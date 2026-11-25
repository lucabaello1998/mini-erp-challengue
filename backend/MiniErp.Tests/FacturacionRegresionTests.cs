using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

public class FacturacionRegresionTests
{
    private static (AppDbContext db, PresupuestoService presupuestos, FacturacionService facturacion) Armar()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var presupuestos = new PresupuestoService(db, numeracion);
        var facturacion = new FacturacionService(db, presupuestos, numeracion);
        return (db, presupuestos, facturacion);
    }

    private static async Task<(Cliente cliente, Articulo articulo)> Seed(AppDbContext db)
    {
        var cliente = new Cliente { RazonSocial = "C", Cuit = "1", CondicionIva = CondicionIva.ConsumidorFinal };
        var articulo = new Articulo
        {
            Codigo = "A1",
            Descripcion = "Articulo",
            PrecioUnitario = 100m,
            StockActual = 100,
            AlicuotaIva = 21m
        };
        db.Clientes.Add(cliente);
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();
        return (cliente, articulo);
    }

    [Fact]
    public async Task Facturar_VencidoORechazado_Lanza()
    {
        var (db, _, facturacion) = Armar();
        var (cliente, articulo) = await Seed(db);

        var vencido = new Presupuesto
        {
            Numero = 1,
            Fecha = DateTime.UtcNow.AddDays(-10),
            ValidezDias = 1,
            ClienteId = cliente.Id,
            Estado = EstadoPresupuesto.Aprobado,
            Items = new List<PresupuestoItem>
            {
                new() { ArticuloId = articulo.Id, Cantidad = 1, PrecioUnitario = 100m, AlicuotaIva = 21m }
            }
        };
        db.Presupuestos.Add(vencido);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => facturacion.FacturarAsync(vencido.Id));

        var rechazado = new Presupuesto
        {
            Numero = 2,
            Fecha = DateTime.UtcNow,
            ValidezDias = 30,
            ClienteId = cliente.Id,
            Estado = EstadoPresupuesto.Rechazado,
            Items = new List<PresupuestoItem>
            {
                new() { ArticuloId = articulo.Id, Cantidad = 1, PrecioUnitario = 100m, AlicuotaIva = 21m }
            }
        };
        db.Presupuestos.Add(rechazado);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => facturacion.FacturarAsync(rechazado.Id));
    }

    [Fact]
    public async Task Eliminar_PresupuestoFacturado_Lanza()
    {
        var (db, presupuestos, facturacion) = Armar();
        var (cliente, articulo) = await Seed(db);

        var presupuesto = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = articulo.Id, Cantidad = 1 } });
        await facturacion.FacturarAsync(presupuesto.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => presupuestos.EliminarAsync(presupuesto.Id));
    }

    [Fact]
    public async Task Facturar_Inexistente_LanzaKeyNotFound()
    {
        var (_, _, facturacion) = Armar();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => facturacion.FacturarAsync(999));
    }

    [Fact]
    public async Task Facturar_DosPresupuestos_NumeraSecuencial()
    {
        var (db, presupuestos, facturacion) = Armar();
        var (cliente, articulo) = await Seed(db);

        var p1 = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = articulo.Id, Cantidad = 1 } });
        var p2 = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = articulo.Id, Cantidad = 1 } });

        await facturacion.FacturarAsync(p1.Id);
        await facturacion.FacturarAsync(p2.Id);

        var numeros = await db.Facturas.OrderBy(f => f.Numero).Select(f => f.Numero).ToListAsync();
        Assert.Equal(new[] { 1, 2 }, numeros);
    }
}
