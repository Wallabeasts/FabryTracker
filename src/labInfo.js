// "About this result" information for every lab, scan and score: what it is, where to find the value, and in
// general whether higher or lower is better. General information only; the care team knows what's right for each
// person. Keyed by metric or chart id; a condition can override parts (byCond).

const SRC = {
  blood: "On your blood test results. Ask your clinic for a copy, or look in your patient portal (for example, MyChart).",
  urine: "On your urine test results. Ask your clinic for a copy, or look in your patient portal.",
  urine24: "On your 24-hour urine collection report. Ask your kidney or kidney stone doctor for a copy.",
  special: "This is a specialized test, usually ordered by your rare disease specialist. Ask them or their clinic for the result.",
  antibody: "A specialized blood test that your specialist may order. Ask them for the result.",
  echo: "In your echocardiogram (heart ultrasound) report. Ask your heart (cardiology) clinic for a copy.",
  cmr: "In your cardiac MRI report. Ask your heart (cardiology) clinic for a copy.",
  pft: "In your pulmonary function test (PFT) report. Ask your lung (pulmonary) clinic for a copy.",
  dexa: "In your bone density (DEXA) scan report.",
  abdImg: "In your abdominal MRI or CT scan report. Ask your clinic for a copy.",
  abdCT: "Ask for your abdominal CT scan report. An abdominal ultrasound or MRI report may show these too.",
  audiogram: "On your hearing test (audiogram) report. Ask your hearing (audiology) clinic for a copy.",
  vitals: "Measured at every clinic visit and listed in your visit summary. You can also check it at home with a blood pressure monitor.",
  scale: "Measured at clinic visits and listed in your visit summary, or on a scale at home.",
  height: "Measured at clinic visits and listed in your visit summary.",
  walk: "From a 6-minute walk test. The test is done by walking back and forth along a flat hallway for 6 minutes and measuring how far you walked.",
  stairs: "From a timed stair climb. The test is done by timing how many seconds it takes to climb 10 stairs.",
  self: "A score you give yourself. Use the quick log at the top of the Trends tab, or enter it under Add.",
  eye: "From your visit with your eye doctor (ophthalmologist).",
  stone: "From your urologist, your procedure report or your hospital discharge papers.",
  egfr: "The app calculates it from the creatinine on your blood test results, with your age and sex. Many lab reports list eGFR too.",
};

const DIR = {
  lower: "In general, lower is better.",
  higher: "In general, higher is better.",
  range: "In general, a value within the normal range is best. Too high or too low can both be a concern.",
  higherNormal: "In general, higher is better, up to the normal range. A low value can be a concern.",
  lowerNormal: "In general, lower is better, down to the normal range. A high value can be a concern.",
  no: "In general, No is better.",
  score: "In general, a lower score is better.",
  scoreHigh: "In general, a higher score is better.",
  track: "There's no better or worse number for everyone. What matters is the change over time, and the goal you set with your care team.",
};

