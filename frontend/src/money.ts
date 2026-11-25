export function round2(value: number): number {
  // Math.round sobre floats puede caer para abajo en casos como 4.725.
  // Escalamos, normalizamos a 6 decimales y recien despues redondeamos
  // half-up, que es lo que hace el backend con decimales.
  const signo = value < 0 ? -1 : 1;
  const escalado = Number((Math.abs(value) * 100).toFixed(6));
  return (signo * Math.round(escalado)) / 100;
}

export function subtotalLinea(cantidad: number, precioUnitario: number, descuentoPct: number): number {
  return cantidad * precioUnitario * (1 - descuentoPct / 100);
}

export function ivaLinea(subtotal: number, alicuotaIva: number): number {
  return round2((subtotal * alicuotaIva) / 100);
}

export function calcularTotales(
  items: Array<{ cantidad: number; precioUnitario: number; descuentoPct: number; alicuotaIva: number }>,
): { subtotal: number; iva: number; total: number } {
  let subtotal = 0;
  let iva = 0;

  for (const item of items) {
    const linea = subtotalLinea(item.cantidad, item.precioUnitario, item.descuentoPct);
    subtotal += linea;
    iva += ivaLinea(linea, item.alicuotaIva);
  }

  return { subtotal, iva, total: subtotal + iva };
}

const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number): string {
  return ars.format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
