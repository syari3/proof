const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "..", "data", "problem-examples", "shizuoka-2025-proof-7-1.json");
const problem = JSON.parse(fs.readFileSync(file, "utf8"));

assert.equal(problem.format, "proof-problem");
assert.equal(problem.version, 1);
assert.ok(problem.id && problem.source && problem.prompt);
assert.equal(problem.source.year, 2025);
assert.equal(problem.goal.type, "triangle-similarity");
assert.deepEqual(problem.goal.triangles, [["A", "F", "E"], ["B", "G", "P"]]);
assert.equal(problem.validation.status, "not-yet-proved");

const geometry = problem.geometry;
const pointIds = new Set(geometry.points.map((point) => point.id));
const objectIds = new Set(geometry.objects.map((object) => object.id));
assert.equal(pointIds.size, geometry.points.length, "point IDs must be unique");
assert.equal(objectIds.size, geometry.objects.length, "geometry object IDs must be unique");

for (const object of geometry.objects) {
  if (object.type === "circle") {
    assert.ok(pointIds.has(object.center), object.id + " must refer to a declared center");
  }
  if (object.type === "line") {
    assert.ok(object.through.every((id) => pointIds.has(id)), object.id + " must refer to declared points");
  }
  if (object.type === "parallel-through-point") {
    assert.ok(object.through.every((id) => pointIds.has(id)), object.id + " must refer to declared points");
    assert.ok(objectIds.has(object.parallelTo), object.id + " must reference an existing parallel line");
  }
}
for (const construction of geometry.constructions) {
  assert.ok(pointIds.has(construction.point), "construction must define a declared point");
  assert.ok(construction.of.every((id) => objectIds.has(id)), construction.point + " must reference declared objects");
}
for (const constraint of geometry.constraints) {
  if (constraint.type === "point-on-circle") {
    assert.ok(pointIds.has(constraint.point));
    assert.ok(objectIds.has(constraint.circle));
  }
  if (constraint.type === "equal-segments") {
    assert.ok(constraint.segments.flat().every((id) => pointIds.has(id)));
  }
}
for (const triangle of problem.goal.triangles) {
  assert.equal(triangle.length, 3);
  assert.ok(triangle.every((id) => pointIds.has(id)), "goal triangle vertices must be declared");
}

assert.ok(problem.proofPlan.warning.includes("検証済みの証明手順ではない"));
assert.ok(problem.validation.openQuestions.length > 0, "unverified geometry must retain open questions");

console.log("problem-data-format example checks passed");
