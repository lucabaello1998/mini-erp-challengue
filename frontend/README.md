# Mini ERP — Cliente React

Cliente del challenge: lista de presupuestos, alta con búsqueda de artículos y
totales en vivo, y facturación con manejo de errores.

## Stack

- Vite + React 19 + TypeScript.
- CSS plano, sin framework.
- Sin router ni store: dos vistas con estado local.

## Cómo correrlo

El backend tiene que estar en `http://localhost:5080`:

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

## Build

```bash
npm run build
```
