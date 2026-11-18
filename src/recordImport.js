// Turning a patient's health record (FHIR R4 from MyChart) into vital signs and treatments for the app.
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

// ---------- Treatments ----------
// Only the medicines on the app's own treatment lists are recognized; everything else in the record is ignored.
// Each app medicine id lists the generic and brand names it goes by. Earlier entries win when a name could match
// more than one (for example a combination pill), and only ids on the person's condition list are used.
const MED_NAMES = [
  ["heartFailure", ["sacubitril", "entresto", "carvedilol", "coreg", "metoprolol succinate", "toprol", "bisoprolol", "spironolactone", "aldactone", "eplerenone", "inspra"]],
  ["sglt2", ["dapagliflozin", "farxiga", "forxiga", "empagliflozin", "jardiance", "canagliflozin", "invokana", "invokamet", "ertugliflozin", "steglatro", "sotagliflozin", "inpefa", "bexagliflozin", "brenzavvy", "xigduo", "qtern", "synjardy", "glyxambi", "trijardy"]],
  ["statin", ["atorvastatin", "lipitor", "rosuvastatin", "crestor", "ezallor", "simvastatin", "zocor", "pravastatin", "pravachol", "lovastatin", "mevacor", "altoprev", "fluvastatin", "lescol", "pitavastatin", "livalo", "zypitamag", "vytorin", "caduet", "roszet"]],
  ["acei", ["benazepril", "lotensin", "captopril", "enalapril", "vasotec", "epaned", "fosinopril", "lisinopril", "zestril", "prinivil", "qbrelis", "zestoretic", "moexipril", "perindopril", "quinapril", "accupril", "ramipril", "altace", "trandolapril", "mavik"]],
  ["arb", ["losartan", "cozaar", "hyzaar", "valsartan", "diovan", "irbesartan", "avapro", "candesartan", "atacand", "olmesartan", "benicar", "telmisartan", "micardis", "azilsartan", "edarbi", "eprosartan"]],
  ["migalastat", ["migalastat", "galafold"]],
  ["agala", ["agalsidase alfa", "replagal"]],
  ["agalb", ["agalsidase beta", "fabrazyme"]],
  ["pegun", ["pegunigalsidase", "elfabrio"]],
  ["gabapentin", ["gabapentin", "neurontin", "gralise", "horizant"]],
  ["pregabalin", ["pregabalin", "lyrica"]],
  ["carbamazepine", ["carbamazepine", "tegretol", "carbatrol", "equetro"]],
  ["amitriptyline", ["amitriptyline", "elavil"]],
  ["opioid", ["oxycodone", "hydrocodone", "morphine", "tramadol", "codeine", "hydromorphone", "oxymorphone", "tapentadol", "fentanyl", "methadone", "percocet", "norco", "vicodin", "ultram", "dilaudid"]],
  ["linaclotide", ["linaclotide", "linzess"]],
  ["furosemide", ["furosemide", "lasix"]],
  ["cysteamineEye", ["cystaran", "cystadrops", "cysteamine ophthalmic", "cysteamine eye"]],
  ["cysteamineDR", ["procysbi", "cysteamine delayed", "cysteamine dr"]],
  ["cysteamineIR", ["cystagon", "cysteamine"]],
  ["citrate", ["urocit", "potassium citrate", "sodium citrate"]],
  ["potassiumSupp", ["potassium chloride", "klor-con", "k-tab", "potassium citrate"]],
  ["bicarbSupp", ["sodium bicarbonate", "bicitra", "sodium citrate"]],
  ["phosSupp", ["k-phos", "phos-nak", "phospha 250", "potassium phosphate"]],
  ["oralPhos", ["k-phos", "phos-nak", "phospha 250", "potassium phosphate"]],
  ["growthHormone", ["somatropin", "genotropin", "humatrope", "norditropin", "nutropin", "omnitrope", "saizen", "zomacton", "lonapegsomatropin", "skytrofa", "somapacitan", "sogroya", "somatrogon", "ngenla"]],
  ["levothyroxine", ["levothyroxine", "synthroid", "levoxyl", "unithroid", "tirosint", "euthyrox"]],
  ["levocarnitine", ["levocarnitine", "carnitor"]],
  ["burosumab", ["burosumab", "crysvita"]],
  ["activeVitD", ["calcitriol", "rocaltrol", "alfacalcidol"]],
  ["cinacalcet", ["cinacalcet", "sensipar"]],
  ["setmelanotide", ["setmelanotide", "imcivree"]],
  ["glp1", ["semaglutide", "ozempic", "wegovy", "rybelsus", "tirzepatide", "mounjaro", "zepbound", "liraglutide", "victoza", "saxenda", "dulaglutide", "trulicity", "exenatide", "byetta", "bydureon"]],
  ["metformin", ["metformin", "glucophage", "glumetza", "fortamet", "riomet"]],
  ["insulin", ["insulin", "lantus", "humalog", "novolog", "tresiba", "levemir", "basaglar", "toujeo", "admelog", "fiasp", "lyumjev"]],
  ["sulfonylurea", ["glipizide", "glucotrol", "glimepiride", "amaryl", "glyburide", "gliclazide"]],
  ["magnesiumSupp", ["magnesium oxide", "magnesium chloride", "magnesium glycinate", "magnesium lactate", "mag-tab", "slow-mag", "mag-ox"]],
  ["allopurinol", ["allopurinol", "zyloprim", "febuxostat", "uloric"]],
  ["lumasiran", ["lumasiran", "oxlumo"]],
  ["nedosiran", ["nedosiran", "rivfloza"]],
  ["pyridoxine", ["pyridoxine", "vitamin b6", "vitamin b-6"]],
  ["fibrate", ["fenofibrate", "tricor", "trilipix", "fenoglide", "gemfibrozil", "lopid"]],
  ["imiglucerase", ["imiglucerase", "cerezyme"]],
  ["velaglucerase", ["velaglucerase", "vpriv"]],
  ["taliglucerase", ["taliglucerase", "elelyso"]],
  ["eliglustat", ["eliglustat", "cerdelga"]],
  ["cipaglucosidase", ["cipaglucosidase", "pombiliti", "opfolda"]],
  ["miglustatGD", ["miglustat", "zavesca"]],
  ["bisphosphonate", ["alendronate", "fosamax", "risedronate", "actonel", "atelvia", "ibandronate", "boniva", "zoledronic", "reclast", "zometa"]],
  ["avalglucosidase", ["avalglucosidase", "nexviazyme", "nexviadyme"]],
  ["alglucosidase", ["alglucosidase", "lumizyme", "myozyme"]],
  ["laronidase", ["laronidase", "aldurazyme"]],
  ["idursulfase", ["idursulfase", "elaprase"]],
  ["tividenofusp", ["tividenofusp", "avlayah"]],
  ["elosulfase", ["elosulfase", "vimizim"]],
  ["galsulfase", ["galsulfase", "naglazyme"]],
  ["vestronidase", ["vestronidase", "mepsevii"]],
].map(([id, names]) => ({ id, res: names.map((n) => ({ n, re: new RegExp(`(^|[^a-z])${n.replace(/[-/]/g, "[-\\s/]?")}([^a-z]|$)`, "i") })) }));

