// Turning vital signs from a patient's health record (FHIR R4 from MyChart) into the app's results.
// Pure functions with no app state, so they can be tested on their own (see test/recordImport.test.mjs).

const normUnit = (u) => (u || "").toLowerCase().replace(/\s/g, "").replace(/[µμ]/g, "u");
const round = (v, dp) => Math.round(v * 10 ** dp) / 10 ** dp;
const FINAL = new Set(["final", "amended", "corrected", "preliminary"]);
const obsDate = (obs) => String(obs.effectiveDateTime || (obs.effectivePeriod && obs.effectivePeriod.start) || obs.issued || "");
const loincCodes = (cc) => ((cc && cc.coding) || []).filter((c) => !c.system || /loinc/i.test(c.system)).map((c) => c.code);

// ---------- Vital signs ----------
// Saved in the app's own units: blood pressure mmHg, heart rate beats/min, weight pounds, height cm.
const VITALS = [
  { metric: "sbp", loinc: ["8480-6", "8459-0", "8460-8", "8461-6"],
    convert: (v, u) => (["mm[hg]", "mmhg", ""].includes(normUnit(u)) && v >= 40 && v <= 300 ? Math.round(v) : null) },
  { metric: "dbp", loinc: ["8462-4", "8453-3", "8454-1", "8455-8"],
    convert: (v, u) => (["mm[hg]", "mmhg", ""].includes(normUnit(u)) && v >= 20 && v <= 200 ? Math.round(v) : null) },
  { metric: "hr", loinc: ["8867-4", "40443-4", "8893-0"],
    convert: (v, u) => (["/min", "{beats}/min", "beats/min", "bpm", ""].includes(normUnit(u)) && v >= 20 && v <= 250 ? Math.round(v) : null) },
  { metric: "weight", loinc: ["29463-7", "3141-9", "3142-7", "8335-2"],
    convert: (v, u) => {
      const n = normUnit(u);
      if (n === "kg") return round(v / 0.45359237, 1);
      if (n === "g") return round(v / 453.59237, 1);
      if (["[lb_av]", "lb", "lbs", "[lb]"].includes(n)) return round(v, 1);
      if (["[oz_av]", "oz"].includes(n)) return round(v / 16, 1);
      return null;
    } },
  { metric: "heightCm", loinc: ["8302-2", "8306-3", "8308-9"],
    convert: (v, u) => {
      const n = normUnit(u);
      if (n === "cm") return round(v, 1);
      if (n === "m") return round(v * 100, 1);
      if (["[in_i]", "in", "[in_us]"].includes(n)) return round(v * 2.54, 1);
      return null;
    } },
];
const vitalFor = (code) => VITALS.find((r) => r.loinc.some((c) => code.includes(c))) || null;

// Returns [{ fhirId, date, metric, value }], keeping the last reading of each day for each measure
// (hospital stays can record vital signs every few hours). Blood pressure often comes as one reading with two parts.
export function mapVitals(observations) {
  const best = {};
  const add = (obs, part, rule, q, suffix) => {
    if (!q || typeof q.value !== "number" || !isFinite(q.value)) return;
    const when = obsDate(obs);
    const date = when.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const value = rule.convert(q.value, q.unit || q.code);
    if (value === null || !isFinite(value)) return;
    const key = `${rule.metric}|${date}`;
    if (best[key] && best[key].when >= when) return;
    best[key] = { when, entry: { fhirId: `${obs.id || key}${suffix}`, date, metric: rule.metric, value } };
  };
  (observations || []).forEach((obs) => {
    if (!obs || obs.resourceType !== "Observation" || !FINAL.has(obs.status)) return;
    const own = vitalFor(loincCodes(obs.code));
    if (own) add(obs, obs, own, obs.valueQuantity, `:${own.metric}`);
    (obs.component || []).forEach((c) => {
      const rule = vitalFor(loincCodes(c.code));
      if (rule) add(obs, c, rule, c.valueQuantity, `:${rule.metric}`);
    });
  });
  return Object.values(best).map((b) => b.entry);
}
