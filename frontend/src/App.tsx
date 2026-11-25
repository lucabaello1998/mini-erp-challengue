import { useCallback, useEffect, useRef, useState } from "react";
import { api, API_URL } from "./api";
import type { Articulo, Cliente, FormItem, Presupuesto } from "./types";
import { Alert } from "./components/Alert";
import { BudgetDetail } from "./components/BudgetDetail";
import { BudgetForm } from "./components/BudgetForm";
import { BudgetTable } from "./components/BudgetTable";
import { FacturasView } from "./components/FacturasView";
import { ReportView } from "./components/ReportView";

type Vista = "lista" | "alta" | "reporte" | "facturas";

export default function App() {
  const [vista, setVista] = useState<Vista>("lista");
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [verEliminados, setVerEliminados] = useState(false);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [facturandoId, setFacturandoId] = useState<number | null>(null);
  const [duplicandoId, setDuplicandoId] = useState<number | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Presupuesto | null>(null);
  const [detalleCargando, setDetalleCargando] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [validezDias, setValidezDias] = useState(15);
  const [items, setItems] = useState<FormItem[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [cargandoArticulos, setCargandoArticulos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargaId = useRef(0);

  const cargarPresupuestos = useCallback(async (silencioso = false) => {
    const id = ++cargaId.current;
    if (!silencioso) setCargandoLista(true);
    setErrorLista(null);

    try {
      const data = await api.presupuestos(verEliminados);
      if (id === cargaId.current) setPresupuestos(data);
    } catch (error) {
      if (id === cargaId.current) {
        setErrorLista(
          error instanceof Error ? error.message : "No se pudieron cargar los presupuestos.",
        );
      }
    } finally {
      if (id === cargaId.current) setCargandoLista(false);
    }
  }, [verEliminados]);

  const cargarClientes = useCallback(async () => {
    try {
      setClientes(await api.clientes());
    } catch (error) {
      setErrorForm(error instanceof Error ? error.message : "No se pudieron cargar los clientes.");
    }
  }, []);

  useEffect(() => {
    void cargarPresupuestos();
  }, [cargarPresupuestos]);

  useEffect(() => {
    void cargarClientes();
  }, [cargarClientes]);

  useEffect(() => {
    if (vista !== "alta") return;

    let cancelado = false;
    setCargandoArticulos(true);

    const timer = window.setTimeout(async () => {
      try {
        const data = await api.articulos(busqueda);
        if (!cancelado) {
          setArticulos(data);
          setErrorForm(null);
        }
      } catch (error) {
        if (!cancelado) {
          setErrorForm(
            error instanceof Error ? error.message : "No se pudieron cargar los artículos.",
          );
        }
      } finally {
        if (!cancelado) setCargandoArticulos(false);
      }
    }, 250);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [vista, busqueda]);

  const abrirAlta = () => {
    setVista("alta");
    setClienteId(null);
    setValidezDias(15);
    setItems([]);
    setBusqueda("");
    setErrorForm(null);
    setErrorLista(null);
    setAviso(null);
  };

  const agregarArticulo = (articulo: Articulo) => {
    setItems((prev) => {
      const existente = prev.findIndex((item) => item.articulo.id === articulo.id);
      if (existente >= 0) {
        const siguiente = [...prev];
        siguiente[existente] = {
          ...siguiente[existente],
          cantidad: siguiente[existente].cantidad + 1,
        };
        return siguiente;
      }
      return [...prev, { articulo, cantidad: 1, descuentoPct: 0 }];
    });
    setErrorForm(null);
  };

  const cambiarCantidad = (index: number, cantidad: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, cantidad: Math.max(1, Math.floor(cantidad) || 1) }
          : item,
      ),
    );
  };

  const cambiarDescuento = (index: number, descuento: number) => {
    const valor = Number.isFinite(descuento) ? descuento : 0;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, descuentoPct: Math.min(100, Math.max(0, valor)) } : item,
      ),
    );
  };

  const quitarItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const guardar = async () => {
    if (clienteId === null) {
      setErrorForm("Elegí un cliente.");
      return;
    }
    if (items.length === 0) {
      setErrorForm("Agregá al menos un artículo.");
      return;
    }

    setGuardando(true);
    setErrorForm(null);

    try {
      const creado = await api.crearPresupuesto({
        clienteId,
        validezDias,
        items: items.map((item) => ({
          articuloId: item.articulo.id,
          cantidad: item.cantidad,
          descuentoPct: item.descuentoPct,
        })),
      });

      setVista("lista");
      setItems([]);
      setAviso(`Presupuesto #${creado.numero} creado.`);
      await cargarPresupuestos(true);
    } catch (error) {
      setErrorForm(
        error instanceof Error ? error.message : "No se pudo guardar el presupuesto.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const duplicar = async (presupuesto: Presupuesto) => {
    if (facturandoId !== null) return;

    setDuplicandoId(presupuesto.id);
    setErrorLista(null);
    setAviso(null);

    try {
      const copia = await api.duplicar(presupuesto.id);
      setAviso(`Presupuesto #${copia.numero} duplicado.`);
      await cargarPresupuestos(true);
    } catch (error) {
      setErrorLista(
        error instanceof Error ? error.message : "No se pudo duplicar el presupuesto.",
      );
    } finally {
      setDuplicandoId(null);
    }
  };

  const verDetalle = async (presupuesto: Presupuesto) => {
    setDetalle(null);
    setDetalleError(null);
    setDetalleCargando(true);

    try {
      setDetalle(await api.obtenerPresupuesto(presupuesto.id));
    } catch (error) {
      setDetalleError(
        error instanceof Error ? error.message : "No se pudo cargar el detalle.",
      );
    } finally {
      setDetalleCargando(false);
    }
  };

  const cerrarDetalle = () => {
    setDetalle(null);
    setDetalleError(null);
    setDetalleCargando(false);
  };

  const eliminar = async (presupuesto: Presupuesto) => {
    if (!window.confirm(`¿Eliminar el presupuesto #${presupuesto.numero}?`)) return;

    setEliminandoId(presupuesto.id);
    setErrorLista(null);
    setAviso(null);

    try {
      await api.eliminarPresupuesto(presupuesto.id);
      setAviso(`Presupuesto #${presupuesto.numero} eliminado.`);
      if (detalle?.id === presupuesto.id) cerrarDetalle();
      await cargarPresupuestos(true);
    } catch (error) {
      setErrorLista(
        error instanceof Error ? error.message : "No se pudo eliminar el presupuesto.",
      );
    } finally {
      setEliminandoId(null);
    }
  };

  const facturar = async (presupuesto: Presupuesto) => {
    if (duplicandoId !== null) return;

    setFacturandoId(presupuesto.id);
    setErrorLista(null);
    setAviso(null);

    try {
      const factura = await api.facturar(presupuesto.id);
      setAviso(`Factura #${factura.numero} generada para el presupuesto #${presupuesto.numero}.`);
      await cargarPresupuestos(true);
    } catch (error) {
      setErrorLista(
        error instanceof Error ? error.message : "No se pudo facturar el presupuesto.",
      );
    } finally {
      setFacturandoId(null);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">ME</span>
          <div>
            <h1>Mini ERP</h1>
            <p>Presupuestos y facturación</p>
          </div>
        </div>
        <nav className="nav" aria-label="Navegación principal">
          <button
            className={vista === "lista" ? "nav-link active" : "nav-link"}
            type="button"
            onClick={() => {
              setVista("lista");
              setErrorLista(null);
              setAviso(null);
            }}
          >
            Presupuestos
          </button>
          <button
            className={vista === "facturas" ? "nav-link active" : "nav-link"}
            type="button"
            onClick={() => {
              setVista("facturas");
              setErrorLista(null);
              setAviso(null);
            }}
          >
            Facturas
          </button>
          <button
            className={vista === "reporte" ? "nav-link active" : "nav-link"}
            type="button"
            onClick={() => {
              setVista("reporte");
              setErrorLista(null);
              setAviso(null);
            }}
          >
            Reporte
          </button>
          <button className="btn btn-primary" type="button" onClick={abrirAlta}>
            Nuevo presupuesto
          </button>
        </nav>
      </header>

      <main className="container">
        {aviso ? <Alert kind="success">{aviso}</Alert> : null}

        {vista === "lista" ? (
          <section className="page-view">
            <div className="page-head">
              <div>
                <h2>Presupuestos</h2>
                <p className="muted">
                  {presupuestos.length} presupuesto(s)
                  {verEliminados ? " (incluye eliminados)" : ""} · API {API_URL}
                </p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={verEliminados}
                  onChange={(event) => setVerEliminados(event.target.checked)}
                />
                <span>Ver eliminados</span>
              </label>
            </div>

            {errorLista ? <Alert kind="error">{errorLista}</Alert> : null}

            {errorLista && presupuestos.length === 0 ? null : (
              <BudgetTable
                presupuestos={presupuestos}
                cargando={cargandoLista}
                facturandoId={facturandoId}
                duplicandoId={duplicandoId}
                eliminandoId={eliminandoId}
                onFacturar={(presupuesto) => {
                  void facturar(presupuesto);
                }}
                onDuplicar={(presupuesto) => {
                  void duplicar(presupuesto);
                }}
                onEliminar={(presupuesto) => {
                  void eliminar(presupuesto);
                }}
                onVer={(presupuesto) => {
                  void verDetalle(presupuesto);
                }}
              />
            )}
          </section>
        ) : vista === "alta" ? (
          <BudgetForm
            clientes={clientes}
            articulos={articulos}
            busqueda={busqueda}
            cargandoArticulos={cargandoArticulos}
            items={items}
            clienteId={clienteId}
            validezDias={validezDias}
            guardando={guardando}
            error={errorForm}
            onCliente={setClienteId}
            onValidez={setValidezDias}
            onBusqueda={setBusqueda}
            onAgregar={agregarArticulo}
            onCantidad={cambiarCantidad}
            onDescuento={cambiarDescuento}
            onQuitar={quitarItem}
            onGuardar={() => {
              void guardar();
            }}
            onCancelar={() => {
              setVista("lista");
              setErrorForm(null);
            }}
          />
        ) : vista === "reporte" ? (
          <ReportView />
        ) : (
          <FacturasView />
        )}
      </main>

      <footer className="footer">
        <span>Mini ERP · Challenge técnico</span>
        <span>API: {API_URL}</span>
      </footer>

      {detalleCargando || detalle || detalleError ? (
        <BudgetDetail
          presupuesto={detalle}
          cargando={detalleCargando}
          error={detalleError}
          onClose={cerrarDetalle}
        />
      ) : null}
    </div>
  );
}
