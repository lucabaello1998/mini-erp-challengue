const ESCALA = 1_000_000; // 6 decimales
const CENTAVOS = 10_000n; // 0.01 expresado en la escala
const CIEN_PORCIENTO_BP = 10_000n; // 100% en puntos basicos (2 decimales)

function aCentavos(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

function aPuntosBasicos(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

function desdeEscala(value: bigint): number {
  return Number(value) / ESCALA;
}

/**
 * Subtotal de una linea en escala 1e-6, sin pasar por floats.
 * cantidad x precio x (1 - descuento%) con precio en centavos y descuento en
 * puntos basicos. El resultado ya queda en la misma escala que usa el backend
 * decimal para precios y descuentos de 2 decimales.
 */
function subtotalLineaEscala(
  cantidad: number,
  precioUnitario: number,
  descuentoPct: number,
): bigint {
  const precioCentavos = aCentavos(precioUnitario);
  const descuentoBp = aPuntosBasicos(descuentoPct);
  const factor = CIEN_PORCIENTO_BP - descuentoBp;

  return BigInt(cantidad) * precioCentavos * factor;
}

/** IVA de una linea redondeado a 2 decimales, half-up, en escala 1e-6. */
function ivaLineaEscala(lineaEscala: bigint, alicuotaIva: number): bigint {
  const alicuotaBp = aPuntosBasicos(alicuotaIva);
  const numerador = lineaEscala * alicuotaBp;
  const denominador = CIEN_PORCIENTO_BP * CENTAVOS;

  let centavos = numerador / denominador;
  const resto = numerador % denominador;
  if (resto * 2n >= denominador) centavos += 1n;

  return centavos * CENTAVOS;
}

export function round2(value: number): number {
  // Math.round sobre floats puede caer para abajo en casos como 4.725.
  // Escalamos, normalizamos a 6 decimales y recien despues redondeamos
  // half-up, que es lo que hace el backend con decimales.
  const signo = value < 0 ? -1 : 1;
  const escalado = Number((Math.abs(value) * 100).toFixed(6));
  return (signo * Math.round(escalado)) / 100;
}

export function subtotalLinea(
  cantidad: number,
  precioUnitario: number,
  descuentoPct: number,
): number {
  return desdeEscala(subtotalLineaEscala(cantidad, precioUnitario, descuentoPct));
}

export function ivaLinea(subtotal: number, alicuotaIva: number): number {
  return desdeEscala(
    ivaLineaEscala(BigInt(Math.round(subtotal * ESCALA)), alicuotaIva),
  );
}

export function calcularTotales(
  items: Array<{ cantidad: number; precioUnitario: number; descuentoPct: number; alicuotaIva: number }>,
): { subtotal: number; iva: number; total: number } {
  let subtotalEscala = 0n;
  let ivaEscala = 0n;

  for (const item of items) {
    const linea = subtotalLineaEscala(
      item.cantidad,
      item.precioUnitario,
      item.descuentoPct,
    );
    subtotalEscala += linea;
    ivaEscala += ivaLineaEscala(linea, item.alicuotaIva);
  }

  return {
    subtotal: desdeEscala(subtotalEscala),
    iva: desdeEscala(ivaEscala),
    total: desdeEscala(subtotalEscala + ivaEscala),
  };
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
