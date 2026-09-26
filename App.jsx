import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";

// App name and developer details. Edit these to change the About section.
const APP_INFO = {
  name: "Fabry Tracker",
  version: "1.0",
  developers: [
    {
      name: "Eric Wallace, MD",
      role: "Nephrologist, UAB Medicine",
      bio: "Dr. Wallace is a nephrologist who cares for people living with Fabry disease at UAB Medicine. He created Fabry Tracker so patients can keep their results, treatments and symptoms in one place, see how they change over time, and bring that picture to every visit with their care team.",
    },
    {
      name: "Andrew Wallace",
      role: "Developer",
      bio: "Andrew Wallace is Dr. Wallace's son and has a passion for coding, artificial intelligence and robotics.",
    },
  ],
};

const KEY = "fabry-tracker-v1";
const PHRASE_KEY = "fabry-tracker-recent-phrases";
const PREFS_KEY = "fabry-tracker-prefs";

const REDUCED = typeof window !== "undefined" && window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const APP_CSS = `@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap');
${THEME_CSS}
@keyframes fxFadeUp {
  0% { opacity: 0; transform: translateY(36px) scale(0.96); }
  70% { opacity: 1; transform: translateY(-6px) scale(1.01); }
  100% { opacity: 1; transform: none; }
}
@keyframes fxToast {
  0% { opacity: 0; transform: translateY(120px); }
  65% { opacity: 1; transform: translateY(-12px); }
  100% { transform: none; }
}
@keyframes fxPop {
  0% { transform: scale(1); }
  35% { transform: scale(1.35) rotate(-4deg); }
  65% { transform: scale(0.92) rotate(3deg); }
  100% { transform: scale(1); }
}
@keyframes fxLeave { to { opacity: 0; transform: scale(1.12); filter: blur(4px); } }
@keyframes fabryRise {
  0% { opacity: 0; transform: translateY(48px); }
  70% { opacity: 1; transform: translateY(-8px); }
  100% { opacity: 1; transform: none; }
}
@keyframes fxDrop {
  0% { opacity: 0; transform: translateY(-110vh) rotate(-3deg); }
  60% { opacity: 1; transform: translateY(24px) rotate(1deg); }
  78% { transform: translateY(-10px) rotate(0deg); }
  90% { transform: translateY(4px); }
  100% { opacity: 1; transform: none; }
}
.fx-fade { animation: fxFadeUp 550ms cubic-bezier(.2,.9,.3,1.2) both; }
.fx-toast { animation: fxToast 550ms cubic-bezier(.2,.9,.3,1.2) both; }
.fx-pop { animation: fxPop 480ms ease-out; }
.fx-leave { animation: fxLeave 420ms ease-in both; }
.fx-press { transition: transform 160ms cubic-bezier(.3,1.6,.5,1), background-color 250ms ease, color 250ms ease; }
.fx-press:active { transform: scale(0.88); }
@keyframes fxDraw { to { stroke-dashoffset: 0; } }
@keyframes fxDotsIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fxGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.fx-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: fxDraw 1600ms ease-out forwards; }
.fx-dots { animation: fxDotsIn 500ms ease-out 900ms both; }
.fx-grow { transform-box: fill-box; transform-origin: 50% 100%; animation: fxGrow 1200ms cubic-bezier(.2,.9,.3,1.1) both; }
.fx-cascade > * { animation: fxDrop 900ms cubic-bezier(.25,.8,.3,1) both; }
.fx-cascade > *:nth-last-child(1) { animation-delay: 0ms; }
.fx-cascade > *:nth-last-child(2) { animation-delay: 130ms; }
.fx-cascade > *:nth-last-child(3) { animation-delay: 260ms; }
.fx-cascade > *:nth-last-child(4) { animation-delay: 390ms; }
.fx-cascade > *:nth-last-child(5) { animation-delay: 520ms; }
.fx-cascade > *:nth-last-child(6) { animation-delay: 650ms; }
.fx-cascade > *:nth-last-child(7) { animation-delay: 780ms; }
.fx-cascade > *:nth-last-child(8) { animation-delay: 910ms; }
.fx-cascade > *:nth-last-child(9) { animation-delay: 1040ms; }
.fx-cascade > *:nth-last-child(10) { animation-delay: 1170ms; }
.fx-cascade > *:nth-last-child(11) { animation-delay: 1300ms; }
.fx-cascade > *:nth-last-child(12) { animation-delay: 1430ms; }
button, a, label, select { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
@media (prefers-reduced-motion: reduce) {
  .fx-fade, .fx-toast, .fx-pop, .fx-leave, .fabry-rise, .fx-cascade > *, .fx-dots, .fx-grow { animation: none !important; }
  .fx-draw { animation: none !important; stroke-dashoffset: 0; }
  .fx-press { transition: none; }
  .fx-press:active { transform: none; }
}`;

const PHRASES = [
  "Today is full of possibilities. Pick one small thing that makes you smile and do it.",
  "You've got this! Set one simple goal for today and celebrate when you reach it.",
  "Good things are ahead. Treatments for Fabry keep getting better every year.",
  "Call or text someone who makes you laugh today. Joy is good medicine.",
  "Write down one thing you're looking forward to this week, and let yourself get excited about it.",
  "Step outside for a few minutes and notice something beautiful.",
  "Keep asking questions and learning. Knowledge is power, and your future is bright.",
  "Celebrate your wins, big and small. You earned every one of them.",
  "Plan something fun to look forward to, even something simple like a movie night.",
  "Your warmth and energy brighten the people around you.",
  "Try something new this week: a recipe, a song or a hobby. Life is for exploring.",
  "Every day you care for yourself, you're investing in a great tomorrow.",
  "Bring a list of questions to your next visit. You're the captain of your care team.",
  "Find something funny to enjoy today. Laughter lifts the spirit.",
  "Connect with the Fabry community. Sharing your story can brighten someone's day, and yours too.",
  "You're growing stronger in ways you can't always see.",
  "Make today count by doing one kind thing for someone else.",
  "Your dreams still matter. Take one small step toward one of them today.",
  "Gentle movement you enjoy, like a short walk or some stretching, can lift your mood.",
  "Name three good things about today. Gratitude grows happiness.",
  "You bring something special to this world that no one else can.",
  "Keep logging your progress. Every entry helps you and your team plan your best path forward.",
  "Surround yourself with people who cheer you on, and cheer for them too.",
  "Every morning is a fresh start. Today is yours to shape.",
  "Researchers around the world are working on Fabry every day. There's real reason for hope.",
  "Put on a song you love. Music can change your whole day.",
  "Be proud of how far you've come, and excited about where you're going.",
  "Learn one new thing about Fabry this week. The Learn tab is a great place to start.",
  "Share a smile today. It's contagious in the best way.",
  "Make time for something you love today. You deserve to feel good.",
];

// Colors come from theme tokens, so light and dark mode share one set of components.
const THEMES = {
  light: {
    bg: "#EEF2F4", surface: "#FFFFFF", ink: "#1B2B3A", muted: "#5B6B7A", line: "#D5DDE3", accent: "#0F6E78",
    "on-accent": "#FFFFFF", subtle: "#F5F8FA", chip: "#DCE4E9", grid: "#E6EBEF", guide: "#9AA5B1", error: "#B3261E",
    "accent-soft": "#E6F2F3", field: "#FAFBFC", invert: "#1B2B3A", "on-invert": "#FFFFFF", hero: "#0B4F57",
    "hero-text": "#A9D3D6", "hero-sub": "#7FB3B8", shadow: "rgba(27,43,58,0.15)", scrim: "rgba(14,23,29,0.45)", mix: "100%",
  },
  dark: {
    bg: "#0E171D", surface: "#16232C", ink: "#E4ECF1", muted: "#9DB0BD", line: "#2B3E4B", accent: "#5BBAC4",
    "on-accent": "#0E171D", subtle: "#1B2C37", chip: "#22343F", grid: "#22333E", guide: "#6E8494", error: "#FF8A80",
    "accent-soft": "#1D3B41", field: "#111D25", invert: "#E4ECF1", "on-invert": "#0E171D", hero: "#0A3036",
    "hero-text": "#A9D3D6", "hero-sub": "#7FB3B8", shadow: "rgba(0,0,0,0.5)", scrim: "rgba(0,0,0,0.6)", mix: "62%",
  },
};
const vars = (t) => Object.entries(t).map(([k, v]) => `--${k}:${v};`).join("");
export const THEME_CSS = `:root{${vars(THEMES.light)}color-scheme:light}
:root[data-theme="dark"]{${vars(THEMES.dark)}color-scheme:dark}
@media (prefers-color-scheme: dark){:root[data-theme="system"],:root:not([data-theme]){${vars(THEMES.dark)}color-scheme:dark}}
html,body{background:var(--bg);color:var(--ink)}`;

const C = Object.fromEntries(Object.keys(THEMES.light).map((k) => [
  k.replace(/-(\w)/g, (_, ch) => ch.toUpperCase()), `var(--${k})`,
]));
// Data colors (treatments, symptoms) are lightened in dark mode so they stay readable.
const hue = (hex) => `color-mix(in srgb, ${hex} var(--mix), #FFFFFF)`;

const THEME_KEY = "fabry-tracker-theme";
const THEME_OPTIONS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Match device" },
];

const CATEGORIES = [
  { id: "fabry", label: "Fabry specific" },
  { id: "kidney", label: "Kidney" },
  { id: "heart", label: "Heart" },
  { id: "neuro", label: "Neurologic" },
  { id: "gi", label: "Gastrointestinal" },
  { id: "vitamins", label: "Vitamins" },
  { id: "lipids", label: "Lipids" },
];

const METRICS = [
  { id: "gb3", cat: "fabry", label: "Plasma Gb3 (GL-3)", short: "Gb3", unit: "µg/mL" },
  { id: "lysoGb3", cat: "fabry", label: "Lyso-Gb3 (lyso-GL-3)", short: "Lyso-Gb3", unit: "nmol/L" },
  { id: "creatinine", cat: "kidney", label: "Creatinine", short: "Creatinine", unit: "mg/dL", custom: true },
  { id: "heightCm", cat: "kidney", label: "Height", short: "Height", unit: "cm", custom: true },
  { id: "uacr", cat: "kidney", label: "Albumin-to-creatinine ratio (UACR)", short: "UACR", unit: "mg/g", ref: { value: 30, label: "30 mg/g" } },
  { id: "upcr", cat: "kidney", label: "Protein-to-creatinine ratio (UPCR)", short: "UPCR", unit: "mg/g", ref: { value: 150, label: "150 mg/g" } },
  { id: "lvmi", cat: "heart", label: "LV mass index", short: "LVMI", unit: "g/m²" },
  { id: "ivs", cat: "heart", label: "Septum thickness (IVS)", short: "IVS", unit: "mm", ref: { value: 12, label: "12 mm" } },
  { id: "troponin", cat: "heart", label: "Troponin (high-sensitivity)", short: "Troponin", unit: "ng/L" },
  { id: "pain", cat: "neuro", label: "Neuropathic pain (1–10)", short: "Pain", unit: "/10" },
  { id: "fatigue", cat: "neuro", label: "Fatigue (1–10)", short: "Fatigue", unit: "/10" },
  { id: "vitD", cat: "vitamins", label: "Vitamin D (25-hydroxy)", short: "Vitamin D", unit: "ng/mL", ref: { value: 30, label: "30 ng/mL" } },
  { id: "b12", cat: "vitamins", label: "Vitamin B12", short: "B12", unit: "pg/mL", ref: { value: 200, label: "200 pg/mL" } },
  { id: "ldl", cat: "lipids", label: "LDL cholesterol", short: "LDL", unit: "mg/dL" },
];

// Region and units. Results are always saved in U.S. units; the Europe setting converts them
// for display, entry and export, so switching regions never changes saved data.
const REGION_KEY = "fabry-tracker-region";
const REGIONS = [
  { id: "us", label: "United States", units: "mg/dL, mg/g, ng/mL" },
  { id: "eu", label: "Europe", units: "µmol/L, mmol/L, mg/mmol" },
];
const EU_UNITS = {
  creatinine: { unit: "µmol/L", f: 88.4, dp: 0 },
  uacr: { unit: "mg/mmol", f: 1 / 8.84, dp: 1, ref: { value: 3, label: "3 mg/mmol" } },
  upcr: { unit: "mg/mmol", f: 1 / 8.84, dp: 1, ref: { value: 15, label: "15 mg/mmol" } },
  vitD: { unit: "nmol/L", f: 2.496, dp: 0, ref: { value: 75, label: "75 nmol/L" } },
  b12: { unit: "pmol/L", f: 0.7378, dp: 0, ref: { value: 148, label: "148 pmol/L" } },
  ldl: { unit: "mmol/L", f: 1 / 38.67, dp: 1 },
};
const roundTo = (v, dp) => { const k = 10 ** dp; return Math.round(v * k) / k; };
function makeUnits(region) {
  const spec = (id) => (region === "eu" && EU_UNITS[id]) || null;
  return {
    region,
    unit: (m) => (spec(m.id) ? spec(m.id).unit : m.unit),
    ref: (m) => (spec(m.id) ? spec(m.id).ref : m.ref),
    show: (id, v) => (spec(id) ? roundTo(Number(v) * spec(id).f, spec(id).dp) : Number(v)),
    store: (id, v) => (spec(id) ? roundTo(Number(v) / spec(id).f, 4) : Number(v)),
  };
}
const EUROPE = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE GB UK CH NO IS LI".split(" "));
// First guess at the region: a ?region=eu or ?region=us link, then the browser's language setting.
function guessRegion() {
  try {
    const q = new URLSearchParams(window.location.search).get("region");
    if (q === "eu" || q === "us") return q;
    for (const lang of navigator.languages || [navigator.language]) {
      const country = (String(lang).split("-")[1] || "").toUpperCase();
      if (country) return EUROPE.has(country) ? "eu" : "us";
    }
  } catch (e) { /* fall through */ }
  return "us";
}

const GI = [
  { id: "diarrhea", label: "Diarrhea", color: hue("#B5651D") },
  { id: "constipation", label: "Constipation", color: hue("#4A6FA5") },
];

