const assert = require("node:assert/strict");
const generator = require("../js/problem-generator.js");
const templates = {
  one: { facts: ["x"], expectedConclusion: "y" },
  two: { facts: ["z"], expectedConclusion: "w" }
};
const rules = { prove(facts, goal) { return { success: facts.includes("x") && goal === "y" }; } };
const result = generator.generate(templates, rules, () => 0);
assert.equal(result.validation, "passed");
assert.equal(result.key, "one");
assert.equal(result.problem.expectedConclusion, "y");
console.log("✓ 生成器は証明ルールで検証できた問題型だけを返す");
