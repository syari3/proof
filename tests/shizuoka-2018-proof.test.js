const assert = require("node:assert/strict");
const Adapter = require("../js/problem-data-engine.js");
const Rules = require("../js/proof-rules.js");
const problem = require("../data/problem-examples/shizuoka-2018-proof-cb-ce.json");

const result = Adapter.run(problem, Rules);
console.log("2018 reconstructed problem:", result.status);
console.log("Goal:", result.converted.goal);
console.log("Initial facts:", result.converted.facts.length);
console.log("Unsupported conditions:", result.converted.unsupported);
console.log("Derived proof steps:", result.proof.steps.map((step) => ({
  ruleId: step.ruleId,
  conclusion: step.conclusion
})));

assert.equal(result.converted.goal, "side(BC)=side(CE)");
assert.deepEqual(result.converted.unsupported, []);
assert.equal(result.success, true,
  "The engine should prove the reconstructed 2018 goal using derived facts, not by assuming the goal.");
assert.ok(result.proof.steps.some(step => step.ruleId === "circle.angles-same-segment"));
assert.ok(result.proof.steps.some(step => step.ruleId === "triangle.isosceles-base-angles"));
assert.ok(result.proof.steps.some(step => step.ruleId === "angle.triangle-sum-cancellation"),
  "The proof should use the general three-angle-sum cancellation rule.");
assert.ok(result.proof.steps.some(step => step.conclusion === "side(BC)=side(CE)"));
console.log("✓ 2018 case proved through general angle-sum cancellation.");
