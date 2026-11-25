import type { Articulo } from "../types";
import { formatMoney } from "../money";

type Props = {
  articulos: Articulo[];
  busqueda: string;
  cargando: boolean;
  onBusqueda: (value: string) => void;
  onAgregar: (articulo: Articulo) => void;
};

export function ArticlePicker({ articulos, busqueda, cargando, onBusqueda, onAgregar }: Props) {
  return (
    <section className="card picker">
      <div className="card-head">
        <div>
          <h2>Artículos</h2>
          <p className="muted">Buscá por código o descripción y agregá líneas.</p>
        </div>
        <span className="pill">{cargando ? "Buscando..." : `${articulos.length} resultados`}</span>
      </div>

      <label className="field">
        <span>Buscar artículo</span>
        <input
          type="search"
          value={busqueda}
          onChange={(event) => onBusqueda(event.target.value)}
          placeholder="Ej.: teclado, ART-001..."
          autoFocus
        />
      </label>

      <div className="picker-results" role="list">
        {articulos.length === 0 && !cargando ? (
          <p className="muted empty-inline">No encontramos artículos con esa búsqueda.</p>
        ) : null}

        {articulos.map((articulo) => (
          <div className="picker-row" key={articulo.id} role="listitem">
            <div className="picker-info">
              <div className="picker-title">
                <span className="code">{articulo.codigo}</span>
                <span>{articulo.descripcion}</span>
              </div>
              <div className="picker-meta">
                <span>{formatMoney(articulo.precioUnitario)}</span>
                <span>IVA {articulo.alicuotaIva}%</span>
                <span className={articulo.stockActual === 0 ? "danger-text" : ""}>
                  Stock {articulo.stockActual}
                </span>
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => onAgregar(articulo)}
            >
              Agregar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
