using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;

namespace MiniErp.Core.Services;

public record Totales(decimal Subtotal, decimal Iva, decimal Total);

public class PresupuestoService
{
    private readonly AppDbContext _db;
    private readonly NumeracionService _numeracion;

    public PresupuestoService(AppDbContext db, NumeracionService numeracion)
    {
        _db = db;
        _numeracion = numeracion;
    }

    /// <summary>
    /// Subtotal de una linea: cantidad x precio x (1 - descuento). Se calcula
    /// exacto; el redondeo a 2 decimales se aplica al IVA de cada linea, que es
    /// lo que pide el enunciado.
    /// </summary>
    public static decimal CalcularSubtotalLinea(PresupuestoItem item)
        => item.Cantidad * item.PrecioUnitario * (1 - item.DescuentoPct / 100m);

    /// <summary>
    /// Calcula subtotal, IVA y total. El IVA se calcula por linea segun la
    /// alicuota de cada articulo, se redondea a 2 decimales por linea y recien
    /// despues se suma.
    /// </summary>
    public Totales CalcularTotales(Presupuesto presupuesto)
    {
        decimal subtotal = 0m;
        decimal iva = 0m;

        foreach (var item in presupuesto.Items)
        {
            var subtotalLinea = CalcularSubtotalLinea(item);
            subtotal += subtotalLinea;
            iva += Math.Round(subtotalLinea * item.AlicuotaIva / 100m, 2, MidpointRounding.AwayFromZero);
        }

        var total = subtotal + iva;
        return new Totales(subtotal, iva, total);
    }

    public async Task<Presupuesto> CrearAsync(int clienteId, int validezDias, List<PresupuestoItem> items)
    {
        if (items is null || items.Count == 0)
            throw new InvalidOperationException("El presupuesto debe tener al menos un item.");

        if (validezDias <= 0)
            throw new InvalidOperationException("La validez debe ser mayor a cero.");

        var clienteExiste = await _db.Clientes.AnyAsync(c => c.Id == clienteId);
        if (!clienteExiste)
            throw new InvalidOperationException("El cliente no existe.");

        foreach (var item in items)
        {
            if (item.Cantidad <= 0)
                throw new InvalidOperationException("La cantidad debe ser mayor a cero.");

            if (item.DescuentoPct < 0 || item.DescuentoPct > 100)
                throw new InvalidOperationException("El descuento debe estar entre 0 y 100.");

            var articulo = await _db.Articulos.FirstOrDefaultAsync(a => a.Id == item.ArticuloId)
                ?? throw new InvalidOperationException($"El articulo {item.ArticuloId} no existe.");

            // Tomamos precio y alicuota actuales del articulo como snapshot.
            item.PrecioUnitario = articulo.PrecioUnitario;
            item.AlicuotaIva = articulo.AlicuotaIva;
        }

        var presupuesto = new Presupuesto
        {
            Numero = await _numeracion.ProximoNumeroPresupuestoAsync(),
            Fecha = DateTime.UtcNow,
            ClienteId = clienteId,
            Estado = EstadoPresupuesto.Borrador,
            ValidezDias = validezDias,
            Items = items
        };

        _db.Presupuestos.Add(presupuesto);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (EsConflictoDeNumero(ex))
        {
            throw new InvalidOperationException(
                "No se pudo generar el numero del presupuesto. Reintenta.", ex);
        }

        return presupuesto;
    }

    public async Task<Presupuesto?> ObtenerAsync(int id)
    {
        return await _db.Presupuestos
            .Include(p => p.Cliente)
            .Include(p => p.Items)
                .ThenInclude(i => i.Articulo)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<List<Presupuesto>> ListarAsync()
    {
        return await _db.Presupuestos
            .Include(p => p.Cliente)
            .Include(p => p.Items)
                .ThenInclude(i => i.Articulo)
            .OrderByDescending(p => p.Numero)
            .ToListAsync();
    }

    public async Task<Presupuesto> DuplicarAsync(int id)
    {
        var original = await _db.Presupuestos
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new InvalidOperationException("El presupuesto no existe.");

        if (original.Items.Count == 0)
            throw new InvalidOperationException("El presupuesto no tiene items.");

        var ids = original.Items.Select(i => i.ArticuloId).Distinct().ToList();
        var articulos = await _db.Articulos
            .Where(a => ids.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id);

        var items = new List<PresupuestoItem>();
        foreach (var item in original.Items)
        {
            if (!articulos.TryGetValue(item.ArticuloId, out var articulo))
                throw new InvalidOperationException($"El articulo {item.ArticuloId} no existe.");

            // El duplicado usa los precios y alicuotas actuales del articulo,
            // no los del presupuesto original.
            items.Add(new PresupuestoItem
            {
                ArticuloId = item.ArticuloId,
                Cantidad = item.Cantidad,
                DescuentoPct = item.DescuentoPct,
                PrecioUnitario = articulo.PrecioUnitario,
                AlicuotaIva = articulo.AlicuotaIva
            });
        }

        var duplicado = new Presupuesto
        {
            Numero = await _numeracion.ProximoNumeroPresupuestoAsync(),
            Fecha = DateTime.UtcNow,
            ClienteId = original.ClienteId,
            Estado = EstadoPresupuesto.Borrador,
            ValidezDias = original.ValidezDias,
            Items = items
        };

        _db.Presupuestos.Add(duplicado);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (EsConflictoDeNumero(ex))
        {
            throw new InvalidOperationException(
                "No se pudo generar el numero del presupuesto. Reintenta.", ex);
        }

        return duplicado;
    }

    public async Task EliminarAsync(int id)
    {
        var presupuesto = await _db.Presupuestos.FindAsync(id);
        if (presupuesto is null) return;

        var facturado = await _db.Facturas.AnyAsync(f => f.PresupuestoId == id);
        if (facturado)
            throw new InvalidOperationException("No se puede eliminar un presupuesto facturado.");

        _db.Presupuestos.Remove(presupuesto);
        await _db.SaveChangesAsync();
    }

    private static bool EsConflictoDeNumero(DbUpdateException ex)
        => ex.InnerException?.Message.Contains("Presupuestos.Numero", StringComparison.OrdinalIgnoreCase) == true;
}
