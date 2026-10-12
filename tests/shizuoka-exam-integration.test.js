const assert = require("node:assert/strict");
const problem = require("../data/problem-examples/shizuoka-2025-proof-7-1.json");
const Adapter = require("../js/problem-data-engine.js");
const GeometryRelations = require("../js/geometry-relations.js");
const Rules = require("../js/proof-rules.js");

// The adapter's relation pass is registered on the global namespace by this module.
void GeometryRelations;

// Exercise the actual 2025 Shizuoka entrance-exam data through conversion and proof.
const result = Adapter.run(problem, Rules, 100, { analyzeConditions: false });
const converted = Adapter.convert(problem);

assert.equal(problem.source.region, "静岡県");
assert.equal(problem.source.year, 2025);
assert.equal(problem.goal.type, "triangle-similarity");
assert.ok(converted.facts.includes("side(AB)=side(BG)"));
assert.ok(converted.facts.includes("parallel(line-EF,line-BC)"));

// A valid alternate route uses same-segment angles, parallel corresponding
// angles, and isosceles-triangle equalities. The disabled opposite-segment rule
// must not appear in the proof. Full geometric validation remains a separate task.
assert.equal(result.success, true, "有効な別経路で相似を証明できる");
assert.equal(result.status, "proved");
assert.ok(result.proof.steps.some((step) => step.ruleId === "triangle.similarity-aa"));
assert.equal(result.proof.steps.some((step) => step.ruleId === "circle.opposite-segment-supplementary-angles"), false);

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

console.log("✓ 静岡県2025年度の実データを変換し、有効な相似証明を確認");
console.log("✓ 動点の弧・存在条件が未検証であることを保持");
