# NOTES

## Bugs encontrados (backend)

### 1. IVA fijo al 21%

**Qué pasaba:** `CalcularTotales` hacía `subtotal * 0.21`, sin mirar la alícuota
de cada artículo. Un presupuesto con ART-001 (21%) y ART-004 (10,5%) daba IVA
252 en vez de 231.

**Por qué:** el cálculo se hacía una sola vez sobre el subtotal total y se
ignoraba `AlicuotaIva` de cada línea.

**Cómo lo resolví:** recorro las líneas, calculo el subtotal con descuento y le
aplico la alícuota de esa línea. El IVA se redondea a 2 decimales **por línea**
y recién después se suma. El subtotal se deja exacto: el enunciado solo pide
redondear el IVA. El DTO del front usa la misma fórmula.

Commit: `95082fe`.

### 2. Stock sin validar

**Qué pasaba:** al facturar se descontaba stock sin chequear si alcanzaba. Se
podía facturar ART-006 (stock 3) con cantidad 4 y el stock quedaba en -1.

**Por qué:** el `foreach` descontaba directo, sin comparar contra
`StockActual`.

**Cómo lo resolví:** agrupo las cantidades por artículo (si el mismo artículo
aparece en dos líneas, sumo antes de validar), cargo los artículos en una sola
consulta y verifico stock antes de tocar nada. Si falta, lanzo
`InvalidOperationException` y el controller devuelve 400. El stock se descuenta
una sola vez, después de validar.

Commit: `8971162`.

### 3. Doble facturación

**Qué pasaba:** un presupuesto se podía facturar dos veces; la segunda
descontaba stock de nuevo y generaba otra factura.

**Por qué:** no se miraba el estado del presupuesto ni si ya existía una
factura.

**Cómo lo resolví:** chequeo `Estado == Facturado` y también
`Facturas.Any(f => f.PresupuestoId == id)` antes de facturar. Como el
`AnyAsync` no es atómico, agregué un índice único en `Factura.PresupuestoId` y
traduzco el `DbUpdateException` a un 400 con el mensaje "ya fue facturado".
También rechazo presupuestos rechazados o vencidos.

Commits: `8971162` y `240a003`.

### 4. El listado ocultaba los borradores

**Qué pasaba:** creabas un presupuesto y no aparecía en la grilla.

**Por qué:** `ListarAsync` filtraba `Estado != Borrador`.

**Cómo lo resolví:** saqué el filtro. El flujo 1 del README pide justamente que
el recién creado aparezca.

Commit: `96ee869`.

### 5. Numeración con `Count + 1`

**Qué pasaba:** el número de presupuesto se calculaba con la cantidad de filas.
Si borrabas un presupuesto, el siguiente podía repetir un número.

**Por qué:** la numeración se derivaba de las filas existentes, no de un
contador propio.

**Cómo lo resolví:** creé una tabla `Secuencia` (nombre + último número). El
número sale de un contador que solo avanza y no depende de que los documentos
sigan existiendo. El contador se inicializa desde el máximo existente para
bases viejas y se persiste en el mismo `SaveChanges` que el presupuesto o la
factura. También puse índices únicos en `Presupuesto.Numero`,
`Factura.Numero` y `Secuencia.Nombre`.

`Max + 1` no alcanzaba: si borrabas el último, reutilizaba ese número. La tabla
de secuencias sí lo evita.

Commit: `d16f19f`.

### 6. Datos inválidos y borrado de facturados

**Qué pasaba:** se podían crear presupuestos con cantidad 0 o negativa, con
descuentos fuera de rango, con un cliente inexistente o sin ítems. También se
podía borrar un presupuesto ya facturado.

**Cómo lo resolví:** validaciones en `CrearAsync` (cliente, ítems, validez,
cantidad y descuento) y en el controller (400 con mensaje). `EliminarAsync`
rechaza presupuestos con factura y, en el resto, hace **borrado lógico**:
cambia el estado a `Eliminado` sin borrar la fila ni los ítems.

Commit: `96ee869`.

## Decisiones del cliente React

- **Vite + React 19 + TypeScript**, CSS plano con variables. Sin Tailwind ni
  librería de componentes: para dos vistas suma más configuración que valor.
- **Sin router ni store global.** Tres vistas (`lista`, `alta` y `reporte`) con
  estado local. No hacía falta React Router ni Zustand para este alcance.
- **Capa de API separada** (`src/api.ts`) con un `fetch` tipado y `ApiError`.
  La URL sale de `VITE_API_URL` y por defecto apunta a
  `http://localhost:5080`.
- **Totales en vivo** (`src/money.ts`) con la misma regla que el backend:
  subtotal exacto por línea, descuento antes del IVA, IVA por alícuota
  redondeado a 2 decimales por línea, total = subtotal + IVA. La UI formatea
  con `Intl.NumberFormat` en ARS. El backend sigue siendo la fuente de verdad;
  la vista es una previsualización.