// Which app medicine a record's medicine name is, among the ids allowed for this condition. Returns
// { med, matched } (matched is the name that was recognized) or null.
export function matchMedicine(text, allowedIds) {
  const t = String(text || "");
  if (!t) return null;
  for (const m of MED_NAMES) {
    if (allowedIds && !allowedIds.has(m.id)) continue;
    const hit = m.res.find((r) => r.re.test(t));
    if (hit) return { med: m.id, matched: hit.n };
  }
  return null;
}

const titleCase = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
const tidy = (s) => String(s || "").replace(/\s+/g, " ").trim();
// "lisinopril 10 MG tablet" -> "10 mg"; "Fabrazyme 35 MG injection" -> "35 mg"
const strengthOf = (s) => {
  const m = /(\d+(?:\.\d+)?)\s*(mg|mcg|g|units?|unit\/ml|mg\/ml|ml|%)\b/i.exec(String(s || ""));
  return m ? `${m[1]} ${m[2].toLowerCase()}` : "";
};

function medName(req) {
  const cc = req.medicationCodeableConcept;
  if (cc) return tidy(cc.text || ((cc.coding || []).find((c) => c.display) || {}).display);
  if (req.medicationReference) return tidy(req.medicationReference.display);
  return "";
}

// One line describing the dose, short enough for the Treatments list.
function doseOf(req, name) {
  const di = (req.dosageInstruction || [])[0] || {};
  const strength = strengthOf(name);
  const text = tidy(di.patientInstruction || di.text);
  if (text && text.length <= 90) return strength && !text.includes(strength.split(" ")[0]) ? `${strength}: ${text}` : text;
  return strength || text.slice(0, 90);
}

