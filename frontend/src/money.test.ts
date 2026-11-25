import { describe, expect, it } from "vitest";
import { calcularTotales, round2, subtotalLinea } from "./money";

describe("money", () => {
  it("redondea half-up los casos de un centavo", () => {
    expect(round2(4.725)).toBe(4.73);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });

  it("calcula IVA mixto por linea", () => {
    const totales = calcularTotales([
      { cantidad: 10, precioUnitario: 100, descuentoPct: 0, alicuotaIva: 21 },
      { cantidad: 4, precioUnitario: 50, descuentoPct: 0, alicuotaIva: 10.5 },
    ]);

    expect(totales).toEqual({ subtotal: 1200, iva: 231, total: 1431 });
  });

  it("aplica el descuento antes del IVA", () => {
    const totales = calcularTotales([
      { cantidad: 10, precioUnitario: 100, descuentoPct: 10, alicuotaIva: 21 },
    ]);

    expect(totales).toEqual({ subtotal: 900, iva: 189, total: 1089 });
  });

  it("coincide con el ejemplo del README", () => {
    const totales = calcularTotales([
      { cantidad: 1, precioUnitario: 35000, descuentoPct: 0, alicuotaIva: 21 },
      { cantidad: 1, precioUnitario: 4500, descuentoPct: 0, alicuotaIva: 10.5 },
    ]);

    expect(totales.subtotal).toBe(39500);
    expect(totales.iva).toBe(7822.5);
    expect(totales.total).toBe(47322.5);
  });

  it("calcula el subtotal de una linea con descuento", () => {
    expect(subtotalLinea(2, 100, 10)).toBe(180);
  });
});
