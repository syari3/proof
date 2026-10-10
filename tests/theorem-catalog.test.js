const assert = require("node:assert/strict");
const catalog = require("../js/theorem-catalog.js");

const all = catalog.all();
const ids = all.map((rule) => rule.id);

assert.ok(all.length >= 1, "catalog should contain at least one rule");
assert.equal(new Set(ids).size, ids.length, "rule IDs must be unique");

for (const rule of all) {
  assert.ok(rule.id && rule.name && rule.subject && rule.reason, "rule metadata is required");
  assert.ok(Array.isArray(rule.premises) && rule.premises.length > 0, rule.id + " needs premises");
  assert.ok(Array.isArray(rule.conclusions) && rule.conclusions.length > 0, rule.id + " needs conclusions");
  assert.ok(rule.premises.every((premise) => typeof premise.type === "string"), rule.id + " premises need typed predicates");
  assert.ok(rule.conclusions.every((conclusion) => typeof conclusion.type === "string"), rule.id + " conclusions need typed predicates");
  assert.ok(rule.testCases?.positive, rule.id + " needs a positive test description");
  assert.ok(rule.testCases?.negative, rule.id + " needs a negative test description");
}

assert.equal(catalog.get("triangle.isosceles-base-angles").conclusions[0].type, "equal-angles");
assert.equal(catalog.get("circle.diameter-inscribed-angle").conclusions[0].degrees, 90);
assert.equal(catalog.get("not-a-real-rule"), null);

const proofRules = require("../js/proof-rules.js");
const runtimeIds = new Set([
  ...proofRules.list().map((rule) => rule.id),
  ...proofRules.derive([
    "triangle(ABC)", "side(AB)=side(AC)",
    "onCircle(A,O)", "onCircle(B,O)",
    "parallel(l,m)", "intersects(t,l)", "intersects(t,m)",
    "alternateAngles(angle1,angle2,t,l,m)",
    "onCircle(A)", "onCircle(B)", "onCircle(C)", "diameter(BC)",
    "verticalAngles(ABC,DBE)",
    "extends(BC,D)", "rayInsideAngle(O,A,B,C)", "between(A,B,C)",
    "angle(ABC)=angle(BCA)", "triangle(DEF)",
    "angle(A)=angle(D)", "angle(B)=angle(E)",
    "side(AB)=side(DE)", "side(BC)=side(EF)", "side(CA)=side(FD)",
    "angle(BAC)=angle(EDF)", "side(AC)=side(DF)",
    "angle(ABC)=angle(DEF)",
    "equalArc(AB,CD)", "inscribed(AEB,AB)", "inscribed(CFD,CD)",
    "central(AOB,AB)", "inscribed(ACB,AB)"
  ]).map((rule) => rule.ruleId),
  "logic.equality-transitivity"
]);
const status = proofRules.catalogStatus([...runtimeIds].filter((id) => id !== "corresponding-parts-of-congruent-triangles" && id !== "same-angle-ray-notation"));
assert.equal(status.available, true, "proof engine should have access to canonical catalog");
assert.deepEqual(status.missing, [], "all canonical theorem IDs emitted by the runtime must exist in the catalog");
assert.equal(proofRules.getTheorem("triangle.isosceles-base-angles").name, catalog.get("triangle.isosceles-base-angles").name);
const derived = proofRules.derive(["triangle(ABC)", "side(AB)=side(AC)"]);
assert.equal(derived[0].ruleName, catalog.get(derived[0].ruleId).name, "derived theorem metadata comes from catalog");

console.log("theorem-catalog schema and runtime integration tests passed (" + all.length + " catalog rules)");
