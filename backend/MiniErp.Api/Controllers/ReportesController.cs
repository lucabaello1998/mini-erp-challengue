using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Dtos;
using MiniErp.Core.Services;

namespace MiniErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportesController : ControllerBase
{
    private readonly ReporteService _service;

    public ReportesController(ReporteService service) => _service = service;

    // GET /api/reportes/top-articulos?desde=2026-11-01&hasta=2026-11-30&top=5
    [HttpGet("top-articulos")]
    public async Task<ActionResult<List<TopArticuloDto>>> TopArticulos(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] int top = 5)
    {
        var desdeFecha = (desde ?? DateTime.UtcNow.AddMonths(-1)).Date;
        var hastaFecha = (hasta ?? DateTime.UtcNow).Date;

        if (desdeFecha > hastaFecha)
            return BadRequest(new { error = "La fecha desde no puede ser mayor que la hasta." });

        if (top < 1 || top > 50)
            return BadRequest(new { error = "El top debe estar entre 1 y 50." });

        var datos = await _service.TopArticulosAsync(desdeFecha, hastaFecha, top);

        return Ok(datos
            .Select(d => new TopArticuloDto(
                d.ArticuloId,
                d.Codigo,
                d.Descripcion,
                d.Cantidad,
                d.MontoFacturado,
                d.MontoConIva))
            .ToList());
    }
}
