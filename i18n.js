// Translations. The app is written in English; for another language, every piece of text on the screen is looked up
// in that language's file (lang/xx.json, loaded from the app's own site) and swapped in place. Nothing is sent to a
// translation service, and anything not in the file stays in English.
//
// Text with numbers, dates or condition names is matched as a template: "Pain 5/10 logged for today" is looked up as
// "Pain {0}/{1} logged for today". Dates are wrapped in invisible markers (U+2068 … U+2069) when another language is
// on, so they become placeholders whatever their format. The English strings (keys) are in lang/keys.json; each
// language file is an array of translations in the same order.

export const LANG_KEY = "fabry-tracker-lang";
export const LANGS = [
  { id: "en", label: "English", locale: undefined },
  { id: "es", label: "Español", locale: "es" },
  { id: "fr", label: "Français", locale: "fr" },
  { id: "de", label: "Deutsch", locale: "de" },
  { id: "it", label: "Italiano", locale: "it" },
  { id: "pt", label: "Português", locale: "pt-BR" },
  { id: "zh", label: "简体中文", locale: "zh-CN" },
  { id: "ar", label: "العربية", locale: "ar-u-nu-latn", rtl: true },
];

const state = { lang: "en", dict: null, cond: [] };
const FSI = "⁨";
const PDI = "⁩";

export const currentLang = () => state.lang;
export const isRTL = () => Boolean((LANGS.find((l) => l.id === state.lang) || {}).rtl);
// The locale for dates. English keeps the phone's own date style, as before.
export const dateLocale = () => (LANGS.find((l) => l.id === state.lang) || {}).locale;
// Marks a date (or other value that shouldn't be translated) so it becomes a placeholder.
// (window.__i18nKeys turns the markers on in English too; it's used only to collect the strings to translate.)
export const dyn = (s) => (state.lang === "en" && !(typeof window !== "undefined" && window.__i18nKeys) ? s : FSI + s + PDI);

export function savedLang() {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    if (LANGS.some((l) => l.id === v)) return v;
  } catch (e) { /* storage blocked */ }
  try {
    for (const l of navigator.languages || [navigator.language]) {
      const base = String(l).toLowerCase().split(/[-_@]/)[0];
      if (LANGS.some((x) => x.id === base)) return base;
    }
  } catch (e) { /* fall through */ }
  return "en";
}

// Condition names inside sentences are placeholders too, translated on their own.
export function setConditionNames(names) {
  state.cond = [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length);
}

const EN_MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
const EN_DATES = new RegExp(`${EN_MONTH} \\d{1,2}, \\d{4}|${EN_MONTH} \\d{2}(?!\\d)|(?:January|February|March|April|May|June|July|August|September|October|November|December) \\d{4}|${EN_MONTH}(?= |$)`, "g");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turns a string into its template and the values that fill it.
export function templateOf(s) {
  const vals = [];
  // Values are swapped for private-use characters first, so later steps (like finding numbers) don't touch them.
  const put = (kind) => (m) => { vals.push({ kind, v: m }); return String.fromCharCode(0xe000 + vals.length - 1); };
  let t = s.replace(new RegExp(`${FSI}[^${PDI}]*${PDI}`, "g"), put("raw"));
  t = t.replace(EN_DATES, put("raw"));
  if (state.cond.length) t = t.replace(new RegExp(state.cond.map(escRe).join("|"), "g"), put("cond"));
  t = t.replace(/[-−]?\d+(?:[.,]\d+)*/g, put("raw"));
  // Number the placeholders in order of appearance.
  let n = 0;
  const order = [];
  t = t.replace(/[\ue000-\ue0ff]/g, (c) => { order.push(vals[c.charCodeAt(0) - 0xe000]); return `{${n++}}`; });
  return { t, vals: order };
}

function lookup(s) {
  const d = state.dict;
  if (!d) return null;
  if (Object.prototype.hasOwnProperty.call(d, s)) return d[s];
  const { t, vals } = templateOf(s);
  if (!vals.length || !Object.prototype.hasOwnProperty.call(d, t)) return null;
  return d[t].replace(/\{(\d+)\}/g, (m, i) => {
    const v = vals[Number(i)];
    if (!v) return m;
    return v.kind === "cond" ? (Object.prototype.hasOwnProperty.call(d, v.v) ? d[v.v] : v.v) : v.v;
  });
}

// Translates one string (keeping its surrounding spaces). Used for text that isn't on the screen, like emails.
export function tr(s) {
  if (state.lang === "en" || !s) return s;
  const m = String(s).match(/^(\s*)([\s\S]*?)(\s*)$/);
  const out = lookup(m[2]);
  return out === null || out === undefined ? s : m[1] + out + m[3];
}

