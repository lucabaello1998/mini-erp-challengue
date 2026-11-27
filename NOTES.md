# NOTES

## Bugs encontrados (backend)

### 1. IVA fijo al 21%

**Qué pasaba:** `CalcularTotales` hacía `subtotal * 0.21`, sin mirar la alícuota
de cada artículo. En el caso sintético de 10×100 al 21% + 4×50 al 10,5% daba
IVA 252 en vez de 231; con el seed (1×ART-001 + 1×ART-004) daba 8.295 en vez
de 7.822,50.

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

**Por qué:** `CrearAsync` no validaba los datos de entrada y `EliminarAsync`
borraba sin mirar si existía una factura asociada.

**Cómo lo resolví:** validaciones en `CrearAsync` (cliente, ítems, validez,
cantidad y descuento) y en el controller (400 con mensaje). `EliminarAsync`
rechaza presupuestos con factura y, en el resto, hace **borrado lógico**:
cambia el estado a `Eliminado` sin borrar la fila ni los ítems.

Commits: `96ee869` (validaciones y bloqueo de borrado) y `4fd3d3c`
(borrado lógico).

## Decisiones del cliente React

- **Vite + React 19 + TypeScript**, CSS plano con variables. Sin Tailwind ni
  librería de componentes: para cuatro vistas suma más configuración que valor.
- **Sin router ni store global.** Cuatro vistas (`lista`, `alta`, `reporte` y
  `facturas`) con estado local, más un modal de detalle. No hacía falta React
  Router ni Zustand para este alcance.
- **Capa de API separada** (`src/api.ts`) con un `fetch` tipado y `ApiError`.
  La URL sale de `VITE_API_URL` y por defecto apunta a
  `http://localhost:5080`.
- **Totales en vivo** (`src/money.ts`) con la misma regla que el backend:
  subtotal exacto por línea, descuento antes del IVA, IVA por alícuota
  redondeado a 2 decimales por línea, total = subtotal + IVA. La UI formatea
  con `Intl.NumberFormat` en ARS. El backend sigue siendo la fuente de verdad;
  la vista es una previsualización.
- **Grilla**: número, fecha, cliente, estado, total y acciones Ver, Duplicar,
  Eliminar y Facturar. Facturar se deshabilita para rechazados y se reemplaza
  por el estado para facturados; los eliminados no tienen acciones.
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
- **Redondeo**: los totales se calculan con enteros escalados (centavos y puntos
  básicos) y el IVA se redondea half-up por línea; `round2` queda como helper de
  formateo para no diferir 1 centavo del backend (caso 4,725).
- **Refresco**: después de crear, facturar o duplicar se refresca en silencio,
  sin desmontar la tabla, y se descartan respuestas viejas.

## Correcciones de la revisión adversarial

- Redondeo de IVA del front corregido para que coincida con el backend.
- Reporte: estados inválidos, error sin datos viejos y refresco sin tapar la
  tabla.
- Zona horaria de negocio (Argentina) y fechas UTC con `Z` en el JSON.
- Numeración concurrente: 400 con mensaje en vez de 500.
- Duplicar inexistente: 404.
- Montos del reporte redondeados a 2 decimales; errores de query con `{ error }`.
- Grilla: no muestra el empty state si falla la API, refresco silencioso,
  aria-labels y guardas entre facturar/duplicar.
- Borrado lógico: estado `Eliminado`, listado filtrado salvo con
  `?incluirEliminados=true`, `GET` 404 y facturación rechazada; FK `Restrict`
  para no borrar facturas en cascada. En la grilla, el check “Ver eliminados”
  recarga la lista y muestra esas filas en gris, sin acciones.
- Tests nuevos: duplicar facturado/inexistente, bordes de reporte, exclusión de
  no facturados, suma entre facturas, redondeo, validaciones y regresiones.
- Pulido final: todos los botones Facturar se bloquean mientras hay una factura
  en vuelo; error de fecha/top en español; `Content-Type` solo cuando hay body.
- Aviso no bloqueante de stock: el alta muestra una alerta y una leyenda por
  línea; la grilla marca "Sin stock" con tooltip. El listado incluye
  `stockActual` por ítem y el backend sigue rechazando la facturación.
- Revisión adversarial: dos facturas concurrentes de presupuestos distintos podían
  sobrevender el mismo artículo. Agregué token de concurrencia en
  `Articulo.StockActual` y retry con estado fresco; verificado con 6 facturas
  paralelas (todas OK) y con dos que superan el stock (una sola descuenta).
- Contrato 404: GET/duplicar/facturar inexistente devuelven 404 con `{ error }`;
  DELETE sigue siendo idempotente (204).
- Bordes extremos: cantidades que desbordaban `int`, validez `int.MaxValue` y
  fechas de reporte fuera de rango ya no producen 500.
- Totales del front con aritmética entera (centavos/puntos básicos) para que no
  difieran un centavo del `decimal` del backend; test con importe grande.
