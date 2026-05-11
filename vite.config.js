import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // During `npm run dev`, proxy /api calls to the local Azure Functions runtime
      // When using `swa start`, the SWA CLI handles this automatically instead.
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
