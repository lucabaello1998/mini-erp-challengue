using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

public class DuplicarTests
{
    [Fact]
    public async Task Duplicar_UsaNumeroNuevoYPrecionActuales()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var service = new PresupuestoService(db, numeracion);

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

        var original = await service.CrearAsync(
            cliente.Id,
            30,
            new List<PresupuestoItem> { new() { ArticuloId = articulo.Id, Cantidad = 2, DescuentoPct = 10 } });

        articulo.PrecioUnitario = 150m;
        await db.SaveChangesAsync();

        var duplicado = await service.DuplicarAsync(original.Id);

        Assert.NotEqual(original.Id, duplicado.Id);
        Assert.Equal(original.Numero + 1, duplicado.Numero);
        Assert.Equal(EstadoPresupuesto.Borrador, duplicado.Estado);
        Assert.Equal(original.ClienteId, duplicado.ClienteId);
        Assert.True((DateTime.UtcNow - duplicado.Fecha).TotalMinutes < 5);

        var item = Assert.Single(duplicado.Items);
        Assert.Equal(articulo.Id, item.ArticuloId);
        Assert.Equal(2, item.Cantidad);
        Assert.Equal(10m, item.DescuentoPct);
        Assert.Equal(150m, item.PrecioUnitario);
        Assert.Equal(21m, item.AlicuotaIva);
    }
}
