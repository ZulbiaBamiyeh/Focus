import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* GitHub Pages serves a project site from /<repo>/, so assets need that
   prefix. Set BASE_PATH=/ for a user site or a custom domain. */
export default defineConfig({
  base: process.env.BASE_PATH ?? "/Focus/",
  plugins: [react()],
});
