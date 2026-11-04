// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// GitHub Pages serves static files only, so that build is a client-side SPA under /<repo>/.
// Set GITHUB_PAGES=1 (the Pages workflow does) to get it; every other build is unchanged.
const pagesBase = process.env["GITHUB_PAGES"]
  ? (process.env["PAGES_BASE"] ?? "/sahmati/")
  : undefined;

export default defineConfig(
  pagesBase
    ? {
        nitro: false,
        vite: { base: pagesBase },
        tanstackStart: {
          server: { entry: "server" },
          spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } },
        },
      }
    : {
        tanstackStart: {
          // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
          // nitro/vite builds from this
          server: { entry: "server" },
        },
      },
);
