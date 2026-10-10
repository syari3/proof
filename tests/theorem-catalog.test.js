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

console.log("theorem-catalog schema tests passed (" + all.length + " rules)");