export const LAB_INFO = {
  // Vitals
  sbp: { what: "The top number of your blood pressure: the pressure in your arteries when your heart beats.", where: "vitals", dir: "range", extra: "The dashed lines mark 90 and 130 mmHg." },
  dbp: { what: "The bottom number of your blood pressure: the pressure in your arteries between heartbeats.", where: "vitals", dir: "range" },
  hr: { what: "How many times your heart beats in a minute, at rest.", where: "vitals", dir: "range", extra: "The dashed lines mark 60 and 100 beats per minute." },
  weight: { what: "Your body weight.", where: "scale", dir: "track" },
  heightCm: { what: "Your height. For children it shows growth, and it's needed to calculate eGFR under age 18.", where: "height", dir: "track" },
  bmi: { what: "Body mass index (BMI): your weight compared with your height.", where: "scale", dir: "range" },

  // Kidney
  egfr: { what: "eGFR (estimated glomerular filtration rate) estimates how well your kidneys filter your blood.", where: "egfr", dir: "higher", extra: "The eGFR slope shows how fast it's changing each year. A slope closer to zero is better." },
  creatinine: { what: "A waste product from your muscles that your kidneys filter out. It's used to calculate eGFR.", where: "blood", dir: "lowerNormal" },
  uacr: { what: "Urine albumin-to-creatinine ratio (UACR): how much albumin, a protein, leaks into your urine. It's an early sign of kidney damage.", where: "urine", dir: "lower" },
  upcr: { what: "Urine protein-to-creatinine ratio (UPCR): how much total protein leaks into your urine.", where: "urine", dir: "lower" },
  potassium: { what: "A mineral in your blood that your heart and muscles need. The kidneys control its level.", where: "blood", dir: "range" },
  bicarb: { what: "Bicarbonate (CO2) shows the acid balance of your blood. A low value can mean too much acid.", where: "blood", dir: "higherNormal" },
  phos: { what: "A mineral in your blood that your bones need.", where: "blood", dir: "range" },
  mg: { what: "A mineral in your blood that your muscles, nerves and heart need.", where: "blood", dir: "higherNormal" },
  urate: { what: "Uric acid: a waste product in your blood. High levels can cause gout or kidney problems.", where: "blood", dir: "lowerNormal" },
  calcium: { what: "A mineral in your blood that your bones, muscles and nerves need.", where: "blood", dir: "range" },
  pth: { what: "Parathyroid hormone (PTH) controls the calcium and phosphate in your blood and bones.", where: "blood", dir: "range" },

  // Kidney stones and oxalate
  uox: { what: "How much oxalate your body passes in urine in a day. High oxalate causes kidney stones.", where: "urine24", dir: "lower" },
  pox: { what: "The level of oxalate in your blood. It can build up when kidney function falls.", where: "special", dir: "lower" },
  uvol: { what: "How much urine you make in a day. It shows how much fluid you're drinking.", where: "urine24", dir: "higher", extra: "Making more urine helps prevent kidney stones." },
  uCitrate: { what: "Citrate in your urine helps stop kidney stones from forming.", where: "urine24", dir: "higher" },
  uCalcium: { what: "How much calcium your body passes in urine in a day. High urine calcium can cause kidney stones.", where: "urine24", dir: "lower" },
  ssCaOx: { what: "Calcium oxalate supersaturation (SS CaOx): how likely calcium oxalate stones are to form in your urine.", where: "urine24", dir: "lower" },
  stoneProcs: { what: "Procedures to remove or break up kidney stones, such as ureteroscopy or PCNL.", where: "stone", dir: "" },

  // Heart
  lvmi: { what: "Left ventricular mass index (LVMI): how heavy the main pumping chamber of your heart is, for your body size. A high value means the heart muscle is thickened.", where: "echo", dir: "lower", extra: "It can also be measured by cardiac MRI." },
  ivs: { what: "Interventricular septum (IVS) thickness: the thickness of the wall between the two lower chambers of your heart.", where: "echo", dir: "lower" },
  lvef: { what: "Ejection fraction (LVEF): how much blood your heart pumps out with each beat.", where: "echo", dir: "higherNormal", extra: "It can also be measured by cardiac MRI." },
  lvedd: { what: "Left ventricular end-diastolic diameter (LVEDD): how wide the main pumping chamber of your heart is when it's filled. A large value can mean the heart is enlarged.", where: "echo", dir: "lowerNormal" },
  troponin: { what: "A protein released when heart muscle is stressed or damaged.", where: "blood", dir: "lower" },
  t1: { what: "Native T1 is a cardiac MRI measure of the heart muscle. In Fabry disease, a low T1 can be a sign of Gb3 build-up in the heart.", where: "cmr", dir: "range" },
  lge: { what: "Late gadolinium enhancement (LGE) shows scarring (fibrosis) in the heart muscle on a cardiac MRI.", where: "cmr", dir: "no" },

  // Breathing and muscles
  fvc: { what: "Forced vital capacity (FVC): how much air you can breathe out after a deep breath, sitting up, compared with what's expected for you.", where: "pft", dir: "higher" },
  fvcSupine: { what: "FVC measured lying down. A large drop from sitting can be an early sign of weak breathing muscles (the diaphragm).", where: "pft", dir: "higher" },
  fev1: { what: "FEV1: how much air you can breathe out in the first second of a hard breath out, compared with what's expected for you.", where: "pft", dir: "higher" },
  sixMWT: {
    what: "How far you can walk in 6 minutes. It measures endurance and muscle strength.", where: "walk", dir: "higher",
    how: [
      "Use a flat, straight, quiet hallway. Mark a start line and a turnaround point 30 meters (100 feet) apart.",
      "Rest sitting in a chair for 10 minutes first. Wear comfortable shoes, and use your usual cane or walker if you have one.",
      "Start a stopwatch or phone timer and begin walking. Walk back and forth, turning at each end, as far as you can in 6 minutes. Walk, don't run.",
      "You can slow down or stop to rest if you need to. The timer keeps running.",
      "Count your laps, and stop when the timer reaches 6 minutes. Add up the distance: the full laps, plus the part of the last lap.",
      "Stop right away if you have chest pain, feel faint or dizzy, or are very short of breath.",
    ],
    extra: "Do the test the same way each time, in the same place, so the results can be compared. Ask your care team before doing it at home.",
  },
  stairs10: {
    what: "How many seconds it takes you to climb 10 stairs. It measures leg strength.", where: "stairs", dir: "lower",
    how: [
      "Use a staircase of at least 10 steps with a handrail. Use the same stairs every time.",
      "Stand at the bottom with both feet on the floor, with a stopwatch or phone timer ready.",
      "Start the timer and climb the 10 stairs as fast as you safely can. Use the handrail if you need it.",
      "Stop the timer when both feet are on the 10th step.",
      "Write down the time in seconds, and whether you used the handrail. Use the handrail the same way each time.",
      "Don't do this test alone, and skip it if you're at risk of falling.",
    ],
  },
  ck: { what: "Creatine kinase (CK): an enzyme that leaks from muscles when they're damaged.", where: "blood", dir: "lower" },

  // Disease biomarkers
  gb3: { what: "Gb3 (globotriaosylceramide) is the fatty substance that builds up in Fabry disease. This measures it in your blood.", where: "special", dir: "lower" },
  lysoGb3: { what: "Lyso-Gb3 is a form of Gb3 in your blood. It's one of the most useful markers of Fabry disease activity.", where: "special", dir: "lower" },
  wbcCystine: { what: "The amount of cystine inside your white blood cells. It's a marker of cystinosis activity.", where: "special", dir: "lower" },
  lysoGb1: { what: "Lyso-Gb1 (glucosylsphingosine) is the main marker of Gaucher disease activity.", where: "special", dir: "lower" },
  chito: { what: "Chitotriosidase is an enzyme made by Gaucher cells. It's a marker of Gaucher disease activity.", where: "special", dir: "lower", extra: "Some people have a common gene change that means they make none. If so, this test isn't useful for them." },
  trap: { what: "Tartrate-resistant acid phosphatase (TRAP) is a marker of Gaucher disease activity.", where: "special", dir: "lower" },
  ace: { what: "Angiotensin-converting enzyme (ACE) can be high in Gaucher disease and is used as a marker of disease activity.", where: "blood", dir: "lower" },
  ccl18: { what: "CCL18 (PARC) is a marker of Gaucher disease activity.", where: "special", dir: "lower" },
  hex4: { what: "Urine Hex4 (glucose tetrasaccharide) is a marker of glycogen build-up in Pompe disease.", where: "special", dir: "lower" },
  ugag: { what: "Glycosaminoglycans (GAGs) are the sugars that build up in MPS. This measures them in your urine.", where: "special", dir: "lower" },
  ada: { what: "Anti-drug antibodies (ADA) are antibodies your body may make against enzyme replacement therapy. Some can make it work less well.", where: "antibody", dir: "lower" },
  nab: { what: "Neutralizing antibodies are a type of anti-drug antibody.", where: "antibody", dir: "no" },
  rhgaa: { what: "Antibodies the body can make against rhGAA, the enzyme used in Pompe disease.", where: "antibody", dir: "lower" },

  // Blood counts, liver and clotting
  hgb: { what: "Hemoglobin carries oxygen in your red blood cells. A low value means anemia.", where: "blood", dir: "higherNormal" },
  plt: { what: "Platelets help your blood clot. A low count can cause easy bruising or bleeding.", where: "blood", dir: "higherNormal" },
  alt: { what: "ALT is an enzyme that leaks into the blood when the liver (or sometimes muscle) is irritated or damaged.", where: "blood", dir: "lowerNormal" },
  ast: { what: "AST is an enzyme that leaks into the blood when the liver or muscles are irritated or damaged.", where: "blood", dir: "lowerNormal" },
  ggt: { what: "GGT is a liver enzyme. A high value can be a sign of liver or bile duct problems.", where: "blood", dir: "lowerNormal" },
  alp: { what: "Alkaline phosphatase comes from the liver and bones. A high value can be a sign of active bone disease, like rickets.", where: "blood", dir: "lowerNormal" },
  pt: { what: "Prothrombin time (PT): how many seconds it takes your blood to clot.", where: "blood", dir: "range" },
  ptt: { what: "Partial thromboplastin time (PTT): another measure of how many seconds it takes your blood to clot.", where: "blood", dir: "range" },
  inr: { what: "INR is a standardized form of the prothrombin time (PT), showing how fast your blood clots.", where: "blood", dir: "range" },

  // Organs and bones
  spleenMN: { what: "Your spleen's size compared with a normal spleen for your body (1 = normal).", where: "abdImg", dir: "lower" },
  liverMN: { what: "Your liver's size compared with a normal liver for your body (1 = normal).", where: "abdImg", dir: "lower" },
  dexaT: { what: "A T-score compares your bone density with a healthy young adult. −2.5 or lower means osteoporosis.", where: "dexa", dir: "higher" },
  dexaZ: { what: "A Z-score compares your bone density with people your age. −2.0 or lower is low for age.", where: "dexa", dir: "higher" },
  abdImaging: { what: "Findings from imaging of your abdomen: your kidneys, kidney cysts, uterus and pancreas.", where: "abdCT", dir: "" },

  // Hormones, sugar and fats
  tsh: { what: "Thyroid-stimulating hormone (TSH) shows how well your thyroid is working. A high value can mean an underactive thyroid.", where: "blood", dir: "range" },
  freeT4: { what: "Free T4 is the main hormone your thyroid makes.", where: "blood", dir: "range" },
  freeT3: { what: "Free T3 is the active form of thyroid hormone.", where: "blood", dir: "range" },
  hba1c: { what: "Hemoglobin A1c shows your average blood sugar over the past 2 to 3 months.", where: "blood", dir: "lower" },
  tg: { what: "Triglycerides are a type of fat in your blood.", where: "blood", dir: "lower" },
  ldl: { what: "LDL is the \"bad\" cholesterol that can build up in your arteries.", where: "blood", dir: "lower" },

  // Vitamins and nutrients
  vitD: { what: "Vitamin D helps keep your bones strong.", where: "blood", dir: "higherNormal" },
  b12: { what: "Vitamin B12 is needed for your nerves and red blood cells.", where: "blood", dir: "higherNormal" },
  carnitine: { what: "Carnitine helps your muscles use fat for energy. It's often low in cystinosis.", where: "blood", dir: "higherNormal" },
  copper: { what: "Copper is a mineral your body needs for blood and nerves.", where: "blood", dir: "range" },

  // Hearing and eyes
  pta: { what: "Hearing loss at high pitches (4000 and 8000 Hz), in decibels (dB HL). The average is shown for each ear.", where: "audiogram", dir: "lower", extra: "0 to 25 dB HL is usually normal hearing." },
  hearingL: { what: "Hearing loss in the left ear at each pitch, in decibels (dB HL).", where: "audiogram", dir: "lower" },
  hearingR: { what: "Hearing loss in the right ear at each pitch, in decibels (dB HL).", where: "audiogram", dir: "lower" },
  eyeVisits: { what: "Your visits with an eye doctor, including what they recommended.", where: "eye", dir: "" },

  // Scores you give yourself
  pain: { what: "How much pain you've had, from 1 (very little) to 10 (the worst).", where: "self", dir: "score" },
  fatigue: { what: "How tired you've felt, from 1 (very little) to 10 (the worst).", where: "self", dir: "score" },
  symptoms: { what: "How much pain and tiredness (fatigue) you've had, each from 1 to 10.", where: "self", dir: "score" },
  hunger: { what: "How hungry you've felt, from 0 (not at all) to 10 (the most).", where: "self", dir: "score" },
  abdPain: { what: "How much belly (abdominal) pain you've had, from 1 to 10.", where: "self", dir: "score" },
  anxiety: { what: "How anxious you've felt, from 1 to 10.", where: "self", dir: "score" },
  qol: { what: "How good your quality of life has been, from 0 (worst) to 10 (best).", where: "self", dir: "scoreHigh" },
  mobility: { what: "How much trouble you've had moving around, from 0 (none) to 10 (the most).", where: "self", dir: "score" },
  sob: { what: "How short of breath you've felt, from 1 to 10.", where: "self", dir: "score" },
  chairRise: { what: "How hard it is to get up from a chair, from 0 (easy) to 10 (can't do it).", where: "self", dir: "score" },
  stiffness: { what: "How stiff your joints have felt, from 0 (not at all) to 10 (the most).", where: "self", dir: "score" },
};

