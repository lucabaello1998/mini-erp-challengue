using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=minierp.db"));

builder.Services.AddScoped<NumeracionService>();
builder.Services.AddScoped<PresupuestoService>();
builder.Services.AddScoped<FacturacionService>();
builder.Services.AddScoped<ReporteService>();

builder.Services.AddControllers();
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        // Solo miramos las entradas que fallaron: ModelState incluye tambien
        // los parametros que bindearon bien, y eso hacia que cualquier error
        // devolviera el mensaje de fecha.
        var clavesConError = context.ModelState
            .Where(par => par.Value?.Errors.Count > 0)
            .Select(par => par.Key);

        var mensaje = "La solicitud no es valida. Revisa los datos enviados.";

        if (clavesConError.Any(k => k.Equals("desde", StringComparison.OrdinalIgnoreCase)
                                 || k.Equals("hasta", StringComparison.OrdinalIgnoreCase)))
        {
            mensaje = "La fecha no es valida. Usa el formato AAAA-MM-DD.";
        }
        else if (clavesConError.Any(k => k.Equals("top", StringComparison.OrdinalIgnoreCase)))
        {
            mensaje = "El top debe ser un numero entero entre 1 y 50.";
        }

        return new BadRequestObjectResult(new { error = mensaje });
    };
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Crear y seedear la base al arrancar.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DbSeeder.Seed(db);
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();

app.Run();
