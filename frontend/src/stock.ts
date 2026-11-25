export type ItemConStock = {
  articuloId: number;
  cantidad: number;
  stockActual: number;
};

export function lineaSuperaStock(cantidad: number, stockActual: number): boolean {
  return cantidad > stockActual;
}

export function presupuestoSinStock(items: ItemConStock[]): boolean {
  const porArticulo = new Map<number, { cantidad: number; stock: number }>();

  for (const item of items) {
    const actual = porArticulo.get(item.articuloId);
    if (actual) {
      actual.cantidad += item.cantidad;
    } else {
      porArticulo.set(item.articuloId, {
        cantidad: item.cantidad,
        stock: item.stockActual,
      });
    }
  }

  return Array.from(porArticulo.values()).some(
    (item) => item.cantidad > item.stock,
  );
}
