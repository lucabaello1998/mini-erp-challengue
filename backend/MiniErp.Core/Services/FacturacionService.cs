using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;

namespace MiniErp.Core.Services;

public class FacturacionService
{
    private readonly AppDbContext _db;
    private readonly PresupuestoService _presupuestos;
    private readonly NumeracionService _numeracion;

    public FacturacionService(AppDbContext db, PresupuestoService presupuestos, NumeracionService numeracion)
    {
        _db = db;
        _presupuestos = presupuestos;
        _numeracion = numeracion;
    }

    public async Task<Factura> FacturarAsync(int presupuestoId)
    {
        const int maxIntentos = 3;

        for (var intento = 1; ; intento++)
        {
            try
            {
                return await FacturarUnaVezAsync(presupuestoId);
            }
            catch (DbUpdateConcurrencyException) when (intento < maxIntentos)
            {
                // Otro request cambio el stock entre la lectura y el UPDATE.
                // El token de concurrencia evito el lost update; descartamos
                // el estado del intento fallido y reintentamos con stock fresco.
                _db.ChangeTracker.Clear();
                await Task.Delay(10 * intento);
            }
            catch (DbUpdateConcurrencyException ex)
            {
                throw new InvalidOperationException(
                    "El stock cambio mientras se facturaba. Reintenta.", ex);
            }
        }
    }

    private async Task<Factura> FacturarUnaVezAsync(int presupuestoId)
    {
        var presupuesto = await _db.Presupuestos
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == presupuestoId)
            ?? throw new KeyNotFoundException("El presupuesto no existe.");

        if (presupuesto.Items.Count == 0)
            throw new InvalidOperationException("El presupuesto no tiene items.");

        // Idempotencia: un presupuesto se factura una sola vez.
        var yaFacturado = presupuesto.Estado == EstadoPresupuesto.Facturado
            || await _db.Facturas.AnyAsync(f => f.PresupuestoId == presupuestoId);
        if (yaFacturado)
            throw new InvalidOperationException("El presupuesto ya fue facturado.");

        if (presupuesto.Estado == EstadoPresupuesto.Eliminado)
            throw new InvalidOperationException("El presupuesto esta eliminado y no se puede facturar.");

        if (presupuesto.Estado == EstadoPresupuesto.Rechazado)
            throw new InvalidOperationException("El presupuesto esta rechazado y no se puede facturar.");

        var vencimiento = presupuesto.Fecha.AddDays(presupuesto.ValidezDias);
        if (DateTime.UtcNow > vencimiento)
            throw new InvalidOperationException("El presupuesto esta vencido y no se puede facturar.");

        // Si el mismo articulo aparece en dos lineas, sumamos las cantidades
        // antes de validar el stock.
        var cantidadesPorArticulo = presupuesto.Items
            .GroupBy(i => i.ArticuloId)
            .ToDictionary(g => g.Key, g => g.Sum(i => (long)i.Cantidad));

        var ids = cantidadesPorArticulo.Keys.ToList();
        var articulos = await _db.Articulos
            .Where(a => ids.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id);

        foreach (var (articuloId, cantidad) in cantidadesPorArticulo)
        {
            if (!articulos.TryGetValue(articuloId, out var articulo))
                throw new InvalidOperationException($"El articulo {articuloId} no existe.");

            if (articulo.StockActual < cantidad)
                throw new InvalidOperationException(
                    $"Stock insuficiente para {articulo.Codigo}: hay {articulo.StockActual} y se necesitan {cantidad}.");
        }

        // Generamos el numero antes de armar la factura; la secuencia se
        // persiste junto con la factura en el SaveChanges final.
        var numero = await _numeracion.ProximoNumeroFacturaAsync();

        foreach (var (articuloId, cantidad) in cantidadesPorArticulo)
            articulos[articuloId].StockActual -= (int)cantidad;

        var totales = _presupuestos.CalcularTotales(presupuesto);

        var factura = new Factura
        {
            Numero = numero,
            Fecha = DateTime.UtcNow,
            PresupuestoId = presupuesto.Id,
            Subtotal = totales.Subtotal,
            Iva = totales.Iva,
            Total = totales.Total
        };

        presupuesto.Estado = EstadoPresupuesto.Facturado;
        _db.Facturas.Add(factura);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (EsConflictoDeFacturacion(ex))
        {
            // Backstop atomico de idempotencia: el indice unico en
            // Factura.PresupuestoId impide dos facturas para el mismo presupuesto.
            var mensaje = ex.InnerException?.Message ?? string.Empty;
            if (mensaje.Contains("Facturas.PresupuestoId", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("El presupuesto ya fue facturado.", ex);

            throw new InvalidOperationException(
                "No se pudo generar el numero de la factura. Reintenta.", ex);
        }

        return factura;
    }

    private static bool EsConflictoDeFacturacion(DbUpdateException ex)
    {
        var mensaje = ex.InnerException?.Message ?? string.Empty;
        return mensaje.Contains("Facturas.PresupuestoId", StringComparison.OrdinalIgnoreCase)
            || mensaje.Contains("Facturas.Numero", StringComparison.OrdinalIgnoreCase);
    }
}
