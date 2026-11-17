// Understands a spoken lab result or medicine change, such as "creatinine 1.4" or "started Fabrazyme 1 mg per kg".
// Used for entries spoken on the Apple Watch. Nothing here saves anything: the patient sees what was understood and
// checks it before it goes into the record, because dictation can mishear a number or a name.
//
// makeVoiceParser({ metrics, meds, unitOptions, regionUnit, tr }) returns parse(text, records), which returns a list of
//   { type: "lab", metric, value, unit, unitGuessed, said }
//   { type: "med", action: "start" | "stop" | "dose", med, record, dose, said }
//   { type: "unknown", said }

// Folds one character for matching: lower case, no accents. Always one character, so positions stay the same as the
// original text (which is used to keep a dose exactly as it was said).
const fold1 = (c) => {
  const f = c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return f.length === 1 ? f : c.toLowerCase().charAt(0) || c;
};
const fold = (s) => Array.from(String(s), fold1).join("");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CJK = /[　-鿿가-힯]/;

// Number words a dictation might leave as words (mostly small ones, like a pain score).
const WORDS = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(" ");
// "1 point 4", "1 coma 4" and so on, in each of the app's languages.
const POINT = /(\d+)\s+(?:point|coma|virgule|komma|virgola|virgula|punto|punkt)\s+(\d+)/g;

const ACTIONS = {
  stop: ["stop", "stopped", "stopping", "quit", "discontinued", "ended", "off", "deje", "suspendi", "pare", "arrete", "abgesetzt", "gestoppt", "aufgehort", "smesso", "interrotto", "sospeso", "parei", "停", "أوقفت", "توقفت"],
  start: ["start", "started", "starting", "begin", "began", "new", "empece", "empezar", "inicie", "iniciar", "comence", "commence", "debute", "begonnen", "angefangen", "iniziato", "cominciato", "comecei", "开始", "بدأت"],
  dose: ["dose", "dosis", "dosage", "changed", "change", "increased", "increase", "decreased", "decrease", "now", "switched", "cambie", "aumente", "reduje", "augmente", "diminue", "geandert", "erhoht", "reduziert", "cambiato", "aumentato", "ridotto", "mudei", "aumentei", "diminui", "剂量", "جرعة"],
};
// Little words around a dose that aren't part of it ("to 2 mg", "at 300 mg").
const FILLER = /^(?:to|at|of|is|was|on|a|de|da|di|du|auf|zu|sur|em|para|por)\s+/i;

// Spoken unit words, so "milligrams per deciliter" matches "mg/dL".
function unitText(s) {
  return fold(s)
    .replace(/micro ?grams?|mcg/g, "ug").replace(/milli ?grams?/g, "mg").replace(/nano ?grams?/g, "ng").replace(/pico ?grams?/g, "pg")
    .replace(/milli ?moles?/g, "mmol").replace(/micro ?moles?/g, "umol").replace(/nano ?moles?/g, "nmol").replace(/pico ?moles?/g, "pmol")
    .replace(/milli ?liters?|millilitres?/g, "ml").replace(/deci ?liters?|decilitres?/g, "dl").replace(/liters?|litres?/g, "l")
    .replace(/grams?/g, "g").replace(/units?/g, "u").replace(/percent|por ?ciento|pour ?cent|prozent|per ?cento|por ?cento/g, "%")
    .replace(/\s+(?:per|por|par|pro)\s+/g, "/").replace(/[µμ]/g, "u").replace(/²/g, "2").replace(/\s+/g, "");
}
const unitKey = (u) => fold(u).replace(/[µμ]/g, "u").replace(/²/g, "2").replace(/\s+/g, "");

