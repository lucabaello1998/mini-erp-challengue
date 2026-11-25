# Mini ERP - Cliente React

Cliente del challenge: lista de presupuestos, alta con búsqueda de artículos y
totales en vivo, facturación con manejo de errores, duplicado, reporte, detalle
y vista de facturas.

## Stack

- Vite + React 19 + TypeScript.
- CSS plano, sin framework.
- Sin router ni store: cuatro vistas con estado local.

## Requisitos

- Node.js **18+**. Verificado con **Node 18.20.8**: Vite 6, build y tests con
  `node:test` + `tsx`. El CI usa Node 18.
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
