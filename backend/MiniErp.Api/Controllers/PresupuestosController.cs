using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniErp.Api.Dtos;
using MiniErp.Core.Models;
using MiniErp.Core.Services;

namespace MiniErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PresupuestosController : ControllerBase
{
    private readonly PresupuestoService _service;

    public PresupuestosController(PresupuestoService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<PresupuestoDto>>> Listar([FromQuery] bool incluirEliminados = false)
    {
        var lista = await _service.ListarAsync(incluirEliminados);
        return Ok(lista.Select(MapToDto).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PresupuestoDto>> Obtener(int id)
    {
        var presupuesto = await _service.ObtenerAsync(id);
        if (presupuesto is null)
            return NotFound(new { error = "El presupuesto no existe." });
        return Ok(MapToDto(presupuesto));
    }

    [HttpPost]
    public async Task<ActionResult<PresupuestoDto>> Crear([FromBody] CrearPresupuestoRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest(new { error = "El presupuesto debe tener al menos un item." });

        var items = request.Items.Select(i => new PresupuestoItem
        {
            ArticuloId = i.ArticuloId,
            Cantidad = i.Cantidad,
            DescuentoPct = i.DescuentoPct
        }).ToList();

        try
        {
            var creado = await _service.CrearAsync(request.ClienteId, request.ValidezDias, items);
            var completo = await _service.ObtenerAsync(creado.Id);
            return Ok(MapToDto(completo!));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/duplicar")]
    public async Task<ActionResult<PresupuestoDto>> Duplicar(int id)
    {
        if (await _service.ObtenerAsync(id) is null)
            return NotFound(new { error = "El presupuesto no existe." });

        try
        {
            var duplicado = await _service.DuplicarAsync(id);
            var completo = await _service.ObtenerAsync(duplicado.Id);
            return Ok(MapToDto(completo!));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        try
        {
            await _service.EliminarAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (DbUpdateException)
        {
            return BadRequest(new { error = "No se puede eliminar un presupuesto facturado." });
        }
    }

    private static DateTime AsUtc(DateTime value)
        => value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private PresupuestoDto MapToDto(Presupuesto p)
    {
        var totales = _service.CalcularTotales(p);

        var items = p.Items.Select(i => new PresupuestoItemDto(
            i.ArticuloId,
            i.Articulo?.Codigo ?? "",
            i.Articulo?.Descripcion ?? "",
            i.Cantidad,
            i.PrecioUnitario,
            i.DescuentoPct,
            i.AlicuotaIva,
            i.Articulo?.StockActual ?? 0,
            PresupuestoService.CalcularSubtotalLinea(i)
        )).ToList();

        return new PresupuestoDto(
            p.Id,
            p.Numero,
            AsUtc(p.Fecha),
            p.ClienteId,
            p.Cliente?.RazonSocial ?? "",
            p.Estado.ToString(),
            p.ValidezDias,
            items,
            totales.Subtotal,
            totales.Iva,
            totales.Total
        );
    }
}
