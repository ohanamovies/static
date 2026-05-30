import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [vue()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
