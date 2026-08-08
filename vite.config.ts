// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Local HTTPS: `npm run dev:https` (or HTTPS=1 vite dev).
// Microphone / Web Speech APIs require a secure origin, so plain http://192.168.x.x
// (phone on your LAN) silently blocks the mic. Only enabled when HTTPS=1 so the
// Lovable preview/published build is unaffected.
const useHttps = process.env["HTTPS"] === "1";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: useHttps ? { plugins: [basicSsl()] } : {},
});
