import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lineaSuperaStock, presupuestoSinStock } from "./stock";

describe("stock", () => {
  it("detecta una linea que supera el stock", () => {
    assert.equal(lineaSuperaStock(4, 3), true);
    assert.equal(lineaSuperaStock(3, 3), false);
    assert.equal(lineaSuperaStock(1, 3), false);
  });

  it("suma las lineas del mismo articulo antes de comparar", () => {
    assert.equal(
      presupuestoSinStock([
        { articuloId: 1, cantidad: 2, stockActual: 3 },
        { articuloId: 1, cantidad: 2, stockActual: 3 },
      ]),
      true,
    );
  });

  it("no marca falta de stock si cada articulo entra", () => {
    assert.equal(
      presupuestoSinStock([
        { articuloId: 1, cantidad: 2, stockActual: 3 },
        { articuloId: 2, cantidad: 5, stockActual: 10 },
      ]),
      false,
    );
  });
});
