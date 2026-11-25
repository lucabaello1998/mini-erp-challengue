namespace MiniErp.Core.Models;

/// <summary>
/// Contador persistente para numeraciones. No se deriva de las filas
/// existentes: si se borra un presupuesto, el numero no se reutiliza.
/// </summary>
public class Secuencia
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public int UltimoNumero { get; set; }
}
