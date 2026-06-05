// Builds the PWA index.html from the engine copy:
//   1. Strips any embedded preload API key (must never ship in a public repo).
//   2. Injects PWA <head> tags + a SYNCHRONOUS, pre-boot first-run seed that
//      writes the bundled keyless config into localStorage BEFORE the engine
//      boots (the engine merges sp_state over DEFAULTS at load, so the app comes
//      up already-configured — no fetch, no reload, no race).
//   3. Injects the service-worker registration.
// Idempotent. Run from the repo root: `node scripts/inject-pwa.mjs`
import fs from 'node:fs';

const FILE = 'index.html';
let h = fs.readFileSync(FILE, 'utf8');

// 1) SECURITY: neutralize the engine's KEY_SEEDS preload values so no live key
//    ships in a public repo. Done by PATTERN — we match
//    `seed: '<value>', flag: 'sp_..._seeded...'` and blank the value — so this
//    build script never itself contains a key literal. PWA users enter their own
//    keys in the wizard.
const beforeStrip = h;
h = h.replace(/(seed\s*:\s*)'[^']*'(\s*,\s*flag\s*:\s*'sp_[A-Za-z0-9_]*seeded)/g, "$1''$2");
if (h !== beforeStrip) console.log('Neutralized embedded KEY_SEEDS preload value(s) for public-repo safety.');

// Already injected? Persist any strip, then stop.
if (h.includes('manifest.webmanifest')) {
  fs.writeFileSync(FILE, h);
  console.log('PWA tags already present — strip applied (if any), nothing else to do.');
  process.exit(0);
}

// 2) Embed config.json for the synchronous seed (safe inside <script>).
let cfgEmbed = 'null';
try {
  const raw = fs.readFileSync('config.json', 'utf8');
  JSON.parse(raw);                              // validate
  cfgEmbed = raw.replace(/<\//g, '<\\/');       // avoid an accidental </script>
  console.log('Embedded config.json (' + raw.length + ' bytes) into the first-run seed.');
} catch (e) {
  console.warn('No/invalid config.json — first-run seed will be a no-op.');
}

const headBlock = `
  <!-- PWA (StartPage Mobile) -->
  <meta name="robots" content="noindex, nofollow">
  <link rel="manifest" href="./manifest.webmanifest">
  <meta name="theme-color" content="#0b1220">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="StartPage">
  <link rel="apple-touch-icon" href="./apple-touch-icon-180.png">
  <script>
  /* First-run config seed — SYNCHRONOUS, pre-boot. Writes the bundled keyless
     config into localStorage BEFORE the engine's state-load runs, so the app
     boots already-configured (engine does S = {...DEFAULTS, ...sp_state}). No
     fetch, no reload. Gated by sp_seeded; never clobbers an existing install
     (if sp_state already exists at first paint, we just mark seeded and skip).
     config carries NO keys (keysIncluded:false) — those are entered on-device. */
  (function () {
    try {
      if (localStorage.getItem('sp_seeded')) return;
      if (localStorage.getItem('sp_state')) { localStorage.setItem('sp_seeded', '1'); return; }
      var CFG = ${cfgEmbed};
      if (CFG && typeof CFG === 'object') {
        var st = (CFG.kind === 'startpage-settings' && CFG.state) ? CFG.state : CFG;
        if (st && typeof st === 'object') {
          localStorage.setItem('sp_state', JSON.stringify(st));
          if (typeof CFG.theme === 'string') localStorage.setItem('sp_theme', CFG.theme);
          if (CFG.widgetLayout && typeof CFG.widgetLayout === 'object') localStorage.setItem('sp_widget_layout', JSON.stringify(CFG.widgetLayout));
          if (CFG.caches && typeof CFG.caches === 'object') {
            for (var k in CFG.caches) { var v = CFG.caches[k]; if (typeof v === 'string') { try { localStorage.setItem(k, v); } catch (e) {} } }
          }
        }
      }
      localStorage.setItem('sp_seeded', '1');
    } catch (e) { /* never block boot */ }
  })();
  </script>
`;
const m = h.match(/<head[^>]*>/i);
if (!m) { console.error('ERROR: no <head> tag found'); process.exit(1); }
const at = m.index + m[0].length;
h = h.slice(0, at) + headBlock + h.slice(at);

const swReg = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function (e) { console.warn('SW registration failed', e); });
  });
}
</script>
`;
const bi = h.lastIndexOf('</body>');
h = (bi >= 0) ? h.slice(0, bi) + swReg + h.slice(bi) : h + swReg;

fs.writeFileSync(FILE, h);
console.log('Injected PWA head tags + synchronous first-run seed + service-worker registration.');
