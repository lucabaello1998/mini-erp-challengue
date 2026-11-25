using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

public class NumeracionTests
{
    [Fact]
    public async Task ProximoNumero_TrasBorrarElUltimo_NoReutiliza()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var service = new PresupuestoService(db, numeracion);

        var cliente = new Cliente { RazonSocial = "C", Cuit = "1", CondicionIva = CondicionIva.ConsumidorFinal };
        var articulo = new Articulo { Codigo = "A1", Descripcion = "A", PrecioUnitario = 100m, StockActual = 10, AlicuotaIva = 21m };
        db.Clientes.Add(cliente);
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();

        var p1 = await service.CrearAsync(cliente.Id, 30, new List<PresupuestoItem> { new() { ArticuloId = articulo.Id, Cantidad = 1 } });
        var p2 = await service.CrearAsync(cliente.Id, 30, new List<PresupuestoItem> { new() { ArticuloId = articulo.Id, Cantidad = 1 } });
        await service.EliminarAsync(p2.Id);
        var p3 = await service.CrearAsync(cliente.Id, 30, new List<PresupuestoItem> { new() { ArticuloId = articulo.Id, Cantidad = 1 } });

        Assert.Equal(1, p1.Numero);
        Assert.Equal(2, p2.Numero);
        Assert.Equal(3, p3.Numero);
    }
}
