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

function fechaHaceDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return toInputDate(fecha);
}

export function ReportView() {
  const [desde, setDesde] = useState(() => fechaHaceDias(30));
  const [hasta, setHasta] = useState(() => toInputDate(new Date()));
  const [top, setTop] = useState("5");
  const [refresh, setRefresh] = useState(0);
  const [datos, setDatos] = useState<TopArticulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const topNumero = Number(top);
  const topValido = /^\d+$/.test(top) && topNumero >= 1 && topNumero <= 50;
  const rangoValido = Boolean(desde && hasta && desde <= hasta);
  const errorRango = !desde || !hasta
    ? "Elegí ambas fechas."
    : desde > hasta
      ? "La fecha desde no puede ser mayor que la hasta."
      : !topValido
        ? "El top debe ser un entero entre 1 y 50."
        : null;

  useEffect(() => {
    if (!rangoValido || !topValido) {
      setDatos([]);
      setCargando(false);
      setError(null);
      return;
    }

    let cancelado = false;
    setCargando(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const data = await api.reporteTop(desde, hasta, topNumero);
        if (!cancelado) setDatos(data);
      } catch (e) {
        if (!cancelado) {
          setDatos([]);
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
  }, [desde, hasta, topNumero, topValido, rangoValido, refresh]);

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
              step={1}
              value={top}
              onChange={(event) => setTop(event.target.value)}
            />
          </label>

          <button
            className="btn btn-secondary"
            type="button"
            disabled={!rangoValido || !topValido || cargando}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Actualizar
          </button>
        </div>
      </div>

      {errorRango ? <Alert kind="error">{errorRango}</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      {cargando && datos.length === 0 ? (
        <div className="card empty-state" role="status" aria-live="polite">
          <p>Cargando reporte...</p>
        </div>
      ) : datos.length === 0 ? (
        errorRango || error ? null : (
          <div className="card empty-state">
            <h3>Sin facturas en el rango</h3>
            <p>Probá con otro rango de fechas.</p>
          </div>
        )
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

      {cargando && datos.length > 0 ? <p className="muted small">Actualizando...</p> : null}

      <p className="muted small report-note">
        El monto neto no incluye IVA. La última columna suma el IVA de cada línea.
      </p>
    </section>
  );
}
