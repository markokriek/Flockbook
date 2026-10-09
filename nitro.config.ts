import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  // Bundle dependencies for a portable server without node_modules tracing.
  noExternals: true,
  // Keep server initialization in one chunk to avoid circular middleware imports.
  inlineDynamicImports: true,
  routeRules: {
    "/sw.js": { headers: { "cache-control": "no-cache", "service-worker-allowed": "/" } },
    "/manifest.webmanifest": {
      headers: { "cache-control": "no-cache", "content-type": "application/manifest+json" },
    },
    "/offline.html": { headers: { "cache-control": "no-cache" } },
  },
});
