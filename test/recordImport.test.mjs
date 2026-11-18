// Run: node test/recordImport.test.mjs
import assert from "node:assert/strict";
import { mapVitals } from "../src/recordImport.js";

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

console.log("recordImport: all tests passed");
