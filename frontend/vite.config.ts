import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: '0.0.0.0',  // Aceita conexões de qualquer IP da rede
    port: 5173,
    strictPort: true,
    cors: true
  },
  base: "./", // Importante para Electron
  build: {
    outDir: "dist",
    assetsDir: "assets"
  }
});