const localDate = (ms) => {
  const d = new Date(ms);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const daysAgo = (n) => localDate(Date.now() - n * 864e5);

// Which graphs each kind of medicine is marked on.
const CHART_OPTIONS = [
  { id: "egfr", label: "eGFR" },
  { id: "gb3", label: "Plasma Gb3" },
  { id: "lysoGb3", label: "Lyso-Gb3" },
  { id: "uacr", label: "UACR" },
  { id: "upcr", label: "UPCR" },
  { id: "lvmi", label: "LV mass" },
  { id: "ivs", label: "Septum (IVS)" },
  { id: "troponin", label: "Troponin" },
  { id: "symptoms", label: "Pain and fatigue" },
  { id: "gi", label: "Stomach episodes" },
  { id: "vitD", label: "Vitamin D" },
  { id: "b12", label: "Vitamin B12" },
  { id: "ldl", label: "LDL" },
];

const MED_GROUPS = [
  { id: "fabry", label: "Fabry therapies", charts: ["egfr", "gb3", "lysoGb3", "lvmi", "symptoms", "gi"] },
  { id: "kidney", label: "Kidney protection", charts: ["egfr", "uacr", "upcr"] },
  { id: "statin", label: "Cholesterol", charts: ["ldl"] },
  { id: "pain", label: "Nerve pain", charts: ["symptoms"] },
  { id: "custom", label: "Other", charts: [] },
];

const MEDS = [
  { id: "migalastat", group: "fabry", name: "Migalastat (Galafold)", short: "Galafold", color: hue("#C0392B") },
  { id: "agala", group: "fabry", name: "Agalsidase alfa (Replagal)", short: "Replagal", color: hue("#D35400") },
  { id: "agalb", group: "fabry", name: "Agalsidase beta (Fabrazyme)", short: "Fabrazyme", color: hue("#1D5FA8") },
  { id: "pegun", group: "fabry", name: "Pegunigalsidase alfa (Elfabrio)", short: "Elfabrio", color: hue("#B0457A") },
  { id: "trial", group: "fabry", name: "Clinical trial drug", short: "Trial drug", color: hue("#8E44AD") },
  { id: "acei", group: "kidney", name: "ACE inhibitor", short: "ACEi", color: hue("#9A6200") },
  { id: "arb", group: "kidney", name: "ARB", short: "ARB", color: hue("#6B4FA0") },
  { id: "sglt2", group: "kidney", name: "SGLT2 inhibitor (dapagliflozin, empagliflozin)", short: "SGLT2i", className: "SGLT2 inhibitor", color: hue("#1F7A5A") },
  { id: "statin", group: "statin", name: "Statin (atorvastatin, rosuvastatin and others)", short: "Statin", className: "Statin", color: hue("#7A5C2E") },
  { id: "gabapentin", group: "pain", name: "Gabapentin", short: "Gabapentin", color: hue("#138D75") },
  { id: "pregabalin", group: "pain", name: "Pregabalin (Lyrica)", short: "Lyrica", color: hue("#2E86C1") },
  { id: "carbamazepine", group: "pain", name: "Carbamazepine", short: "Carbamazepine", color: hue("#A04000") },
  { id: "amitriptyline", group: "pain", name: "Amitriptyline (Elavil)", short: "Elavil", color: hue("#6C3483") },
  { id: "opioid", group: "pain", name: "Opioid (narcotic) pain medicine", short: "Opioid", color: hue("#7B241C") },
  { id: "custom", group: "custom", name: "Other medicine (enter name)", short: "Other", color: hue("#455A64") },
];

const CUSTOM_COLORS = ["#00796B", "#5D4037", "#455A64", "#AD1457", "#283593", "#827717"].map(hue);
const hashIdx = (str, n) => [...String(str)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % n;

// Medicines the app recognizes by generic or brand name, so a drug typed by name is sorted into its class
// (and onto the right graphs) automatically.
const KNOWN_DRUGS = [
  { cls: "statin", generic: "Atorvastatin", names: ["atorvastatin", "lipitor", "atorvaliq"] },
  { cls: "statin", generic: "Rosuvastatin", names: ["rosuvastatin", "crestor", "ezallor"] },
  { cls: "statin", generic: "Simvastatin", names: ["simvastatin", "zocor", "flolipid"] },
  { cls: "statin", generic: "Pravastatin", names: ["pravastatin", "pravachol"] },
  { cls: "statin", generic: "Lovastatin", names: ["lovastatin", "mevacor", "altoprev"] },
  { cls: "statin", generic: "Fluvastatin", names: ["fluvastatin", "lescol"] },
  { cls: "statin", generic: "Pitavastatin", names: ["pitavastatin", "livalo", "zypitamag"] },
  { cls: "statin", generic: "Ezetimibe/simvastatin", names: ["vytorin"] },
  { cls: "statin", generic: "Amlodipine/atorvastatin", names: ["caduet"] },
  { cls: "statin", generic: "Rosuvastatin/ezetimibe", names: ["roszet"] },
  { cls: "sglt2", generic: "Dapagliflozin", names: ["dapagliflozin", "farxiga", "forxiga"] },
  { cls: "sglt2", generic: "Empagliflozin", names: ["empagliflozin", "jardiance"] },
  { cls: "sglt2", generic: "Dapagliflozin/metformin", names: ["xigduo"] },
  { cls: "sglt2", generic: "Dapagliflozin/saxagliptin", names: ["qtern"] },
  { cls: "sglt2", generic: "Empagliflozin/metformin", names: ["synjardy"] },
  { cls: "sglt2", generic: "Empagliflozin/linagliptin", names: ["glyxambi"] },
  { cls: "sglt2", generic: "Empagliflozin/linagliptin/metformin", names: ["trijardy"] },
];
const DRUG_PATTERNS = KNOWN_DRUGS.flatMap((d) => d.names.map((n) => ({ ...d, n, re: new RegExp(`(^|[^a-z])${n}([^a-z]|$)`, "i") })));

// Finds a known drug in free text such as "Lipitor 20mg daily".
// Returns { cls, label, generic, dose } or null. The dose is whatever follows the name.
function classifyDrug(text) {
  const t = String(text || "");
  for (const d of DRUG_PATTERNS) {
    const m = t.match(d.re);
    if (!m) continue;
    const at = m.index + m[1].length;
    const rawAfter = t.slice(at + d.n.length);
    // A partner drug typed as "simvastatin/ezetimibe" or "empagliflozin-linagliptin" belongs in the name, not the dose.
    const combo = d.generic.includes("/") ? null : /^\s*[/+&-]\s*([a-z]{4,})/i.exec(rawAfter);
    const rest = combo ? rawAfter.slice(combo[0].length) : rawAfter;
    const digit = rest.search(/\d/);
    const dose = (digit >= 0 ? rest.slice(digit) : rest.replace(/^[\s,:;()-]+/, "")).trim();
    const generic = combo ? `${d.generic}/${combo[1].toLowerCase()}` : d.generic;
    const brand = d.n === d.generic.toLowerCase() ? "" : d.n.charAt(0).toUpperCase() + d.n.slice(1);
    return { cls: d.cls, generic, label: brand ? `${generic} (${brand})` : generic, dose };
  }
  return null;
}

// A saved medicine as the app should treat it: an "Other" medicine that is really a statin or
// SGLT2 inhibitor is handled as one, including records saved before this was added.
function effectiveMed(m) {
  if (m.med === "custom") {
    const c = classifyDrug(m.customName);
    if (c) return { ...m, med: c.cls, customName: c.label };
  }
  if ((m.med === "statin" || m.med === "sglt2") && !(m.customName || "").trim()) {
    const c = classifyDrug(m.startDose);
    if (c && c.cls === m.med) return { ...m, customName: c.label, startDose: c.dose };
  }
  return m;
}

// Display details for a saved medicine, including trial and custom names.
function medInfo(raw) {
  const m = effectiveMed(raw);
  const d = MEDS.find((x) => x.id === m.med) || { id: m.med, group: "custom", name: m.med, short: m.med, color: C.muted };
  if (d.className) {
    const nm = (m.customName || "").trim();
    return nm ? { ...d, name: `${d.className}: ${nm}`, short: nm.replace(/\s*\(.*\)$/, "") } : { ...d, name: d.className };
  }
  if (m.med === "trial") {
    const nm = (m.customName || "").trim();
    return { ...d, name: nm ? `${nm} (clinical trial)` : d.name, short: nm || d.short };
  }
  if (d.group === "custom") {
    const nm = (m.customName || "").trim() || "Other medicine";
    return { ...d, name: nm, short: nm, color: CUSTOM_COLORS[hashIdx(m.id, CUSTOM_COLORS.length)] };
  }
  return d;
}

const chartsForMed = (raw) => {
  const m = effectiveMed(raw);
  const d = medInfo(m);
  if (d.group === "custom") return m.charts || [];
  return (MED_GROUPS.find((g) => g.id === d.group) || { charts: [] }).charts;
};
const medsFor = (chartId, meds) => meds.filter((m) => chartsForMed(m).includes(chartId));
const chartLabel = (id) => (CHART_OPTIONS.find((c) => c.id === id) || { label: id }).label;

// Works out what the Treatments form will save. Typing a known statin or SGLT2 inhibitor name
// (in the name or dose box) files it under that class, with the dose kept. Fabry therapies and trial drugs are left as chosen.
function resolveMedForm(f) {
  const base = MEDS.find((x) => x.id === f.med) || {};
  if (base.group === "fabry") return { med: f.med, customName: f.customName.trim(), startDose: f.startDose.trim(), recognized: null };
  const fromName = f.med === "custom" ? classifyDrug(f.customName) : null;
  const fromDose = fromName ? null : classifyDrug(f.startDose);
  const c = fromName || fromDose;
  if (!c) return { med: f.med, customName: f.med === "custom" ? f.customName.trim() : "", startDose: f.startDose.trim(), recognized: null };
  const dose = fromName ? (f.startDose.trim() || c.dose) : c.dose;
  return { med: c.cls, customName: c.label, startDose: dose, recognized: c };
}

const EMPTY = { profile: { mutation: "", phenotype: "", birthDate: "", sex: "" }, entries: [], meds: [], events: [] };

const SAMPLE = {
  profile: { mutation: "c.644A>G (p.N215S)", phenotype: "Late-onset", birthDate: "1978-04-12", sex: "Male" },
  events: [300, 290, 284, 270, 262, 240, 231, 215, 190, 176, 150, 122, 95, 60, 33, 12, 4].map((n, i) => ({
    id: "g" + i, date: daysAgo(n), type: i % 3 === 2 ? "constipation" : "diarrhea",
  })),
  entries: [
    ["2019-03-10", 8.2, 210, 380, 14, 128, 5],
    ["2019-11-02", 8.6, 240, 410, null, null, 6],
    ["2020-06-15", 8.9, 185, 350, 14.5, 131, 6],
    ["2021-04-20", 9.1, 170, 320, null, null, 5],
    ["2021-12-08", 6.4, 160, 300, 14, 126, 4],
    ["2022-09-14", 5.8, 140, 270, null, null, 4],
    ["2023-06-01", 5.5, 95, 210, 13.5, 120, 3],
    ["2024-05-22", 5.2, 70, 180, null, null, 3],
    ["2025-06-10", 5.0, 62, 165, 13, 115, 2],
  ].map(([date, lysoGb3, uacr, upcr, ivs, lvmi, pain], i) => ({
    id: "s" + i, date, lysoGb3, uacr, upcr, ivs, lvmi, pain,
    fatigue: [7, 7, 8, 7, 6, 6, 5, 5, 4][i],
    creatinine: [1.10, 1.15, 1.20, 1.24, 1.26, 1.28, 1.29, 1.30, 1.30][i],
    gb3: [5.8, 6.0, 6.1, 6.3, 4.9, 4.4, 4.1, 3.9, 3.8][i],
    troponin: [16, null, 18, null, 17, null, 15, null, 14][i],
    vitD: [21, 24, null, 27, 31, null, 34, 36, 35][i],
    b12: [390, null, 420, null, 405, null, 440, null, 460][i],
    ldl: [138, 132, 127, 121, 115, 108, 99, 94, 90][i],
  })),
  meds: [
    {
      id: "m1", med: "acei", start: "2019-05-01", stop: "", startDose: "Lisinopril 5 mg daily",
      doses: [
        { id: "d1", date: "2020-01-15", dose: "10 mg daily" },
        { id: "d2", date: "2022-03-01", dose: "20 mg daily" },
      ],
    },
    { id: "m2", med: "migalastat", start: "2021-05-15", stop: "", startDose: "123 mg every other day", doses: [] },
    { id: "m3", med: "sglt2", start: "2023-02-01", stop: "", customName: "Dapagliflozin", startDose: "10 mg daily", doses: [] },
    {
      id: "m4", med: "statin", start: "2020-09-01", stop: "", customName: "Atorvastatin", startDose: "20 mg daily",
      doses: [{ id: "d3", date: "2023-08-01", dose: "40 mg daily" }],
    },
    {
      id: "m5", med: "gabapentin", start: "2019-06-01", stop: "", startDose: "300 mg at bedtime",
      doses: [{ id: "d4", date: "2020-01-10", dose: "300 mg three times daily" }],
    },
  ],
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const toT = (d) => Date.parse(d + "T00:00:00");
const today = () => localDate(Date.now());
const fmtTick = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const hasVal = (v) => v !== null && v !== undefined && v !== "";

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function buildCSV(data, units = makeUnits("us")) {
  const rows = [];
  data.entries.forEach((e) => {
    METRICS.forEach((m) => {
      if (hasVal(e[m.id])) rows.push([e.date, "Result", m.label, units.show(m.id, e[m.id]), units.unit(m), ""]);
    });
    const g = calcEGFR(e, data.profile);
    if (g && g.value) rows.push([e.date, "Result", "eGFR", g.value, "mL/min/1.73m²", `calculated, ${g.method}`]);
  });
  data.meds.forEach((m) => {
    const d = medInfo(m);
    rows.push([m.start, "Treatment started", d.name, m.startDose || "", "", ""]);
    (m.doses || []).forEach((dc) => rows.push([dc.date, "Dose changed", d.name, dc.dose, "", ""]));
    if (m.stop) rows.push([m.stop, "Treatment stopped", d.name, "", "", ""]);
  });
  (data.events || []).forEach((e) => {
    const g = GI.find((x) => x.id === e.type);
    rows.push([e.date, "Stomach episode", g ? g.label : e.type, 1, "episode", ""]);
  });
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  const head = [
    [`${APP_INFO.name} export`, "", "", "", "", `Exported ${today()}`],
    ["", "Profile", "Units", units.region === "eu" ? "Europe (SI units)" : "United States", "", ""],
    ["", "Profile", "GLA variant", data.profile.mutation || "", "", ""],
    ["", "Profile", "Phenotype", data.profile.phenotype || "", "", ""],
    ["", "Profile", "Birth date", data.profile.birthDate || "", "", ""],
    ["", "Profile", "Sex", data.profile.sex || "", "", ""],
    ["Date", "Type", "Item", "Value", "Unit", "Notes"],
  ];
  // The leading byte-order mark lets Excel show symbols like µ and ² correctly.
  return "\uFEFF" + [...head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

function tryDownload(text, filename, mime) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    // download blocked; the copy box below still works
  }
}

// ---------- Charts ----------
// Small SVG charts built for this app, so the page needs no chart library.

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setW(Math.round(el.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const tidy = (v) => Number(Number(v).toPrecision(12));

// Evenly spaced, round-number ticks that cover min..max.
function niceTicks(min, max, count = 5) {
  if (!isFinite(min) || !isFinite(max)) return { lo: 0, hi: 1, ticks: [0, 1] };
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / Math.max(1, count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const lo = tidy(Math.floor(min / step) * step);
  const hi = tidy(Math.ceil(max / step) * step);
  const ticks = [];
  for (let i = 0; lo + i * step <= hi + step / 2 && i < 50; i++) ticks.push(tidy(lo + i * step));
  return { lo, hi, ticks };
}

// First-of-month ticks spaced so labels don't crowd.
function timeTicks(t0, t1, maxTicks) {
  const a = new Date(t0);
  const b = new Date(t1);
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const step = [1, 2, 3, 4, 6, 12, 24, 36, 60].find((s) => months / s <= maxTicks) || 120;
  let d;
  if (step >= 12) {
    d = new Date(a.getFullYear() + 1, 0, 1);
  } else {
    d = new Date(a.getFullYear(), a.getMonth() + 1, 1);
    d = new Date(d.getFullYear(), d.getMonth() + ((step - (d.getMonth() % step)) % step), 1);
  }
  const out = [];
  while (d.getTime() <= t1 && out.length < 60) {
    out.push(d.getTime());
    d = new Date(d.getFullYear(), d.getMonth() + step, 1);
  }
  return out;
}

const labelWidth = (text) => String(text).length * 5.9 + 4;

// Gives each treatment label its own row so labels never overlap. Labels that would run
// off the right edge sit to the left of their line. If there is no room at all, only the line shows.
function layoutMarks(marks, left, right, plotH) {
  const maxRows = Math.max(1, Math.floor((plotH - 4) / 12));
  const rows = [];
  return [...marks].sort((a, b) => a.x - b.x).map((m) => {
    let text = m.text;
    let w = labelWidth(text);
    const avail = right - left;
    if (w > avail) {
      text = `${text.slice(0, Math.max(1, Math.floor((avail - 10) / 5.9)))}…`;
      w = labelWidth(text);
    }
    // Beside the line if possible (right side first), otherwise as close as fits inside the chart.
    let start = m.x + 4;
    if (start + w > right) start = m.x - 4 - w;
    if (start < left) start = Math.max(left, Math.min(m.x + 4, right - w));
    const end = start + w;
    let row = rows.findIndex((r) => r.every(([s0, e0]) => end < s0 - 3 || start > e0 + 3));
    if (row === -1 && rows.length < maxRows) { row = rows.length; rows.push([]); }
    if (row !== -1) rows[row].push([start, end]);
    return { ...m, text, lx: start + 2, row };
  });
}

// A vertical treatment marker with its label.
function MarkLine({ top, bottom, mark }) {
  const { x } = mark;
  return (
    <g>
      <line x1={x} x2={x} y1={top} y2={bottom} style={{ stroke: mark.color }} strokeWidth={mark.width}
        strokeDasharray={mark.dash || undefined} />
      {mark.row >= 0 && (
        <text x={mark.lx} y={top + 11 + mark.row * 12} textAnchor="start"
          style={{ fill: mark.color, stroke: C.surface }} fontSize={10} fontWeight={700} strokeWidth={3} paintOrder="stroke">
          {mark.text}
        </text>
      )}
    </g>
  );
}

function ChartLegend({ items }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 text-xs" style={{ color: C.ink }}>
      {items.map((it) => (
        <span key={it.name} className="flex items-center gap-1">
          <span aria-hidden="true" className="inline-block rounded-sm" style={{ width: 12, height: it.bar ? 10 : 3, background: it.color }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

function Tip({ x, width, children }) {
  const boxW = 168;
  const left = Math.max(0, Math.min(x - boxW / 2, width - boxW));
  return (
    <div role="status" className="absolute pointer-events-none px-2 py-1 rounded-md text-xs"
      style={{ left, top: 0, width: boxW, background: C.surface, border: `1px solid ${C.line}`, color: C.ink,
        boxShadow: `0 2px 8px ${C.shadow}` }}>
      {children}
    </div>
  );
}

// Line chart over time. series: [{ key, name, color, points: [{ t, v, ...extra }] }]
function TimeChart({ height = 200, domain, series, yDomain, yTicks, refY, meds = [], formatValue, label }) {
  const marks = medMarks(meds);
  const [wrapRef, width] = useWidth();
  const [hoverT, setHoverT] = useState(null);
  const W = Math.max(width, 120);
  const pad = { top: 10, right: 14, bottom: 24, left: 42 };
  const plotW = W - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const [t0, t1] = domain;
  const x = (t) => pad.left + ((t - t0) / (t1 - t0 || 1)) * plotW;

  const values = series.flatMap((s) => s.points.map((p) => p.v)).filter((v) => isFinite(v));
  let lo;
  let hi;
  let ticks;
  if (yDomain) {
    [lo, hi] = yDomain;
    ticks = yTicks || niceTicks(lo, hi).ticks.filter((v) => v >= lo && v <= hi);
  } else {
    const all = [...values, ...(refY ? [refY.value] : [])];
    const r = niceTicks(Math.min(...all), Math.max(...all));
    lo = r.lo;
    hi = r.hi;
    ticks = r.ticks;
  }
  const y = (v) => pad.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;
  const xTicks = timeTicks(t0, t1, Math.max(2, Math.floor(plotW / 64)));

  const times = [...new Set(series.flatMap((s) => s.points.map((p) => p.t)))].sort((a, b) => a - b);
  const nearest = (px) => times.reduce((best, t) => (Math.abs(x(t) - px) < Math.abs(x(best) - px) ? t : best), times[0]);
  const onPointer = (e) => {
    if (!times.length) return;
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setHoverT(nearest(e.clientX - rect.left));
  };
  const onKey = (e) => {
    if (!times.length) return;
    const i = hoverT === null ? -1 : times.indexOf(hoverT);
    if (e.key === "ArrowRight") { setHoverT(times[Math.min(times.length - 1, i + 1)]); e.preventDefault(); }
    if (e.key === "ArrowLeft") { setHoverT(times[Math.max(0, i < 0 ? times.length - 1 : i - 1)]); e.preventDefault(); }
    if (e.key === "Escape") setHoverT(null);
  };
  const hovered = hoverT === null ? [] : series
    .map((s) => ({ s, p: s.points.find((p) => p.t === hoverT) }))
    .filter((h) => h.p);

  return (
    <div ref={wrapRef} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={W} height={height} role="img" aria-label={label} tabIndex={0} onKeyDown={onKey}
          onBlur={() => setHoverT(null)} style={{ display: "block", overflow: "visible", touchAction: "pan-y" }}>
          {ticks.map((v) => (
            <g key={`y${v}`}>
              <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} style={{ stroke: C.grid }} />
              <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} style={{ fill: C.muted }}>{v}</text>
            </g>
          ))}
          <line x1={pad.left} x2={W - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} style={{ stroke: C.line }} />
          {xTicks.map((t) => {
            const tx = x(t);
            const anchor = tx < pad.left + 18 ? "start" : tx > W - pad.right - 18 ? "end" : "middle";
            return (
              <text key={`x${t}`} x={tx} y={height - 6} textAnchor={anchor} fontSize={11} style={{ fill: C.muted }}>{fmtTick(t)}</text>
            );
          })}
          {refY && refY.value >= lo && refY.value <= hi && (
            <g>
              <line x1={pad.left} x2={W - pad.right} y1={y(refY.value)} y2={y(refY.value)} style={{ stroke: C.guide }} strokeDasharray="4 4" />
              <text x={W - pad.right - 2} y={y(refY.value) + 12 > pad.top + plotH - 2 ? y(refY.value) - 4 : y(refY.value) + 12}
                textAnchor="end" fontSize={10} style={{ fill: C.muted, stroke: C.surface }} strokeWidth={3} paintOrder="stroke">{refY.label}</text>
            </g>
          )}
          {layoutMarks(marks.filter((m) => isFinite(m.t) && m.t >= t0 && m.t <= t1).map((m) => ({ ...m, x: x(m.t) })),
            pad.left, W - pad.right, plotH).map((m) => <MarkLine key={m.id} top={pad.top} bottom={pad.top + plotH} mark={m} />)}
          {series.map((s) => {
            const pts = s.points.filter((p) => isFinite(p.v)).sort((a, b) => a.t - b.t);
            if (!pts.length) return null;
            const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
            return (
              <g key={s.key}>
                {pts.length > 1 && (
                  <path className="fx-draw" d={d} pathLength="1" fill="none" style={{ stroke: s.color }} strokeWidth={2}
                    strokeLinejoin="round" strokeLinecap="round" />
                )}
                <g className="fx-dots">
                  {pts.map((p) => <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={3} style={{ fill: s.color }} />)}
                </g>
              </g>
            );
          })}
          {hoverT !== null && (
            <g pointerEvents="none">
              <line x1={x(hoverT)} x2={x(hoverT)} y1={pad.top} y2={pad.top + plotH} style={{ stroke: C.guide }} />
              {hovered.map(({ s, p }) => (
                <circle key={s.key} cx={x(p.t)} cy={y(p.v)} r={5} style={{ fill: s.color, stroke: C.surface }} strokeWidth={2} />
              ))}
            </g>
          )}
          <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="transparent"
            onPointerDown={onPointer} onPointerMove={onPointer}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") setHoverT(null); }} />
        </svg>
      )}
      {hoverT !== null && hovered.length > 0 && (
        <Tip x={x(hoverT)} width={W}>
          <div className="font-bold">{fmtDate(hoverT)}</div>
          {hovered.map(({ s, p }) => (
            <div key={s.key} style={{ color: s.color }}>
              {series.length > 1 ? `${s.name}: ` : ""}{formatValue ? formatValue(p.v, s, p) : p.v}
            </div>
          ))}
          <TipMeds list={medsOnDate(meds, hoverT)} />
        </Tip>
      )}
    </div>
  );
}

// Stacked monthly bar chart. rows: [{ key, m, [series.key]: count }]
function MonthBarChart({ height = 180, rows, series, meds = [], label }) {
  const marks = medMarks(meds);
  const [wrapRef, width] = useWidth();
  const [hoverI, setHoverI] = useState(null);
  const W = Math.max(width, 120);
  const pad = { top: 10, right: 12, bottom: 24, left: 30 };
  const plotW = W - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const band = plotW / rows.length;
  const totals = rows.map((r) => series.reduce((a, s) => a + (r[s.key] || 0), 0));
  const maxTotal = Math.max(2, ...totals);
  const step = Math.max(1, Math.ceil(maxTotal / 4));
  const top = step * Math.ceil(maxTotal / step);
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const y = (v) => pad.top + (1 - v / top) * plotH;
  const cx = (i) => pad.left + band * (i + 0.5);
  const barW = Math.max(4, band * 0.62);
  const every = band < 26 ? 2 : 1;
  const keyIndex = Object.fromEntries(rows.map((r, i) => [r.key, i]));

  const pick = (e) => {
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - pad.left) / band);
    setHoverI(i >= 0 && i < rows.length ? i : null);
  };
  const onKey = (e) => {
    if (e.key === "ArrowRight") { setHoverI((i) => (i === null ? 0 : Math.min(rows.length - 1, i + 1))); e.preventDefault(); }
    if (e.key === "ArrowLeft") { setHoverI((i) => (i === null ? rows.length - 1 : Math.max(0, i - 1))); e.preventDefault(); }
    if (e.key === "Escape") setHoverI(null);
  };

  return (
    <div ref={wrapRef} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={W} height={height} role="img" aria-label={label} tabIndex={0} onKeyDown={onKey}
          onBlur={() => setHoverI(null)} style={{ display: "block", overflow: "visible", touchAction: "pan-y" }}>
          {ticks.map((v) => (
            <g key={`y${v}`}>
              <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} style={{ stroke: C.grid }} />
              <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} style={{ fill: C.muted }}>{v}</text>
            </g>
          ))}
          <line x1={pad.left} x2={W - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} style={{ stroke: C.line }} />
          {hoverI !== null && (
            <rect x={pad.left + band * hoverI} y={pad.top} width={band} height={plotH} style={{ fill: C.subtle }} />
          )}
          {rows.map((r, i) => {
            let base = 0;
            return (
              <g key={r.key}>
                <g className="fx-grow">
                  {series.map((s) => {
                    const n = r[s.key] || 0;
                    if (!n) return null;
                    const rect = <rect key={s.key} x={cx(i) - barW / 2} y={y(base + n)} width={barW} height={y(base) - y(base + n)} style={{ fill: s.color }} />;
                    base += n;
                    return rect;
                  })}
                </g>
                {i % every === (rows.length - 1) % every && (
                  <text x={cx(i)} y={height - 6} textAnchor="middle" fontSize={11} style={{ fill: C.muted }}>{r.m}</text>
                )}
              </g>
            );
          })}
          {layoutMarks(marks.filter((m) => m.monthKey in keyIndex).map((m) => ({ ...m, x: cx(keyIndex[m.monthKey]) })),
            pad.left, W - pad.right, plotH).map((m) => <MarkLine key={m.id} top={pad.top} bottom={pad.top + plotH} mark={m} />)}
          <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="transparent"
            onPointerDown={pick} onPointerMove={pick}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") setHoverI(null); }} />
        </svg>
      )}
      {hoverI !== null && (
        <Tip x={cx(hoverI)} width={W}>
          <div className="font-bold">{rows[hoverI].full || rows[hoverI].m}</div>
          {series.map((s) => (
            <div key={s.key} style={{ color: s.color }}>{s.name}: {rows[hoverI][s.key] || 0}</div>
          ))}
          <TipMeds list={medsOnDate(meds, (() => {
            const [yy, mm] = rows[hoverI].key.split("-").map(Number);
            return Math.min(Date.now(), new Date(yy, mm, 0).getTime());
          })())} />
        </Tip>
      )}
    </div>
  );
}

// Treatment start, dose-change and stop markers for a chart.
// Treatment start, dose-change and stop markers for a chart. Every marker carries its dose.
function medMarks(meds) {
  return meds.flatMap((raw, i) => {
    const m = effectiveMed(raw);
    const d = medInfo(m);
    const withDose = (dose) => (dose ? `${d.short} ${dose}` : d.short);
    const out = [{ id: `${m.id}s`, date: m.start, text: withDose(m.startDose), color: d.color, width: 1.5, dash: null, row: i }];
    (m.doses || []).forEach((dc) => out.push({
      id: dc.id, date: dc.date, text: withDose(dc.dose), color: d.color, width: 1, dash: "1 3", row: i,
    }));
    if (m.stop) out.push({ id: `${m.id}e`, date: m.stop, text: `${d.short} stop`, color: d.color, width: 1.5, dash: "3 3", row: i });
    return out
      .filter((mk) => typeof mk.date === "string" && mk.date.length >= 7)
      .map((mk) => ({ ...mk, t: toT(mk.date), monthKey: mk.date.slice(0, 7) }));
  });
}

// The dose a medicine was at on a given day: the latest dose change on or before it, else the starting dose.
function doseOn(m, t) {
  const changes = (m.doses || []).filter((dc) => toT(dc.date) <= t).sort((a, b) => toT(a.date) - toT(b.date));
  return changes.length ? changes[changes.length - 1].dose : (m.startDose || "");
}

// Medicines being taken on a given day, each with its dose that day.
function medsOnDate(meds, t) {
  return meds
    .map(effectiveMed)
    .filter((m) => toT(m.start) <= t && (!m.stop || toT(m.stop) >= t))
    .map((m) => {
      const d = medInfo(m);
      const dose = doseOn(m, t);
      return { id: m.id, text: dose ? `${d.short} ${dose}` : d.short, color: d.color };
    });
}

function TipMeds({ list }) {
  if (!list.length) return null;
  return (
    <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
      <div style={{ color: C.muted }}>Taking then:</div>
      {list.map((x) => <div key={x.id} className="font-bold" style={{ color: x.color }}>{x.text}</div>)}
    </div>
  );
}

function GIChart({ events, onDelete, meds = [] }) {
  const now = new Date();
  const rows = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const row = {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      m: d.toLocaleDateString(undefined, { month: "short" }),
      full: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    };
    GI.forEach((g) => { row[g.id] = 0; });
    rows.push(row);
  }
  events.forEach((e) => {
    const row = rows.find((r) => r.key === String(e.date).slice(0, 7));
    if (row && GI.some((g) => g.id === e.type)) row[e.type] += 1;
  });
  const recent = [...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const series = GI.map((g) => ({ key: g.id, name: g.label, color: g.color }));
  const total = rows.reduce((a, r) => a + GI.reduce((b, g) => b + r[g.id], 0), 0);

  return (
    <section className="p-4 mb-3 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <h3 className="text-base font-bold mb-2" style={{ color: C.ink }}>Stomach episodes, last 12 months</h3>
      {events.length === 0 ? (
        <p className="text-sm py-4" style={{ color: C.muted }}>No episodes logged. Use the quick log above when one happens.</p>
      ) : (
        <>
          <MonthBarChart rows={rows} series={series} meds={meds}
            label={`Stomach episodes per month for the last 12 months, ${total} in total`} />
          <ChartLegend items={series.map((s) => ({ name: s.name, color: s.color, bar: true }))} />
          <ul className="mt-2">
            {recent.map((e) => {
              const g = GI.find((x) => x.id === e.type) || { label: e.type, color: C.muted };
              return (
                <li key={e.id} className="flex justify-between text-sm py-1" style={{ borderTop: `1px solid ${C.line}` }}>
                  <span>
                    <span className="font-bold" style={{ color: g.color }}>{g.label}</span>
                    <span style={{ color: C.muted }}> on {fmtDate(toT(e.date))}</span>
                  </span>
                  <button className="underline ml-3" style={{ color: C.muted }} onClick={() => onDelete(e.id)}>Delete</button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

const SYMPTOMS = [
  { id: "pain", label: "Pain", color: hue("#0F6E78") },
  { id: "fatigue", label: "Fatigue", color: hue("#4A4FA0") },
];
const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);

function SymptomChart({ entries, meds, domain }) {
  const byDate = {};
  entries.forEach((e) => SYMPTOMS.forEach((sy) => {
    if (!hasVal(e[sy.id])) return;
    if (!byDate[e.date]) byDate[e.date] = { t: toT(e.date), pain: [], fatigue: [] };
    byDate[e.date][sy.id].push(Number(e[sy.id]));
  }));
  const points = Object.values(byDate)
    .map((b) => ({ t: b.t, pain: avg(b.pain), fatigue: avg(b.fatigue) }))
    .sort((a, b) => a.t - b.t);
  const latest = (k) => [...points].reverse().find((p) => p[k] !== null);
  const series = SYMPTOMS.map((sy) => ({
    key: sy.id, name: sy.label, color: sy.color,
    points: points.filter((p) => p[sy.id] !== null).map((p) => ({ t: p.t, v: p[sy.id] })),
  }));

  return (
    <section className="p-4 mb-3 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-base font-bold" style={{ color: C.ink }}>Pain and fatigue</h3>
        <div className="text-right text-sm">
          {SYMPTOMS.map((sy) => {
            const l = latest(sy.id);
            return l ? (
              <div key={sy.id}>
                <span style={{ color: C.muted }}>{sy.label} </span>
                <span className="font-bold" style={{ color: sy.color }}>{l[sy.id]}/10</span>
              </div>
            ) : null;
          })}
        </div>
      </div>
      {points.length === 0 ? (
        <p className="text-sm py-4" style={{ color: C.muted }}>No scores yet. Use the quick log above to add today's.</p>
      ) : (
        <>
          <TimeChart height={230} domain={domain} series={series} yDomain={[0, 10]} yTicks={[0, 2, 4, 6, 8, 10]}
            meds={meds} formatValue={(v) => `${v}/10`}
            label={`Pain and fatigue scores from 1 to 10 over time, ${points.length} days recorded`} />
          <ChartLegend items={series} />
          <p className="text-xs mt-1" style={{ color: C.muted }}>Higher is worse. Days with more than one score show the average.</p>
        </>
      )}
    </section>
  );
}

const SUPPORT_ORGS = [
  {
    name: "National Fabry Disease Foundation",
    regions: ["us"],
    about: "U.S. nonprofit offering education, help finding Fabry specialists, family programs and an annual family conference.",
    color: hue("#1D5FA8"),
    links: [
      { label: "Facebook community", href: "https://www.facebook.com/FabryDisease/" },
      { label: "Website", href: "https://www.fabrydisease.org/" },
      { label: "Call 1-800-651-9131", href: "tel:+18006519131" },
      { label: "Email", href: "mailto:info@fabrydisease.org" },
    ],
  },
  {
    name: "Fabry Support & Information Group (FSIG)",
    regions: ["us"],
    about: "Patient-founded nonprofit offering information, advocacy, education and support for patients and families.",
    color: hue("#1F7A5A"),
    links: [{ label: "Website", href: "https://www.fabry.org" }],
  },
  {
    name: "Fabry International Network (FIN)",
    about: "A network of Fabry patient organisations in 57 countries, based in Belgium. It can help you find the patient group in your country.",
    color: hue("#6B4FA0"),
    regions: ["us", "eu"],
    links: [
      { label: "Website", href: "https://www.fabrynetwork.org/" },
      { label: "Facebook community", href: "https://www.facebook.com/fabryinternationalnetwork/" },
    ],
  },
];

const NEWS_TOPICS = [
  { id: "all", label: "All", q: "" },
  {
    id: "treatment", label: "Treatments",
    q: '(therapy[tiab] OR treatment[tiab] OR "enzyme replacement"[tiab] OR migalastat[tiab] OR agalsidase[tiab] OR pegunigalsidase[tiab] OR "gene therapy"[tiab] OR "substrate reduction"[tiab] OR trial[tiab])',
  },
  { id: "kidney", label: "Kidney", q: "(kidney[tiab] OR renal[tiab] OR nephropathy[tiab] OR albuminuria[tiab] OR proteinuria[tiab] OR GFR[tiab])" },
  { id: "heart", label: "Heart", q: '(cardiac[tiab] OR heart[tiab] OR cardiomyopathy[tiab] OR "left ventricular"[tiab] OR arrhythmia[tiab])' },
  { id: "nerves", label: "Pain and nerves", q: '(pain[tiab] OR neuropath*[tiab] OR "small fiber"[tiab] OR "quality of life"[tiab])' },
];
const NEWS_TYPES = { "Study": hue("#0F6E78"), "Review": hue("#6B4FA0"), "Clinical trial": hue("#1D5FA8"), "Case report": hue("#9A6200"), "Guidance": hue("#C0392B") };

const CTGOV_SEARCH_URL = "https://clinicaltrials.gov/search?cond=Fabry%20Disease";
const PUBMED_SEARCH_URL = "https://pubmed.ncbi.nlm.nih.gov/?term=fabry+disease&sort=date";
const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

const isWebLink = (u) => typeof u === "string" && /^https:\/\//.test(u);
// Turns text that may hold HTML tags or entities into plain text, without adding it to the page.
const plainText = (s) => {
  if (!s) return "";
  try { return (new DOMParser().parseFromString(String(s), "text/html").body.textContent || "").trim(); }
  catch (e) { return String(s).replace(/<[^>]+>/g, "").trim(); }
};

async function getWithTimeout(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return res;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("the request took too long");
    if (/^status /.test(e.message)) throw e;
    throw new Error("it couldn't be reached");
  } finally {
    clearTimeout(timer);
  }
}

function articleType(pubtypes) {
  const t = (pubtypes || []).join(" | ").toLowerCase();
  if (/guideline|consensus/.test(t)) return "Guidance";
  if (/clinical trial|randomized controlled/.test(t)) return "Clinical trial";
  if (/review|meta-analysis/.test(t)) return "Review";
  if (/case reports/.test(t)) return "Case report";
  return "Study";
}

// Newest Fabry disease articles from PubMed (NCBI E-utilities). Free, no key, no personal data sent.
async function searchResearch(topicId) {
  const topic = NEWS_TOPICS.find((t) => t.id === topicId) || NEWS_TOPICS[0];
  const term = `"fabry disease"[tiab]${topic.q ? ` AND ${topic.q}` : ""}`;
  const common = "db=pubmed&tool=fabry-tracker";
  const search = await (await getWithTimeout(
    `${EUTILS}/esearch.fcgi?${common}&retmode=json&retmax=8&sort=pub_date&datetype=pdat&reldate=183&term=${encodeURIComponent(term)}`
  )).json();
  const ids = ((search.esearchresult || {}).idlist || []).filter((id) => /^\d+$/.test(id));
  if (!ids.length) return [];
  const summary = await (await getWithTimeout(`${EUTILS}/esummary.fcgi?${common}&retmode=json&id=${ids.join(",")}`)).json();

  // Abstracts are a bonus: if this call fails, the list still shows.
  const abstracts = {};
  try {
    const xml = await (await getWithTimeout(`${EUTILS}/efetch.fcgi?${common}&retmode=xml&id=${ids.join(",")}`)).text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    doc.querySelectorAll("PubmedArticle").forEach((art) => {
      const pmid = (art.querySelector("MedlineCitation > PMID") || {}).textContent;
      const parts = [...art.querySelectorAll("Abstract > AbstractText")].map((n) => {
        const label = n.getAttribute("Label");
        return `${label ? `${label.charAt(0)}${label.slice(1).toLowerCase()}: ` : ""}${n.textContent.trim()}`;
      });
      if (pmid && parts.length) abstracts[pmid] = parts.join(" ");
    });
  } catch (e) { /* no abstracts */ }

  const result = summary.result || {};
  return ids.map((id) => result[id]).filter((r) => r && r.title).map((r) => {
    const sortDate = (r.sortpubdate || "").slice(0, 10).replace(/\//g, "-");
    return {
      id: `pm${r.uid}`,
      title: plainText(r.title).replace(/\.$/, ""),
      source: plainText(r.fulljournalname || r.source),
      date: /^\d{4}-\d{2}-\d{2}$/.test(sortDate) ? sortDate : plainText(r.pubdate),
      url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`,
      type: articleType(r.pubtype),
      summary: abstracts[r.uid] || "",
    };
  });
}

function ArticleCard({ a, delay }) {
  const [open, setOpen] = useState(false);
  const text = a.summary || "";
  const long = text.length > 280;
  return (
    <article className="fx-fade py-4" style={{ borderTop: `1px solid ${C.line}`, animationDelay: `${delay}ms` }}>
      <p className="text-sm font-bold mb-1" style={{ color: NEWS_TYPES[a.type] || C.muted }}>{a.type || "Article"}</p>
      <h3 className="text-base font-bold leading-snug mb-1">
        {isWebLink(a.url)
          ? <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: C.ink }} className="underline">{a.title}</a>
          : a.title}
      </h3>
      <p className="text-sm mb-2" style={{ color: C.muted }}>
        {[a.source, a.date && /^\d{4}-\d{2}-\d{2}$/.test(a.date) ? fmtDate(toT(a.date)) : a.date].filter(Boolean).join(", ")}
      </p>
      {text && (
        <p className="text-sm" style={{ color: C.ink }}>
          {open || !long ? text : text.slice(0, 280).trim() + "…"}
          {long && (
            <button className="ml-1 underline font-bold" style={{ color: C.accent }} onClick={() => setOpen(!open)}>
              {open ? "Show less" : "Read the abstract"}
            </button>
          )}
        </p>
      )}
    </article>
  );
}

const TRIAL_FILTERS = [
  { id: "open", label: "Recruiting now", statuses: "RECRUITING,NOT_YET_RECRUITING,ENROLLING_BY_INVITATION" },
  { id: "active", label: "Ongoing", statuses: "ACTIVE_NOT_RECRUITING" },
  { id: "all", label: "All trials", statuses: "" },
];
const TRIAL_STATUS = {
  RECRUITING: { label: "Recruiting", color: hue("#1F7A5A") },
  NOT_YET_RECRUITING: { label: "Not yet recruiting", color: hue("#0F6E78") },
  ENROLLING_BY_INVITATION: { label: "Enrolling by invitation", color: hue("#0F6E78") },
  ACTIVE_NOT_RECRUITING: { label: "Active, not recruiting", color: hue("#1D5FA8") },
  COMPLETED: { label: "Completed", color: hue("#5B6B7A") },
  TERMINATED: { label: "Stopped early", color: hue("#8A4B3C") },
  SUSPENDED: { label: "Paused", color: hue("#9A6200") },
  WITHDRAWN: { label: "Withdrawn", color: hue("#8A4B3C") },
};
const phaseLabel = (ph) => ({ EARLY_PHASE1: "Early phase 1", PHASE1: "Phase 1", PHASE2: "Phase 2", PHASE3: "Phase 3", PHASE4: "Phase 4" }[ph] || "");
const TRIAL_FIELDS = "NCTId,BriefTitle,OverallStatus,StartDate,Phase,InterventionName,LeadSponsorName,BriefSummary,LocationCity,LocationState,LocationCountry";

function mapStudy(st) {
  const p = st.protocolSection || {};
  const idm = p.identificationModule || {};
  const sm = p.statusModule || {};
  const locs = ((p.contactsLocationsModule || {}).locations || [])
    .map((l) => [l.city, l.state, l.country].filter(Boolean).join(", "));
  return {
    nct: /^NCT\d{8}$/.test(idm.nctId || "") ? idm.nctId : "",
    title: idm.briefTitle || "Untitled study",
    status: sm.overallStatus || "",
    start: (sm.startDateStruct || {}).date || "",
    phases: ((p.designModule || {}).phases || []).map(phaseLabel).filter(Boolean),
    interventions: [...new Set(((p.armsInterventionsModule || {}).interventions || []).map((i) => i.name))],
    sponsor: ((p.sponsorCollaboratorsModule || {}).leadSponsor || {}).name || "",
    summary: (p.descriptionModule || {}).briefSummary || "",
    locations: [...new Set(locs)],
  };
}

async function fetchTrialsDirect(filterId) {
  const f = TRIAL_FILTERS.find((x) => x.id === filterId) || TRIAL_FILTERS[0];
  const all = [];
  let token = "";
  let useFields = true;
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ "query.cond": "Fabry disease", pageSize: "200", sort: "LastUpdatePostDate:desc", format: "json" });
    if (f.statuses) q.set("filter.overallStatus", f.statuses);
    if (useFields) q.set("fields", TRIAL_FIELDS);
    if (token) q.set("pageToken", token);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
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
    (json.studies || []).forEach((st) => all.push(mapStudy(st)));
    token = json.nextPageToken || "";
    if (!token) break;
  }
  return all.filter((t) => t.nct);
}

function TrialCard({ t }) {
  const [open, setOpen] = useState(false);
  const st = TRIAL_STATUS[t.status] || { label: t.status ? t.status.replace(/_/g, " ").toLowerCase() : "Status unknown", color: C.muted };
  const longSummary = t.summary.length > 260;
  const shownLocs = t.locations.slice(0, 3);
  return (
    <article className="fx-fade py-4" style={{ borderTop: `1px solid ${C.line}` }}>
      <p className="text-sm font-bold mb-1" style={{ color: st.color }}>{st.label}</p>
      <h3 className="text-base font-bold leading-snug mb-1">
        <a href={`https://clinicaltrials.gov/study/${t.nct}`} target="_blank" rel="noopener noreferrer"
          className="underline" style={{ color: C.ink }}>{t.title}</a>
      </h3>
      <p className="text-sm mb-2" style={{ color: C.muted }}>
        {[t.phases.join(" and "), t.nct, t.start ? `started ${t.start}` : ""].filter(Boolean).join(", ")}
      </p>
      {t.interventions.length > 0 && (
        <p className="text-sm mb-1"><span className="font-bold">Testing: </span>{t.interventions.join(", ")}</p>
      )}
      {t.sponsor && <p className="text-sm mb-1"><span className="font-bold">Sponsor: </span>{t.sponsor}</p>}
      {t.locations.length > 0 && (
        <p className="text-sm mb-2">
          <span className="font-bold">Where: </span>{shownLocs.join("; ")}
          {t.locations.length > 3 ? `, and ${t.locations.length - 3} more locations` : ""}
        </p>
      )}
      {t.summary && (
        <p className="text-sm" style={{ color: C.ink }}>
          {open || !longSummary ? t.summary : t.summary.slice(0, 260).trim() + "…"}
          {longSummary && (
            <button className="ml-1 underline font-bold" style={{ color: C.accent }} onClick={() => setOpen(!open)}>
              {open ? "Show less" : "Show more"}
            </button>
          )}
        </p>
      )}
    </article>
  );
}

const UMOL_PER_MGDL = 88.4;
const ageAt = (birth, date) => (toT(date) - toT(birth)) / (365.25 * 864e5);

// CKD-EPI 2021 (race-free) for 18 and older; bedside Schwartz (2009) for under 18.
function calcEGFR(entry, profile) {
  if (!hasVal(entry.creatinine)) return null;
  const scr = Number(entry.creatinine);
  if (!profile.birthDate || !profile.sex) return { missing: "profile" };
  const age = ageAt(profile.birthDate, entry.date);
  if (!(age >= 0) || !(scr > 0)) return null;
  if (age >= 18) {
    const female = profile.sex === "Female";
    const k = female ? 0.7 : 0.9;
    const a = female ? -0.241 : -0.302;
    const v = 142 * Math.pow(Math.min(scr / k, 1), a) * Math.pow(Math.max(scr / k, 1), -1.2)
      * Math.pow(0.9938, age) * (female ? 1.012 : 1);
    return { value: Math.round(v), method: "CKD-EPI 2021" };
  }
  if (!hasVal(entry.heightCm)) return { missing: "height" };
  return { value: Math.round((0.413 * Number(entry.heightCm)) / scr), method: "Schwartz" };
}

const egfrStage = (v) => (v >= 90 ? "G1" : v >= 60 ? "G2" : v >= 45 ? "G3a" : v >= 30 ? "G3b" : v >= 15 ? "G4" : "G5");

function egfrSlope(points) {
  if (points.length < 3) return null;
  const xs = points.map((p) => p.t / (365.25 * 864e5));
  const span = xs[xs.length - 1] - xs[0];
  if (span < 1) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = points.reduce((a, p) => a + p.v, 0) / points.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (points[i].v - my); den += (x - mx) ** 2; });
  return { perYear: Math.round((num / den) * 10) / 10, years: Math.round(span * 10) / 10, n: points.length };
}

function EGFRChart({ entries, profile, meds, domain, onOpenProfile }) {
  const results = entries.filter((e) => hasVal(e.creatinine)).map((e) => ({ e, r: calcEGFR(e, profile) }));
  const points = results.filter((x) => x.r && x.r.value)
    .map((x) => ({ t: toT(x.e.date), v: x.r.value, method: x.r.method })).sort((a, b) => a.t - b.t);
  const needProfile = results.some((x) => x.r && x.r.missing === "profile");
  const needHeight = results.filter((x) => x.r && x.r.missing === "height").length;
  const latest = points[points.length - 1];
  const slope = egfrSlope(points);
  const egfrTop = Math.max(120, Math.ceil(Math.max(0, ...points.map((p) => p.v)) / 30) * 30);
  const egfrTicks = Array.from({ length: egfrTop / 30 + 1 }, (_, i) => i * 30);

  return (
    <section className="p-4 mb-3 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-base font-bold" style={{ color: C.ink }}>Kidney function (eGFR)</h3>
        {latest && (
          <div className="text-right">
            <span className="text-xl font-bold" style={{ color: C.ink }}>{latest.v}</span>
            <span className="text-sm ml-1" style={{ color: C.muted }}>mL/min/1.73m²</span>
            <div className="text-xs" style={{ color: C.muted }}>Stage {egfrStage(latest.v)}, {latest.method}</div>
          </div>
        )}
      </div>
      {needProfile ? (
        <div className="py-2">
          <p className="text-sm mb-3" style={{ color: C.muted }}>
            Add your birth date and sex in your profile so your eGFR can be calculated from your creatinine results.
          </p>
          <Button kind="secondary" onClick={onOpenProfile}>Go to profile</Button>
        </div>
      ) : points.length === 0 ? (
        <p className="text-sm py-4" style={{ color: C.muted }}>
          {needHeight ? "Add your height to your results so eGFR can be calculated." : "No creatinine results yet. Add one under \"Add\"."}
        </p>
      ) : (
        <>
          <TimeChart domain={domain} yDomain={[0, egfrTop]} yTicks={egfrTicks} refY={{ value: 60, label: "60" }}
            series={[{ key: "egfr", name: "eGFR", color: C.ink, points }]} meds={meds}
            formatValue={(v, sr, p) => `${v} mL/min/1.73m² (${p.method})`}
            label={`eGFR over time, ${points.length} results, latest ${latest.v} mL/min/1.73m²`} />
          {slope && (
            <p className="text-sm mt-1" style={{ color: C.ink }}>
              Change per year: <span className="font-bold">{slope.perYear > 0 ? "+" : ""}{slope.perYear}</span> mL/min/1.73m²
              <span style={{ color: C.muted }}> (from {slope.n} results over {slope.years} years)</span>
            </p>
          )}
          {needHeight > 0 && (
            <p className="text-xs mt-1" style={{ color: C.muted }}>
              {needHeight} result{needHeight > 1 ? "s" : ""} from before age 18 need a height to calculate eGFR.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function MetricChart({ metric, entries, meds, domain, units }) {
  const unit = units.unit(metric);
  const points = entries
    .filter((e) => hasVal(e[metric.id]))
    .map((e) => ({ t: toT(e.date), v: units.show(metric.id, e[metric.id]) }))
    .sort((a, b) => a.t - b.t);
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];

  return (
    <section className="p-4 mb-3 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-base font-bold" style={{ color: C.ink }}>{metric.label}</h3>
        {latest && (
          <div className="text-right">
            <span className="text-xl font-bold" style={{ color: C.ink }}>{latest.v}</span>
            <span className="text-sm ml-1" style={{ color: C.muted }}>{unit}</span>
            {prev && (
              <div className="text-xs" style={{ color: C.muted }}>
                {latest.v > prev.v ? "Up" : latest.v < prev.v ? "Down" : "No change"} from {prev.v}
              </div>
            )}
          </div>
        )}
      </div>
      {points.length === 0 ? (
        <p className="text-sm py-4" style={{ color: C.muted }}>No results yet. Add one under "Add".</p>
      ) : (
        <TimeChart domain={domain} refY={units.ref(metric)} series={[{ key: metric.id, name: metric.short, color: C.ink, points }]}
          meds={meds} formatValue={(v) => `${v} ${unit}`}
          label={`${metric.label} over time, ${points.length} results, latest ${latest.v} ${unit}`} />
      )}
    </section>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-md text-base focus:outline-none focus:ring-2";
const inputStyle = { border: `1px solid ${C.line}`, color: C.ink, background: C.field };

const TAB_ICONS = {
  trends: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>,
  add: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  meds: <><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="M9.2 9.2l5.6 5.6" /></>,
  news: <><path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z" /><path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

function TabIcon({ id }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {TAB_ICONS[id]}
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

// A small picture of each appearance choice.
function ThemePreview({ id }) {
  const panel = (t) => (
    <span className="flex flex-col gap-1 p-1 h-full" style={{ background: t.bg, flex: 1 }}>
      <span className="rounded-sm" style={{ height: 6, width: "70%", background: t.accent }} />
      <span className="rounded-sm" style={{ height: 14, background: t.surface, border: `1px solid ${t.line}` }} />
      <span className="rounded-sm" style={{ height: 4, width: "50%", background: t.muted }} />
    </span>
  );
  return (
    <span aria-hidden="true" className="flex w-full rounded-md overflow-hidden mb-2" style={{ height: 40, border: `1px solid ${C.line}` }}>
      {id !== "dark" && panel(THEMES.light)}
      {id !== "light" && panel(THEMES.dark)}
    </span>
  );
}

// ---------- Terms of use ----------
// DRAFT for legal review. Changing `version` makes every user accept the new terms before continuing.
const TERMS_KEY = "fabry-tracker-terms";
const TERMS = {
  version: "1",
  effective: "September 25, 2026",
  summary: [
    `${APP_INFO.name} is a personal record-keeping tool. It does not give medical advice, and it does not diagnose or treat any condition.`,
    "You choose what to enter or import, and you are responsible for checking it. Charts and calculations, such as eGFR and unit conversions, can contain errors.",
    "Your record stays on your device. The developers do not receive, store or see it.",
    "If you connect a patient portal, you are asking your health system to send your results to this device.",
    "Always talk with your care team before making health decisions. In an emergency, call your local emergency number.",
    "You use the app at your own risk, and the developers' liability is limited as far as the law allows.",
  ],
  sections: [
    {
      h: "1. About these terms",
      p: [
        `These terms apply to your use of ${APP_INFO.name} (the "app"). "We" and "us" mean the developers of the app, ${APP_INFO.developers.map((d) => d.name).join(", and ")}. By tapping "Agree and continue" or using the app, you agree to these terms. If you do not agree, do not use the app.`,
        "You must be 18 or older to accept these terms. A parent or legal guardian may use the app to keep a record for a child and accepts these terms on the child's behalf.",
      ],
    },
    {
      h: "2. Not medical advice",
      p: [
        "The app is for personal record-keeping and general information only. It is not a substitute for professional medical advice, diagnosis or treatment. It has not been approved, cleared or certified as a medical device by any regulator.",
        "Using the app does not create a doctor-patient relationship with us, including with any developer who is a physician. Do not start, stop or change any treatment based on the app. Do not delay seeking care because of anything you see in it.",
        "Reference lines on charts are general guides and may not apply to you. Clinical trial listings and articles come from third parties, are written for many audiences, and are not recommendations or endorsements.",
      ],
    },
    {
      h: "3. Your data and your responsibility",
      p: [
        "You decide what information to enter or import, and you are responsible for its accuracy. Check results against your original lab and imaging reports.",
        "The app performs automated calculations, including kidney function (eGFR) estimates, unit conversions, medicine grouping and dose tracking. These can be wrong, incomplete or unsuitable for your situation.",
        "Your record is stored only in the browser on your device. We do not collect, receive or store it. You are responsible for keeping your device secure and for making backups. Your record can be lost if you clear your browser's data, remove the app, or lose or change your device. Once you export or share a file, you are responsible for where it goes.",
      ],
    },
    {
      h: "4. Connecting your patient portal",
      p: [
        "If the app offers a connection to your health system's patient portal (for example, one that uses Epic's FHIR interface), using it is your choice. You sign in directly with your health system, and you authorize it to send copies of your lab results and basic details to the app on your device. The connection only reads information. It does not change your medical record, and the information is not sent to us.",
        "Your health system, Epic and other technology vendors are independent third parties. We do not control their systems, their availability or the accuracy of the information they send. Imported results may be incomplete, delayed or matched to the wrong test or unit, so review them before importing.",
        "You can stop the connection at any time by removing the app's access in your patient portal's settings, and you can delete imported results from the app. Connecting does not make us part of your care team or a party to any agreement between you and your health system.",
      ],
    },
    {
      h: "5. Other services",
      p: [
        "The app links to and retrieves information from other services, such as ClinicalTrials.gov, PubMed and patient organizations. When it searches these services it sends only the topic you choose, not your health information. Their own terms and privacy policies apply, and we are not responsible for their content or availability.",
      ],
    },
    {
      h: "6. No warranties",
      p: [
        'The app is provided "as is" and "as available", without warranties of any kind, whether express or implied, including warranties of accuracy, reliability, fitness for a particular purpose, merchantability, non-infringement, or uninterrupted or error-free operation.',
      ],
    },
    {
      h: "7. Limitation of liability",
      p: [
        "To the fullest extent permitted by law, we, and any institution we are affiliated with, will not be liable for any direct, indirect, incidental, special, consequential or punitive damages, or for any loss of data, health outcome, or decision made, arising out of or related to: your use of, or inability to use, the app; information you enter, import or export; any patient portal connection; or any third-party service or content. This applies even if we have been told such damages are possible.",
        "Where liability cannot be excluded, it is limited to the amount you paid to use the app. The app is free.",
      ],
    },
    {
      h: "8. Rights the law protects",
      p: [
        "Nothing in these terms excludes or limits liability that cannot be excluded or limited by law, such as liability for death or personal injury caused by negligence, or for fraud. Nothing in these terms affects rights you have as a consumer under the laws of your country, including in the European Union and the United Kingdom.",
      ],
    },
    {
      h: "9. Changes",
      p: [
        "We may update the app, or stop offering it, at any time. If these terms change, the app will ask you to read and accept the new version before you continue.",
      ],
    },
  ],
};

function TermsText() {
  return (
    <div className="text-sm" style={{ color: C.ink }}>
      <p className="mb-3" style={{ color: C.muted }}>Version {TERMS.version}, effective {TERMS.effective}</p>
      {TERMS.sections.map((sec) => (
        <section key={sec.h} className="mb-4">
          <h3 className="text-base font-bold mb-1">{sec.h}</h3>
          {sec.p.map((t) => <p key={t.slice(0, 40)} className="mb-2">{t}</p>)}
        </section>
      ))}
    </div>
  );
}

function TermsSummary() {
  return (
    <ul className="text-sm" style={{ color: C.ink }}>
      {TERMS.summary.map((t) => (
        <li key={t.slice(0, 40)} className="flex gap-2 mb-2">
          <span aria-hidden="true" className="rounded-full" style={{ width: 6, height: 6, marginTop: 7, flexShrink: 0, background: C.accent }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

// Shown before anything else until the current version of the terms is accepted.
function TermsGate({ updated, onAccept }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh", fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
      paddingTop: "max(24px, env(safe-area-inset-top))", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      <style>{APP_CSS}</style>
      <div className="fx-fade max-w-xl mx-auto px-4">
        <p className="text-base font-bold" style={{ color: C.accent, letterSpacing: "0.02em" }}>{APP_INFO.name}</p>
        <h1 className="text-2xl font-bold leading-tight mt-2 mb-1">{updated ? "We've updated our terms of use" : "Before you start"}</h1>
        <p className="text-base mb-4" style={{ color: C.muted }}>Please read and accept the terms of use to continue.</p>
        <section className="p-4 mb-3 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <h2 className="text-base font-bold mb-2">In short</h2>
          <TermsSummary />
        </section>
        <div role="region" aria-label="Terms of use" tabIndex={0} className="p-4 mb-4 rounded-lg overflow-y-auto focus:outline-none focus:ring-2"
          style={{ background: C.surface, border: `1px solid ${C.line}`, maxHeight: "38vh" }}>
          <h2 className="text-base font-bold mb-1">Terms of use</h2>
          <TermsText />
        </div>
        <label className="flex items-start gap-3 mb-4 text-base cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1" style={{ width: 22, height: 22, flexShrink: 0, accentColor: "var(--accent)" }} />
          <span>I have read and agree to the terms of use. I understand that {APP_INFO.name} does not give medical advice.</span>
        </label>
        <button onClick={onAccept} disabled={!agreed}
          className="fx-press w-full py-3 rounded-md text-lg font-bold focus:outline-none focus:ring-2 disabled:opacity-40"
          style={{ background: C.accent, color: C.onAccent }}>
          Agree and continue
        </button>
      </div>
    </div>
  );
}

// Read-only view of the terms, from Settings or the Learn tab.
function TermsDialog({ accepted, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: C.scrim }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="terms-title" className="fx-fade w-full max-w-xl rounded-lg p-5 overflow-y-auto"
        style={{ background: C.surface, color: C.ink, maxHeight: "calc(100vh - 32px)", marginBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 id="terms-title" className="text-xl font-bold">Terms of use</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close terms of use"
            className="fx-press flex items-center justify-center rounded-md text-2xl leading-none focus:outline-none focus:ring-2"
            style={{ width: 40, height: 40, color: C.muted }}>×</button>
        </div>
        {accepted && accepted.date && (
          <p className="text-sm mb-3 p-2 rounded-md" style={{ background: C.accentSoft }}>
            You accepted version {accepted.version} on {fmtDate(Date.parse(accepted.date))}.
          </p>
        )}
        <h3 className="text-base font-bold mb-2">In short</h3>
        <TermsSummary />
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
          <TermsText />
        </div>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

// ---------- Guided tour ----------
const TOUR_KEY = "fabry-tracker-tour";
const TOUR_STEPS = [
  {
    title: `Welcome to ${APP_INFO.name}`,
    body: "Here's a one-minute tour of how to track your health. You can skip it now and replay it anytime from Settings.",
  },
  {
    target: "quicklog",
    title: "Log how you feel",
    body: "Tap a number to record today's pain or fatigue, from 1 to 10. Tap Diarrhea or Constipation when a stomach episode happens. Tapped the wrong one? Tap Undo.",
  },
  {
    target: "charts",
    title: "See your results over time",
    body: "Your results are grouped by body system, starting with Fabry-specific tests. Tap a heading to open or close it. Tap any point on a chart to see the exact value and the medicines you were taking that day.",
  },
  {
    target: "legend",
    fallback: "charts",
    title: "Your treatments on the charts",
    body: "Colored lines show your medicines: a solid line when you started, a dotted line for each dose change, and a dashed line when you stopped. Each medicine appears only on the charts it affects.",
  },
  {
    target: "tab-add",
    title: "Add your lab results",
    body: "After each visit, enter your results here. Fill in only what you have. Kidney function (eGFR) is calculated for you from your creatinine.",
  },
  {
    target: "tab-meds",
    title: "Keep your medicines up to date",
    body: "Add each medicine with its starting dose, then log every dose change. Type a name like Lipitor or Farxiga and the app puts it in the right group.",
  },
  {
    target: "tab-news",
    title: "Learn and connect",
    body: "Find Fabry clinical trials, the newest research, and patient support groups.",
  },
  {
    target: "tab-profile",
    title: "Your profile and backups",
    body: "Update your details, export a spreadsheet for your care team, and save a backup. Your record is kept only on this device, so back it up now and then.",
  },
  {
    target: "settings",
    title: "Settings",
    body: "Switch between light and dark mode, choose United States or European units, add the app to your home screen, and replay this tour.",
  },
  {
    title: "You're all set",
    body: "Start by adding your latest lab results or logging how you feel today.",
    last: true,
  },
];

// Highlights one part of the real screen at a time with a short explanation.
function Tour({ onClose, onSample, hasEntries }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [vw, setVw] = useState(() => window.innerWidth);
  const [vh, setVh] = useState(() => window.innerHeight);
  const nextRef = useRef(null);
  const cardRef = useRef(null);
  const [cardH, setCardH] = useState(240);
  const step = TOUR_STEPS[i];
  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.getBoundingClientRect().height);
  }, [i, vw]);

  const findTarget = () => {
    for (const name of [step.target, step.fallback]) {
      if (!name) continue;
      const el = document.querySelector(`[data-tour="${name}"]`);
      if (el && el.getBoundingClientRect().height > 0) return el;
    }
    return null;
  };

  useEffect(() => {
    let frame = 0;
    const el = findTarget();
    const measure = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      const target = findTarget();
      setRect(target ? target.getBoundingClientRect() : null);
    };
    if (el && getComputedStyle(el).position !== "fixed" && !el.closest("nav, .sticky")) {
      el.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
    }
    measure();
    const t = setTimeout(measure, REDUCED ? 0 : 450);
    const onMove = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    if (nextRef.current) nextRef.current.focus({ preventScroll: true });
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [i]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && i < TOUR_STEPS.length - 1) setI(i + 1);
      if (e.key === "ArrowLeft" && i > 0) setI(i - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [i]);

  const pad = 6;
  const cardW = Math.min(360, vw - 32);
  const spot = rect && {
    left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2,
  };
  // The card goes below the highlight if it fits, else above, else pinned to the bottom of the screen.
  // With nothing highlighted it is centered.
  const margin = 12;
  let cardStyle;
  if (!spot) {
    cardStyle = { left: (vw - cardW) / 2, top: Math.max(margin, (vh - cardH) / 2) };
  } else {
    const left = Math.max(16, Math.min(spot.left + spot.width / 2 - cardW / 2, vw - cardW - 16));
    const spaceBelow = vh - (spot.top + spot.height) - margin * 2;
    const spaceAbove = spot.top - margin * 2;
    if (cardH <= spaceBelow) cardStyle = { left, top: spot.top + spot.height + margin };
    else if (cardH <= spaceAbove) cardStyle = { left, top: spot.top - margin - cardH };
    else cardStyle = { left, bottom: `calc(${margin}px + env(safe-area-inset-bottom))` };
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {spot ? (
        <div aria-hidden="true" className="fixed rounded-xl pointer-events-none"
          style={{ ...spot, boxShadow: `0 0 0 9999px ${C.scrim}`, outline: `3px solid ${C.accent}`, outlineOffset: 0,
            transition: REDUCED ? "none" : "all 350ms cubic-bezier(.2,.9,.3,1)" }} />
      ) : (
        <div aria-hidden="true" className="fixed inset-0" style={{ background: C.scrim }} />
      )}
      <div key={i} ref={cardRef} className="fx-fade fixed rounded-lg p-4" style={{ ...cardStyle, width: cardW, background: C.surface, color: C.ink,
        boxShadow: `0 8px 30px ${C.shadow}`, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold" style={{ color: C.muted }}>Step {i + 1} of {TOUR_STEPS.length}</span>
          {!step.last && (
            <button onClick={onClose} className="text-sm underline focus:outline-none focus:ring-2" style={{ color: C.muted }}>
              Skip tour
            </button>
          )}
        </div>
        <h2 id="tour-title" className="text-lg font-bold mb-1">{step.title}</h2>
        <p id="tour-body" className="text-base mb-3">{step.body}</p>
        <div className="flex items-center gap-1 mb-3" aria-hidden="true">
          {TOUR_STEPS.map((_, k) => (
            <span key={k} className="rounded-full" style={{ width: k === i ? 16 : 6, height: 6,
              background: k === i ? C.accent : C.line, transition: REDUCED ? "none" : "width 200ms" }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {i > 0 && !step.last && <Button kind="secondary" onClick={() => setI(i - 1)}>Back</Button>}
          {step.last ? (
            <>
              {!hasEntries && <Button kind="secondary" onClick={() => { onClose(); onSample(); }}>Explore with sample data</Button>}
              <button ref={nextRef} onClick={onClose}
                className="fx-press px-4 py-2 rounded-md text-base font-bold focus:outline-none focus:ring-2"
                style={{ background: C.accent, color: C.onAccent }}>
                Start tracking
              </button>
            </>
          ) : (
            <button ref={nextRef} onClick={() => setI(i + 1)}
              className="fx-press px-4 py-2 rounded-md text-base font-bold focus:outline-none focus:ring-2"
              style={{ background: C.accent, color: C.onAccent }}>
              {i === 0 ? "Show me around" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Install-to-home-screen support. main.jsx keeps the browser's install prompt on window.
function useInstall() {
  const [prompt, setPrompt] = useState(() => (typeof window !== "undefined" && window.__fabryInstallPrompt) || null);
  useEffect(() => {
    const ready = () => setPrompt(window.__fabryInstallPrompt || null);
    window.addEventListener("fabry-install-ready", ready);
    return () => window.removeEventListener("fabry-install-ready", ready);
  }, []);
  const standalone = typeof window !== "undefined"
    && ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true);
  const ios = typeof navigator !== "undefined"
    && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    try { await prompt.userChoice; } catch (e) { /* dismissed */ }
    window.__fabryInstallPrompt = null;
    setPrompt(null);
  };
  return { canPrompt: Boolean(prompt), install, standalone, ios };
}

function InstallSection() {
  const { canPrompt, install, standalone, ios } = useInstall();
  return (
    <section className="mb-5">
      <h3 className="text-base font-bold mb-1">Add to your home screen</h3>
      {standalone ? (
        <p className="text-sm" style={{ color: C.muted }}>{APP_INFO.name} is installed on this device.</p>
      ) : canPrompt ? (
        <>
          <p className="text-sm mb-2" style={{ color: C.muted }}>Open {APP_INFO.name} like any other app, even without internet.</p>
          <Button onClick={install}>Install {APP_INFO.name}</Button>
        </>
      ) : ios ? (
        <p className="text-sm" style={{ color: C.muted }}>
          In Safari, tap the Share button, then Add to Home Screen. Installing also keeps your record safer, because Safari can
          clear data from websites you haven't opened for a while. Your record doesn't move over on its own: export a
          backup here first, then restore it in the installed app.
        </p>
      ) : (
        <p className="text-sm" style={{ color: C.muted }}>
          Open your browser's menu and choose Install app or Add to Home screen.
        </p>
      )}
    </section>
  );
}

function SettingsDialog({ theme, onTheme, region, onRegion, onTour, onTerms, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (before && before.focus) before.focus();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: C.scrim }}
      onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="fx-fade w-full max-w-md rounded-lg p-5 overflow-y-auto"
        style={{ background: C.surface, color: C.ink, boxShadow: `0 8px 30px ${C.shadow}`, maxHeight: "calc(100vh - 32px)",
          marginBottom: "env(safe-area-inset-bottom)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="settings-title" className="text-xl font-bold">Settings</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close settings"
            className="fx-press flex items-center justify-center rounded-md text-2xl leading-none focus:outline-none focus:ring-2"
            style={{ width: 40, height: 40, color: C.muted }}>
            ×
          </button>
        </div>
        <fieldset>
          <legend className="text-base font-bold mb-1">Appearance</legend>
          <p className="text-sm mb-3" style={{ color: C.muted }}>
            Match device follows your phone or computer's light or dark setting.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {THEME_OPTIONS.map((o) => {
              const on = theme === o.id;
              return (
                <label key={o.id} className="fx-press flex flex-col items-center p-2 rounded-md text-sm font-bold text-center cursor-pointer focus-within:ring-2"
                  style={{ border: `2px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : C.surface }}>
                  <input type="radio" name="theme" value={o.id} checked={on} onChange={() => onTheme(o.id)} className="sr-only" />
                  <ThemePreview id={o.id} />
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-base font-bold mb-1">Region and units</legend>
          <p className="text-sm mb-3" style={{ color: C.muted }}>
            Results already saved are converted automatically when you switch.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {REGIONS.map((r) => {
              const on = region === r.id;
              return (
                <label key={r.id} className="fx-press flex flex-col p-3 rounded-md cursor-pointer focus-within:ring-2"
                  style={{ border: `2px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : C.surface }}>
                  <input type="radio" name="region" value={r.id} checked={on} onChange={() => onRegion(r.id)} className="sr-only" />
                  <span className="text-sm font-bold">{r.label}</span>
                  <span className="text-xs mt-1" style={{ color: C.muted }}>{r.units}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <InstallSection />
        <section className="mb-5">
          <h3 className="text-base font-bold mb-1">App tour</h3>
          <p className="text-sm mb-2" style={{ color: C.muted }}>A quick walk through each part of {APP_INFO.name}.</p>
          <Button kind="secondary" onClick={onTour}>Show the tour</Button>
        </section>
        <section className="mb-5">
          <h3 className="text-base font-bold mb-1">Terms of use</h3>
          <Button kind="secondary" onClick={onTerms}>Read the terms of use</Button>
        </section>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm mb-1" style={{ color: C.muted }}>{label}</span>
      {children}
    </label>
  );
}

function Button({ children, onClick, kind = "primary", disabled }) {
  const style = kind === "primary"
    ? { background: C.accent, color: C.onAccent }
    : { background: "transparent", color: C.accent, border: `1px solid ${C.accent}` };
  return (
    <button onClick={onClick} disabled={disabled}
      className="fx-press px-4 py-2 rounded-md text-base font-bold focus:outline-none focus:ring-2 disabled:opacity-40"
      style={style}>
      {children}
    </button>
  );
}

export default function FabryTracker() {
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState("trends");
  const [form, setForm] = useState({ date: today() });
  const [medForm, setMedForm] = useState({ med: "migalastat", start: today(), stop: "", startDose: "", customName: "", charts: [] });
  const [doseForms, setDoseForms] = useState({});
  const [openDose, setOpenDose] = useState("");
  const [toast, setToast] = useState(null);
  const [phraseIdx, setPhraseIdx] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [popped, setPopped] = useState("");
  const [dropId, setDropId] = useState(0);
  const [dropping, setDropping] = useState(false);

  const loadSample = () => {
    setData(SAMPLE);
    setConfirm("");
    setTab("trends");
    if (REDUCED) return;
    setDropId((x) => x + 1);
    setDropping(true);
    setTimeout(() => setDropping(false), 2600);
  };

  const openRecord = () => {
    if (REDUCED) { setShowWelcome(false); return; }
    setLeaving(true);
    setTimeout(() => { setShowWelcome(false); setLeaving(false); }, 420);
  };

  const pop = (key) => {
    setPopped(key);
    setTimeout(() => setPopped((k) => (k === key ? "" : k)), 360);
  };

  const pickPhrase = async (exclude = []) => {
    let recent = [];
    try {
      const r = await window.storage.get(PHRASE_KEY, false);
      if (r && r.value) recent = JSON.parse(r.value);
    } catch (e) {
      // first visit
    }
    const avoid = new Set([...recent, ...exclude]);
    const pool = PHRASES.map((_, i) => i).filter((i) => !avoid.has(i));
    const choices = pool.length ? pool : PHRASES.map((_, i) => i).filter((i) => !exclude.includes(i));
    const idx = choices[Math.floor(Math.random() * choices.length)];
    setPhraseIdx(idx);
    try {
      await window.storage.set(PHRASE_KEY, JSON.stringify([idx, ...recent.filter((i) => i !== idx)].slice(0, 15)), false);
    } catch (e) {
      // not critical
    }
  };

  useEffect(() => { pickPhrase(); }, []);
  const [topic, setTopic] = useState("all");
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");
  const [trialFilter, setTrialFilter] = useState("open");
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [trialsError, setTrialsError] = useState("");
  const [trialQuery, setTrialQuery] = useState("");
  const [trialShown, setTrialShown] = useState(10);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [terms, setTerms] = useState(null); // null while loading, then { version, date } or false
  const [showTerms, setShowTerms] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(TERMS_KEY, false);
        const t = JSON.parse(r.value);
        setTerms(t && t.version ? t : false);
      } catch (e) {
        setTerms(false);
      }
    })();
  }, []);
  const termsOk = Boolean(terms && terms.version === TERMS.version);
  const acceptTerms = () => {
    const record = { version: TERMS.version, date: new Date().toISOString() };
    setTerms(record);
    window.storage.set(TERMS_KEY, JSON.stringify(record), false).catch(() => {});
  };
  const [tourOn, setTourOn] = useState(false);
  const [tourSeen, setTourSeen] = useState(null); // null until loaded
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(TOUR_KEY, false);
        setTourSeen(Boolean(r && r.value));
      } catch (e) {
        setTourSeen(false);
      }
    })();
  }, []);
  const endTour = () => {
    setTourOn(false);
    setTourSeen(true);
    window.storage.set(TOUR_KEY, "done", false).catch(() => {});
  };
  const [region, setRegion] = useState(guessRegion);
  const units = useMemo(() => makeUnits(region), [region]);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(REGION_KEY, false);
        if (r && (r.value === "us" || r.value === "eu")) setRegion(r.value);
      } catch (e) {
        // no saved choice yet
      }
    })();
  }, []);
  const chooseRegion = (r) => {
    setRegion(r);
    setForm((f) => ({ ...f, creatUnit: undefined }));
    window.storage.set(REGION_KEY, r, false).catch(() => {});
  };
  const [theme, setTheme] = useState(() => {
    const t = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme");
    return THEME_OPTIONS.some((o) => o.id === t) ? t : "system";
  });

  // Apply the appearance choice to the page and remember it.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(THEME_KEY, false);
        if (r && THEME_OPTIONS.some((o) => o.id === r.value)) setTheme(r.value);
      } catch (e) {
        // no saved choice yet
      }
    })();
  }, []);
  const chooseTheme = (t) => {
    setTheme(t);
    window.storage.set(THEME_KEY, t, false).catch(() => {});
  };
  const [setup, setSetup] = useState({ birthDate: "", sex: "", mutation: "" });

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(PREFS_KEY, false);
        if (r && r.value) {
          const pr = JSON.parse(r.value);
          if (pr.tab) setTab(pr.tab);
          if (pr.topic) setTopic(pr.topic);
          if (pr.trialFilter) setTrialFilter(pr.trialFilter);
          if (pr.collapsed) setCollapsed(pr.collapsed);
        }
      } catch (e) {
        // no saved preferences yet
      } finally {
        setPrefsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    window.storage.set(PREFS_KEY, JSON.stringify({ tab, topic, trialFilter, collapsed }), false).catch(() => {});
  }, [tab, topic, trialFilter, collapsed, prefsLoaded]);

  const loadTrials = async () => {
    setTrialsLoading(true);
    setTrialsError("");
    setTrialShown(10);
    try {
      const items = await fetchTrialsDirect(trialFilter);
      setData((d) => ({ ...d, trials: { items, fetched: today(), filter: trialFilter, source: "ClinicalTrials.gov" } }));
    } catch (e) {
      setTrialsError(`The trial list couldn't be loaded right now (${e.message}). You can browse every Fabry trial on ClinicalTrials.gov with the link below.`);
    } finally {
      setTrialsLoading(false);
    }
  };

  // Trials load on their own when the Learn tab opens or the filter changes,
  // at most once per filter per day.
  const trialAttempt = useRef("");
  useEffect(() => {
    if (!loaded || !prefsLoaded || tab !== "news" || trialsLoading) return;
    const key = `${trialFilter}-${today()}`;
    const cached = data.trials && data.trials.filter === trialFilter && data.trials.fetched === today();
    if (cached || trialAttempt.current === key) return;
    trialAttempt.current = key;
    loadTrials();
  }, [loaded, prefsLoaded, tab, trialFilter]);

  // Research loads on its own the same way: when Learn opens or the topic changes,
  // at most once per topic per day.
  const newsAttempt = useRef("");
  useEffect(() => {
    if (!loaded || !prefsLoaded || tab !== "news" || newsLoading) return;
    const key = `${topic}-${today()}`;
    const cached = data.news && data.news.topic === topic && data.news.fetched === today();
    if (cached || newsAttempt.current === key) return;
    newsAttempt.current = key;
    findResearch();
  }, [loaded, prefsLoaded, tab, topic]);

  const findResearch = async () => {
    setNewsLoading(true);
    setNewsError("");
    try {
      const items = await searchResearch(topic);
      setData((d) => ({ ...d, news: { items, fetched: today(), topic } }));
    } catch (e) {
      setNewsError(`New research couldn't be loaded right now (${e.message}). You can search PubMed with the link below.`);
    } finally {
      setNewsLoading(false);
    }
  };
  const [exported, setExported] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [importError, setImportError] = useState("");

  const exportData = (kind) => {
    const text = kind === "csv" ? buildCSV(data, units) : JSON.stringify({ app: "fabry-tracker", version: 1, exported: today(), ...data }, null, 2);
    const filename = `fabry-record-${today()}.${kind}`;
    tryDownload(text, filename, kind === "csv" ? "text/csv" : "application/json");
    setExported({ kind, text, filename });
    setCopied(false);
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exported.text);
      setCopied(true);
    } catch (e) {
      setCopied(false);
    }
  };

  const readBackup = (file) => {
    setImportError("");
    setPendingImport(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        if (!p || !Array.isArray(p.entries) || !Array.isArray(p.meds)) throw new Error("bad");
        // Keep only well-formed records so a damaged file can't break the charts.
        const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(toT(v));
        const str = (v) => (typeof v === "string" ? v : "");
        const prof = p.profile && typeof p.profile === "object" ? p.profile : {};
        const entries = p.entries.filter((e) => e && isDate(e.date)).map((e) => {
          const clean = { id: str(e.id) || uid(), date: e.date };
          METRICS.forEach((m) => {
            if (hasVal(e[m.id]) && isFinite(Number(e[m.id]))) clean[m.id] = Number(e[m.id]);
          });
          return clean;
        });
        const meds = p.meds.filter((m) => m && isDate(m.start) && typeof m.med === "string").map((m) => ({
          id: str(m.id) || uid(),
          med: m.med,
          start: m.start,
          stop: isDate(m.stop) ? m.stop : "",
          startDose: str(m.startDose),
          customName: str(m.customName),
          charts: Array.isArray(m.charts) ? m.charts.filter((c) => CHART_OPTIONS.some((o) => o.id === c)) : [],
          doses: (Array.isArray(m.doses) ? m.doses : []).filter((d) => d && isDate(d.date))
            .map((d) => ({ id: str(d.id) || uid(), date: d.date, dose: str(d.dose) })),
        }));
        const events = (Array.isArray(p.events) ? p.events : [])
          .filter((e) => e && isDate(e.date) && GI.some((g) => g.id === e.type))
          .map((e) => ({ id: str(e.id) || uid(), date: e.date, type: e.type }));
        setPendingImport({
          profile: {
            mutation: str(prof.mutation),
            phenotype: str(prof.phenotype),
            birthDate: isDate(prof.birthDate) ? prof.birthDate : "",
            sex: ["Female", "Male"].includes(prof.sex) ? prof.sex : "",
          },
          entries,
          meds,
          events,
          exported: isDate(p.exported) ? p.exported : "",
        });
      } catch (e) {
        setImportError("That file isn't a Fabry tracker backup. Choose a .json file exported from this app.");
      }
    };
    reader.onerror = () => setImportError("The file couldn't be read. Try choosing it again.");
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(h);
  }, [toast]);

  const quickScore = (metricId, n) => {
    const id = uid();
    const m = METRICS.find((x) => x.id === metricId);
    setData((d) => ({ ...d, entries: [...d.entries, { id, date: today(), [metricId]: n }] }));
    setToast({ text: `${m.short} ${n}/10 logged for today`, undo: () => setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })) });
  };

  const logGI = (type) => {
    const id = uid();
    const g = GI.find((x) => x.id === type);
    setData((d) => ({ ...d, events: [...(d.events || []), { id, date: today(), type }] }));
    setToast({ text: `${g.label} logged for today`, undo: () => setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) })) });
  };

  // Every delete can be undone from the confirmation bar for a few seconds.
  const deleteEvent = (id) => {
    const ev = (data.events || []).find((e) => e.id === id);
    setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
    if (ev) setToast({ text: "Stomach episode deleted", undo: () => setData((d) => ({ ...d, events: [...(d.events || []), ev] })) });
  };
  const deleteEntry = (entry) => {
    setData((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== entry.id) }));
    setToast({ text: "Result deleted", undo: () => setData((d) => ({ ...d, entries: [...d.entries, entry] })) });
  };
  const deleteMed = (med) => {
    setData((d) => ({ ...d, meds: d.meds.filter((x) => x.id !== med.id) }));
    setToast({ text: `${medInfo(med).name} deleted`, undo: () => setData((d) => ({ ...d, meds: [...d.meds, med] })) });
  };
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY, false);
        if (r && r.value) setData({ ...EMPTY, ...JSON.parse(r.value) });
      } catch (e) {
        // nothing saved yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setStatus("Saving…");
    const h = setTimeout(async () => {
      try {
        const r = await window.storage.set(KEY, JSON.stringify(data), false);
        setStatus(r ? "Saved on this device" : "Couldn't save. Export a backup to keep your data safe.");
      } catch (e) {
        setStatus("Couldn't save. Export a backup to keep your data safe.");
      }
    }, 400);
    return () => clearTimeout(h);
  }, [data, loaded]);

  const domain = useMemo(() => {
    const ts = [
      ...data.entries.map((e) => toT(e.date)),
      ...data.meds.flatMap((m) => [toT(m.start), m.stop ? toT(m.stop) : null, ...(m.doses || []).map((dc) => toT(dc.date))]).filter(Boolean),
    ];
    if (!ts.length) return [Date.now() - 365 * 864e5, Date.now()];
    const pad = 60 * 864e5;
    return [Math.min(...ts) - pad, Math.max(...ts) + pad];
  }, [data]);

  const sortedMeds = [...data.meds].sort((a, b) => toT(a.start) - toT(b.start));
  const sortedEntries = [...data.entries].sort((a, b) => toT(b.date) - toT(a.date));
  const formHasValue = METRICS.some((m) => hasVal(form[m.id]));
  const creatUnit = form.creatUnit || (region === "eu" ? "umol" : "mgdl");

  const saveEntry = () => {
    const entry = { id: uid(), date: form.date };
    METRICS.forEach((m) => { if (!m.custom && hasVal(form[m.id])) entry[m.id] = units.store(m.id, form[m.id]); });
    if (hasVal(form.creatinine)) {
      const v = Number(form.creatinine);
      entry.creatinine = creatUnit === "umol" ? roundTo(v / UMOL_PER_MGDL, 4) : v;
    }
    if (hasVal(form.heightCm)) entry.heightCm = Number(form.heightCm);
    setData((d) => ({ ...d, entries: [...d.entries, entry] }));
    setForm({ date: form.date, creatUnit: form.creatUnit });
    setTab("trends");
  };

  const addMed = () => {
    const r = resolveMedForm(medForm);
    const rec = { id: uid(), med: r.med, start: medForm.start, stop: medForm.stop, startDose: r.startDose, doses: [] };
    if (r.customName) rec.customName = r.customName;
    if (r.med === "custom") rec.charts = medForm.charts;
    setData((d) => ({ ...d, meds: [...d.meds, rec] }));
    setMedForm({ med: medForm.med, start: today(), stop: "", startDose: "", customName: "", charts: medForm.med === "custom" ? [] : medForm.charts });
  };

  const addDose = (medId) => {
    const f = doseForms[medId] || {};
    if (!f.date || !f.dose) return;
    setData((d) => ({
      ...d,
      meds: d.meds.map((m) => m.id === medId
        ? { ...m, doses: [...(m.doses || []), { id: uid(), date: f.date, dose: f.dose.trim() }] }
        : m),
    }));
    setDoseForms((s) => ({ ...s, [medId]: { date: today(), dose: "" } }));
    setOpenDose("");
  };

  const deleteDose = (medId, dose) => {
    setData((d) => ({
      ...d,
      meds: d.meds.map((m) => m.id === medId ? { ...m, doses: (m.doses || []).filter((x) => x.id !== dose.id) } : m),
    }));
    setToast({
      text: "Dose change deleted",
      undo: () => setData((d) => ({
        ...d,
        meds: d.meds.map((m) => m.id === medId ? { ...m, doses: [...(m.doses || []), dose] } : m),
      })),
    });
  };

  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  // Run the tour once, the first time the main screen appears.
  const onMainScreen = loaded && termsOk && !showWelcome && (data.onboarded || data.profile.birthDate || data.entries.length > 0);
  useEffect(() => {
    if (onMainScreen && tourSeen === false && !tourOn) {
      setTab("trends");
      setTourOn(true);
    }
  }, [onMainScreen, tourSeen]);

  const tabs = [
    ["trends", "Trends"],
    ["add", "Add"],
    ["meds", "Treatments"],
    ["news", "Learn"],
    ["profile", "Profile"],
  ];

  if (!loaded) {
    return <div className="p-6 text-base" style={{ color: C.muted, background: C.bg, minHeight: "100vh" }}>Loading your record…</div>;
  }

  if (terms === null) {
    return <div className="p-6 text-base" style={{ color: C.muted, background: C.bg, minHeight: "100vh" }}>Loading your record…</div>;
  }
  if (!termsOk) {
    return <TermsGate updated={Boolean(terms && terms.version)} onAccept={acceptTerms} />;
  }

  const needsSetup = !data.onboarded && !data.profile.birthDate && data.entries.length === 0;

  if (!needsSetup && showWelcome && phraseIdx === null) {
    return <div className="p-6 text-base" style={{ color: C.muted, background: C.bg, minHeight: "100vh" }}>Loading your record…</div>;
  }

  if (needsSetup) {
    const future = setup.birthDate && setup.birthDate > today();
    const ready = setup.birthDate && setup.sex && !future;
    const finish = (save) => {
      chooseRegion(region);
      setData((d) => ({
        ...d,
        onboarded: true,
        profile: save
          ? { ...d.profile, birthDate: setup.birthDate, sex: setup.sex, mutation: setup.mutation.trim() }
          : d.profile,
      }));
      setShowWelcome(false);
    };
    const darkInput = inputStyle;
    return (
      <div className="flex flex-col justify-center px-5 py-8" data-screen="setup"
        style={{ background: C.hero, minHeight: "100vh", paddingTop: "max(32px, env(safe-area-inset-top))", paddingBottom: "max(32px, env(safe-area-inset-bottom))", fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif" }}>
        <style>{APP_CSS}</style>
        <div className="fx-fade max-w-md mx-auto w-full">
          <h1 className="text-4xl font-bold mb-3" style={{ color: "#fff", letterSpacing: "-0.01em" }}>{APP_INFO.name}</h1>
          <h2 className="text-2xl font-bold leading-snug mb-2" style={{ color: "#fff" }}>Welcome. Let's set up your record.</h2>
          <p className="text-base mb-6" style={{ color: C.heroText }}>
            This takes a minute. Your information stays on this device.
          </p>
          <div className="p-5 rounded-lg" style={{ background: C.surface }}>
            <Field label="Date of birth">
              <input type="date" className={inputCls} style={darkInput} value={setup.birthDate} max={today()}
                onChange={(e) => setSetup({ ...setup, birthDate: e.target.value })} />
            </Field>
            {future && <p className="text-sm -mt-2 mb-3" style={{ color: C.error }}>Birth date can't be in the future.</p>}
            <div className="mb-3">
              <span className="block text-sm mb-1" style={{ color: C.muted }}>Sex (used to calculate kidney function)</span>
              <div className="grid grid-cols-2 gap-2">
                {["Female", "Male"].map((sx) => (
                  <button key={sx} onClick={() => setSetup({ ...setup, sex: sx })} aria-pressed={setup.sex === sx}
                    className="fx-press py-3 rounded-md text-base font-bold focus:outline-none focus:ring-2"
                    style={setup.sex === sx
                      ? { background: C.accent, color: C.onAccent, border: `2px solid ${C.accent}` }
                      : { background: C.surface, color: C.ink, border: `2px solid ${C.line}` }}>
                    {sx}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <span className="block text-sm mb-1" style={{ color: C.muted }}>Where do you get your care? This sets the lab units.</span>
              <div className="grid grid-cols-2 gap-2">
                {REGIONS.map((r) => (
                  <button key={r.id} onClick={() => setRegion(r.id)} aria-pressed={region === r.id}
                    className="fx-press py-2 px-2 rounded-md text-base font-bold focus:outline-none focus:ring-2"
                    style={region === r.id
                      ? { background: C.accent, color: C.onAccent, border: `2px solid ${C.accent}` }
                      : { background: C.surface, color: C.ink, border: `2px solid ${C.line}` }}>
                    {r.label}
                    <span className="block text-xs font-normal mt-0.5" style={{ opacity: 0.85 }}>{r.units}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="GLA variant, if you know it (optional)">
              <input className={inputCls} style={darkInput} placeholder="e.g. c.644A>G (p.N215S)" value={setup.mutation}
                onChange={(e) => setSetup({ ...setup, mutation: e.target.value })} />
            </Field>
            <p className="text-sm mb-4" style={{ color: C.muted }}>
              You'll find it on your genetic test report. You can add it later in Profile.
            </p>
            <button onClick={() => finish(true)} disabled={!ready}
              className="fx-press w-full py-3 rounded-md text-lg font-bold focus:outline-none focus:ring-2 disabled:opacity-40"
              style={{ background: C.accent, color: C.onAccent }}>
              Create my profile
            </button>
          </div>
          <button onClick={() => finish(false)} className="mt-4 text-base underline focus:outline-none focus:ring-2"
            style={{ color: C.heroText }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (showWelcome && phraseIdx !== null) {
    return (
      <div className={`flex flex-col justify-center px-6 ${leaving ? "fx-leave" : ""}`}
        style={{ background: C.hero, color: "#fff", minHeight: "100vh", paddingTop: "max(32px, env(safe-area-inset-top))", paddingBottom: "max(32px, env(safe-area-inset-bottom))", fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif" }}>
        <style>{APP_CSS}</style>
        <div className="max-w-xl mx-auto w-full">
          <h1 className="text-4xl font-bold mb-6" style={{ color: "#fff", letterSpacing: "-0.01em" }}>{APP_INFO.name}</h1>
          <p className="text-base mb-4" style={{ color: C.heroText }}>
            {data.entries.length || data.meds.length ? "Welcome back" : "Welcome"}
          </p>
          <p key={phraseIdx} className="fabry-rise text-3xl font-bold leading-snug mb-10"
            style={{ animation: "fabryRise 900ms cubic-bezier(.2,.9,.3,1.2) both" }}>
            {PHRASES[phraseIdx]}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={openRecord}
              className="fx-press px-6 py-3 rounded-md text-lg font-bold focus:outline-none focus:ring-2"
              style={{ background: "#fff", color: "#0B4F57" }}>
              Open my record
            </button>
            <button onClick={() => pickPhrase([phraseIdx])}
              className="text-base underline focus:outline-none focus:ring-2" style={{ color: C.heroText }}>
              Show another
            </button>
          </div>
          <p className="text-sm mt-12" style={{ color: C.heroSub }}>
            Developed by {APP_INFO.developers.map((d) => d.name).join(", and ")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif", color: C.ink }}>
      <style>{APP_CSS}</style>

      {/* App bar: stays at the top while the page scrolls. */}
      <div className="sticky top-0 z-30" style={{ background: C.bg, paddingTop: "env(safe-area-inset-top)", borderBottom: `1px solid ${C.line}` }}>
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between" style={{ height: 52 }}>
          <p className="text-base font-bold" style={{ color: C.accent, letterSpacing: "0.02em" }}>{APP_INFO.name}</p>
          <button data-tour="settings" onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings"
            className="fx-press flex items-center justify-center rounded-md focus:outline-none focus:ring-2"
            style={{ width: 44, height: 44, color: C.muted, marginRight: -10 }}>
            <GearIcon />
          </button>
        </div>
      </div>

      <div className="fx-fade max-w-2xl mx-auto px-4 pt-4"
        style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))", paddingLeft: "max(16px, env(safe-area-inset-left))",
          paddingRight: "max(16px, env(safe-area-inset-right))" }}>
        <header className="mb-4">
          <h1 className="text-2xl font-bold leading-tight">
            {data.profile.mutation ? `GLA ${data.profile.mutation}` : "Add your GLA variant"}
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>
            {data.profile.phenotype ? `${data.profile.phenotype} phenotype. ` : ""}{status}
          </p>
        </header>

        <div key={`${tab}-${dropId}`} className={dropping ? "" : "fx-fade"}>

        {tab === "trends" && (
          <div className={dropping ? "fx-cascade" : ""}>
            <section data-tour="quicklog" className="p-4 mb-4 rounded-lg" style={{ background: C.surface, border: `2px solid ${C.accent}` }}>
              <h2 className="text-lg font-bold mb-1">Quick log for today</h2>
              {[
                { id: "pain", prompt: "Pain right now, from 1 (barely there) to 10 (worst imaginable)", rgb: "15,110,120" },
                { id: "fatigue", prompt: "Fatigue today, from 1 (full of energy) to 10 (exhausted)", rgb: "74,79,160" },
              ].map((row) => (
                <div key={row.id}>
                  <p className="text-sm mb-2" style={{ color: C.muted }}>{row.prompt}</p>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button key={n} onClick={() => { quickScore(row.id, n); pop(`${row.id}-${n}`); }}
                        aria-label={`Log ${row.id} ${n} out of 10`}
                        className={`fx-press py-3 rounded-md text-lg font-bold focus:outline-none focus:ring-2 ${popped === `${row.id}-${n}` ? "fx-pop" : ""}`}
                        style={{ background: `rgba(${row.rgb},${0.06 + n * 0.07})`, color: n > 6 ? "#FFFFFF" : C.ink }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-sm mb-2" style={{ color: C.muted }}>Stomach episode</p>
              <div className="grid grid-cols-2 gap-2">
                {GI.map((g) => (
                  <button key={g.id} onClick={() => { logGI(g.id); pop(g.id); }}
                    className={`fx-press py-3 rounded-md text-base font-bold focus:outline-none focus:ring-2 ${popped === g.id ? "fx-pop" : ""}`}
                    style={{ border: `2px solid ${g.color}`, color: g.color, background: C.surface }}>
                    {g.label}
                  </button>
                ))}
              </div>
            </section>
            {sortedMeds.length > 0 && (
              <div data-tour="legend" className="mb-3 text-sm" style={{ lineHeight: 1.45 }}>
                {sortedMeds.map((raw) => {
                  const m = effectiveMed(raw);
                  const d = medInfo(m);
                  const now = doseOn(m, Date.now());
                  return (
                    <p key={m.id} className="mb-1" style={{ paddingLeft: 18, textIndent: -18 }}>
                      <span className="inline-block align-middle rounded-sm" style={{ width: 12, height: 3, marginRight: 6, background: d.color }} />
                      <span style={{ color: d.color }} className="font-bold">{now ? `${d.short} ${now}` : d.short}</span>
                      <span style={{ color: C.muted }}>
                        {m.stop ? `, ${fmtDate(toT(m.start))} to ${fmtDate(toT(m.stop))}` : `, from ${fmtDate(toT(m.start))}`}
                      </span>
                    </p>
                  );
                })}
              </div>
            )}
            {data.entries.length === 0 && (
              <div className="p-4 mb-3 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <p className="text-base mb-3">Start by adding a result from your last visit, or load sample data to see how the charts work.</p>
                <div className="flex gap-2">
                  <Button onClick={() => setTab("add")}>Add results</Button>
                  <Button kind="secondary" onClick={loadSample}>Load sample data</Button>
                </div>
              </div>
            )}
            {CATEGORIES.map((c) => {
              const isOpen = !collapsed[c.id];
              return (
                <div key={c.id} className="mb-2">
                  <button data-tour={c.id === CATEGORIES[0].id ? "charts" : undefined}
                    onClick={() => setCollapsed((x) => ({ ...x, [c.id]: isOpen }))} aria-expanded={isOpen}
                    className="fx-press w-full flex items-center justify-between px-3 py-3 mb-2 rounded-md text-left focus:outline-none focus:ring-2"
                    style={{ background: C.chip, borderLeft: `4px solid ${C.accent}` }}>
                    <span className="text-lg font-bold" style={{ color: C.ink }}>{c.label}</span>
                    <span className="text-lg" aria-hidden="true" style={{ color: C.muted }}>{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && (
                    <div className="fx-fade">
                      {c.id === "kidney" && (
                        <EGFRChart entries={data.entries} profile={data.profile} meds={medsFor("egfr", sortedMeds)} domain={domain}
                          onOpenProfile={() => setTab("profile")} />
                      )}
                      {c.id === "neuro" && <SymptomChart entries={data.entries} meds={medsFor("symptoms", sortedMeds)} domain={domain} />}
                      {c.id === "gi" && <GIChart events={data.events || []} onDelete={deleteEvent} meds={medsFor("gi", sortedMeds)} />}
                      {METRICS.filter((m) => m.cat === c.id && !m.custom && !SYMPTOMS.some((sy) => sy.id === m.id)).map((m) => (
                        <MetricChart key={m.id} metric={m} entries={data.entries} meds={medsFor(m.id, sortedMeds)} domain={domain} units={units} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Solid vertical lines mark when a treatment started, fine dotted lines mark dose changes, and dashed
              lines mark when a treatment stopped. Dashed horizontal lines mark commonly used thresholds. Review
              your results with your care team.
            </p>
          </div>
        )}

        {tab === "add" && (
          <div>
            <div className="p-4 mb-4 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <Field label="Date of test">
                <input type="date" className={inputCls} style={inputStyle} value={form.date} max={today()}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <p className="text-sm mb-3" style={{ color: C.muted }}>Fill in only the results you have from this date.</p>
              {CATEGORIES.filter((c) => c.id !== "gi").map((c) => (
                <div key={c.id}>
                  <h3 className="text-base font-bold mt-4 mb-2 pb-1" style={{ color: C.accent, borderBottom: `1px solid ${C.line}` }}>
                    {c.label}
                  </h3>
                  {c.id === "kidney" && (() => {
                const bd = data.profile.birthDate;
                const child = bd && form.date ? ageAt(bd, form.date) < 18 : false;
                const scr = hasVal(form.creatinine)
                  ? (creatUnit === "umol" ? Number(form.creatinine) / UMOL_PER_MGDL : Number(form.creatinine)) : null;
                const preview = scr ? calcEGFR({ date: form.date, creatinine: scr, heightCm: form.heightCm }, data.profile) : null;
                return (
                  <div className="mb-3 p-3 rounded-md" style={{ background: C.subtle, border: `1px solid ${C.line}` }}>
                    <span className="block text-sm mb-1" style={{ color: C.muted }}>Creatinine</span>
                    <div className="flex gap-2 mb-2">
                      <input type="number" inputMode="decimal" step="any" min="0" className={inputCls} style={inputStyle}
                        aria-label="Creatinine" value={form.creatinine ?? ""} onChange={(e) => setForm({ ...form, creatinine: e.target.value })} />
                      <select className="px-2 py-2 rounded-md text-base" style={inputStyle} value={creatUnit}
                        onChange={(e) => setForm({ ...form, creatUnit: e.target.value })} aria-label="Creatinine unit">
                        <option value="mgdl">mg/dL</option>
                        <option value="umol">µmol/L</option>
                      </select>
                    </div>
                    {child && (
                      <Field label="Height (cm), needed for eGFR under age 18">
                        <input type="number" inputMode="decimal" step="any" min="0" className={inputCls} style={inputStyle}
                          value={form.heightCm ?? ""} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
                      </Field>
                    )}
                    {!bd || !data.profile.sex ? (
                      <p className="text-sm" style={{ color: C.muted }}>
                        Add your birth date and sex in your profile to see your eGFR.
                      </p>
                    ) : preview && preview.value ? (
                      <p className="text-sm">
                        eGFR for this result: <span className="font-bold">{preview.value} mL/min/1.73m²</span>
                        <span style={{ color: C.muted }}> ({preview.method})</span>
                      </p>
                    ) : preview && preview.missing === "height" ? (
                      <p className="text-sm" style={{ color: C.muted }}>Enter a height to calculate eGFR.</p>
                    ) : null}
                  </div>
                );
              })()}
                  {METRICS.filter((m) => m.cat === c.id && !m.custom).map((m) => (
                    <Field key={m.id} label={`${m.label} (${units.unit(m)})`}>
                      <input type="number" inputMode="decimal" step="any" min="0" className={inputCls} style={inputStyle}
                        value={form[m.id] ?? ""} onChange={(e) => setForm({ ...form, [m.id]: e.target.value })} />
                    </Field>
                  ))}
                </div>
              ))}
              {form.date > today() && (
                <p className="text-sm mb-2" style={{ color: C.error }}>The test date can't be in the future.</p>
              )}
              <Button onClick={saveEntry} disabled={!formHasValue || !form.date || form.date > today()}>Save results</Button>
            </div>

            {sortedEntries.length > 0 && (
              <div>
                <h2 className="text-base font-bold mb-2">Past results</h2>
                {sortedEntries.map((e) => (
                  <div key={e.id} className="flex justify-between items-start py-3" style={{ borderTop: `1px solid ${C.line}` }}>
                    <div>
                      <div className="font-bold">{fmtDate(toT(e.date))}</div>
                      <div className="text-sm" style={{ color: C.muted }}>
                        {[
                          ...METRICS.filter((m) => hasVal(e[m.id])).map((m) => `${m.short} ${units.show(m.id, e[m.id])} ${units.unit(m)}`),
                          ...(() => { const g = calcEGFR(e, data.profile); return g && g.value ? [`eGFR ${g.value}`] : []; })(),
                        ].join(", ")}
                      </div>
                    </div>
                    <button className="text-sm underline ml-3" style={{ color: C.muted }}
                      onClick={() => deleteEntry(e)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "meds" && (
          <div>
            <div className="p-4 mb-4 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <Field label="Treatment">
                <select className={inputCls} style={inputStyle} value={medForm.med}
                  onChange={(e) => setMedForm({ ...medForm, med: e.target.value })}>
                  {MED_GROUPS.map((g) => (
                    <optgroup key={g.id} label={g.label}>
                      {MEDS.filter((m) => m.group === g.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              {medForm.med === "trial" && (
                <Field label="Trial drug name or study number (optional)">
                  <input className={inputCls} style={inputStyle} placeholder="e.g. study drug or NCT number"
                    value={medForm.customName} onChange={(e) => setMedForm({ ...medForm, customName: e.target.value })} />
                </Field>
              )}
              {medForm.med === "custom" && (
                <>
                  <Field label="Medicine name">
                    <input className={inputCls} style={inputStyle} placeholder="e.g. Aspirin, or Lipitor 20 mg"
                      value={medForm.customName} onChange={(e) => setMedForm({ ...medForm, customName: e.target.value })} />
                  </Field>
                  {!resolveMedForm(medForm).recognized && (
                  <div className="mb-3">
                    <span className="block text-sm mb-2" style={{ color: C.muted }}>Show this medicine on these graphs</span>
                    <div className="grid grid-cols-2 gap-2">
                      {CHART_OPTIONS.map((c) => {
                        const on = medForm.charts.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm px-2 py-2 rounded-md"
                            style={{ border: `1px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : C.surface }}>
                            <input type="checkbox" checked={on}
                              onChange={() => setMedForm({
                                ...medForm,
                                charts: on ? medForm.charts.filter((x) => x !== c.id) : [...medForm.charts, c.id],
                              })} />
                            {c.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  )}
                </>
              )}
              {(() => {
                const r = resolveMedForm(medForm);
                if (r.recognized) {
                  const kind = r.med === "statin" ? "a statin" : "an SGLT2 inhibitor";
                  return (
                    <p className="text-sm mb-3 p-2 rounded-md" role="status"
                      style={{ color: C.ink, background: C.accentSoft, border: `1px solid ${C.accent}` }}>
                      <span className="font-bold">{r.recognized.label}</span> is {kind}. It will be saved as {kind}
                      {r.startDose ? ` (${r.startDose})` : ""} and shown on: {chartsForMed({ med: r.med }).map(chartLabel).join(", ")}.
                    </p>
                  );
                }
                return medForm.med !== "custom" ? (
                  <p className="text-sm mb-3" style={{ color: C.muted }}>
                    Shown on: {chartsForMed({ med: medForm.med }).map(chartLabel).join(", ")}
                  </p>
                ) : null;
              })()}
              <Field label="Start date">
                <input type="date" className={inputCls} style={inputStyle} value={medForm.start}
                  onChange={(e) => setMedForm({ ...medForm, start: e.target.value })} />
              </Field>
              <Field label="Starting dose (optional)">
                <input className={inputCls} style={inputStyle}
                  placeholder={{ statin: "e.g. Atorvastatin 20 mg daily", sglt2: "e.g. Dapagliflozin 10 mg daily",
                    acei: "e.g. Lisinopril 5 mg daily", arb: "e.g. Losartan 25 mg daily" }[medForm.med] || "e.g. 10 mg daily"}
                  value={medForm.startDose} onChange={(e) => setMedForm({ ...medForm, startDose: e.target.value })} />
              </Field>
              <Field label="Stop date (leave blank if still taking)">
                <input type="date" className={inputCls} style={inputStyle} value={medForm.stop}
                  onChange={(e) => setMedForm({ ...medForm, stop: e.target.value })} />
              </Field>
              {medForm.stop && medForm.start && medForm.stop < medForm.start && (
                <p className="text-sm mb-2" style={{ color: C.error }}>The stop date is before the start date.</p>
              )}
              <Button onClick={addMed}
                disabled={!medForm.start || (medForm.stop && medForm.stop < medForm.start)
                  || (medForm.med === "custom" && !resolveMedForm(medForm).recognized
                    && (!medForm.customName.trim() || medForm.charts.length === 0))}>
                Add treatment
              </Button>
            </div>
            {sortedMeds.length === 0 ? (
              <p className="text-base" style={{ color: C.muted }}>No treatments yet. Each one you add appears as a marker on your charts.</p>
            ) : sortedMeds.map((m) => {
              const d = medInfo(m);
              const doses = [...(m.doses || [])].sort((a, b) => toT(a.date) - toT(b.date));
              const f = doseForms[m.id] || { date: today(), dose: "" };
              return (
                <div key={m.id} className="py-3" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div className="flex justify-between items-start">
                    <div className="pl-3" style={{ borderLeft: `3px solid ${d.color}` }}>
                      <div className="font-bold">{d.name}</div>
                      <div className="text-sm" style={{ color: C.muted }}>
                        Started {fmtDate(toT(m.start))}{m.startDose ? ` at ${m.startDose}` : ""}
                        {m.stop ? `, stopped ${fmtDate(toT(m.stop))}` : ", ongoing"}
                      </div>
                      <div className="text-xs mt-1" style={{ color: C.muted }}>
                        Shown on: {chartsForMed(m).map(chartLabel).join(", ") || "no graphs"}
                      </div>
                    </div>
                    <button className="text-sm underline ml-3" style={{ color: C.muted }}
                      onClick={() => deleteMed(m)}>
                      Delete
                    </button>
                  </div>

                  {doses.length > 0 && (
                    <ul className="mt-2 ml-3 pl-3" style={{ borderLeft: `1px dotted ${d.color}` }}>
                      {doses.map((dc) => (
                        <li key={dc.id} className="flex justify-between text-sm py-1">
                          <span>
                            <span style={{ color: C.muted }}>{fmtDate(toT(dc.date))}: </span>
                            changed to {dc.dose}
                          </span>
                          <button className="underline ml-3" style={{ color: C.muted }}
                            onClick={() => deleteDose(m.id, dc)}>Delete</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {openDose === m.id ? (
                    <div className="fx-fade mt-3 ml-3 p-3 rounded-md" style={{ background: C.subtle, border: `1px solid ${C.line}` }}>
                      <Field label="Date of dose change">
                        <input type="date" className={inputCls} style={inputStyle} value={f.date}
                          onChange={(e) => setDoseForms((s) => ({ ...s, [m.id]: { ...f, date: e.target.value } }))} />
                      </Field>
                      <Field label="New dose">
                        <input className={inputCls} style={inputStyle} placeholder="e.g. 10 mg daily" value={f.dose}
                          onChange={(e) => setDoseForms((s) => ({ ...s, [m.id]: { ...f, dose: e.target.value } }))} />
                      </Field>
                      <div className="flex gap-2">
                        <Button onClick={() => addDose(m.id)} disabled={!f.date || !f.dose}>Save dose change</Button>
                        <Button kind="secondary" onClick={() => setOpenDose("")}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button className="mt-2 ml-3 text-sm font-bold underline" style={{ color: C.accent }}
                      onClick={() => setOpenDose(m.id)}>
                      Log a dose change
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "news" && (
          <div>
            <h2 className="text-lg font-bold mb-2">Patient support</h2>
            <p className="text-sm mb-3" style={{ color: C.muted }}>
              Connect with other people living with Fabry disease and with organizations that support them.
            </p>
            {SUPPORT_ORGS.filter((o) => o.regions.includes(region)).map((o) => (
              <section key={o.name} className="p-4 mb-3 rounded-lg"
                style={{ background: C.surface, border: `1px solid ${C.line}`, borderLeft: `4px solid ${o.color}` }}>
                <h3 className="text-base font-bold mb-1">{o.name}</h3>
                <p className="text-sm mb-3" style={{ color: C.muted }}>{o.about}</p>
                <div className="flex flex-wrap gap-2">
                  {o.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                      className="fx-press px-3 py-2 rounded-md text-sm font-bold focus:outline-none focus:ring-2"
                      style={{ border: `1px solid ${o.color}`, color: o.color }}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </section>
            ))}

            <h2 className="text-lg font-bold mb-2 mt-6">Clinical trials</h2>
            <p className="text-sm mb-3" style={{ color: C.muted }}>
              Fabry disease studies registered on ClinicalTrials.gov. Ask your care team whether a trial might be right for you.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {TRIAL_FILTERS.map((f) => (
                <button key={f.id} onClick={() => setTrialFilter(f.id)}
                  className="fx-press px-3 py-1 rounded-full text-sm font-bold focus:outline-none focus:ring-2"
                  style={trialFilter === f.id
                    ? { background: C.invert, color: C.onInvert }
                    : { background: C.surface, color: C.ink, border: `1px solid ${C.line}` }}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="mb-3">
              {trialsLoading && (
                <p className="text-sm" style={{ color: C.muted }}>Loading Fabry trials from ClinicalTrials.gov…</p>
              )}
              {trialsError && <p className="text-sm mt-2" style={{ color: C.error }}>{trialsError}</p>}
              <a href={CTGOV_SEARCH_URL} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-sm font-bold underline" style={{ color: C.accent }}>
                Browse all Fabry trials on ClinicalTrials.gov
              </a>
            </div>
            {data.trials && data.trials.items && (() => {
              const q = trialQuery.trim().toLowerCase();
              const list = data.trials.items.filter((t) => !q || [t.title, t.sponsor, ...t.interventions, ...t.locations]
                .join(" ").toLowerCase().includes(q));
              const label = (TRIAL_FILTERS.find((f) => f.id === data.trials.filter) || {}).label;
              return (
                <div>
                  <p className="text-sm mb-2" style={{ color: C.muted }}>
                    {data.trials.items.length} trials ({label ? label.toLowerCase() : "all"}) from {data.trials.source},
                    updated {fmtDate(toT(data.trials.fetched))}.
                  </p>
                  {data.trials.items.length > 3 && (
                    <input className={inputCls + " mb-2"} style={inputStyle} placeholder="Filter by drug, sponsor or city"
                      value={trialQuery} onChange={(e) => { setTrialQuery(e.target.value); setTrialShown(10); }} />
                  )}
                  {list.length === 0 && (
                    <p className="text-sm py-2" style={{ color: C.muted }}>
                      {q ? "No trials match that filter. Try a different word." : "No trials found with this status. Try \"All trials\"."}
                    </p>
                  )}
                  {list.slice(0, trialShown).map((t) => <TrialCard key={t.nct} t={t} />)}
                  {list.length > trialShown && (
                    <div className="pt-2">
                      <Button kind="secondary" onClick={() => setTrialShown((n) => n + 10)}>
                        Show more trials ({list.length - trialShown} left)
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}

            <h2 className="text-lg font-bold mb-2 mt-6">Recent research</h2>
            <p className="text-base mb-1">The newest Fabry disease articles published in the last six months, from PubMed.</p>
            <p className="text-sm mb-3" style={{ color: C.muted }}>
              Searching sends only the topic you choose. Your health information stays on this device.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {NEWS_TOPICS.map((t) => (
                <button key={t.id} onClick={() => setTopic(t.id)}
                  className="fx-press px-3 py-1 rounded-full text-sm font-bold focus:outline-none focus:ring-2"
                  style={topic === t.id
                    ? { background: C.invert, color: C.onInvert }
                    : { background: C.surface, color: C.ink, border: `1px solid ${C.line}` }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mb-4">
              {newsLoading && (
                <p className="text-sm" style={{ color: C.muted }}>Searching PubMed for recent articles…</p>
              )}
              {newsError && <p className="text-sm mt-2" style={{ color: C.error }}>{newsError}</p>}
              <a href={PUBMED_SEARCH_URL} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-sm font-bold underline" style={{ color: C.accent }}>
                Search the newest Fabry articles on PubMed
              </a>
            </div>

            {data.news && data.news.items && data.news.items.length > 0 ? (
              <div>
                <p className="text-sm mb-2" style={{ color: C.muted }}>
                  Updated {fmtDate(toT(data.news.fetched))}
                  {data.news.topic && data.news.topic !== "all"
                    ? `, topic: ${(NEWS_TOPICS.find((t) => t.id === data.news.topic) || {}).label}` : ""}
                </p>
                {data.news.items.map((a, i) => <ArticleCard key={a.id} a={a} delay={i * 140} />)}
              </div>
            ) : data.news && data.news.topic === topic && !newsLoading && !newsError ? (
              <p className="text-base" style={{ color: C.muted }}>No new articles on this topic in the last six months. Try "All".</p>
            ) : !newsLoading && !newsError && (
              <p className="text-base" style={{ color: C.muted }}>Choose a topic to see what's been published lately.</p>
            )}

            <p className="text-xs mt-4" style={{ color: C.muted }}>
              These articles are written for health professionals. Talk with your care team before changing anything
              about your treatment.
            </p>

            <h2 className="text-lg font-bold mb-2 mt-8">About the developers</h2>
            {APP_INFO.developers.map((dev) => (
              <section key={dev.name} className="p-4 mb-3 rounded-lg"
                style={{ background: C.surface, border: `1px solid ${C.line}`, borderLeft: `4px solid ${C.accent}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div aria-hidden="true" className="flex items-center justify-center rounded-full text-lg font-bold"
                    style={{ width: 52, height: 52, background: "#0B4F57", color: "#fff", flexShrink: 0 }}>
                    {dev.name.replace(/,.*$/, "").split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: C.ink }}>{dev.name}</p>
                    <p className="text-sm" style={{ color: C.muted }}>{dev.role}</p>
                  </div>
                </div>
                <p className="text-base" style={{ color: C.ink }}>{dev.bio}</p>
              </section>
            ))}
            <p className="text-sm mb-3" style={{ color: C.muted }}>
              {APP_INFO.name} helps you keep track of your health. It does not give medical advice and is not a
              substitute for care from your medical team.{" "}
              <button onClick={() => setShowTerms(true)} className="underline font-bold" style={{ color: C.accent }}>
                Read the terms of use
              </button>
            </p>
            <p className="text-xs mb-2" style={{ color: C.muted }}>{APP_INFO.name}, {APP_INFO.version}</p>
          </div>
        )}

        {tab === "profile" && (
          <div>
            <div className="p-4 mb-4 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <Field label="GLA variant (from your genetic test report)">
                <input className={inputCls} style={inputStyle} placeholder="e.g. c.644A>G (p.N215S)"
                  value={data.profile.mutation}
                  onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, mutation: e.target.value } }))} />
              </Field>
              <Field label="Phenotype">
                <select className={inputCls} style={inputStyle} value={data.profile.phenotype}
                  onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, phenotype: e.target.value } }))}>
                  <option value="">Not sure</option>
                  <option value="Classic">Classic</option>
                  <option value="Late-onset">Late-onset</option>
                </select>
              </Field>
              <Field label="Birth date">
                <input type="date" className={inputCls} style={inputStyle} value={data.profile.birthDate || ""}
                  onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, birthDate: e.target.value } }))} />
              </Field>
              <Field label="Sex (used in the eGFR calculation)">
                <select className={inputCls} style={inputStyle} value={data.profile.sex || ""}
                  onChange={(e) => setData((d) => ({ ...d, profile: { ...d.profile, sex: e.target.value } }))}>
                  <option value="">Choose</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </Field>
            </div>

            <h2 className="text-base font-bold mb-2">Export your record</h2>
            <p className="text-sm mb-3" style={{ color: C.muted }}>
              A spreadsheet file is easiest to share with your care team. A backup file can be restored into this app later.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <Button onClick={() => exportData("csv")}>Export spreadsheet (CSV)</Button>
              <Button kind="secondary" onClick={() => exportData("json")}>Export backup (JSON)</Button>
            </div>
            {exported && (
              <div className="fx-fade p-3 mb-5 rounded-md" style={{ background: C.subtle, border: `1px solid ${C.line}` }}>
                <p className="text-sm mb-2">
                  Downloading <span className="font-bold">{exported.filename}</span>. If nothing downloaded, copy the text
                  below and paste it into an email or note.
                </p>
                <textarea readOnly value={exported.text} rows={6} onFocus={(e) => e.target.select()}
                  className="w-full p-2 rounded-md text-xs mb-2" style={{ ...inputStyle, fontFamily: "inherit" }} />
                <div className="flex gap-2 items-center">
                  <Button kind="secondary" onClick={copyExport}>Copy text</Button>
                  <Button kind="secondary" onClick={() => setExported(null)}>Close</Button>
                  {copied && <span className="text-sm" style={{ color: C.accent }}>Copied</span>}
                </div>
              </div>
            )}

            <h2 className="text-base font-bold mb-2 mt-5">Restore from a backup</h2>
            <input type="file" accept=".json,application/json" className="text-sm mb-2"
              onChange={(e) => { readBackup(e.target.files[0]); e.target.value = ""; }} />
            {importError && <p className="text-sm mb-2" style={{ color: C.error }}>{importError}</p>}
            {pendingImport && (
              <div className="fx-fade p-3 mb-5 rounded-md" style={{ background: C.subtle, border: `1px solid ${C.line}` }}>
                <p className="text-sm mb-2">
                  This backup{pendingImport.exported ? ` from ${fmtDate(toT(pendingImport.exported))}` : ""} has{" "}
                  {pendingImport.entries.length} results, {pendingImport.meds.length} treatments and{" "}
                  {pendingImport.events.length} stomach episodes. Restoring replaces everything currently in the app.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    const { exported: _x, ...rest } = pendingImport;
                    setData({ ...rest, onboarded: true });
                    setPendingImport(null);
                    setTab("trends");
                  }}>Restore backup</Button>
                  <Button kind="secondary" onClick={() => setPendingImport(null)}>Cancel</Button>
                </div>
              </div>
            )}

            <h2 className="text-base font-bold mb-2 mt-5">Your data</h2>
            <p className="text-sm mb-3" style={{ color: C.muted }}>
              Everything is stored only in this browser on this device. Clearing your browser's data erases it, so
              export a backup now and then.
            </p>
            <div className="flex flex-wrap gap-2">
              {confirm === "sample" ? (
                <>
                  <Button onClick={loadSample}>Replace with sample data</Button>
                  <Button kind="secondary" onClick={() => setConfirm("")}>Cancel</Button>
                </>
              ) : confirm === "clear" ? (
                <>
                  <Button onClick={() => { setData(EMPTY); setConfirm(""); }}>Delete all my data</Button>
                  <Button kind="secondary" onClick={() => setConfirm("")}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button kind="secondary" onClick={() => setConfirm("sample")}>Load sample data</Button>
                  <Button kind="secondary" onClick={() => setConfirm("clear")}>Delete all data</Button>
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Tab bar at the bottom of the screen, within thumb reach. */}
      <nav aria-label="Sections" className="fixed bottom-0 left-0 right-0 z-30"
        style={{ background: C.surface, borderTop: `1px solid ${C.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {tabs.map(([id, label]) => {
            const on = tab === id;
            return (
              <button key={id} data-tour={`tab-${id}`} onClick={() => setTab(id)} aria-current={on ? "page" : undefined}
                className="fx-press flex flex-col items-center justify-center gap-0.5 text-xs font-bold focus:outline-none focus:ring-2"
                style={{ height: 60, color: on ? C.accent : C.muted }}>
                <span className="flex items-center justify-center rounded-full"
                  style={{ width: 52, height: 30, background: on ? C.accentSoft : "transparent" }}>
                  <TabIcon id={id} />
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {showSettings && <SettingsDialog theme={theme} onTheme={chooseTheme} region={region} onRegion={chooseRegion}
        onTour={() => { setShowSettings(false); setTab("trends"); setTourOn(true); }}
        onTerms={() => { setShowSettings(false); setShowTerms(true); }}
        onClose={() => setShowSettings(false)} />}
      {showTerms && <TermsDialog accepted={terms} onClose={() => setShowTerms(false)} />}
      {tourOn && <Tour onClose={endTour} onSample={loadSample} hasEntries={data.entries.length > 0} />}
      {toast && (
        <div role="status" className="fixed left-0 right-0 z-40 px-4 flex justify-center"
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}>
          <div className="fx-toast flex items-center gap-4 px-4 py-3 rounded-lg text-base"
            style={{ background: C.invert, color: C.onInvert, maxWidth: 480, width: "100%" }}>
            <span className="flex-1">{toast.text}</span>
            <button className="font-bold underline" onClick={() => { toast.undo(); setToast(null); }}>Undo</button>
          </div>
        </div>
      )}
    </div>
  );
}