- **Grilla**: número, fecha, cliente, estado, total y acción Facturar. El botón
  se deshabilita si el presupuesto ya está facturado o rechazado.
- **Alta**: cliente, validez, búsqueda de artículos con debounce de 250 ms,
  alta/incremento de líneas, cantidad, descuento, quitar línea y totales.
- **Errores**: los mensajes del backend (`{ error }`) se muestran en un alert.
  Probé el caso de stock insuficiente y se ve el mensaje sin romper la grilla.
- **Duplicar**: botón en la grilla. Crea un borrador nuevo con número nuevo,
  fecha de hoy y precios/alícuotas actuales (no copia los precios viejos). Se
  puede duplicar un presupuesto facturado; el clon nace en Borrador.
- **Reporte**: vista con rango de fechas y top N. Muestra cantidad, monto neto
  y monto con IVA. El endpoint es
  `GET /api/reportes/top-articulos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&top=5`.
- **Estados del reporte**: rango inválido o top no entero muestran un error y no
  un "Sin facturas" falso; si la API falla se limpian los datos viejos y la
  tabla no queda con datos de un rango anterior.
- **Zona horaria**: la base guarda UTC y el reporte interpreta las fechas como
  hora de Argentina antes de filtrar. El JSON de fechas sale con `Z`.
- **Redondeo**: `round2` usa half-up con normalización a 6 decimales para no
  diferir 1 centavo del backend (caso 4,725).
- **Refresco**: después de crear, facturar o duplicar se refresca en silencio,
  sin desmontar la tabla, y se descartan respuestas viejas.

## Correcciones del gauntlet

- Redondeo de IVA del front corregido para que coincida con el backend.
- Reporte: estados inválidos, error sin datos viejos y refresco sin tapar la
  tabla.
- Zona horaria de negocio (Argentina) y fechas UTC con `Z` en el JSON.
- Numeración concurrente: 400 con mensaje en vez de 500.
- Duplicar inexistente: 404.
- Montos del reporte redondeados a 2 decimales; errores de query con `{ error }`.
- Grilla: no muestra el empty state si falla la API, refresco silencioso,
  aria-labels y guardas entre facturar/duplicar.
- Borrado lógico: estado `Eliminado`, listado filtrado, `GET` 404 y facturación
  rechazada; FK `Restrict` para no borrar facturas en cascada.
- Tests nuevos: duplicar facturado/inexistente, bordes de reporte, exclusión de
  no facturados, suma entre facturas, redondeo, validaciones y regresiones.
- Pulido final: todos los botones Facturar se bloquean mientras hay una factura
  en vuelo; error de fecha/top en español; `Content-Type` solo cuando hay body.
- Aviso no bloqueante de stock: el alta muestra una alerta y una leyenda por
  línea; la grilla marca "Sin stock" con tooltip. El listado incluye
  `stockActual` por ítem y el backend sigue rechazando la facturación.

## Decisiones de negocio y técnicas

| # | Decisión | Por qué |
|---|---|---|
| D1 | Subtotal exacto; IVA redondeado por línea con `AwayFromZero` | Es la regla 2 del enunciado y evita que el front y el back difieran por centavos. |
| D2 | Numeración con tabla `Secuencia`, no con `Max + 1` | Si se borra el último presupuesto, `Max + 1` reutiliza un número ya emitido. |
| D3 | Idempotencia con estado + índice único en `Factura.PresupuestoId` | Un presupuesto se factura una sola vez, incluso con requests concurrentes. |
| D4 | Storage UTC; reporte en zona de negocio Argentina | La UI y el reporte muestran el mismo día aunque la factura se emita a las 22:00. |
| D5 | Duplicar usa precios/alícuotas actuales, número nuevo y estado Borrador | Es la regla del stretch; el original no se toca. |
| D6 | Reporte con rango inclusivo, top 1-50 y monto neto + con IVA | Cubre las dos lecturas de "monto facturado" sin ambigüedad. |
| D7 | Borrado lógico (`Eliminado`) + facturados bloqueados; FK `Restrict` | La fila y los ítems quedan; GET/listado/duplicar/facturar excluyen eliminados. |
| D8 | 404 para inexistente, 400 para datos inválidos, siempre `{ error }` | Contrato HTTP consistente para el front. |
| D9 | Reporte agrupado en memoria | Evita la aritmética decimal de SQLite; alcanza para el volumen del challenge. |
| D10 | Front sin router ni store, con CSS plano | Tres vistas no justifican más dependencias. |
| D11 | Tests provistos intactos; 15 propios de backend + 8 de frontend | Cubren reglas, bordes, redondeo, borrado lógico y regresiones. |
| D12 | CI de backend y frontend en GitHub Actions | El proceso queda verificable en cada push. |
| D13 | Aviso de stock no bloqueante en alta y grilla | El backend sigue siendo la fuente de verdad; el front avisa antes de facturar y no impide guardar. |
| D14 | Detalle, borrado y facturas en el front | El README lista esos endpoints; el front usa `GET /presupuestos/{id}`, `DELETE` y `GET /facturas`. El borrado es lógico, pide confirmación y se bloquea para facturados. |
| D15 | Páginas con grilla sin scroll de página | Shell de altura fija; presupuestos, facturas, reporte y alta scrollean dentro de sus tablas/pickers. |

