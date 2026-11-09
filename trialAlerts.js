// Clinical trial alerts.
//
// Every two weeks the app asks ClinicalTrials.gov for the trials that are enrolling for the record's condition, the same
// public search the Learn tab already runs. Nothing about the person is sent: not their country, not their city, not
// their location. The phone itself picks out the trials with a site in the person's country, finds the closest site,
// and remembers which trials it has already shown, so only new ones raise an alert.

export const ALERT_EVERY_DAYS = 14;

// ISO country codes. Names come from the phone (Intl.DisplayNames) so they appear in the app's language.
const CODES = ("AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN " +
  "CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE " +
  "IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR " +
  "MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK " +
  "SL SM SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VA VC VE VN YE ZA ZM ZW").split(" ");

// How ClinicalTrials.gov writes some country names, where they differ from the usual English name.
const CTGOV_NAMES = {
  US: ["United States", "USA"], GB: ["United Kingdom", "UK"], KR: ["Korea, Republic of", "South Korea"],
  KP: ["Korea, Democratic People's Republic of"], RU: ["Russian Federation", "Russia"], IR: ["Iran, Islamic Republic of", "Iran"],
  TR: ["Turkey", "Türkiye"], CZ: ["Czechia", "Czech Republic"], VN: ["Vietnam", "Viet Nam"], TW: ["Taiwan"],
  HK: ["Hong Kong"], MO: ["Macao", "Macau"], MD: ["Moldova, Republic of", "Moldova"], SY: ["Syrian Arab Republic", "Syria"],
  TZ: ["Tanzania", "Tanzania, United Republic of"], BO: ["Bolivia", "Bolivia, Plurinational State of"],
  VE: ["Venezuela", "Venezuela, Bolivarian Republic of"], MK: ["North Macedonia", "Macedonia, The Former Yugoslav Republic of"],
  CI: ["Côte D'Ivoire", "Cote d'Ivoire", "Ivory Coast"], CD: ["Congo, The Democratic Republic of the", "Democratic Republic of the Congo"],
  CG: ["Congo", "Republic of the Congo"], PS: ["Palestinian Territory, occupied", "Palestine"], MM: ["Myanmar", "Burma"],
  LA: ["Lao People's Democratic Republic", "Laos"], BN: ["Brunei Darussalam", "Brunei"], SZ: ["Eswatini", "Swaziland"],
  CV: ["Cabo Verde", "Cape Verde"], VA: ["Holy See (Vatican City State)", "Vatican City"], LY: ["Libya", "Libyan Arab Jamahiriya"],
  RE: ["Réunion", "Reunion"], PR: ["Puerto Rico"], TL: ["Timor-Leste", "East Timor"],
};

const norm = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

let englishNames = null;
function englishName(code) {
  if (!englishNames) {
    try { englishNames = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) { englishNames = { of: (c) => c }; }
  }
  try { return englishNames.of(code) || code; } catch (e) { return code; }
}

// The countries for the picker, sorted by name in the app's language.
export function countryOptions(locale) {
  let dn = null;
  try { dn = new Intl.DisplayNames(locale ? [locale] : undefined, { type: "region" }); } catch (e) { dn = null; }
  const name = (c) => { try { return (dn && dn.of(c)) || englishName(c); } catch (e) { return englishName(c); } };
  return CODES.map((code) => ({ code, name: name(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale || undefined));
}

export const countryName = (code, locale) => {
  if (!code) return "";
  try { return new Intl.DisplayNames(locale ? [locale] : undefined, { type: "region" }).of(code) || englishName(code); } catch (e) { return englishName(code); }
};

const aliasCache = {};
function aliases(code) {
  if (aliasCache[code]) return aliasCache[code];
  const names = [englishName(code), ...(CTGOV_NAMES[code] || [])];
  return (aliasCache[code] = new Set(names.map(norm)));
}

// Whether a country name from ClinicalTrials.gov is the person's country.
export function inCountry(code, ctName) {
  if (!code || !ctName) return false;
  const a = aliases(code);
  const n = norm(ctName);
  return a.has(n) || (n.includes(" ") && String(ctName).includes(",") && a.has(norm(String(ctName).split(",")[0])));
}

const sameText = (a, b) => Boolean(a) && Boolean(b) && norm(a) === norm(b);

// Great-circle distance in kilometres.
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const geoOf = (l) => (l && l.geoPoint && isFinite(l.geoPoint.lat) && isFinite(l.geoPoint.lon) ? { lat: Number(l.geoPoint.lat), lon: Number(l.geoPoint.lon) } : null);

function contactOf(list) {
  const c = (list || []).find((x) => x && (x.phone || x.email)) || null;
  if (!c) return null;
  return {
    name: String(c.name || "").slice(0, 120),
    phone: String(c.phone || "").slice(0, 40) + (c.phoneExt ? ` ext. ${String(c.phoneExt).slice(0, 10)}` : ""),
    email: /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(String(c.email || "")) ? String(c.email).slice(0, 120) : "",
  };
}

// Asks ClinicalTrials.gov for every trial enrolling for this condition. Only the condition is sent.
export async function fetchEnrolling(cond) {
  const all = [];
  let token = "";
  let useFields = true;
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ "query.cond": cond.trials, "filter.overallStatus": "RECRUITING", pageSize: "200", format: "json" });
    if (useFields) q.set("fields", "NCTId,BriefTitle,OverallStatus,ContactsLocationsModule");
    if (token) q.set("pageToken", token);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let res;
    try {
      res = await fetch(`https://clinicaltrials.gov/api/v2/studies?${q.toString()}`, { signal: ctrl.signal });
    } catch (e) {
      throw new Error(e.name === "AbortError" ? "it took too long to answer" : "it couldn't be reached");
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      if (useFields && page === 0) { useFields = false; page--; continue; }
      throw new Error(`status ${res.status}`);
    }
    const json = await res.json();
    for (const st of json.studies || []) {
      const p = st.protocolSection || {};
      const id = p.identificationModule || {};
      const cl = p.contactsLocationsModule || {};
      if (!/^NCT\d{8}$/.test(id.nctId || "")) continue;
      all.push({
        nct: id.nctId,
        title: String(id.briefTitle || "Untitled study").slice(0, 400),
        status: (p.statusModule || {}).overallStatus || "",
        central: contactOf(cl.centralContacts),
        sites: (cl.locations || []).map((l) => ({
          facility: String(l.facility || "").slice(0, 200),
          city: String(l.city || "").slice(0, 100),
          state: String(l.state || "").slice(0, 100),
          zip: String(l.zip || "").slice(0, 20),
          country: String(l.country || "").slice(0, 100),
          status: l.status || "",
          geo: geoOf(l),
          contact: contactOf(l.contacts),
        })),
      });
    }
    token = json.nextPageToken || "";
    if (!token) break;
  }
  return all;
}

