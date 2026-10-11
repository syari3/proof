const assert = require("node:assert/strict");
const Validator = require("../js/geometry-validator.js");
const exam = require("../data/problem-examples/shizuoka-2025-proof-7-1.json");

const result = Validator.validate(exam);
assert.equal(result.valid, true, "実際の入試データの参照構造が整合している");
assert.equal(result.status, "structurally-valid-geometry-review-pending");
assert.equal(result.errors.length, 0);
assert.ok(result.pending.some((item) => item.code === "intersection-realizability"));
assert.ok(result.pending.some((item) => item.code === "moving-point-existence"));
assert.ok(result.note.includes("保証しません"));

const unknownPoint = {
  format: "proof-problem",
  version: 1,
  geometry: {
    points: [{ id: "A" }, { id: "B" }],
    objects: [{ id: "line-AB", type: "line", through: ["A", "Z"] }],
    constraints: [],
    constructions: [],
    dynamicConditions: []
  },
  goal: { type: "triangle-similarity", triangles: [["A", "B", "Z"], ["A", "B", "A"]] }
};
const invalid = Validator.validate(unknownPoint);
assert.equal(invalid.valid, false);
assert.equal(invalid.status, "invalid-geometry-data");
assert.ok(invalid.errors.some((item) => item.code === "unknown-point"));
assert.ok(invalid.errors.some((item) => item.code === "degenerate-goal-triangle"));

const duplicateIds = {
  format: "proof-problem",
  version: 1,
  geometry: {
    points: [{ id: "A" }, { id: "A" }],
    objects: [],
    constraints: [],
    constructions: [],
    dynamicConditions: []
  },
  goal: { type: "triangle-similarity", triangles: [["A", "A", "A"], ["A", "A", "A"]] }
};
const duplicate = Validator.validate(duplicateIds);
assert.ok(duplicate.errors.some((item) => item.code === "duplicate-point-id"));
assert.ok(duplicate.errors.some((item) => item.code === "degenerate-goal-triangle"));

console.log("geometry-validator structural checks passed");
