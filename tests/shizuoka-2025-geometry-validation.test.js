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
// The currently implemented coordinate constraints should all be evaluated for this dataset.
assert.equal(checked.status, "coordinate-witness-consistent", JSON.stringify(checked.pending, null, 2));
assert.equal(checked.pending.length, 0);
const angleChecks = checked.checked.filter(item => item.path.startsWith("geometry.constraints") &&
  (item.path.endsWith("[11]") || item.path.endsWith("[12]")));
assert.equal(angleChecks.length, 2);
assert.ok(angleChecks.every(item => item.ok), JSON.stringify(angleChecks, null, 2));
assert.ok(checked.checked.some(item => item.path === "geometry.dynamicConditions[1]" && item.ok));

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

// Bad placement 3: E must lie inside angle FAG, not outside its boundary rays.
const badInterior = Checker.validate(problem, {points:{
  ...realization.points,
  E:{x:0.25,y:1.5}
}});
assert.equal(badInterior.valid, false);
assert.ok(badInterior.errors.some(item => item.path === "geometry.constraints[17]"),
  JSON.stringify(badInterior.errors, null, 2));

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
