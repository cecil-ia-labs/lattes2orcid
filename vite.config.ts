import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/lattes2orcid/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  build: {
    target: "es2020",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        v2: path.resolve(__dirname, "v2/index.html")
      }
    }
  }
});
