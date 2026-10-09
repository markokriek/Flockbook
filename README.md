# Flockbook — Sheep Farm PWA

The existing React/TanStack Start sheep-farm app, with Android, iPhone and iPad home-screen installation support.

See [Hosting and installation](HOSTING-AND-INSTALLATION.md) for deployment, environment variables, device installation and a release checklist. See [Test results](TEST-RESULTS.md) for completed verification and remaining device checks.

## Quick start

Use Node.js 22.22+ supported LTS and npm:

```sh
npm ci
```

Copy `.env.example` to `.env` if needed, and use your existing Supabase project URL and publishable key. The local working copy retains the original `.env`; the distributable ZIP excludes it. Both build-time VITE settings and runtime server settings are required.

```sh
npm run dev -- --port 4173
npm run typecheck
npm run test:pwa
npm run build
node --env-file=.env .output/server/index.mjs
```

Hosting uses `npm start` with environment variables supplied by the host. Serve the full Node application over HTTPS from the root of a domain.

## PWA behavior

- Standalone manifest, Android any/maskable PNG icons, Apple touch icon and mobile metadata.
- Android install prompt where supported, manual Safari installation guidance, and connection notice.
- Static offline landing page; farm records still need internet access. No offline mutation queue or background sync.
- Service-worker updates wait for the user's reload confirmation. No authenticated HTML, farm records or auth responses are stored in the worker cache.
- Mobile navigation wrapping, safe-area padding and readable mobile form text.

## Existing backend

The backend, data model and farm features are preserved. The PWA conversion needs no SQL migration. If setting up a separate Supabase database, use the existing migrations in `supabase/migrations/`, and configure auth/redirect URLs for the new HTTPS domain.

## Stack

React 19, TanStack Start, Vite, Nitro Node server, Tailwind CSS v4, Supabase, Recharts. The supplied npm lockfile was repaired and is canonical for this delivery.