- Carreras de UI: guardar/cancelar, detalle, búsqueda fallida, filtro "Ver
  eliminados" y estado vacío de Facturas ya no pisan la vista actual.
- Node 18+: Vite 6 y tests con `node:test` + `tsx`. Verificado con Node
  18.20.8; el CI corre Node 18. Se documenta en `frontend/README.md`.

## Decisiones de negocio y técnicas

| # | Decisión | Por qué |
|---|---|---|
| D1 | Subtotal exacto; IVA redondeado por línea con `AwayFromZero` | Es la regla 2 del enunciado y evita que el front y el back difieran por centavos. |
| D2 | Numeración con tabla `Secuencia`, no con `Max + 1` | Si se borra el último presupuesto, `Max + 1` reutiliza un número ya emitido. |
| D3 | Idempotencia con estado + índice único en `Factura.PresupuestoId` | Un presupuesto se factura una sola vez, incluso con requests concurrentes. |
| D4 | Storage UTC; reporte en zona de negocio Argentina | La UI y el reporte muestran el mismo día aunque la factura se emita a las 22:00. |
| D5 | Duplicar usa precios/alícuotas actuales, número nuevo y estado Borrador | Es la regla del stretch; el original no se toca. |
| D6 | Reporte con rango inclusivo, top 1-50 y monto neto + con IVA | Cubre las dos lecturas de "monto facturado" sin ambigüedad. |
| D7 | Borrado lógico (`Eliminado`) + facturados bloqueados; FK `Restrict` | La fila y los ítems quedan; GET/listado/duplicar/facturar excluyen eliminados. `?incluirEliminados=true` los muestra solo en la grilla. |
| D8 | 404 con `{ error }` para GET/duplicar/facturar inexistente; 400 para datos inválidos | Contrato HTTP consistente para el front. DELETE es idempotente y devuelve 204. |
| D9 | Reporte agrupado en memoria | Evita la aritmética decimal de SQLite; alcanza para el volumen del challenge. |
| D10 | Front sin router ni store, con CSS plano | Cuatro vistas no justifican más dependencias. |
| D11 | Tests provistos intactos; 17 propios de backend + 12 de frontend | Cubren reglas, bordes, redondeo, concurrencia, borrado lógico y regresiones. |
| D12 | CI de backend y frontend en GitHub Actions | El proceso queda verificable en cada push. |
| D13 | Aviso de stock no bloqueante en alta y grilla | El backend sigue siendo la fuente de verdad; el front avisa antes de facturar y no impide guardar. |
| D14 | Detalle, borrado y facturas en el front | El README lista esos endpoints; el front usa `GET /presupuestos/{id}`, `DELETE` y `GET /facturas`. El borrado es lógico, pide confirmación y se bloquea para facturados; el check “Ver eliminados” permite auditar sin acciones sobre esas filas. |
| D15 | Páginas con grilla sin scroll de página | Shell de altura fija; presupuestos, facturas, reporte y alta scrollean dentro de sus tablas/pickers. |
| D16 | Token de concurrencia en `Articulo.StockActual` + retry de facturación | Evita la sobreventa si dos facturas consumen el mismo artículo a la vez; el conflicto se reintenta y, si persiste, se informa como 400. |

## Endpoints del stretch

- `POST /api/presupuestos/{id}/duplicar` — clona un presupuesto con número
  nuevo y precios actuales. Devuelve el presupuesto creado.
- `GET /api/reportes/top-articulos?desde=...&hasta=...&top=5` — top N de
  artículos por monto facturado. El rango incluye los dos extremos. Devuelve
  `montoFacturado` (neto) y `montoConIva`.

## Endpoints que usa el front

- `GET /api/clientes`, `GET /api/articulos`,
  `GET /api/presupuestos` (`?incluirEliminados=true` opcional),
  `GET /api/presupuestos/{id}`, `GET /api/facturas`.
- `POST /api/presupuestos`, `DELETE /api/presupuestos/{id}`,
  `POST /api/facturas/facturar/{presupuestoId}`.
- Stretch: `POST /api/presupuestos/{id}/duplicar`,
  `GET /api/reportes/top-articulos`.

## Qué hice y qué dejé afuera

**Hice:** los seis bugs del backend, la idempotencia atómica, 23 tests de
backend (6 provistos + 17 propios) y 12 tests de frontend, todo el must-have del
cliente, el stretch (duplicar + reporte), las correcciones de la revisión
adversarial, el
aviso no bloqueante de stock, detalle/borrado/vista de facturas, el shell de
grillas con scroll interno y un CI que corre backend y frontend en Node 18 en
cada push.

**Dejé afuera / deuda conocida:** tests HTTP/E2E automatizados, retry de altas
concurrentes, migraciones de EF y `presupuestoNumero` en la vista Facturas.
Ninguna bloquea el README; el orden y el porqué están en la sección siguiente.

