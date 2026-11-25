import type { Presupuesto } from "../types";
import { formatDate, formatMoney } from "../money";
import { StatusBadge } from "./StatusBadge";

type Props = {
  presupuestos: Presupuesto[];
  cargando: boolean;
  facturandoId: number | null;
  duplicandoId: number | null;
  onFacturar: (presupuesto: Presupuesto) => void;
  onDuplicar: (presupuesto: Presupuesto) => void;
};

export function BudgetTable({
  presupuestos,
  cargando,
  facturandoId,
  duplicandoId,
  onFacturar,
  onDuplicar,
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
              const facturando = facturandoId === presupuesto.id;
              const duplicando = duplicandoId === presupuesto.id;
              const copiandoOtro = duplicandoId !== null && !duplicando;

              return (
                <tr key={presupuesto.id}>
                  <td>
                    <span className="budget-number">#{presupuesto.numero}</span>
                  </td>
                  <td>{formatDate(presupuesto.fecha)}</td>
                  <td>{presupuesto.clienteRazonSocial}</td>
                  <td>
                    <StatusBadge estado={presupuesto.estado} />
                  </td>
                  <td className="numeric">{formatMoney(presupuesto.total)}</td>
                  <td className="actions">
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        disabled={duplicando || copiandoOtro || facturandoId !== null}
                        aria-label={`Duplicar presupuesto #${presupuesto.numero}`}
                        onClick={() => onDuplicar(presupuesto)}
                      >
                        {duplicando ? "Duplicando..." : "Duplicar"}
                      </button>
                      {facturado ? (
                        <span className="muted small">Facturado</span>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          disabled={facturandoId !== null || duplicandoId !== null || rechazado}
                          aria-label={`Facturar presupuesto #${presupuesto.numero}`}
                          onClick={() => onFacturar(presupuesto)}
                        >
                          {facturando ? "Facturando..." : "Facturar"}
                        </button>
                      )}
                    </div>
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