## Endpoints del stretch

- `POST /api/presupuestos/{id}/duplicar` — clona un presupuesto con número
  nuevo y precios actuales. Devuelve el presupuesto creado.
- `GET /api/reportes/top-articulos?desde=...&hasta=...&top=5` — top N de
  artículos por monto facturado. El rango incluye los dos extremos. Devuelve
  `montoFacturado` (neto) y `montoConIva`.

## Endpoints que usa el front

- `GET /api/clientes`, `GET /api/articulos`, `GET /api/presupuestos`,
  `GET /api/presupuestos/{id}`, `GET /api/facturas`.
- `POST /api/presupuestos`, `DELETE /api/presupuestos/{id}`,
  `POST /api/facturas/facturar/{presupuestoId}`.
- Stretch: `POST /api/presupuestos/{id}/duplicar`,
  `GET /api/reportes/top-articulos`.

## Qué hice y qué dejé afuera

**Hice:** los seis bugs del backend, la idempotencia atómica, 21 tests de
backend (6 provistos + 15 propios) y 8 tests de frontend, todo el must-have del
cliente, el stretch (duplicar + reporte), las correcciones del gauntlet, el
aviso no bloqueante de stock, detalle/borrado/vista de facturas, el shell de
grillas con scroll interno y un CI que corre backend y frontend en cada push.

**Dejé afuera:** tests de componentes/E2E con navegador y una vista de detalle
del presupuesto. La grilla, el alta y el reporte cubren lo pedido; preferí
invertir el tiempo en la verificación contra la API real.

## Cómo usé IA

Usé Claude Code/OpenCode como par, con especificación primero y verificación
contra el artefacto real: `dotnet test`, llamadas HTTP a la API y clicks en el
navegador. No acepté un cambio porque “el agente dijo que estaba bien”.

**Dónde se equivocó o me hizo revisar:**

- El primer fix de numeración fue `Max(Numero) + 1`. Parecía suficiente, pero
  si borrabas el último reutilizaba un número ya emitido. Lo detecté probando
  el flujo 3 del README y lo cambié por la tabla de secuencias.
- La primera versión de la secuencia hacía `SaveChanges` adentro de
  `NumeracionService`. Eso guardaba cambios a mitad de la operación y obligaba
  a ordenar las llamadas. Lo saqué: la secuencia se persiste en el mismo
  `SaveChanges` que el documento.
- El primer cálculo redondeaba el subtotal. El enunciado solo pide redondear el
  IVA; lo corregí y lo dejé documentado acá.
- En el front, la primera prueba de búsqueda parecía no filtrar; era la carrera
  contra el debounce de 250 ms, no un bug.
- El gauntlet encontró que `round2` podía diferir 1 centavo del backend
  (4,725 daba 4,72). Lo corregí con half-up sobre el valor escalado.
- También marcó estados falsos del reporte y el 500 concurrente por numeración;
  los corregí y agregué tests que cubren esos casos.

**Qué acepté:** la estructura de servicios, las validaciones, los tests propios
y el cliente React. **Qué descarté:** el redondeo del subtotal y el `Max + 1`.

## Qué haría con más tiempo / qué falta para producción

- Numeración concurrente atómica: dos POST simultáneos pueden leer el mismo
  contador. El índice único evita duplicados, pero uno de los requests falla.
  Lo resolvería con un `UPSERT ... RETURNING` o una secuencia de base y un
  retry.
- Migraciones de EF en lugar de `EnsureCreated` para evolución de esquema.
- Autenticación/autorización, auditoría y permisos por rol.
- Reserva de stock al aprobar el presupuesto, no solo al facturar.
- Paginación y filtros en la grilla; vista de detalle.
- Tests de integración del frontend y E2E con Playwright.
- Reporte: exportación a CSV/PDF y comparación contra el período anterior.
- Observabilidad: logs estructurados, métricas y trazas.
- Revisión de accesibilidad y de estados de carga/error más finos.

## Cómo correrlo

Backend:

```bash
cd backend/MiniErp.Api
dotnet run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Tests del backend:

```bash
cd backend
dotnet test
```

Tests del frontend:

```bash
cd frontend
npm test
```

Resultado: **21/21 backend + 8/8 frontend** en verde.

> Si la base queda de una corrida anterior, borrá `backend/MiniErp.Api/minierp.db*`
> antes de arrancar: el proyecto usa `EnsureCreated`, no migraciones.
