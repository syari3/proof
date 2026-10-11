const assert = require("node:assert/strict");
const Adapter = require("../js/problem-data-engine.js");
const Rules = require("../js/proof-rules.js");
const problem = require("../data/problem-examples/shizuoka-2018-proof-cb-ce.json");

const result = Adapter.run(problem, Rules);
console.log("2018 reconstructed problem:", result.status);
console.log("Goal:", result.converted.goal);
console.log("Initial facts:", result.converted.facts.length);
console.log("Unsupported conditions:", result.converted.unsupported);
if (result.proof) {
  console.log("Proof steps:", result.proof.steps.map((step) => ({
    ruleId: step.ruleId,
    conclusion: step.conclusion,
    explain: step.explain
  })));
}
assert.equal(result.success, true, "2018 reconstructed problem should be derivable by registered rules");
assert.equal(result.proof.steps.at(-1).conclusion, "side(BC)=side(CE)");
assert.ok(result.proof.steps.some(step => step.ruleId === "circle.angles-same-segment"));
assert.ok(result.proof.steps.some(step => step.ruleId === "triangle.equal-angles-imply-equal-sides"));
