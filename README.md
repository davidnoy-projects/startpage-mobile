# StartPage Mobile (PWA)

An **installable iPhone app** version of the [StartPage dashboard](https://github.com/davidnoy-projects/startpage),
delivered as a **PWA** (Progressive Web App). Same engine, made installable + offline, served free from
**GitHub Pages**. No Mac, no Apple Developer account, no app store.

- **Runs on-device:** after you install it, a service worker caches the whole app, so it launches and
  renders offline. Only live data (prices/AI) needs the network — exactly like the desktop site.
- **Real home-screen icon, full-screen** (no Safari chrome).
- **Keys stay on your phone:** you enter them once on the device (the setup wizard); they live in the
  app's sandboxed storage and are never in this repo and never synced anywhere you don't choose.
- **Data path is unchanged:** it uses your existing **Cloudflare Worker** for market data, just like the
  web dashboard.

## What's here

```
index.html              the dashboard engine (copied from the main repo) + injected PWA tags
wizard.html             first-run setup wizard (enter your keys on the phone)
manifest.webmanifest    makes it installable (name, icons, standalone display)
sw.js                   service worker — caches the app shell for offline; never caches live data
icon-192/512.png, apple-touch-icon-180.png   home-screen icons
scripts/generate-icons.mjs   regenerates the icons (no dependencies)
scripts/inject-pwa.mjs       re-injects the PWA tags after dropping in a fresh engine
```

## Install on your iPhone (once it's published)

1. Open **Safari** (must be Safari on iOS) and go to the published URL:
   `https://davidnoy-projects.github.io/app-35dd4c622d35/`
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch it from the new icon. First run: complete the **setup wizard** to enter your keys + Worker URL.
4. Done. It now runs from the home screen, offline-capable. Pull down to refresh.

> iOS only installs PWAs from **Safari** (not Chrome). The app must be loaded over **https** the first
> time (GitHub Pages is https) — after that it's cached on the device.

## Share with a friend

Send them the URL. They tap Add to Home Screen and run the wizard with their own keys. (No invites, no
accounts — it's just a web page that installs.)

## Update the app

When the dashboard's `index.html` changes, refresh this app:

```sh
# from the repo root, with the latest engine copied in as index.html:
node scripts/inject-pwa.mjs     # re-add the PWA tags (idempotent)
# bump the CACHE name in sw.js (e.g. v1 -> v2) so phones pick up the new shell
git add -A && git commit -m "Update engine" && git push
```

Installed apps pick up the new shell on next launch (the service worker revalidates in the background).

## Regenerate icons

```sh
node scripts/generate-icons.mjs
```

## Notes / limitations vs a native app

- **Face ID:** can be added via WebAuthn/passkeys (triggers Face ID) — not wired in v1; the dashboard's
  Portfolio P&L is already hidden-by-default with a panic-hide, so the over-the-shoulder case is covered.
- **Push:** installed PWAs support web push on iOS 16.4+ (for the Alerts feature) — not wired in v1.
- **Keys** live in the app's local storage (sandboxed to this origin), not the hardware Keychain. Private
  and on-device, but a notch below a native Keychain. Fine for a personal app.

## Why a PWA (not a native app)

A native iPhone app requires a Mac + a paid Apple Developer account ($99/yr) for code signing and
TestFlight. A PWA needs neither and still gives a real on-device home-screen app. See the design docs in
the main dashboard repo under `mobile/` (PRD + HLDs) for the full rationale.
