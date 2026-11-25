using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

public class ReporteTests
{
    private static async Task<(
        AppDbContext db,
        PresupuestoService presupuestos,
        FacturacionService facturacion,
        ReporteService reporte,
        Cliente cliente,
        Articulo a1,
        Articulo a2,
        Articulo a3)> Armar()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var presupuestos = new PresupuestoService(db, numeracion);
        var facturacion = new FacturacionService(db, presupuestos, numeracion);
        var reporte = new ReporteService(db);

        var cliente = new Cliente { RazonSocial = "C", Cuit = "1", CondicionIva = CondicionIva.ConsumidorFinal };
        var a1 = new Articulo { Codigo = "A1", Descripcion = "Uno", PrecioUnitario = 100m, StockActual = 1000, AlicuotaIva = 21m };
        var a2 = new Articulo { Codigo = "A2", Descripcion = "Dos", PrecioUnitario = 50m, StockActual = 1000, AlicuotaIva = 10.5m };
        var a3 = new Articulo { Codigo = "A3", Descripcion = "Tres", PrecioUnitario = 99.99m, StockActual = 1000, AlicuotaIva = 21m };

        db.Clientes.Add(cliente);
        db.Articulos.AddRange(a1, a2, a3);
        await db.SaveChangesAsync();

        return (db, presupuestos, facturacion, reporte, cliente, a1, a2, a3);
    }

    [Fact]
    public async Task TopArticulos_OrdenaPorMontoFacturado()
    {
        var (_, presupuestos, facturacion, reporte, cliente, a1, a2, _) = await Armar();

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

        var hoy = ZonaHoraria.AHoyLocal();
        var top = await reporte.TopArticulosAsync(hoy, hoy, 5);

        Assert.Equal(2, top.Count);
        Assert.Equal("A2", top[0].Codigo);
        Assert.Equal(500m, top[0].MontoFacturado);
        Assert.Equal(552.5m, top[0].MontoConIva);
        Assert.Equal(10, top[0].Cantidad);
        Assert.Equal("A1", top[1].Codigo);
        Assert.Equal(200m, top[1].MontoFacturado);
    }

    [Fact]
    public async Task TopArticulos_ExcluyeNoFacturadosYFueraDeRango()
    {
        var (db, presupuestos, facturacion, reporte, cliente, a1, a2, _) = await Armar();

        var facturado = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a1.Id, Cantidad = 2 } });
        await facturacion.FacturarAsync(facturado.Id);

        // Un presupuesto con monto alto pero sin facturar: no debe aparecer.
        await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a2.Id, Cantidad = 100 } });

        // Una factura vieja: no debe entrar en el rango de hoy.
        var viejo = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a1.Id, Cantidad = 50 } });
        await facturacion.FacturarAsync(viejo.Id);
        var facturaVieja = await db.Facturas.FirstAsync(f => f.PresupuestoId == viejo.Id);
        facturaVieja.Fecha = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        await db.SaveChangesAsync();

        var hoy = ZonaHoraria.AHoyLocal();
        var top = await reporte.TopArticulosAsync(hoy, hoy, 5);

        var fila = Assert.Single(top);
        Assert.Equal("A1", fila.Codigo);
        Assert.Equal(2, fila.Cantidad);
        Assert.Equal(200m, fila.MontoFacturado);
    }

    [Fact]
    public async Task TopArticulos_SumaElMismoArticuloEnDosFacturas()
    {
        var (_, presupuestos, facturacion, reporte, cliente, a1, _, _) = await Armar();

        var p1 = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a1.Id, Cantidad = 2 } });
        await facturacion.FacturarAsync(p1.Id);

        var p2 = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a1.Id, Cantidad = 3 } });
        await facturacion.FacturarAsync(p2.Id);

        var hoy = ZonaHoraria.AHoyLocal();
        var top = await reporte.TopArticulosAsync(hoy, hoy, 5);

        var fila = Assert.Single(top);
        Assert.Equal(5, fila.Cantidad);
        Assert.Equal(500m, fila.MontoFacturado);
    }

    [Fact]
    public async Task TopArticulos_RedondeaMontos()
    {
        var (_, presupuestos, facturacion, reporte, cliente, _, _, a3) = await Armar();

        var p = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a3.Id, Cantidad = 1, DescuentoPct = 33.33m } });
        await facturacion.FacturarAsync(p.Id);

        var hoy = ZonaHoraria.AHoyLocal();
        var top = await reporte.TopArticulosAsync(hoy, hoy, 5);

        var fila = Assert.Single(top);
        Assert.Equal(66.66m, fila.MontoFacturado);
        Assert.Equal(80.66m, fila.MontoConIva);
    }

    [Fact]
    public async Task TopArticulos_RespetaElBordeDeHasta()
    {
        var (db, presupuestos, facturacion, reporte, cliente, a1, _, _) = await Armar();

        var hoy = ZonaHoraria.AHoyLocal();

        var p1 = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a1.Id, Cantidad = 1 } });
        await facturacion.FacturarAsync(p1.Id);
        var f1 = await db.Facturas.FirstAsync(f => f.PresupuestoId == p1.Id);
        f1.Fecha = ZonaHoraria.AUtc(hoy);
        await db.SaveChangesAsync();

        var p2 = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = a1.Id, Cantidad = 1 } });
        await facturacion.FacturarAsync(p2.Id);
        var f2 = await db.Facturas.FirstAsync(f => f.PresupuestoId == p2.Id);
        f2.Fecha = ZonaHoraria.AUtc(hoy.AddDays(1)); // arranca el dia siguiente: no entra
        await db.SaveChangesAsync();

        var top = await reporte.TopArticulosAsync(hoy, hoy, 5);

        var fila = Assert.Single(top);
        Assert.Equal(1, fila.Cantidad);
    }
}
