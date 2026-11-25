import type { Articulo, Cliente, FormItem } from "../types";
import { calcularTotales, formatMoney, subtotalLinea } from "../money";
import { lineaSuperaStock } from "../stock";
import { Alert } from "./Alert";
import { ArticlePicker } from "./ArticlePicker";
import { WarningIcon } from "./WarningIcon";

type Props = {
  clientes: Cliente[];
  articulos: Articulo[];
  busqueda: string;
  cargandoArticulos: boolean;
  items: FormItem[];
  clienteId: number | null;
  validezDias: number;
  guardando: boolean;
  error: string | null;
  onCliente: (id: number | null) => void;
  onValidez: (dias: number) => void;
  onBusqueda: (value: string) => void;
  onAgregar: (articulo: Articulo) => void;
  onCantidad: (index: number, cantidad: number) => void;
  onDescuento: (index: number, descuento: number) => void;
  onQuitar: (index: number) => void;
  onGuardar: () => void;
  onCancelar: () => void;
};

export function BudgetForm({
  clientes,
  articulos,
  busqueda,
  cargandoArticulos,
  items,
  clienteId,
  validezDias,
  guardando,
  error,
  onCliente,
  onValidez,
  onBusqueda,
  onAgregar,
  onCantidad,
  onDescuento,
  onQuitar,
  onGuardar,
  onCancelar,
}: Props) {
  const totales = calcularTotales(
    items.map((item) => ({
      cantidad: item.cantidad,
      precioUnitario: item.articulo.precioUnitario,
      descuentoPct: item.descuentoPct,
      alicuotaIva: item.articulo.alicuotaIva,
    })),
  );

  const puedeGuardar = clienteId !== null && items.length > 0 && !guardando;
  const lineasSinStock = items.filter((item) =>
    lineaSuperaStock(item.cantidad, item.articulo.stockActual),
  );

  return (
    <section className="form-layout">
      <div className="form-main">
        <div className="page-head">
          <div>
            <h2>Nuevo presupuesto</h2>
            <p className="muted">Elegí el cliente, armá las líneas y guardá.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={onCancelar}>
            Volver
          </button>
        </div>

        {error ? <Alert kind="error">{error}</Alert> : null}

        {lineasSinStock.length > 0 ? (
          <Alert kind="warning">
            Hay {lineasSinStock.length} línea(s) con cantidad mayor al stock
            disponible. Podés guardar el presupuesto, pero no se va a poder
            facturar hasta reponer stock.
          </Alert>
        ) : null}

        <div className="card form-meta">
          <div className="form-grid">
            <label className="field">
              <span>Cliente</span>
              <select
                value={clienteId ?? ""}
                onChange={(event) =>
                  onCliente(event.target.value ? Number(event.target.value) : null)
                }
              >
                <option value="">Seleccioná un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razonSocial} — {cliente.cuit}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Validez (días)</span>
              <input
                type="number"
                min={1}
                max={365}
                value={validezDias}
                onChange={(event) =>
                  onValidez(
                    Math.min(365, Math.max(1, Math.floor(Number(event.target.value)) || 1)),
                  )
                }
              />
            </label>
          </div>
        </div>

        <section className="card form-lines">
          <div className="card-head">
            <div>
              <h2>Líneas</h2>
              <p className="muted">{items.length} artículo(s)</p>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="empty-inline">Todavía no agregaste artículos.</p>
          ) : (
            <div className="table-wrap">
              <table className="lines-table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Desc.</th>
                    <th className="numeric">Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const subtotal = subtotalLinea(
                      item.cantidad,
                      item.articulo.precioUnitario,
                      item.descuentoPct,
                    );

                    return (
                      <tr key={item.articulo.id}>
                        <td>
                          <div className="line-title">
                            <span className="code">{item.articulo.codigo}</span>
                            <span>{item.articulo.descripcion}</span>
                          </div>
                          <span className="muted small">IVA {item.articulo.alicuotaIva}%</span>
                          {lineaSuperaStock(item.cantidad, item.articulo.stockActual) ? (
                            <span className="line-warning">
                              <WarningIcon />
                              No se puede facturar por falta de stock (hay{" "}
                              {item.articulo.stockActual})
                            </span>
                          ) : (
                            <span className="muted small">
                              Stock {item.articulo.stockActual}
                            </span>
                          )}
                        </td>
                        <td className="numeric">{formatMoney(item.articulo.precioUnitario)}</td>
                        <td>
                          <input
                            className="input-compact"
                            type="number"
                            min={1}
                            step={1}
                            value={item.cantidad}
                            onChange={(event) => onCantidad(index, Number(event.target.value))}
                            aria-label={`Cantidad de ${item.articulo.codigo}`}
                          />
                        </td>
                        <td>
                          <div className="discount-input">
                            <input
                              className="input-compact"
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={item.descuentoPct}
                              onChange={(event) => onDescuento(index, Number(event.target.value))}
                              aria-label={`Descuento de ${item.articulo.codigo}`}
                            />
                            <span>%</span>
                          </div>
                        </td>
                        <td className="numeric">{formatMoney(subtotal)}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => onQuitar(index)}
                            aria-label={`Quitar ${item.articulo.codigo}`}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <aside className="form-side">
        <ArticlePicker
          articulos={articulos}
          busqueda={busqueda}
          cargando={cargandoArticulos}
          onBusqueda={onBusqueda}
          onAgregar={onAgregar}
        />

        <div className="card summary-card">
          <h2>Resumen</h2>
          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(totales.subtotal)}</dd>
            </div>
            <div>
              <dt>IVA</dt>
              <dd>{formatMoney(totales.iva)}</dd>
            </div>
            <div className="total-row">
              <dt>Total</dt>
              <dd>{formatMoney(totales.total)}</dd>
            </div>
          </dl>
          <p className="muted small">
            El backend recalcula los totales al guardar. Esta vista es una previsualización.
          </p>
          <button
            className="btn btn-primary btn-block"
            type="button"
            disabled={!puedeGuardar}
            onClick={onGuardar}
          >
            {guardando ? "Guardando..." : "Guardar presupuesto"}
          </button>
          <button className="btn btn-ghost btn-block" type="button" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </aside>
    </section>
  );
}
