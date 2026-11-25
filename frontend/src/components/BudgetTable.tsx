import type { Presupuesto } from "../types";
import { formatDate, formatMoney } from "../money";
import { presupuestoSinStock } from "../stock";
import { StatusBadge } from "./StatusBadge";
import { WarningIcon } from "./WarningIcon";

type Props = {
  presupuestos: Presupuesto[];
  cargando: boolean;
  facturandoId: number | null;
  duplicandoId: number | null;
  eliminandoId: number | null;
  onFacturar: (presupuesto: Presupuesto) => void;
  onDuplicar: (presupuesto: Presupuesto) => void;
  onEliminar: (presupuesto: Presupuesto) => void;
  onVer: (presupuesto: Presupuesto) => void;
};

export function BudgetTable({
  presupuestos,
  cargando,
  facturandoId,
  duplicandoId,
  eliminandoId,
  onFacturar,
  onDuplicar,
  onEliminar,
  onVer,
}: Props) {
  if (cargando) {
    return (
      <div className="card empty-state" role="status" aria-live="polite">
        <p>Cargando presupuestos...</p>
      </div>
    );
  }

  if (presupuestos.length === 0) {
    return (
      <div className="card empty-state">
        <h3>Todavía no hay presupuestos</h3>
        <p>Creá el primero para empezar.</p>
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div className="table-wrap">
        <table className="budgets-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th className="numeric">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {presupuestos.map((presupuesto) => {
              const facturado = presupuesto.estado === "Facturado";
              const rechazado = presupuesto.estado === "Rechazado";
              const eliminado = presupuesto.estado === "Eliminado";
              const facturando = facturandoId === presupuesto.id;
              const duplicando = duplicandoId === presupuesto.id;
              const eliminando = eliminandoId === presupuesto.id;
              const copiandoOtro = duplicandoId !== null && !duplicando;
              const eliminandoOtro = eliminandoId !== null && !eliminando;
              const sinStock =
                !facturado &&
                !rechazado &&
                !eliminado &&
                presupuestoSinStock(presupuesto.items);

              return (
                <tr key={presupuesto.id} className={eliminado ? "row-deleted" : undefined}>
                  <td>
                    <div className="budget-cell">
                      <span className="budget-number">#{presupuesto.numero}</span>
                      {sinStock ? (
                        <span
                          className="stock-chip"
                          title="No se puede facturar por falta de stock"
                        >
                          <WarningIcon />
                          Sin stock
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatDate(presupuesto.fecha)}</td>
                  <td>{presupuesto.clienteRazonSocial}</td>
                  <td>
                    <StatusBadge estado={presupuesto.estado} />
                  </td>
                  <td className="numeric">{formatMoney(presupuesto.total)}</td>
                  <td className="actions">
                    {eliminado ? (
                      <span className="muted small" aria-label="Sin acciones">
                        —
                      </span>
                    ) : (
                      <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        aria-label={`Ver presupuesto #${presupuesto.numero}`}
                        onClick={() => onVer(presupuesto)}
                      >
                        Ver
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        disabled={
                          duplicando ||
                          copiandoOtro ||
                          facturandoId !== null ||
                          eliminandoId !== null
                        }
                        aria-label={`Duplicar presupuesto #${presupuesto.numero}`}
                        onClick={() => onDuplicar(presupuesto)}
                      >
                        {duplicando ? "Duplicando..." : "Duplicar"}
                      </button>
                      {!facturado ? (
                        <button
                          className="btn btn-ghost btn-sm btn-danger-text"
                          type="button"
                          disabled={
                            eliminando ||
                            eliminandoOtro ||
                            facturandoId !== null ||
                            duplicandoId !== null
                          }
                          aria-label={`Eliminar presupuesto #${presupuesto.numero}`}
                          onClick={() => onEliminar(presupuesto)}
                        >
                          {eliminando ? "Eliminando..." : "Eliminar"}
                        </button>
                      ) : null}
                      {facturado ? (
                        <span className="muted small">Facturado</span>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          disabled={
                            facturandoId !== null ||
                            duplicandoId !== null ||
                            eliminandoId !== null ||
                            rechazado
                          }
                          aria-label={`Facturar presupuesto #${presupuesto.numero}`}
                          title={
                            sinStock
                              ? "No se puede facturar por falta de stock"
                              : undefined
                          }
                          onClick={() => onFacturar(presupuesto)}
                        >
                          {facturando ? "Facturando..." : "Facturar"}
                        </button>
                      )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
