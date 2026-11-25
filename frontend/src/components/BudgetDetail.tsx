import { useEffect } from "react";
import type { Presupuesto } from "../types";
import { formatDate, formatMoney } from "../money";
import { Alert } from "./Alert";
import { StatusBadge } from "./StatusBadge";

type Props = {
  presupuesto: Presupuesto | null;
  cargando: boolean;
  error: string | null;
  onClose: () => void;
};

export function BudgetDetail({ presupuesto, cargando, error, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del presupuesto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{presupuesto ? `Presupuesto #${presupuesto.numero}` : "Presupuesto"}</h2>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {cargando ? (
          <p className="muted">Cargando...</p>
        ) : error ? (
          <Alert kind="error">{error}</Alert>
        ) : presupuesto ? (
          <>
            <div className="detail-meta">
              <div>
                <span>Cliente</span>
                <strong>{presupuesto.clienteRazonSocial}</strong>
              </div>
              <div>
                <span>Fecha</span>
                <strong>{formatDate(presupuesto.fecha)}</strong>
              </div>
              <div>
                <span>Estado</span>
                <StatusBadge estado={presupuesto.estado} />
              </div>
              <div>
                <span>Validez</span>
                <strong>{presupuesto.validezDias} días</strong>
              </div>
            </div>

            <div className="table-wrap">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th className="numeric">Cantidad</th>
                    <th className="numeric">Precio</th>
                    <th className="numeric">Desc.</th>
                    <th className="numeric">IVA</th>
                    <th className="numeric">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {presupuesto.items.map((item, index) => (
                    <tr key={`${item.articuloId}-${index}`}>
                      <td>
                        <div className="line-title">
                          <span className="code">{item.articuloCodigo}</span>
                          <span>{item.articuloDescripcion}</span>
                        </div>
                      </td>
                      <td className="numeric">{item.cantidad}</td>
                      <td className="numeric">{formatMoney(item.precioUnitario)}</td>
                      <td className="numeric">{item.descuentoPct}%</td>
                      <td className="numeric">{item.alicuotaIva}%</td>
                      <td className="numeric">{formatMoney(item.subtotalLinea)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="totals detail-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatMoney(presupuesto.subtotal)}</dd>
              </div>
              <div>
                <dt>IVA</dt>
                <dd>{formatMoney(presupuesto.iva)}</dd>
              </div>
              <div className="total-row">
                <dt>Total</dt>
                <dd>{formatMoney(presupuesto.total)}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </div>
    </div>
  );
}
