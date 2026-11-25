using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;

namespace MiniErp.Core.Services;

public record TopArticuloReporte(
    int ArticuloId,
    string Codigo,
    string Descripcion,
    int Cantidad,
    decimal MontoFacturado,
    decimal MontoConIva);

public class ReporteService
{
    private readonly AppDbContext _db;

    public ReporteService(AppDbContext db) => _db = db;

    public async Task<List<TopArticuloReporte>> TopArticulosAsync(DateTime desde, DateTime hasta, int top)
    {
        // El usuario elige fechas locales; la base guarda UTC.
        var desdeUtc = ZonaHoraria.AUtc(desde);
        var hastaExclusivoUtc = ZonaHoraria.AUtc(hasta.AddDays(1));
        var limite = Math.Clamp(top, 1, 50);

        var filas = await (
                from factura in _db.Facturas
                join item in _db.PresupuestoItems on factura.PresupuestoId equals item.PresupuestoId
                join articulo in _db.Articulos on item.ArticuloId equals articulo.Id
                where factura.Fecha >= desdeUtc && factura.Fecha < hastaExclusivoUtc
                select new
                {
                    articulo.Id,
                    articulo.Codigo,
                    articulo.Descripcion,
                    item.Cantidad,
                    item.PrecioUnitario,
                    item.DescuentoPct,
                    item.AlicuotaIva
                })
            .ToListAsync();

        return filas
            .GroupBy(fila => new { fila.Id, fila.Codigo, fila.Descripcion })
            .Select(grupo =>
            {
                var monto = Math.Round(
                    grupo.Sum(fila => fila.Cantidad * fila.PrecioUnitario * (1 - fila.DescuentoPct / 100m)),
                    2,
                    MidpointRounding.AwayFromZero);

                var montoConIva = Math.Round(
                    grupo.Sum(fila =>
                    {
                        var linea = fila.Cantidad * fila.PrecioUnitario * (1 - fila.DescuentoPct / 100m);
                        var iva = Math.Round(linea * fila.AlicuotaIva / 100m, 2, MidpointRounding.AwayFromZero);
                        return linea + iva;
                    }),
                    2,
                    MidpointRounding.AwayFromZero);

                return new TopArticuloReporte(
                    grupo.Key.Id,
                    grupo.Key.Codigo,
                    grupo.Key.Descripcion,
                    grupo.Sum(fila => fila.Cantidad),
                    monto,
                    montoConIva);
            })
            .OrderByDescending(fila => fila.MontoFacturado)
            .ThenBy(fila => fila.Codigo)
            .Take(limite)
            .ToList();
    }
}
