import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

/* GitHub Pages serves a project site from /<repo>/, so assets need that
   prefix. Set BASE_PATH=/ for a user site or a custom domain.

   Two pages: the island at the root, and the original React dashboard
   kept running at /classic/. React is only pulled into the classic chunk. */
export default defineConfig({
  base: process.env.BASE_PATH ?? "/Focus/",
  plugins: [react()],
  build: {
    // three.js is most of the main chunk, and it's one page: splitting buys nothing.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: { main: here("index.html"), classic: here("classic/index.html") },
    },
  },
});
