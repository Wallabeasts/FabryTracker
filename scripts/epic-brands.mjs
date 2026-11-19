// Makes src/epicBrands.json, the list of Epic health systems the app offers, from Epic's published list.
// Usage: node scripts/epic-brands.mjs <file>
//   <file> is Epic's "R4 Endpoints as a Brands File" (open.epic.com > Endpoints, a FHIR Bundle, .json or .json.gz),
//   or an already-compact { e, b } file. Refresh it every few months: Epic adds health systems often.
// Output: { e: [FHIR base addresses], b: [[name, states, index into e], ...] } sorted by name.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const file = process.argv[2];
if (!file) { console.error("Usage: node scripts/epic-brands.mjs <brands file>"); process.exit(1); }
let raw = readFileSync(file);
if (raw[0] === 0x1f && raw[1] === 0x8b) raw = gunzipSync(raw);
const data = JSON.parse(raw.toString("utf8"));

let out;
if (Array.isArray(data.e) && Array.isArray(data.b)) {
  out = data;
} else {
  const byFull = Object.fromEntries((data.entry || []).map((x) => [x.fullUrl, x.resource]));
  const e = [];
  const index = new Map();
  const b = [];
  (data.entry || []).map((x) => x.resource).filter((r) => r && r.resourceType === "Organization" && !r.partOf).forEach((r) => {
    const ep = (r.endpoint || []).map((z) => byFull[z.reference])
      .find((z) => z && z.status === "active" && /^https:\/\//.test(z.address || ""));
    if (!ep) return;
    const address = ep.address.replace(/\/?$/, "/");
    if (!index.has(address)) { index.set(address, e.length); e.push(address); }
    const states = [...new Set((r.address || []).map((a) => a.state).filter(Boolean))].slice(0, 3).join("/");
    b.push([String(r.name || "").trim(), states, index.get(address)]);
  });
  b.sort((p, q) => p[0].localeCompare(q[0]));
  out = { e, b };
}
// Checks: every brand has a name and a valid secure address. The same name at the same address is listed once,
// with its states combined.
const merged = new Map();
out.b.filter(([name, , i]) => name && typeof out.e[i] === "string" && /^https:\/\/[^\s"']+\/$/.test(out.e[i]))
  .forEach(([name, states, i]) => {
    const key = `${name.toLowerCase()}|${i}`;
    const prev = merged.get(key);
    const all = new Set([...(prev ? prev[1].split("/") : []), ...states.split("/")].filter(Boolean));
    merged.set(key, [prev ? prev[0] : name, [...all].slice(0, 4).join("/"), i]);
  });
out.b = [...merged.values()].sort((p, q) => p[0].localeCompare(q[0]));
writeFileSync("src/epicBrands.json", JSON.stringify(out));
console.log(`src/epicBrands.json: ${out.b.length} health systems, ${out.e.length} addresses`);
