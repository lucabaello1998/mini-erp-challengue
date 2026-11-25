using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

public class EliminarTests
{
    [Fact]
    public async Task Eliminar_EsLogico_ConservaFilaYNoSeLista()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var presupuestos = new PresupuestoService(db, numeracion);
        var facturacion = new FacturacionService(db, presupuestos, numeracion);

        var cliente = new Cliente { RazonSocial = "C", Cuit = "1", CondicionIva = CondicionIva.ConsumidorFinal };
        var articulo = new Articulo
        {
            Codigo = "A1",
            Descripcion = "Articulo",
            PrecioUnitario = 100m,
            StockActual = 10,
            AlicuotaIva = 21m
        };
        db.Clientes.Add(cliente);
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();

        var presupuesto = await presupuestos.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = articulo.Id, Cantidad = 1 } });

        await presupuestos.EliminarAsync(presupuesto.Id);

        var fila = await db.Presupuestos.AsNoTracking().FirstAsync(p => p.Id == presupuesto.Id);
        Assert.Equal(EstadoPresupuesto.Eliminado, fila.Estado);
        Assert.Equal(1, await db.PresupuestoItems.CountAsync(i => i.PresupuestoId == presupuesto.Id));

        Assert.Null(await presupuestos.ObtenerAsync(presupuesto.Id));
        Assert.Empty(await presupuestos.ListarAsync());

        var conEliminados = await presupuestos.ListarAsync(incluirEliminados: true);
        var eliminado = Assert.Single(conEliminados);
        Assert.Equal(EstadoPresupuesto.Eliminado, eliminado.Estado);

        await Assert.ThrowsAsync<InvalidOperationException>(() => facturacion.FacturarAsync(presupuesto.Id));

        // Es idempotente: volver a eliminar no rompe.
        await presupuestos.EliminarAsync(presupuesto.Id);
    }
}
