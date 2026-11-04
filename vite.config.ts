import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// The site is a static SPA on GitHub Pages at https://<user>.github.io/<repo>/.
// PAGES_BASE overrides the path (the deploy workflow sets it from the repo name).
const base = process.env["PAGES_BASE"] ?? "/sahmati/";

export default defineConfig({
  base,
  server: { port: 3000 },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } },
    }),
    viteReact(),
  ],
});