## Cómo usé IA

Usé OpenCode como par, con especificación primero y verificación
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
- La revisión adversarial encontró que `round2` podía diferir 1 centavo del backend
  (4,725 daba 4,72). Lo corregí con half-up sobre el valor escalado y después
  pasé los totales del front a aritmética entera para que coincidan siempre.
- También marcó estados falsos del reporte. La numeración concurrente sigue
  devolviendo 400 (sin colisiones); queda como deuda de producción.
- La revisión adversarial reprodujo sobreventa con dos facturas simultáneas de
  presupuestos distintos: agregué token de concurrencia en el stock y retry.
- Encontró 500 con cantidades `int.MaxValue`, validez extrema y fechas de
  reporte fuera de rango; los convertí en 400 y agregué tests de borde.
- Marcó carreras de UI al guardar/cancelar, abrir detalle, buscar artículos y
  cambiar "Ver eliminados"; las corregí con IDs de request y refs.

**Qué acepté:** la estructura de servicios, las validaciones, los tests propios
y el cliente React. **Qué descarté:** el redondeo del subtotal y el `Max + 1`.

## Qué haría con más tiempo / qué falta para producción

El challenge pedía priorizar. Cerré must-have + stretch y verifiqué los cinco
flujos contra la API y el navegador. Si tuviera más tiempo, este es el orden:

**Criterio:** primero lo que puede romper dinero, stock o numeración; después el
contrato HTTP; al final comodidad y escala.

### Con 2-3 horas más (deuda del challenge)

1. **Tests HTTP de los cinco flujos** con `WebApplicationFactory` y SQLite
   temporal: POST→GET, IVA mixto, numeración tras borrar, validación 400 y
   stock/doble facturación. Hoy los 23 tests de backend son de servicios; esto
   cubre controllers, DTOs y contrato HTTP, que es donde más se escapa un bug.
2. **Retry de altas concurrentes** en `CrearAsync`/`DuplicarAsync`: si dos POST
   leen el mismo contador, reintentar con estado fresco. Hoy el índice único
   evita duplicados, pero uno recibe 400 “reintentá”. La regla secuencial del
   README ya se cumple; esto mejora disponibilidad.
3. **Facturas con número de presupuesto**: agregar `presupuestoNumero` al
   `FacturaDto` con un join y mostrarlo en la vista. Hoy muestra
   `presupuestoId`; en el flujo normal coincide, pero no está garantizado si se
   migran datos. Es cosmético.
4. **Tests de componente/E2E** con Playwright para alta y facturación. Es lo más
   caro; lo dejaría después de los tests HTTP.

### Para producción (fuera del alcance del challenge)

- **Migraciones de EF** en lugar de `EnsureCreated`, con backup y seed
  idempotente. Es lo primero que cambiaría para no borrar la base al evolucionar
  el esquema.
- **Auth/roles/auditoría**: JWT, permisos por operación y log de quién crea,
  factura o elimina.
- **Numeración concurrente atómica**: `UPDATE ... RETURNING`, secuencia de base
  o retry transparente. El índice único ya evita duplicados, pero un request
  puede fallar.
- **Carrera entre borrado y facturación**: `EliminarAsync` chequea que no haya
  factura y después cambia el estado; si se factura en el medio, el presupuesto
  puede quedar `Eliminado` con una factura emitida. Se resuelve con token de
  concurrencia en `Presupuesto.Estado` o un `UPDATE` condicional por estado.
- **Reserva de stock al aprobar** el presupuesto, no solo al facturar, para
  evitar sobreventa comercial entre presupuestos.
- **Paginación y filtros** en grilla y reporte; índices por fecha/estado. Si el
  reporte crece, agregación en SQL o vista materializada.
- **Observabilidad**: logs estructurados, métricas, trazas, alertas y health
  checks.
- **Operación/seguridad**: rate limiting, validación más estricta, CORS por
  entorno, secretos, HTTPS y backups.
- **UX**: accesibilidad del modal, estados de carga/error más finos, edición o
  anulación de presupuestos y exportación CSV/PDF.
- **Testing**: matriz de CI Node 18/22, contract tests desde OpenAPI y E2E.

### Lo que no haría para este alcance

Microservicios, CQRS/MediatR, AutoMapper, Docker/Kubernetes o Redis: agregan
superficie y configuración sin resolver un problema real del challenge. El
volumen y el dominio no lo justifican.

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

> Node 18+ para Vite 6 y `node:test` + `tsx`. Verificado con Node 18.20.8; el
> CI usa Node 18. El entorno local puede tener una versión más nueva, pero el
> mínimo soportado es 18.

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

Resultado: **23/23 backend + 12/12 frontend** en verde.

> Si la base queda de una corrida anterior, borrá `backend/MiniErp.Api/minierp.db*`
> antes de arrancar: el proyecto usa `EnsureCreated`, no migraciones.
