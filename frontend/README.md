# Mini ERP - Cliente React

Cliente del challenge: lista de presupuestos, alta con búsqueda de artículos y
totales en vivo, facturación con manejo de errores, duplicado, reporte, detalle
y vista de facturas.

## Stack

- Vite + React 19 + TypeScript.
- CSS plano, sin framework.
- Sin router ni store: cuatro vistas con estado local.

## Requisitos

- Node.js **22.13+**. Vite 8 y Vitest 5 ya no soportan Node 18; el README del
  challenge menciona 18+, pero el toolchain actual exige 22.13+ (el CI usa 22).
- El backend tiene que estar en `http://localhost:5080`.

## Cómo correrlo

```bash
cd ..
cd backend/MiniErp.Api
dotnet run
```

Después, en otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abrí `http://localhost:5173`.

## Configuración

La URL del backend sale de `VITE_API_URL` y por defecto es
`http://localhost:5080`. Si cambia, copiá `.env.example` a `.env` y ajustala.

## Build y tests

```bash
npm run build
npm test
```