const reqDate = (req) => String(req.authoredOn || ((req.dispenseRequest || {}).validityPeriod || {}).start || "").slice(0, 10);

// Groups the record's medicine orders into treatments the app knows. Returns
// [{ med, generic, name, start, startDose, doses: [{ date, dose }], fhirIds }], one per medicine.
export function mapMedications(requests, allowedIds) {
  const groups = {};
  (requests || []).forEach((req) => {
    if (!req || req.resourceType !== "MedicationRequest") return;
    if (["entered-in-error", "draft", "cancelled"].includes(req.status)) return;
    const name = medName(req);
    const hit = matchMedicine(name, allowedIds);
    if (!hit) return;
    const date = reqDate(req);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const key = `${hit.med}|${hit.matched}`;
    (groups[key] = groups[key] || { med: hit.med, generic: titleCase(hit.matched), orders: [] })
      .orders.push({ id: String(req.id || `${key}-${date}`), date, dose: doseOf(req, name), name });
  });
  return Object.values(groups).map((g) => {
    const orders = g.orders.sort((a, b) => a.date.localeCompare(b.date));
    const doses = [];
    let last = orders[0].dose;
    orders.slice(1).forEach((o) => {
      if (o.dose && o.dose !== last) { doses.push({ date: o.date, dose: o.dose }); last = o.dose; }
    });
    return { med: g.med, generic: g.generic, name: orders[orders.length - 1].name, start: orders[0].date,
      startDose: orders[0].dose, doses, fhirIds: orders.map((o) => o.id) };
  });
}

// Compares treatments from the record with what's already saved. Returns
// { add: [treatments to add], updates: [{ id, doses, fhirIds }], already: number }.
// A treatment counts as already saved when one came from the record before (same order ids) or the person entered
// the same medicine themselves; for drug classes (ACE inhibitor, statin…) the drug name must match too.
const CLASS_IDS = new Set(["acei", "arb", "sglt2", "statin", "opioid", "glp1", "insulin", "sulfonylurea", "bisphosphonate", "fibrate", "heartFailure"]);
export function planMedImport(existing, found) {
  const add = [];
  const updates = [];
  let already = 0;
  found.forEach((f) => {
    const ids = new Set(f.fhirIds);
    const fromRecord = existing.find((m) => (m.fhirIds || []).some((id) => ids.has(id)));
    if (fromRecord) {
      const known = new Set(fromRecord.fhirIds || []);
      const newOrders = f.fhirIds.filter((id) => !known.has(id));
      // Saved doses may have the drug's name in front ("Lisinopril 10 mg"), so look for the dose inside them.
      const haveDoses = [fromRecord.startDose, ...(fromRecord.doses || []).map((d) => d.dose)].filter(Boolean).map((x) => x.toLowerCase());
      const seen = (dose) => haveDoses.some((h) => h.endsWith(dose.toLowerCase()));
      const doses = f.doses.filter((d) => d.date > fromRecord.start && !seen(d.dose) && !(fromRecord.doses || []).some((x) => x.date === d.date));
      if (newOrders.length || doses.length) updates.push({ id: fromRecord.id, med: f.med, generic: f.generic, doses, fhirIds: [...known, ...newOrders] });
      else already += 1;
      return;
    }
    const g = f.generic.toLowerCase();
    const manual = existing.find((m) => m.med === f.med && !m.stop && (!CLASS_IDS.has(f.med)
      || `${m.customName || ""} ${m.startDose || ""}`.toLowerCase().includes(g)));
    if (manual) { already += 1; return; }
    add.push(f);
  });
  return { add, updates, already };
}