// Where the person is, as a point on the map, if the phone can tell: their phone's location if they shared it,
// otherwise a trial site in the same city (sites carry map coordinates), so a typed city works without sending it anywhere.
export function homePoint(where, studies) {
  if (where.near && isFinite(where.near.lat) && isFinite(where.near.lon)) return { lat: where.near.lat, lon: where.near.lon };
  if (!where.city) return null;
  for (const t of studies) {
    for (const s of t.sites) {
      if (s.geo && inCountry(where.country, s.country) && sameText(s.city, where.city) && (!where.area || sameText(s.state, where.area))) return s.geo;
    }
  }
  return null;
}

// The trials enrolling in the person's country, each with its closest site.
export function matchTrials(studies, where) {
  const home = homePoint(where, studies);
  const out = [];
  for (const t of studies) {
    const sites = t.sites.filter((s) => inCountry(where.country, s.country) && (!s.status || s.status === "RECRUITING"));
    if (!sites.length) continue;
    const ranked = sites.map((s) => ({
      ...s,
      km: home && s.geo ? distanceKm(home, s.geo) : null,
      near: (where.city && sameText(s.city, where.city) ? 2 : 0) + (where.area && sameText(s.state, where.area) ? 1 : 0),
    })).sort((a, b) => (a.km !== null && b.km !== null ? a.km - b.km : a.km !== null ? -1 : b.km !== null ? 1 : b.near - a.near || a.city.localeCompare(b.city)));
    const best = ranked[0];
    out.push({
      nct: t.nct,
      title: t.title,
      siteCount: sites.length,
      site: {
        facility: best.facility, city: best.city, state: best.state, country: best.country,
        km: best.km === null ? null : Math.round(best.km),
        contact: best.contact,
      },
      // The study's own contact, for when the site doesn't list one.
      central: best.contact ? null : t.central,
      ranked: Boolean(home) || Boolean(where.area) || Boolean(where.city),
    });
  }
  return out.sort((a, b) => (a.site.km !== null && b.site.km !== null ? a.site.km - b.site.km : a.site.km !== null ? -1 : b.site.km !== null ? 1 : a.title.localeCompare(b.title)));
}

export const daysSince = (isoDate) => (isoDate ? Math.floor((Date.now() - new Date(isoDate).getTime()) / 864e5) : Infinity);
export const alertDue = (watch) => !watch || !watch.lastCheck || daysSince(watch.lastCheck) >= ALERT_EVERY_DAYS;

// Keeps a saved alert list well formed (for backups restored from a file).
export function cleanWatch(w) {
  if (!w || typeof w !== "object") return undefined;
  const str = (v, n = 200) => (typeof v === "string" ? v.slice(0, n) : "");
  const contact = (c) => (c && typeof c === "object" ? { name: str(c.name, 120), phone: str(c.phone, 60), email: str(c.email, 120) } : null);
  return {
    off: Boolean(w.off),
    cond: str(w.cond, 40),
    whereKey: str(w.whereKey, 300),
    lastCheck: str(w.lastCheck, 40),
    seen: (Array.isArray(w.seen) ? w.seen : []).filter((x) => /^NCT\d{8}$/.test(x)).slice(0, 5000),
    unread: (Array.isArray(w.unread) ? w.unread : []).filter((x) => /^NCT\d{8}$/.test(x)).slice(0, 500),
    list: (Array.isArray(w.list) ? w.list : []).filter((t) => t && /^NCT\d{8}$/.test(t.nct)).slice(0, 500).map((t) => ({
      nct: t.nct, title: str(t.title, 400), siteCount: Number(t.siteCount) || 0, found: str(t.found, 20),
      site: t.site && typeof t.site === "object" ? {
        facility: str(t.site.facility), city: str(t.site.city, 100), state: str(t.site.state, 100), country: str(t.site.country, 100),
        km: isFinite(t.site.km) && t.site.km !== null ? Number(t.site.km) : null, contact: contact(t.site.contact),
      } : { facility: "", city: "", state: "", country: "", km: null, contact: null },
      central: contact(t.central),
      ranked: Boolean(t.ranked),
    })),
  };
}