// ---------- On-screen translation ----------
const ATTRS = ["aria-label", "placeholder", "title", "alt"];
const textSrc = new WeakMap(); // text node -> { src, out }
const attrSrc = new WeakMap(); // element -> { [attr]: { src, out } }
const touched = new Set(); // nodes changed, so they can be put back when the language changes
let observer = null;

const skip = (el) => {
  for (let e = el; e; e = e.parentElement) {
    const tag = e.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") return true;
    if (e.hasAttribute && e.hasAttribute("data-no-translate")) return true;
  }
  return false;
};

function doText(node) {
  if (state.lang === "en") return;
  const cur = node.nodeValue;
  const rec = textSrc.get(node);
  if (rec && rec.lang === state.lang && cur === rec.out) return;
  // Still showing another language's translation: start again from the English.
  const src = rec && cur === rec.out ? rec.src : cur;
  if (!src || !/[A-Za-z]/.test(src) || skip(node.parentElement)) return;
  const out = tr(src);
  textSrc.set(node, { src, out, lang: state.lang });
  touched.add(node);
  if (out !== cur) node.nodeValue = out;
}

function doAttrs(el) {
  if (state.lang === "en" || !el.getAttribute || skip(el)) return;
  let recs = attrSrc.get(el);
  for (const a of ATTRS) {
    const cur = el.getAttribute(a);
    if (!cur) continue;
    const rec = recs && recs[a];
    if (rec && rec.lang === state.lang && cur === rec.out) continue;
    const src = rec && cur === rec.out ? rec.src : cur;
    const out = tr(src);
    if (!recs) { recs = {}; attrSrc.set(el, recs); }
    recs[a] = { src, out, lang: state.lang };
    touched.add(el);
    if (out !== cur) el.setAttribute(a, out);
  }
}

function walk(root) {
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1) return;
  doAttrs(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = it.nextNode();
  while (n) {
    if (n.nodeType === 3) doText(n); else doAttrs(n);
    n = it.nextNode();
  }
}

// Puts every translated piece back to English.
function restore() {
  for (const n of touched) {
    if (!n.isConnected) { touched.delete(n); continue; }
    if (n.nodeType === 3) {
      const r = textSrc.get(n);
      if (r && n.nodeValue === r.out) n.nodeValue = r.src;
      textSrc.delete(n);
    } else {
      const recs = attrSrc.get(n) || {};
      for (const a of Object.keys(recs)) if (n.getAttribute(a) === recs[a].out) n.setAttribute(a, recs[a].src);
      attrSrc.delete(n);
    }
  }
  touched.clear();
}

function start() {
  if (observer) return;
  observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") doText(m.target);
      else if (m.type === "attributes") doAttrs(m.target);
      else m.addedNodes.forEach((n) => walk(n));
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// Loads keys and the language file once; later switches reuse them.
const files = {};
// The files belong in a "lang" folder next to the app; if they were uploaded straight into the app's folder instead,
// they're found there too.
const getJSON = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error("missing"); return r.json(); });
async function loadJSON(name) {
  if (!files[name]) {
    files[name] = getJSON(`lang/${name}.json`).catch(() => getJSON(`${name}.json`));
    files[name].catch(() => { delete files[name]; }); // try again next time
  }
  return files[name];
}

// Switches language. Resolves to true when the language is on (false if its file couldn't be loaded).
export async function setLanguage(id) {
  const lang = LANGS.some((l) => l.id === id) ? id : "en";
  try { window.localStorage.setItem(LANG_KEY, lang); } catch (e) { /* not critical */ }
  // English while the new file loads, so nothing is translated with the old language in between.
  state.lang = "en";
  state.dict = null;
  restore();
  if (lang === "en") {
    state.lang = "en";
    state.dict = null;
    applyDocument();
    return true;
  }
  let ok = true;
  try {
    const [keys, vals] = await Promise.all([loadJSON("keys"), loadJSON(lang)]);
    if (!Array.isArray(keys) || !Array.isArray(vals)) throw new Error("bad file");
    const dict = {};
    keys.forEach((k, i) => { if (typeof k === "string" && typeof vals[i] === "string" && vals[i]) dict[k] = vals[i]; });
    state.dict = dict;
    state.lang = lang;
  } catch (e) {
    state.dict = null;
    state.lang = "en";
    ok = false;
  }
  applyDocument();
  if (state.lang !== "en") {
    start();
    walk(document.body);
  }
  return ok;
}

function applyDocument() {
  const html = document.documentElement;
  html.setAttribute("lang", state.lang === "zh" ? "zh-Hans" : state.lang);
  html.setAttribute("dir", isRTL() ? "rtl" : "ltr");
  window.dispatchEvent(new Event("fabry-lang-change"));
}
