// Builds index.html: one self-contained file with the app, its styles and React inlined.
// Run: npm install, then npm run build.

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const work = mkdtempSync(join(tmpdir(), "fabry-build-"));

// BETA=1 node build.mjs builds a test copy into dist-beta/, for a "beta" folder in the same repository.
// The beta keeps its own saved data and offline copy (keys start with "rdt-beta-"), shows a Beta label,
// and asks search engines not to list it.
const BETA = process.env.BETA === "1";
const OUT = BETA ? "dist-beta" : ".";
if (BETA) mkdirSync(OUT, { recursive: true });
const PREFIX = BETA ? "rdt-beta-" : "fabry-tracker-";
const betaKeys = {
  name: "beta-storage-keys",
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/].*\.(jsx|js)$/ }, (args) => ({
      contents: readFileSync(args.path, "utf8").replace(/(["`])fabry-tracker-/g, "$1rdt-beta-"),
      loader: args.path.endsWith(".jsx") ? "jsx" : "js",
    }));
  },
};

// 1. JavaScript: the app plus React, minified into one script.
const js = await build({
  entryPoints: [existsSync("src/main.jsx") ? "src/main.jsx" : "main.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020", "safari15", "chrome90", "firefox90"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', __BETA__: BETA ? "true" : "false" },
  plugins: BETA ? [betaKeys] : [],
  legalComments: "none",
  write: false,
});
const script = js.outputFiles[0].text
  .replace(/<\/script/gi, "<\\/script")
  .replace(/<!--/g, "<\\!--");

// 2. CSS: only the Tailwind classes the app uses.
const cssIn = join(work, "in.css");
const cssOut = join(work, "out.css");
writeFileSync(cssIn, "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");
execFileSync(process.execPath, [
  require.resolve("tailwindcss/lib/cli.js"),
  "-c", "tailwind.config.cjs", "-i", cssIn, "-o", cssOut, "--minify",
], { stdio: "inherit" });
const css = readFileSync(cssOut, "utf8");
rmSync(work, { recursive: true, force: true });

// 3. A content security policy that only lets the page talk to the services it uses,
// including each health system listed in HEALTH_SYSTEMS in App.jsx.
const appSource = readFileSync(existsSync("src/App.jsx") ? "src/App.jsx" : "App.jsx", "utf8");
const healthOrigins = [...new Set([...appSource.matchAll(/fhirBase:\s*"(https:\/\/[^/"]+)/g)].map((m) => m[1]))];
const scriptHash = createHash("sha256").update(script).digest("base64");
const csp = [
  "default-src 'none'",
  `script-src 'sha256-${scriptHash}'`,
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data: 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  `connect-src 'self' https://eutils.ncbi.nlm.nih.gov https://clinicaltrials.gov https://docs.google.com ${healthOrigins.join(" ")}`,
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const icon = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#123F73"/>' +
  '<polyline points="12,44 24,34 34,38 52,18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<title>My Rare Disease Tracker${BETA ? " (Beta)" : ""}</title>${BETA ? '\n<meta name="robots" content="noindex, nofollow">' : ""}
<meta name="description" content="My Rare Disease Tracker helps people living with rare conditions keep their lab results, treatments and symptoms in one place.">
<meta name="theme-color" content="#03060C">
<meta name="color-scheme" content="light dark">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${BETA ? "My RDT Beta" : "My RD Tracker"}">
<link rel="icon" href="${icon}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Montserrat:wght@500;600&family=Comic+Neue:wght@400;700&display=swap">
<style>${css}
html,body{background:var(--bg,#EEF2F4);margin:0}
body{font-family:'Atkinson Hyperlegible',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink,#1B2B3A)}
</style>
</head>
<body>
<div id="root"></div>
<noscript><p style="padding:24px">My Rare Disease Tracker needs JavaScript. Please turn it on in your browser settings.</p></noscript>
<script>${script}</script>
</body>
</html>
`;

writeFileSync(join(OUT, "index.html"), html);

// 4. Service worker for offline use. Its cache name changes with every build, so phones pick up updates.
const version = createHash("sha256").update(html).digest("hex").slice(0, 12);
writeFileSync(join(OUT, "sw.js"), `// My Rare Disease Tracker offline support. Generated by build.mjs.
const CACHE = "${PREFIX}${version}";
// This worker looks after only the app page in its own folder. Other pages (terms.html, a beta/ folder) are left alone.
const ROOT = new URL("./", self.location).pathname;
const isAppPage = (url) => { const p = new URL(url).pathname; return p === ROOT || p === ROOT + "index.html"; };
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("${PREFIX}") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Only the app's own files are cached. Trial and article searches always go to the network.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    if (!isAppPage(req.url)) return;
    // Newest page when online, saved copy when offline.
    event.respondWith(fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return res; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Translations: newest when online, saved copy when offline.
  const path = new URL(req.url).pathname;
  if (path.startsWith(ROOT + "lang/") || (path.startsWith(ROOT) && path.endsWith(".json") && !path.slice(ROOT.length).includes("/"))) {
    event.respondWith(fetch(req)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`);
// 5. terms.html: the terms of use as a plain web page, from the same text the app shows.
// Its address goes in the "Terms and Conditions Secure URL" field on fhir.epic.com.
{
  const grab = (start, end) => appSource.slice(appSource.indexOf(start), appSource.indexOf(end, appSource.indexOf(start)));
  const { APP_INFO, TERMS } = new Function(
    `${grab("const APP_INFO = {", "\nconst KEY")}\n${grab("const TERMS = {", "\nfunction TermsText")}\nreturn { APP_INFO, TERMS };`
  )();
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<meta name="referrer" content="no-referrer">
<title>Terms of use: ${esc(APP_INFO.name)}</title>
<link rel="icon" href="${icon}">
<style>
:root{--bg:#EEF2F4;--surface:#FFFFFF;--ink:#1B2B3A;--muted:#5B6B7A;--line:#D5DDE3;--accent:#1D5FA8;color-scheme:light dark}
@media (prefers-color-scheme: dark){:root{--bg:#0E171D;--surface:#16232C;--ink:#E4ECF1;--muted:#9DB0BD;--line:#2B3E4B;--accent:#7FB2EA}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 16px 48px}
.app{color:var(--accent);font-weight:700;margin:0 0 8px}
h1{font-size:28px;line-height:1.2;margin:0 0 4px}
.meta{color:var(--muted);margin:0 0 24px}
.box{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px 20px;margin-bottom:24px}
h2{font-size:18px;margin:24px 0 6px}
.box h2{margin-top:0}
ul{padding-left:20px;margin:0}
li{margin-bottom:8px}
p{margin:0 0 10px}
</style>
</head>
<body>
<main>
<p class="app">${esc(APP_INFO.name)}</p>
<h1>Terms of use</h1>
<p class="meta">Version ${esc(TERMS.version)}, effective ${esc(TERMS.effective)}</p>
<section class="box">
<h2>In short</h2>
<ul>
${TERMS.summary.map((t) => `<li>${esc(t)}</li>`).join("\n")}
</ul>
</section>
${TERMS.sections.map((sec) => `<h2>${esc(sec.h)}</h2>\n${sec.p.map((t) => `<p>${esc(t)}</p>`).join("\n")}`).join("\n")}
</main>
</body>
</html>
`;
  writeFileSync(join(OUT, "terms.html"), page);
}

if (BETA) {
  const manifest = JSON.parse(readFileSync("manifest.webmanifest", "utf8"));
  writeFileSync(join(OUT, "manifest.webmanifest"), JSON.stringify({ ...manifest, name: "My Rare Disease Tracker Beta", short_name: "My RDT Beta" }, null, 2) + "\n");
  for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) copyFileSync(f, join(OUT, f));
  // Translations (lang/keys.json and one file per language) go with the beta too.
  if (existsSync("lang")) {
    mkdirSync(join(OUT, "lang"), { recursive: true });
    for (const f of readdirSync("lang").filter((x) => x.endsWith(".json"))) copyFileSync(join("lang", f), join(OUT, "lang", f));
  }
}

// security.txt: tells anyone who finds a security problem where to report it privately (https://securitytxt.org).
if (!BETA) {
  const appSrc = readFileSync("src/App.jsx", "utf8");
  const email = (appSrc.match(/contactEmail: "([^"]+)"/) || [])[1];
  const expires = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10) + "T00:00:00.000Z";
  mkdirSync(".well-known", { recursive: true });
  writeFileSync(join(".well-known", "security.txt"),
    `# My Rare Disease Tracker. Please report security problems privately to the address below.\n` +
    `# Don't include patient health information in your report.\nContact: mailto:${email}\nExpires: ${expires}\nPreferred-Languages: en\n`);
}
console.log(`${BETA ? "BETA " : ""}${OUT}/index.html written: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, sw.js cache ${version}`);
