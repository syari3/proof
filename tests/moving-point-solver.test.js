const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Solver = require("../js/moving-point-solver.js");

const problem = JSON.parse(fs.readFileSync(
  path.join(__dirname, "../data/problem-examples/shizuoka-2025-proof-7-1.json"), "utf8"
));

// Same fixed layout used in the previous real-data experiment, but P and G
// are intentionally omitted: the solver must calculate them from BA = BG.
const fixed = {
  O:{x:0,y:0},
  A:{x:-0.5,y:Math.sqrt(3)/2},
  B:{x:0.5,y:Math.sqrt(3)/2},
  C:{x:1,y:0},
  D:{x:-0.5,y:-Math.sqrt(3)/2},
  E:{x:0.25,y:Math.sqrt(3)/4},
  F:{x:0,y:Math.sqrt(3)/2}
};
const solved = Solver.solve(problem, fixed);
console.log("inverse moving-point solve:", JSON.stringify(solved, null, 2));
assert.equal(solved.status, "coordinate-solution-found");
assert.equal(solved.valid, true);
assert.ok(Math.abs(solved.measurements.BA-solved.measurements.BG)<1e-7);
assert.ok(Math.abs(solved.points.P.x-0.5)<1e-7);
assert.ok(Math.abs(solved.points.P.y+Math.sqrt(3)/2)<1e-7);
assert.equal(solved.checks.POnCircle, true);
assert.equal(solved.checks.selectedArc, true);

// If BA is longer than BD, no G can lie on segment BD at distance BA from B.
const impossible = Solver.solve(problem, {
  ...fixed,
  A:{x:-2,y:0},
  B:{x:0.5,y:Math.sqrt(3)/2},
  D:{x:-0.5,y:-Math.sqrt(3)/2}
});
assert.equal(impossible.status, "no-segment-intersection");
assert.equal(impossible.valid, false);

console.log("moving-point solver tests passed");
