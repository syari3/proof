const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Checker = require("../js/geometry-realization-checker.js");

const problem = JSON.parse(fs.readFileSync(
  path.join(__dirname, "../data/problem-examples/shizuoka-2025-proof-7-1.json"), "utf8"
));

// A deliberately hand-built, circle-like configuration:
// A,B,C,D are on the unit circle, CA=CD, P lies on the D-to-C arc
// not containing A, E/F/G are intersections, and BA=BG.
const similarWitness = {points:{
  O:{x:0,y:0},
  A:{x:-0.5,y:Math.sqrt(3)/2},
  B:{x:0.5,y:Math.sqrt(3)/2},
  C:{x:1,y:0},
  D:{x:-0.5,y:-Math.sqrt(3)/2},
  E:{x:0.25,y:Math.sqrt(3)/4},
  F:{x:0,y:Math.sqrt(3)/2},
  P:{x:0.5,y:-Math.sqrt(3)/2},
  G:{x:0,y:0}
}};

const similar = Checker.validate(problem, similarWitness);
console.log("similar-like witness:", JSON.stringify({
  status: similar.status,
  valid: similar.valid,
  errorCount: similar.errors.length,
  pendingCount: similar.pending.length,
  errors: similar.errors.map(x=>x.code),
  pending: similar.pending.map(x=>x.code)
}, null, 2));

// This deliberately unrelated placement is not a realization of the
// problem. It keeps all point IDs populated but violates circle, line,
// intersection, equal-length, and order conditions.
const unrelatedWitness = {points:{
  O:{x:0,y:0},
  A:{x:2,y:0},
  B:{x:0,y:3},
  C:{x:3,y:1},
  D:{x:-2,y:1},
  E:{x:4,y:2},
  F:{x:-1,y:4},
  P:{x:0,y:-3},
  G:{x:2,y:2}
}};
const unrelated = Checker.validate(problem, unrelatedWitness);
console.log("unrelated witness:", JSON.stringify({
  status: unrelated.status,
  valid: unrelated.valid,
  errorCount: unrelated.errors.length,
  pendingCount: unrelated.pending.length,
  errorCodes: [...new Set(unrelated.errors.map(x=>x.code))]
}, null, 2));

assert.equal(similar.valid, true, "hand-built similar-like witness should pass implemented checks");
assert.equal(unrelated.valid, false, "unrelated placement should be rejected");
assert.ok(unrelated.errors.length > 0);

// Record an important limitation: dynamicConditions are not yet checked by
// this witness checker, and corresponding-angle constraints currently do
// not produce a checked result in AngleArcModel.
assert.ok(problem.geometry.dynamicConditions.some(c=>c.type==="moves-on-arc"));
const corresponding = problem.geometry.constraints.filter(c=>c.type==="corresponding-angles");
assert.equal(corresponding.length, 2);
assert.equal(similar.checked.some(c=>String(c.path).includes("corresponding-angles")), false);

console.log("real-data coordinate experiment tests passed");
