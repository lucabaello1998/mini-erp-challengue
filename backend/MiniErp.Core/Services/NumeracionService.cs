using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;

namespace MiniErp.Core.Services;

public class NumeracionService
{
    private const string SecuenciaPresupuesto = "Presupuesto";
    private const string SecuenciaFactura = "Factura";

    private readonly AppDbContext _db;

    public NumeracionService(AppDbContext db) => _db = db;

    public Task<int> ProximoNumeroPresupuestoAsync() => ProximoNumeroAsync(SecuenciaPresupuesto);

    public Task<int> ProximoNumeroFacturaAsync() => ProximoNumeroAsync(SecuenciaFactura);

    /// <summary>
    /// La numeracion sale de una tabla de secuencias y no del maximo existente.
    /// Si se borra el ultimo presupuesto, el numero no se reutiliza.
    /// </summary>
    private async Task<int> ProximoNumeroAsync(string nombre)
    {
        var secuencia = await _db.Secuencias.FirstOrDefaultAsync(s => s.Nombre == nombre);

        if (secuencia is null)
        {
            // Si la tabla de secuencias esta vacia (por ejemplo, una base que
            // ya tenia datos), arrancamos desde el maximo existente para no
            // chocar con numeros ya emitidos.
            var max = nombre == SecuenciaPresupuesto
                ? await _db.Presupuestos.MaxAsync(p => (int?)p.Numero) ?? 0
                : await _db.Facturas.MaxAsync(f => (int?)f.Numero) ?? 0;

            secuencia = new Secuencia { Nombre = nombre, UltimoNumero = max };
            _db.Secuencias.Add(secuencia);
        }

        // No guardamos aca: la secuencia se persiste junto con el presupuesto
        // o la factura en el SaveChanges del caller, en la misma transaccion.
        secuencia.UltimoNumero++;
        return secuencia.UltimoNumero;
    }
}
