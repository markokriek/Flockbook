# Verification results

Verified on 8 October 2026 using Node.js 22.22.0 on Windows.

| Check | Result |
| --- | --- |
| Production build (`npm run build`) | Pass: complete Nitro Node server and public assets generated |
| TypeScript (`npm run typecheck`) | Pass |
| ESLint on changed TypeScript/React files | Pass |
| PWA tests (`npm run test:pwa`) | 4/4 pass |
| Production `/auth` and `/dashboard` responses | HTTP 200; login HTML includes manifest link |
| Manifest, worker, offline page and Apple icon URLs | HTTP 200 with expected MIME types; worker and manifest use `no-cache` |
| Production login screen in Chromium browser | Renders; no captured browser warnings/errors |
| Installation help button | Displays Android and Apple manual installation instructions |
| Phone viewport (390 × 844) and tablet viewport (820 × 1180) | Login/install help fits with no horizontal overflow |
| Offline page in browser | Renders reconnect message and retry link |

The four automated tests verify manifest/icon dimensions, offline navigation fallback without cached authenticated HTML, exclusion of APIs/auth/mutations/cross-origin requests, and explicit worker-update activation with scoped cache cleanup. Service-worker behavior is tested with a simulated worker environment; airplane-mode behavior on physical devices remains a release check.

## Build issues repaired

The supplied npm lockfile did not match `package.json`. It was refreshed; npm is the canonical package manager for this delivery, and the stale Bun lockfile was removed from the output copy.

Windows asynchronous dependency tracing failed during Nitro bundling. The server now bundles dependencies without external tracing. A production smoke test then found a circular split-chunk initialization failure in CSRF middleware. Inlining the server's dynamic imports fixed the HTTP 500 without removing CSRF protection. The client still uses normal code splitting.

The build emits existing warnings about deprecated TanStack `inputValidator` calls, tsconfig-path plugin support and the main client chunk size. These do not prevent building or serving the app.

## Remaining release checks

Physical Android, iPhone and iPad installation and standalone launch have not been tested here. Nor have live login, OAuth redirects, farm CRUD, export, account isolation or a deployed worker upgrade with unsaved form data. No test account was supplied and no live farm records were changed. Follow the checklist in `HOSTING-AND-INSTALLATION.md` using a test account after HTTPS deployment.

This delivery includes an offline reconnect page, not offline farm editing or synchronization. Hosting instructions are included; the app has not been published to a hosting account.
