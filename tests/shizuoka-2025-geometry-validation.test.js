const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Checker = require("../js/geometry-realization-checker.js");
const Solver = require("../js/moving-point-solver.js");

const problem = JSON.parse(fs.readFileSync(
  path.join(__dirname, "../data/problem-examples/shizuoka-2025-proof-7-1.json"), "utf8"
));

// A coherent coordinate layout: A, B, C, D lie on the unit circle and CA = CD.
// E and F are calculated from the intersections/parallel condition.
const fixed = {
  O:{x:0,y:0},
  A:{x:-0.5,y:Math.sqrt(3)/2},
  B:{x:0.5,y:Math.sqrt(3)/2},
  C:{x:1,y:0},
  D:{x:-0.5,y:-Math.sqrt(3)/2},
  E:{x:0.25,y:Math.sqrt(3)/4},
  F:{x:0,y:Math.sqrt(3)/2}
};
const solution = Solver.solve(problem, fixed);
assert.equal(solution.status, "coordinate-solution-found");
const realization = {points:{...fixed,...solution.points}};
const checked = Checker.validate(problem, realization);
assert.equal(checked.valid, true, JSON.stringify(checked.errors, null, 2));
// Important: the checker must say that unsupported facts remain unverified.
assert.equal(checked.status, "coordinate-witness-partial");
assert.ok(checked.pending.some(item => item.code === "unsupported-angle-relation"));
assert.ok(checked.pending.some(item => item.code === "unsupported-constraint"));

// Bad placement 1: put P at an arbitrary point away from the circle/selected arc.
const badP = Checker.validate(problem, {points:{
  ...realization.points,
  P:{x:2,y:2}
}});
assert.equal(badP.valid, false);
assert.ok(badP.errors.some(item => item.path.includes("dynamicConditions") &&
  (item.path.endsWith(".circle") || item.path.endsWith(".selectedArc"))));

// Bad placement 2: make C fail the circle and CA = CD conditions.
const badFixed = Checker.validate(problem, {points:{
  ...realization.points,
  C:{x:2,y:0}
}});
assert.equal(badFixed.valid, false);
assert.ok(badFixed.errors.some(item => item.code === "constraint-not-satisfied"));

// Impossible movement: BA is longer than BD, so G cannot lie on segment BD.
const impossible = Solver.solve(problem, {
  ...fixed,
  A:{x:-2,y:0},
  B:{x:0.5,y:Math.sqrt(3)/2},
  D:{x:-0.5,y:-Math.sqrt(3)/2}
});
assert.equal(impossible.status, "no-segment-intersection");
assert.equal(impossible.valid, false);

console.log("Shizuoka real-data geometry validation tests passed");
