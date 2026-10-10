const assert = require("node:assert/strict");
const Adapter = require("../js/problem-data-engine.js");
const Rules = require("../js/proof-rules.js");

const sample = {
  format: "proof-problem",
  version: 1,
  id: "adapter-smoke",
  geometry: {
    points: [{ id: "A" }, { id: "B" }, { id: "C" }],
    constraints: [{ type: "equal-segments", segments: [["A", "B"], ["A", "C"]] }],
    dynamicConditions: [],
    constructions: []
  },
  goal: { type: "triangle-similarity", triangles: [["A", "B", "C"], ["A", "C", "B"]] }
};
const converted = Adapter.convert(sample);
assert.ok(converted.facts.includes("side(AB)=side(AC)"));
assert.ok(converted.facts.includes("triangle(ABC)"));
assert.equal(converted.goal, "similar(ABC,ACB)");
assert.equal(Adapter.canonicalAngle("A", "B", "C"), Adapter.canonicalAngle("C", "B", "A"));
assert.equal(Adapter.canonicalSegment("B", "A"), "AB");

// A known supported problem should pass through the same adapter and inference engine.
const isosceles = {
  ...sample,
  goal: { type: "angle-equality", angles: [["A", "B", "C"], ["B", "C", "A"]] },
  proofFacts: ["triangle(ABC)"]
};
// Angle equality is not yet a supported goal data type; the adapter must report this,
// rather than silently converting it into a different proposition.
assert.equal(Adapter.convert(isosceles).goal, null);

const sampleFile = require("../data/problem-examples/shizuoka-2025-proof-7-1.json");
const sampleResult = Adapter.run(sampleFile, Rules);
assert.equal(sampleResult.status, "not-proved-with-current-rules");
assert.ok(sampleResult.converted.unsupported.length > 0);
assert.equal(sampleResult.success, false);
console.log("problem-data-engine adapter checks passed");
