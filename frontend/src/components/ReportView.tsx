import { useEffect, useState } from "react";
import { api } from "../api";
import type { TopArticulo } from "../types";
import { formatMoney } from "../money";
import { Alert } from "./Alert";

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ReportView() {
  const hoy = new Date();
  const hace30 = new Date();
  hace30.setDate(hoy.getDate() - 30);

  const [desde, setDesde] = useState(toInputDate(hace30));
  const [hasta, setHasta] = useState(toInputDate(hoy));
  const [top, setTop] = useState(5);
  const [refresh, setRefresh] = useState(0);
  const [datos, setDatos] = useState<TopArticulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    if (!desde || !hasta || desde > hasta) {
      setDatos([]);
      setCargando(false);
      setError("La fecha desde no puede ser mayor que la hasta.");
      return;
    }

    setCargando(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const data = await api.reporteTop(desde, hasta, top);
        if (!cancelado) setDatos(data);
      } catch (e) {
        if (!cancelado) {
          setError(e instanceof Error ? e.message : "No se pudo cargar el reporte.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, 250);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [desde, hasta, top, refresh]);

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>Reporte</h2>
          <p className="muted">Top artículos por monto facturado en el rango.</p>
        </div>
      </div>

      <div className="card">
        <div className="report-filters">
          <label className="field">
            <span>Desde</span>
            <input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
          </label>

          <label className="field">
            <span>Hasta</span>
            <input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
          </label>

          <label className="field">
            <span>Top</span>
            <input
              type="number"
              min={1}
              max={50}
              value={top}
              onChange={(event) =>
                setTop(Math.min(50, Math.max(1, Number(event.target.value) || 1)))
              }
            />
          </label>

          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Actualizar
          </button>
        </div>
      </div>

      {error ? <Alert kind="error">{error}</Alert> : null}

      {cargando ? (
        <div className="card empty-state">
          <p>Cargando reporte...</p>
        </div>
      ) : datos.length === 0 ? (
        <div className="card empty-state">
          <h3>Sin facturas en el rango</h3>
          <p>Probá con otro rango de fechas.</p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Artículo</th>
                  <th className="numeric">Cantidad</th>
                  <th className="numeric">Monto neto</th>
                  <th className="numeric">Monto con IVA</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((fila) => (
                  <tr key={fila.articuloId}>
                    <td>
                      <span className="code">{fila.codigo}</span>
                    </td>
                    <td>{fila.descripcion}</td>
                    <td className="numeric">{fila.cantidad}</td>
                    <td className="numeric">{formatMoney(fila.montoFacturado)}</td>
                    <td className="numeric">{formatMoney(fila.montoConIva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="muted small report-note">
        El monto neto no incluye IVA. La última columna suma el IVA de cada línea.
      </p>
    </section>
  );
}
