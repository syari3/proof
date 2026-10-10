const assert = require("node:assert/strict");
const Relations = require("../js/geometry-relations.js");
const Adapter = require("../js/problem-data-engine.js");
const Rules = require("../js/proof-rules.js");

const order = Relations.derive([{ type: "between", points: ["A", "B", "C"] }]);
assert.ok(order.includes("sameRay(A,B,C)"));
assert.ok(order.includes("oppositeRay(B,A,C)"));

const reversed = Adapter.canonicalAngle("B", "A", "D");
assert.equal(reversed, Adapter.canonicalAngle("D", "A", "B"));

const angleProblem = {
  format: "proof-problem",
  version: 1,
  id: "same-ray-angle",
  geometry: {
    points: ["A", "B", "C", "D"].map((id) => ({ id })),
    constraints: [{ type: "between", points: ["A", "B", "C"] }],
    constructions: [],
    dynamicConditions: []
  },
  goal: { type: "angle-equality", angles: [["B", "A", "D"], ["C", "A", "D"]] }
};
const result = Adapter.run(angleProblem, Rules);
assert.equal(result.success, true);

const vertical = Relations.derive([
  { type: "opposite-rays", vertex: "E", points: ["A", "C"] },
  { type: "opposite-rays", vertex: "E", points: ["B", "D"] }
]);
assert.ok(vertical.includes("verticalAngles(AEB,CED)"));
assert.ok(vertical.includes("verticalAngles(AED,CEB)"));

const reverseOrder = Relations.derive([{ type: "between", points: ["B", "A", "C"] }]);
assert.ok(reverseOrder.includes("oppositeRay(A,B,C)"));
assert.ok(!reverseOrder.includes("sameRay(A,B,C)"));

console.log("geometry relation tests passed");
