using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

public class ReporteTests
{
    [Fact]
    public async Task TopArticulos_SoloFacturadosEnRango_OrdenaPorMonto()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var presupuestos = new PresupuestoService(db, numeracion);
        var facturacion = new FacturacionService(db, presupuestos, numeracion);
        var reporte = new ReporteService(db);

        var cliente = new Cliente { RazonSocial = "C", Cuit = "1", CondicionIva = CondicionIva.ConsumidorFinal };
        var a1 = new Articulo { Codigo = "A1", Descripcion = "Uno", PrecioUnitario = 100m, StockActual = 100, AlicuotaIva = 21m };
        var a2 = new Articulo { Codigo = "A2", Descripcion = "Dos", PrecioUnitario = 50m, StockActual = 100, AlicuotaIva = 10.5m };
        db.Clientes.Add(cliente);
        db.Articulos.AddRange(a1, a2);
        await db.SaveChangesAsync();

        var p1 = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a1.Id, Cantidad = 2 } });
        await facturacion.FacturarAsync(p1.Id);

        var p2 = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a2.Id, Cantidad = 10 } });
        await facturacion.FacturarAsync(p2.Id);

        var top = await reporte.TopArticulosAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1),
            5);

        Assert.Equal(2, top.Count);
        Assert.Equal("A2", top[0].Codigo);
        Assert.Equal(500m, top[0].MontoFacturado);
        Assert.Equal(552.5m, top[0].MontoConIva);
        Assert.Equal(10, top[0].Cantidad);
        Assert.Equal("A1", top[1].Codigo);
        Assert.Equal(200m, top[1].MontoFacturado);
    }
}
