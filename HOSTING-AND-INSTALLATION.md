# Flockbook PWA: hosting and installation

This is a TanStack Start application with a Node server and a Supabase backend. Deploy the whole application; uploading only the public folder to a static host will not run the farm server functions.

## Run locally

Use Node.js 22.22 or a newer supported LTS version and npm. The npm lockfile is the canonical dependency lockfile for this delivery.

```sh
npm ci
```

The working folder retains your original local `.env`. If using the ZIP, copy `.env.example` to `.env` and supply your existing Supabase project URL and publishable key. The ZIP excludes local credentials.

```sh
npm run dev -- --port 4173
```

For production testing:

```sh
npm run typecheck
npm run test:pwa
npm run build
node --env-file=.env .output/server/index.mjs
```

The production server defaults to port 3000. Set `PORT` to change it. Development deliberately does not register the service worker; test installation and offline behavior against the production build. Localhost is allowed for desktop service workers. A phone opening your computer's plain HTTP LAN address needs a trusted HTTPS endpoint for PWA testing.

## Host the app

Use a Node web service or container host that provides HTTPS, environment variables, and a persistent running process. Configure:

| Setting | Value |
| --- | --- |
| Node version | 22.22+ supported LTS |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Network binding | `HOST=0.0.0.0`; use the host's supplied `PORT` |
| Public URL | A stable HTTPS domain, serving the app at `/` |

Set these variables in the host dashboard:

| Variable | When required |
| --- | --- |
| `VITE_SUPABASE_URL` | Build time |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build time |
| `SUPABASE_URL` | Runtime; same project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Runtime; same public key |

Use the public/publishable key, never a service-role or secret key in a `VITE_` variable. The existing farm functions use authenticated requests and row-level security. This PWA change does not require an admin key or database migration. Keep the same backend to retain your data.

The build uses Nitro's `node-server` preset and bundles dependencies into `.output`. On your own server, transfer the entire `.output` folder and run `node .output/server/index.mjs` with the runtime variables set. Put a trusted HTTPS reverse proxy in front of it and configure a process manager to restart it. See [Nitro Node deployment](https://nitro.build/deploy/runtimes/node).

Configure your backend's Auth URL settings with the new HTTPS site URL and allowed redirect URLs for your domain. Email confirmation and OAuth must return to this domain. Google sign-in currently uses Lovable's cloud-auth integration: verify its allowed origins/redirects for the new host, or configure a separate Supabase OAuth integration before relying on Google login. Test email/password login first.

Do not add an SPA catch-all rewrite that replaces `/sw.js`, `/manifest.webmanifest`, `/offline.html`, or `/icons/*` with HTML. Nitro's configuration supplies no-cache headers for the worker and manifest. Preserve those headers through your proxy/CDN; exclude authenticated HTML, auth responses and server functions from shared CDN caching.

## Android installation

1. Open your deployed HTTPS URL in Chrome on Android.
2. Tap **Install Flockbook** if Chrome offers the install prompt. Otherwise use the browser menu → **Install app** or **Add to Home screen**.
3. Confirm and launch **Flockbook** from the home screen.
4. Sign in with your existing farm account.

The browser decides when the automatic prompt is available; the menu is the fallback. See [PWA installation guidance](https://web.dev/learn/pwa/installation).

## iPhone and iPad installation

1. Open your deployed HTTPS URL in Safari, outside another app's embedded browser.
2. Tap **Share** and **Add to Home Screen** (you may need to scroll the share actions).
3. If shown, enable **Open as Web App**.
4. Tap **Add**, then launch **Flockbook** from the home screen.
5. Sign in inside the installed app; its session may be separate from Safari.

Safari uses the Apple touch icon and standalone metadata. Installation does not need an App Store submission. See [Apple's Home Screen instructions](https://support.apple.com/guide/iphone/turn-a-website-into-an-app-iph42ab2f3a7/ios) and [cross-platform installation guidance](https://web.dev/learn/pwa/installation).

## Offline behavior and updates

After one successful online load and service-worker installation, launching offline displays a local reconnect page. An already open app shows a connection notice when the browser reports loss of connectivity. Farm reads, sign-in and writes require the network. There is no offline record editing, saved mutation queue, background sync or push notification support. Unsaved form data may be lost if you close or reload.

The service worker caches only the offline page, manifest and icons. It does not persist farm data, authentication responses or authenticated HTML. Existing session storage and in-memory query behavior remain as in the source app. Browsers can evict the offline cache; it is restored on a later online visit.

An updated worker waits until you select **Update available — reload** and confirm that your work is saved. For releases changing the offline page or icons, increment the cache version in `public/sw.js` before building. Deploy complete builds atomically and keep previously referenced hashed assets available briefly for open tabs. Changes to the app's normal JavaScript and CSS are fetched on a fresh online load.

## Before sharing the production URL

- Check `/auth`, `/dashboard`, `/manifest.webmanifest`, `/sw.js` and all icon URLs over HTTPS; the worker must be JavaScript, not HTML.
- In Chrome DevTools → Application, inspect the manifest and registered service worker. There should be no manifest/icon errors.
- Install on an Android phone, iPhone and iPad; verify the icon, standalone launch, portrait/landscape and safe-area spacing.
- Sign in, load existing data, and verify a reversible record edit and export using your own test account. Sign out and check that another account sees only its own farm.
- Load online, wait for the worker to activate, then enable airplane mode and relaunch: expect the reconnect page. Reconnect and retry.
- Open a form, deploy a release with a new worker cache version, return to the tab, and verify that updating asks before reloading.

See `TEST-RESULTS.md` for checks completed in this delivery and remaining device checks.
