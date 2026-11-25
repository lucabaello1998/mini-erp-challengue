using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

public class ValidacionTests
{
    [Fact]
    public async Task Crear_RechazaDatosInvalidos()
    {
        var db = TestDbFactory.Create();
        var service = new PresupuestoService(db, new NumeracionService(db));

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

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CrearAsync(cliente.Id, 30, new List<PresupuestoItem>()));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CrearAsync(999, 30, new List<PresupuestoItem>
            {
                new() { ArticuloId = articulo.Id, Cantidad = 1 }
            }));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CrearAsync(cliente.Id, 30, new List<PresupuestoItem>
            {
                new() { ArticuloId = articulo.Id, Cantidad = 0 }
            }));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CrearAsync(cliente.Id, 30, new List<PresupuestoItem>
            {
                new() { ArticuloId = articulo.Id, Cantidad = 1, DescuentoPct = 101 }
            }));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CrearAsync(cliente.Id, 0, new List<PresupuestoItem>
            {
                new() { ArticuloId = articulo.Id, Cantidad = 1 }
            }));

        Assert.False(db.Presupuestos.Any());
    }
}
