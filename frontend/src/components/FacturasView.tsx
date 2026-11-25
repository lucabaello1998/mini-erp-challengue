import { useEffect, useState } from "react";
import { api } from "../api";
import type { Factura } from "../types";
import { formatDate, formatMoney } from "../money";
import { Alert } from "./Alert";

export function FacturasView() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const data = await api.facturas();
        if (!cancelado) setFacturas(data);
      } catch (e) {
        if (!cancelado) {
          setError(e instanceof Error ? e.message : "No se pudieron cargar las facturas.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>Facturas</h2>
          <p className="muted">Facturas emitidas desde los presupuestos.</p>
        </div>
      </div>

      {error ? <Alert kind="error">{error}</Alert> : null}

      {cargando ? (
        <div className="card empty-state" role="status" aria-live="polite">
          <p>Cargando facturas...</p>
        </div>
      ) : facturas.length === 0 ? (
        <div className="card empty-state">
          <h3>Todavía no hay facturas</h3>
          <p>Facturá un presupuesto para verla acá.</p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="facturas-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Fecha</th>
                  <th>Presupuesto</th>
                  <th className="numeric">Subtotal</th>
                  <th className="numeric">IVA</th>
                  <th className="numeric">Total</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((factura) => (
                  <tr key={factura.id}>
                    <td>
                      <span className="budget-number">#{factura.numero}</span>
                    </td>
                    <td>{formatDate(factura.fecha)}</td>
                    <td>#{factura.presupuestoId}</td>
                    <td className="numeric">{formatMoney(factura.subtotal)}</td>
                    <td className="numeric">{formatMoney(factura.iva)}</td>
                    <td className="numeric">{formatMoney(factura.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
