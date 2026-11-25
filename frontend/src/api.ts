import type {
  Articulo,
  Cliente,
  CrearPresupuesto,
  Factura,
  Presupuesto,
  TopArticulo,
} from "./types";

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:5080";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Si el backend no devuelve JSON, dejamos el mensaje generico.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  clientes: () => request<Cliente[]>("/api/clientes"),
  articulos: (busqueda: string) =>
    request<Articulo[]>(
      `/api/articulos${busqueda.trim() ? `?busqueda=${encodeURIComponent(busqueda.trim())}` : ""}`,
    ),
  presupuestos: () => request<Presupuesto[]>("/api/presupuestos"),
  crearPresupuesto: (body: CrearPresupuesto) =>
    request<Presupuesto>("/api/presupuestos", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  facturar: (presupuestoId: number) =>
    request<Factura>(`/api/facturas/facturar/${presupuestoId}`, { method: "POST" }),
  duplicar: (presupuestoId: number) =>
    request<Presupuesto>(`/api/presupuestos/${presupuestoId}/duplicar`, { method: "POST" }),
  reporteTop: (desde: string, hasta: string, top: number) =>
    request<TopArticulo[]>(
      `/api/reportes/top-articulos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&top=${top}`,
    ),
};