export function makeVoiceParser({ metrics, meds, unitOptions, regionUnit, tr = (s) => s }) {
  // Every name a lab or medicine can be called by, longest first so "LDL cholesterol" wins over "cholesterol".
  const names = [];
  const add = (name, entry) => {
    const k = fold(String(name || "").trim()).replace(/\s+/g, " ");
    if (k.length >= 2 && !names.some((n) => n.key === k)) names.push({ key: k, ...entry });
  };
  const variants = (label) => {
    const out = [label];
    const base = label.replace(/\s*\([^)]*\)/g, "").trim();
    out.push(base);
    (label.match(/\(([^)]*)\)/g) || []).forEach((p) => {
      p.slice(1, -1).replace(/\be\.g\.\s*/gi, "").replace(/\band others\b/gi, "")
        .split(/,|\bor\b|\band\b/).map((x) => x.trim()).filter((x) => x.length >= 3).forEach((x) => out.push(x));
    });
    return out;
  };
  metrics.forEach((m) => {
    [m.label, m.short, tr(m.label), tr(m.short)].filter(Boolean).forEach((l) => variants(l).forEach((v) => add(v, { type: "lab", id: m.id })));
  });
  meds.forEach((m) => {
    [m.name, m.short, tr(m.name), tr(m.short)].filter(Boolean).forEach((l) => variants(l).forEach((v) => add(v, { type: "med", id: m.id, custom: m.custom })));
  });
  names.sort((a, b) => b.key.length - a.key.length);
  const metricById = (id) => metrics.find((m) => m.id === id);

  const hasWord = (text, words) => words.some((w) => (CJK.test(w) || /[؀-ۿ]/.test(w)
    ? text.includes(w) : new RegExp(`(?:^|[^\\p{L}\\p{N}])${escRe(w)}(?![\\p{L}\\p{N}])`, "u").test(text)));

  return function parse(said, records = []) {
    const original = String(said || "").slice(0, 600);
    // Same length as the original: only letters are folded.
    let text = fold(original);
    WORDS.forEach((w, i) => { text = text.replace(new RegExp(`\\b${w}\\b`, "g"), (m) => String(i).padEnd(m.length, " ")); });
    text = text.replace(POINT, (m, a, b) => `${a}.${b}`.padEnd(m.length, " "));
    // Decimal commas ("1,4"), but not thousands ("1,200").
    text = text.replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2");

    // Find every lab and medicine named, without overlaps.
    const found = [];
    const taken = new Array(text.length).fill(false);
    names.forEach((n) => {
      const re = CJK.test(n.key) ? new RegExp(escRe(n.key), "g")
        : new RegExp(`(?<![\\p{L}\\p{N}])${escRe(n.key).replace(/ /g, "\\s+")}(?![\\p{L}\\p{N}])`, "gu");
      let mm;
      while ((mm = re.exec(text))) {
        const s = mm.index, e = s + mm[0].length;
        if (taken.slice(s, e).some(Boolean)) continue;
        for (let i = s; i < e; i++) taken[i] = true;
        found.push({ ...n, s, e });
      }
    });
    found.sort((a, b) => a.s - b.s);
    if (!found.length) return [{ type: "unknown", said: original }];

    const out = [];
    found.forEach((f, i) => {
      const before = text.slice(i ? found[i - 1].e : 0, f.s);
      const segEnd = i + 1 < found.length ? found[i + 1].s : text.length;
      const seg = text.slice(f.e, segEnd);
      // This part of the sentence ("started A and stopped B" has two).
      const SEP = /\s(?:and|then|also|y|et|und|e|poi|depois|puis|dann|然后|و)\s|[,;]|\.(?!\d)/g;
      const bParts = before.split(SEP);
      const clauseStart = f.s - bParts[bParts.length - 1].length;
      const cut = seg.search(SEP);
      const clauseEnd = cut < 0 ? segEnd : f.e + cut;
      const piece = original.slice(clauseStart, clauseEnd).trim();
      if (f.type === "lab") {
        const m = metricById(f.id);
        const num = text.slice(f.e, clauseEnd).match(/-?\d+(?:\.\d+)?/);
        if (!num) { out.push({ type: "unknown", said: piece }); return; }
        const value = Number(num[0]);
        if (!isFinite(value) || (m.unit === "/10" && (value < 0 || value > 10))) { out.push({ type: "unknown", said: piece }); return; }
        const rest = unitText(seg.slice(num.index + num[0].length));
        const opts = (unitOptions(m.id) || []).slice().sort((a, b) => unitKey(b.unit).length - unitKey(a.unit).length);
        const hit = opts.find((o) => unitKey(o.unit) && rest.startsWith(unitKey(o.unit)));
        out.push({ type: "lab", metric: m.id, value, unit: hit ? hit.unit : regionUnit(m), unitGuessed: !hit, said: piece });
        return;
      }
      // A medicine: what happened to it? Only this part of the sentence counts ("started A and stopped B").
      const around = text.slice(clauseStart, clauseEnd);
      const current = records.filter((r) => r.med === f.id).sort((a, b) => (a.start < b.start ? 1 : -1))[0];
      const active = current && !current.stop;
      let dose = original.slice(f.e, clauseEnd);
      Object.values(ACTIONS).flat().forEach((w) => {
        if (!CJK.test(w)) dose = dose.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escRe(w)}(?![\\p{L}\\p{N}])`, "giu"), " ");
      });
      dose = dose.replace(/\s+/g, " ").replace(/^[\s,.;:-]+|[\s,.;:]+$/g, "");
      while (FILLER.test(dose)) dose = dose.replace(FILLER, "");
      dose = /\d/.test(dose) ? dose.slice(0, 60) : "";
      let action;
      if (hasWord(around, ACTIONS.stop)) action = "stop";
      else if (hasWord(around, ACTIONS.start)) action = active ? (dose ? "dose" : "") : "start";
      else if (hasWord(around, ACTIONS.dose) || (active && dose)) action = active ? "dose" : "start";
      else action = active ? "" : "start";
      if (!action || (action === "stop" && !active) || (action === "dose" && !dose)) { out.push({ type: "unknown", said: piece }); return; }
      out.push({ type: "med", action, med: f.id, name: original.slice(f.s, f.e), record: current ? current.id : "", dose, said: piece });
    });
    return out;
  };
}
