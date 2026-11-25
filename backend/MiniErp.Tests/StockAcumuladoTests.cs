using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

public class StockAcumuladoTests
{
    [Fact]
    public async Task Facturar_MismoArticuloEnDosLineas_ValidaStockAgregado()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var presupuestos = new PresupuestoService(db, numeracion);
        var facturacion = new FacturacionService(db, presupuestos, numeracion);

        var cliente = new Cliente { RazonSocial = "C", Cuit = "1", CondicionIva = CondicionIva.ConsumidorFinal };
        var articulo = new Articulo { Codigo = "A1", Descripcion = "A", PrecioUnitario = 100m, StockActual = 5, AlicuotaIva = 21m };
        db.Clientes.Add(cliente);
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();

        var presupuesto = new Presupuesto
        {
            Numero = 1,
            Fecha = DateTime.UtcNow,
            ClienteId = cliente.Id,
            ValidezDias = 30,
            Estado = EstadoPresupuesto.Aprobado,
            Items = new List<PresupuestoItem>
            {
                new() { ArticuloId = articulo.Id, Cantidad = 3, PrecioUnitario = 100m, AlicuotaIva = 21m },
                new() { ArticuloId = articulo.Id, Cantidad = 3, PrecioUnitario = 100m, AlicuotaIva = 21m }
            }
        };
        db.Presupuestos.Add(presupuesto);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => facturacion.FacturarAsync(presupuesto.Id));

        var actual = await db.Articulos.AsNoTracking().FirstAsync(a => a.Id == articulo.Id);
        Assert.Equal(5, actual.StockActual);
    }

    [Fact]
    public async Task Facturar_CantidadesEnormes_LanzaControlado()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var presupuestos = new PresupuestoService(db, numeracion);
        var facturacion = new FacturacionService(db, presupuestos, numeracion);

        var cliente = new Cliente { RazonSocial = "C", Cuit = "1", CondicionIva = CondicionIva.ConsumidorFinal };
        var articulo = new Articulo { Codigo = "A1", Descripcion = "A", PrecioUnitario = 100m, StockActual = 5, AlicuotaIva = 21m };
        db.Clientes.Add(cliente);
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();

        var presupuesto = new Presupuesto
        {
            Numero = 1,
            Fecha = DateTime.UtcNow,
            ClienteId = cliente.Id,
            ValidezDias = 30,
            Estado = EstadoPresupuesto.Aprobado,
            Items = new List<PresupuestoItem>
            {
                new() { ArticuloId = articulo.Id, Cantidad = int.MaxValue, PrecioUnitario = 100m, AlicuotaIva = 21m },
                new() { ArticuloId = articulo.Id, Cantidad = int.MaxValue, PrecioUnitario = 100m, AlicuotaIva = 21m }
            }
        };
        db.Presupuestos.Add(presupuesto);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => facturacion.FacturarAsync(presupuesto.Id));

        var actual = await db.Articulos.AsNoTracking().FirstAsync(a => a.Id == articulo.Id);
        Assert.Equal(5, actual.StockActual);
    }
}
