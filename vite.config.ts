import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Proxy API requests to backend to avoid CORS in development
      "/api": {
        target: "http://localhost:8094",
        changeOrigin: true,
      },
      // Proxy refresh token and other root-level API routes if needed
      "/refresh": {
        target: "http://localhost:8094",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
