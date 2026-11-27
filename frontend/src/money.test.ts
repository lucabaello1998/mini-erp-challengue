import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularTotales, round2, subtotalLinea } from "./money";

describe("money", () => {
  it("redondea half-up los casos de un centavo", () => {
    assert.equal(round2(4.725), 4.73);
    assert.equal(round2(1.005), 1.01);
    assert.equal(round2(2.675), 2.68);
  });

  it("calcula IVA mixto por linea", () => {
    const totales = calcularTotales([
      { cantidad: 10, precioUnitario: 100, descuentoPct: 0, alicuotaIva: 21 },
      { cantidad: 4, precioUnitario: 50, descuentoPct: 0, alicuotaIva: 10.5 },
    ]);

    assert.deepEqual(totales, { subtotal: 1200, iva: 231, total: 1431 });
  });

  it("aplica el descuento antes del IVA", () => {
    const totales = calcularTotales([
      { cantidad: 10, precioUnitario: 100, descuentoPct: 10, alicuotaIva: 21 },
    ]);

    assert.deepEqual(totales, { subtotal: 900, iva: 189, total: 1089 });
  });

  it("coincide con el ejemplo del README", () => {
    const totales = calcularTotales([
      { cantidad: 1, precioUnitario: 35000, descuentoPct: 0, alicuotaIva: 21 },
      { cantidad: 1, precioUnitario: 4500, descuentoPct: 0, alicuotaIva: 10.5 },
    ]);

    assert.equal(totales.subtotal, 39500);
    assert.equal(totales.iva, 7822.5);
    assert.equal(totales.total, 47322.5);
  });

  it("calcula el subtotal de una linea con descuento", () => {
    assert.equal(subtotalLinea(2, 100, 10), 180);
  });

  it("coincide con el backend en importes grandes", () => {
    const totales = calcularTotales([
      { cantidad: 105995, precioUnitario: 4500, descuentoPct: 33, alicuotaIva: 10.5 },
    ]);

    assert.equal(totales.subtotal, 319574925);
    assert.equal(totales.iva, 33555367.13);
    assert.equal(totales.total, 353130292.13);
  });

  it("redondea el IVA por linea y no sobre la suma", () => {
    const totales = calcularTotales([
      { cantidad: 1, precioUnitario: 0.5, descuentoPct: 0, alicuotaIva: 21 },
      { cantidad: 1, precioUnitario: 0.5, descuentoPct: 0, alicuotaIva: 21 },
    ]);

    // 0,105 por linea redondea a 0,11; sobre la suma (0,21) daria 0,21.
    assert.equal(totales.iva, 0.22);
  });

  // Casos de medio centavo alcanzables con precios de 2 decimales. Aca se
  // prueba calcularTotales (la funcion que usa la UI), no solo round2.
  it("redondea half-up dentro de calcularTotales: 4,725 -> 4,73", () => {
    const totales = calcularTotales([
      { cantidad: 1, precioUnitario: 22.5, descuentoPct: 0, alicuotaIva: 21 },
    ]);

    assert.equal(totales.iva, 4.73);
    assert.equal(totales.total, 27.23);
  });

  it("redondea half-up dentro de calcularTotales: 2,625 -> 2,63", () => {
    const totales = calcularTotales([
      { cantidad: 1, precioUnitario: 25, descuentoPct: 0, alicuotaIva: 10.5 },
    ]);

    assert.equal(totales.iva, 2.63);
    assert.equal(totales.total, 27.63);
  });
});
