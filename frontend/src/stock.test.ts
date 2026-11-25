import { describe, expect, it } from "vitest";
import { lineaSuperaStock, presupuestoSinStock } from "./stock";

describe("stock", () => {
  it("detecta una linea que supera el stock", () => {
    expect(lineaSuperaStock(4, 3)).toBe(true);
    expect(lineaSuperaStock(3, 3)).toBe(false);
    expect(lineaSuperaStock(1, 3)).toBe(false);
  });

  it("suma las lineas del mismo articulo antes de comparar", () => {
    expect(
      presupuestoSinStock([
        { articuloId: 1, cantidad: 2, stockActual: 3 },
        { articuloId: 1, cantidad: 2, stockActual: 3 },
      ]),
    ).toBe(true);
  });

  it("no marca falta de stock si cada articulo entra", () => {
    expect(
      presupuestoSinStock([
        { articuloId: 1, cantidad: 2, stockActual: 3 },
        { articuloId: 2, cantidad: 5, stockActual: 10 },
      ]),
    ).toBe(false);
  });
});
