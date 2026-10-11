const fs = require("node:fs");
const path = require("node:path");
require("../js/geometry-relations.js");
const Adapter = require("../js/problem-data-engine.js");
const Rules = require("../js/proof-rules.js");

const problemPath = path.join(__dirname, "..", "data", "problem-examples", "shizuoka-2025-proof-7-1.json");
const problem = JSON.parse(fs.readFileSync(problemPath, "utf8"));
const result = Adapter.run(problem, Rules);

console.log("SHIZUOKA_PROOF_TRACE_BEGIN");
console.log(JSON.stringify({
  status: result.status,
  goal: result.converted.goal,
  factCount: result.converted.facts.length,
  rayFacts: result.converted.facts.filter((fact) => /^(sameRay|oppositeRay|oppositeSegment)\(/.test(fact)),
  supplementaryFacts: result.proof.facts.filter((fact) => fact.includes("+") && fact.endsWith("=180")),
  unsupported: result.converted.unsupported,
  targetRelatedFacts: result.proof.facts.filter((fact) =>
    /angle\((AFE|ABC|AEF|ACB|BPG|APB|GPB|BAG|AGB|ABG|CBD|DBG)\)|similar\(AFE,BGP\)/.test(fact)
  ),
  steps: result.proof.steps.map((step) => ({
    index: step.index,
    ruleId: step.ruleId,
    premises: step.premises,
    conclusion: step.conclusion
  }))
}, null, 2));
console.log("SHIZUOKA_PROOF_TRACE_END");
