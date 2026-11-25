namespace MiniErp.Core.Services;

/// <summary>
/// La base guarda las fechas en UTC. Para reportes y filtros usamos la zona
/// de negocio (Argentina), que es la que ve el usuario en la UI.
/// </summary>
public static class ZonaHoraria
{
    public static readonly TimeZoneInfo Argentina = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "Argentina Standard Time" : "America/Argentina/Buenos_Aires");

    public static DateTime AHoyLocal()
        => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Argentina).Date;

    public static DateTime AUtc(DateTime fechaLocal)
        => TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(fechaLocal.Date, DateTimeKind.Unspecified),
            Argentina);
}
