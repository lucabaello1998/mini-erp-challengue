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
        var presupuesto = await _db.Presupuestos
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == presupuestoId)
            ?? throw new InvalidOperationException("El presupuesto no existe.");

        if (presupuesto.Items.Count == 0)
            throw new InvalidOperationException("El presupuesto no tiene items.");

        // Idempotencia: un presupuesto se factura una sola vez.
        var yaFacturado = presupuesto.Estado == EstadoPresupuesto.Facturado
            || await _db.Facturas.AnyAsync(f => f.PresupuestoId == presupuestoId);
        if (yaFacturado)
            throw new InvalidOperationException("El presupuesto ya fue facturado.");

        if (presupuesto.Estado == EstadoPresupuesto.Rechazado)
            throw new InvalidOperationException("El presupuesto esta rechazado y no se puede facturar.");

        var vencimiento = presupuesto.Fecha.AddDays(presupuesto.ValidezDias);
        if (DateTime.UtcNow > vencimiento)
            throw new InvalidOperationException("El presupuesto esta vencido y no se puede facturar.");

        // Si el mismo articulo aparece en dos lineas, sumamos las cantidades
        // antes de validar el stock.
        var cantidadesPorArticulo = presupuesto.Items
            .GroupBy(i => i.ArticuloId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Cantidad));

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
            articulos[articuloId].StockActual -= cantidad;

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
        await _db.SaveChangesAsync();
        return factura;
    }
}
