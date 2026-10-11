const assert = require("node:assert/strict");
const problem = require("../data/problem-examples/shizuoka-2025-proof-7-1.json");
const Adapter = require("../js/problem-data-engine.js");
const GeometryRelations = require("../js/geometry-relations.js");
const Rules = require("../js/proof-rules.js");

// The adapter's relation pass is registered on the global namespace by this module.
void GeometryRelations;

// Exercise the actual 2025 Shizuoka entrance-exam data through conversion and proof.
const result = Adapter.run(problem, Rules);
const converted = Adapter.convert(problem);

assert.equal(problem.source.region, "静岡県");
assert.equal(problem.source.year, 2025);
assert.equal(problem.goal.type, "triangle-similarity");
assert.ok(converted.facts.includes("side(AB)=side(BG)"));
assert.ok(converted.facts.includes("parallel(line-EF,line-BC)"));

// This exam proof currently relies on the opposite-segment supplementary-angle
// inference, which is intentionally disabled. Keep the example data available,
// but do not claim the proof engine can prove it under the active rules.
assert.equal(result.success, false, "無効化した円周角の補角ルールに依存するため未証明となる");
assert.equal(result.status, "not-proved-with-current-rules");

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

console.log("✓ 静岡県2025年度の実データを変換し、無効化したルールへの依存を検出");
console.log("✓ 動点の弧・存在条件が未検証であることを保持");
