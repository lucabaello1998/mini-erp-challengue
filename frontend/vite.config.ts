import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// El backend tiene CORS habilitado para http://localhost:5173.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
