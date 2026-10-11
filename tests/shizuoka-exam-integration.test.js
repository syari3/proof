const assert = require("node:assert/strict");
const problem = require("../data/problem-examples/shizuoka-2025-proof-7-1.json");
const Adapter = require("../js/problem-data-engine.js");
const Rules = require("../js/proof-rules.js");

// Exercise the actual 2025 Shizuoka entrance-exam data through conversion and proof.
const converted = Adapter.convert(problem);
const result = Adapter.run(problem, Rules);

assert.equal(problem.source.region, "静岡県");
assert.equal(problem.source.year, 2025);
assert.equal(problem.goal.type, "triangle-similarity");
assert.ok(converted.facts.includes("side(AB)=side(BG)"));
assert.ok(converted.facts.includes("parallel(line-EF,line-BC)"));

assert.equal(result.success, true, "現行ルールで目標の相似を証明できる");
assert.equal(result.status, "proved");
assert.equal(result.proof.steps.at(-1).ruleId, "triangle.similarity-aa");
assert.ok(result.proof.steps.some((step) => step.ruleId === "angle.addition"));

// Proof success is not the same as full geometric validation. Preserve the
// unsupported moving-arc condition so callers can see the remaining review work.
assert.ok(
  converted.unsupported.some(
    (item) => item.location === "geometry.dynamicConditions" && item.type === "moves-on-arc"
  ),
  "動点の弧上の範囲は未検証条件として明示される"
);
assert.equal(
  problem.validation.status,
  "proof-engine-proved-geometry-review-pending",
  "入試データの幾何検証が保留中である状態を維持する"
);
assert.ok(problem.validation.openQuestions.length > 0);

console.log("✓ 静岡県2025年度の実データを変換し、推論エンジンで相似を証明");
console.log("✓ 動点の弧・存在条件が未検証であることを保持");
