import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://v2.tauri.app/start/frontend/vite/
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],

  resolve: {
    alias: {
      "@": "/src",
    },
  },

  // Evita que o Vite limpe o terminal e esconda erros/logs do Rust
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Ignora o diretório do Rust para não disparar reload em loop
      ignored: ["**/src-tauri/**"],
    },
  },

  // Necessário para builds mobile (iOS/Android) do Tauri
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/epubjs")) return "epubjs";
          if (id.includes("node_modules/framer-motion")) return "framer-motion";
          if (id.includes("node_modules/recharts")) return "recharts";
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router-dom")
          ) {
            return "react-core";
          }
        },
      },
    },
  },
}));
