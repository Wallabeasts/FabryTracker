// Run: node test/recordImport.test.mjs
import assert from "node:assert/strict";
import { mapVitals, matchMedicine, mapMedications, planMedImport } from "../src/recordImport.js";

const fabry = new Set(["migalastat", "agala", "agalb", "pegun", "trial", "acei", "arb", "sglt2", "statin", "gabapentin", "pregabalin", "carbamazepine", "amitriptyline", "opioid", "linaclotide", "furosemide", "custom"]);

// Vital signs
const v = mapVitals([
  { resourceType: "Observation", id: "bp1", status: "final", effectiveDateTime: "2025-03-01T09:00:00Z",
    code: { coding: [{ system: "http://loinc.org", code: "85354-9" }] },
    component: [
      { code: { coding: [{ system: "http://loinc.org", code: "8480-6" }] }, valueQuantity: { value: 132, unit: "mm[Hg]" } },
      { code: { coding: [{ system: "http://loinc.org", code: "8462-4" }] }, valueQuantity: { value: 84, unit: "mm[Hg]" } }] },
  { resourceType: "Observation", id: "bp2", status: "final", effectiveDateTime: "2025-03-01T15:00:00Z",
    code: { coding: [{ system: "http://loinc.org", code: "85354-9" }] },
    component: [{ code: { coding: [{ system: "http://loinc.org", code: "8480-6" }] }, valueQuantity: { value: 128, unit: "mm[Hg]" } }] },
  { resourceType: "Observation", id: "w1", status: "final", effectiveDateTime: "2025-03-01", code: { coding: [{ code: "29463-7" }] }, valueQuantity: { value: 80, unit: "kg" } },
  { resourceType: "Observation", id: "h1", status: "final", effectiveDateTime: "2025-03-01", code: { coding: [{ code: "8302-2" }] }, valueQuantity: { value: 70, unit: "[in_i]" } },
  { resourceType: "Observation", id: "hr1", status: "final", effectiveDateTime: "2025-03-01", code: { coding: [{ code: "8867-4" }] }, valueQuantity: { value: 71, unit: "/min" } },
  { resourceType: "Observation", id: "x", status: "final", effectiveDateTime: "2025-03-01", code: { coding: [{ code: "8310-5" }] }, valueQuantity: { value: 37, unit: "Cel" } },
]);
const by = Object.fromEntries(v.map((e) => [e.metric, e]));
assert.equal(by.sbp.value, 128, "later reading of the day wins");
assert.equal(by.dbp.value, 84);
assert.equal(by.weight.value, 176.4);
assert.equal(by.heightCm.value, 177.8);
assert.equal(by.hr.value, 71);
assert.equal(v.length, 5, "temperature is ignored");

// Medicine names
assert.equal(matchMedicine("lisinopril 10 MG tablet", fabry).med, "acei");
assert.equal(matchMedicine("Fabrazyme 35 MG injection", fabry).med, "agalb");
assert.equal(matchMedicine("agalsidase beta 5 mg", fabry).med, "agalb");
assert.equal(matchMedicine("JARDIANCE 10 MG tablet", fabry).med, "sglt2");
assert.equal(matchMedicine("sacubitril-valsartan 24-26 mg", fabry).med, "arb", "Fabry has no heart-failure group, so valsartan counts as an ARB");
assert.equal(matchMedicine("sacubitril-valsartan 24-26 mg", new Set(["heartFailure", "arb"])).med, "heartFailure");
assert.equal(matchMedicine("avalglucosidase alfa", new Set(["alglucosidase", "avalglucosidase"])).med, "avalglucosidase");
assert.equal(matchMedicine("amLODIPine 5 MG tablet", fabry), null);
assert.equal(matchMedicine("metformin 500 mg", fabry), null, "not on Fabry's list");
assert.equal(matchMedicine("K-Phos Neutral tablet", new Set(["oralPhos"])).med, "oralPhos");

// Orders to treatments
const reqs = [
  { resourceType: "MedicationRequest", id: "r1", status: "completed", authoredOn: "2021-01-05", medicationReference: { display: "lisinopril 5 MG tablet" }, dosageInstruction: [{ text: "Take 1 tablet by mouth daily." }] },
  { resourceType: "MedicationRequest", id: "r2", status: "active", authoredOn: "2022-02-10", medicationReference: { display: "lisinopril 10 MG tablet" }, dosageInstruction: [{ text: "Take 1 tablet by mouth daily." }] },
  { resourceType: "MedicationRequest", id: "r3", status: "active", authoredOn: "2023-04-01", medicationCodeableConcept: { text: "atorvastatin 20 mg tablet" } },
  { resourceType: "MedicationRequest", id: "r4", status: "active", authoredOn: "2023-04-01", medicationCodeableConcept: { text: "amlodipine 5 mg tablet" } },
  { resourceType: "MedicationRequest", id: "r5", status: "entered-in-error", authoredOn: "2023-05-01", medicationCodeableConcept: { text: "gabapentin 300 mg" } },
];
const meds = mapMedications(reqs, fabry);
assert.equal(meds.length, 2);
const lis = meds.find((m) => m.med === "acei");
assert.equal(lis.generic, "Lisinopril");
assert.equal(lis.start, "2021-01-05");
assert.equal(lis.startDose, "5 mg: Take 1 tablet by mouth daily.");
assert.deepEqual(lis.doses, [{ date: "2022-02-10", dose: "10 mg: Take 1 tablet by mouth daily." }]);
assert.equal(meds.find((m) => m.med === "statin").startDose, "20 mg");

// Planning against what's saved
const plan1 = planMedImport([{ id: "a", med: "acei", start: "2019-05-01", startDose: "Lisinopril 5 mg daily", doses: [] }], meds);
assert.equal(plan1.add.length, 1, "lisinopril already entered by hand; statin is new");
assert.equal(plan1.add[0].med, "statin");
assert.equal(plan1.already, 1);
const saved = [{ id: "b", med: "acei", start: "2021-01-05", startDose: lis.startDose, doses: [], fhirIds: ["r1"] }];
const plan2 = planMedImport(saved, [lis]);
assert.equal(plan2.updates.length, 1, "a new order with a new dose updates the saved treatment");
assert.deepEqual(plan2.updates[0].doses, lis.doses);
assert.deepEqual(plan2.updates[0].fhirIds, ["r1", "r2"]);
const plan3 = planMedImport([{ ...saved[0], fhirIds: ["r1", "r2"], doses: lis.doses }], [lis]);
assert.equal(plan3.updates.length + plan3.add.length, 0);
assert.equal(plan3.already, 1);

console.log("recordImport: all tests passed");

// A saved dose with the drug's name in front isn't added again
const prefixed = [{ id: "c", med: "acei", start: "2021-01-05", startDose: "Lisinopril 5 mg: Take 1 tablet by mouth daily.",
  doses: [{ id: "d", date: "2022-02-10", dose: "Lisinopril 10 mg: Take 1 tablet by mouth daily." }], fhirIds: ["r1"] }];
const plan4 = planMedImport(prefixed, [lis]);
assert.equal(plan4.updates.length, 1, "new order id is recorded");
assert.deepEqual(plan4.updates[0].doses, [], "but its dose is already saved");
console.log("recordImport: prefixed-dose test passed");
