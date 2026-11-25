export type Cliente = {
  id: number;
  razonSocial: string;
  cuit: string;
  condicionIva: string;
};

export type Articulo = {
  id: number;
  codigo: string;
  descripcion: string;
  precioUnitario: number;
  stockActual: number;
  alicuotaIva: number;
};

export type PresupuestoItem = {
  articuloId: number;
  articuloCodigo: string;
  articuloDescripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
  alicuotaIva: number;
  subtotalLinea: number;
};

export type Presupuesto = {
  id: number;
  numero: number;
  fecha: string;
  clienteId: number;
  clienteRazonSocial: string;
  estado: string;
  validezDias: number;
  items: PresupuestoItem[];
  subtotal: number;
  iva: number;
  total: number;
};

export type Factura = {
  id: number;
  numero: number;
  fecha: string;
  presupuestoId: number;
  subtotal: number;
  iva: number;
  total: number;
};

export type CrearPresupuestoItem = {
  articuloId: number;
  cantidad: number;
  descuentoPct: number;
};

export type CrearPresupuesto = {
  clienteId: number;
  validezDias: number;
  items: CrearPresupuestoItem[];
};

export type FormItem = {
  articulo: Articulo;
  cantidad: number;
  descuentoPct: number;
};

export type TopArticulo = {
  articuloId: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  montoFacturado: number;
  montoConIva: number;
};