// Condition-specific changes.
const BY_COND = {
  xlh: {
    phos: { what: "A mineral in your blood that your bones need. It's often low in XLH.", dir: "higherNormal" },
    alp: { what: "Alkaline phosphatase comes from your bones and liver. In XLH, a high value can mean rickets or bone softening is active.", dir: "lowerNormal" },
  },
  cystinosis: {
    phos: { what: "A mineral in your blood that your bones need. It can be low in cystinosis because the kidneys lose it.", dir: "higherNormal" },
    potassium: { what: "A mineral in your blood that your heart and muscles need. It can be low in cystinosis because the kidneys lose it.", dir: "range" },
  },
};

// Chart and field ids that share one entry.
const ALIAS = { hlL4000: "hearingL", hlL8000: "hearingL", hlR4000: "hearingR", hlR8000: "hearingR", eyeVisit: "eyeVisits", eyeNotes: "eyeVisits", stoneProc: "stoneProcs", stoneSide: "stoneProcs", stoneNotes: "stoneProcs" };

export function labInfo(id, condId) {
  const key = ALIAS[id] || id;
  const base = LAB_INFO[key];
  if (!base) return null;
  const o = { ...base, ...((BY_COND[condId] || {})[key] || {}) };
  return { what: o.what, where: SRC[o.where] || "", dir: DIR[o.dir] || "", extra: o.extra || "", how: o.how || [] };
}

// Every English string, for the translation files.
export const LAB_INFO_STRINGS = [
  ...Object.values(SRC), ...Object.values(DIR),
  ...Object.values(LAB_INFO).flatMap((x) => [x.what, x.extra, ...(x.how || [])].filter(Boolean)),
  ...Object.values(BY_COND).flatMap((c) => Object.values(c).map((x) => x.what)),
];
