const assert = require("node:assert/strict");
const Adapter = require("../js/problem-data-engine.js");
const GeometryRelations = require("../js/geometry-relations.js");
const Rules = require("../js/proof-rules.js");

const sample = {
  format: "proof-problem",
  version: 1,
  id: "adapter-smoke",
  geometry: {
    points: [{ id: "A" }, { id: "B" }, { id: "C" }],
    constraints: [{ type: "equal-segments", segments: [["A", "B"], ["A", "C"]] }],
    dynamicConditions: [],
    constructions: []
  },
  goal: { type: "triangle-similarity", triangles: [["A", "B", "C"], ["A", "C", "B"]] }
};
const converted = Adapter.convert(sample);
assert.ok(converted.facts.includes("side(AB)=side(AC)"));
assert.ok(converted.facts.includes("triangle(ABC)"));
assert.equal(converted.goal, "similar(ABC,ACB)");
assert.equal(Adapter.canonicalAngle("A", "B", "C"), Adapter.canonicalAngle("C", "B", "A"));
assert.equal(Adapter.canonicalSegment("B", "A"), "AB");

// Three distinct points on one circle form a triangle, allowing the isosceles rule to apply.
const circleTriangleProblem = {
  format: "proof-problem",
  version: 1,
  id: "circle-points-form-triangle",
  geometry: {
    points: [{ id: "A" }, { id: "C" }, { id: "D" }],
    constraints: [
      { type: "point-on-circle", point: "A", circle: "O" },
      { type: "point-on-circle", point: "C", circle: "O" },
      { type: "point-on-circle", point: "D", circle: "O" },
      { type: "equal-segments", segments: [["C", "A"], ["C", "D"]] }
    ],
    constructions: [],
    dynamicConditions: []
  },
  goal: { type: "angle-equality", angles: [["C", "A", "D"], ["C", "D", "A"]] }
};
const circleTriangleConverted = Adapter.convert(circleTriangleProblem);
assert.ok(circleTriangleConverted.facts.includes("triangle(ACD)"));
const circleTriangleProof = Adapter.run(circleTriangleProblem, Rules);
assert.equal(circleTriangleProof.success, true, "円周上の3点から三角形を認識し、二等辺三角形の底角を導く");

// A known supported problem should pass through the same adapter and inference engine.
const isosceles = {
  ...sample,
  goal: { type: "angle-equality", angles: [["A", "B", "C"], ["B", "C", "A"]] },
  proofFacts: ["triangle(ABC)"]
};
assert.equal(Adapter.convert(isosceles).goal, "angle(ABC)=angle(ACB)");
const isoscelesResult = Adapter.run(isosceles, Rules);
assert.equal(isoscelesResult.success, true);
assert.equal(isoscelesResult.proof.steps.at(-1).conclusion, "angle(ABC)=angle(ACB)");

// Point order matters: B and C on the same ray from A make these angles equal.
const sameRayProblem = {
  format: "proof-problem",
  version: 1,
  id: "same-ray-angle-notation",
  geometry: {
    points: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
    constraints: [{ type: "between", points: ["A", "B", "C"] }],
    constructions: [],
    dynamicConditions: []
  },
  goal: { type: "angle-equality", angles: [["B", "A", "D"], ["C", "A", "D"]] }
};
const sameRayConverted = Adapter.convert(sameRayProblem);
assert.ok(sameRayConverted.facts.includes("sameRay(A,B,C)"));
assert.equal(sameRayConverted.unsupported.some((x) => x.type === "between"), false);
const sameRayResult = Adapter.run(sameRayProblem, Rules);
assert.equal(sameRayResult.success, true);
assert.equal(sameRayResult.proof.steps.at(-1).conclusion, "angle(BAD)=angle(CAD)");

// Two pairs of opposite rays at one intersection generate vertical-angle facts.
const verticalFacts = GeometryRelations.derive([
  { type: "opposite-rays", vertex: "E", points: ["A", "C"] },
  { type: "opposite-rays", vertex: "E", points: ["B", "D"] }
]);
assert.ok(verticalFacts.includes("verticalAngles(AEB,CED)"));
assert.ok(verticalFacts.includes("verticalAngles(AED,CEB)"));
const verticalProblem = {
  format: "proof-problem",
  version: 1,
  id: "vertical-angle-from-rays",
  geometry: {
    points: ["A", "B", "C", "D", "E"].map((id) => ({ id })),
    constraints: [
      { type: "opposite-rays", vertex: "E", points: ["A", "C"] },
      { type: "opposite-rays", vertex: "E", "points": ["B", "D"] }
    ],
    constructions: [],
    dynamicConditions: []
  },
  goal: { type: "angle-equality", angles: [["A", "E", "B"], ["C", "E", "D"]] }
};
const verticalResult = Adapter.run(verticalProblem, Rules);
assert.equal(verticalResult.success, true);
assert.equal(verticalResult.proof.steps.at(-1).ruleId, "angle.vertical-angles");

// Collinearity by itself must not infer same/opposite rays.
assert.deepEqual(GeometryRelations.derive([]), []);

const sampleFile = require("../data/problem-examples/shizuoka-2025-proof-7-1.json");
const sampleResult = Adapter.run(sampleFile, Rules);
assert.equal(sampleResult.status, "not-proved-with-current-rules",
  "証明エンジン未対応の推論を誤って証明済みにしない");
assert.equal(sampleResult.success, false);
assert.ok(sampleResult.proof.steps.some((step) => step.conclusion === "angle(AEF)=angle(GPB)"),
  "平行線と同じ弦に対する円周角から、一組の角の等しさを導く");
assert.ok(sampleResult.proof.steps.some((step) => step.ruleId === "angle.addition"),
  "既存の角の加法ルールは動作する");

 // Explicit circle incidence, parallel-through-point construction, and the
 // selected moving-point equality must reach the inference facts.
 const convertedExam = Adapter.convert(sampleFile);
 assert.ok(convertedExam.facts.includes("onCircle(A)"));
 assert.ok(convertedExam.facts.includes("onCircle(B)"));
 assert.ok(convertedExam.facts.includes("onCircle(P)"));
 assert.ok(convertedExam.facts.includes("parallel(line-EF,line-BC)"));
 assert.ok(convertedExam.facts.includes("onLine(E,line-AC)"));
 assert.ok(convertedExam.facts.includes("onLine(E,line-BD)"));
 assert.ok(convertedExam.facts.includes("onLine(F,line-AB)"));
 assert.ok(convertedExam.facts.includes("onLine(F,line-EF)"));
 assert.ok(convertedExam.facts.includes("side(AB)=side(BG)"));
 assert.ok(convertedExam.facts.includes("triangle(ABG)"),
   "3本の異なる直線上の交点関係から補助三角形ABGを認識する");
 const isoscelesConstruction = Rules.prove(convertedExam.facts, "angle(BAG)=angle(BGA)");
 assert.equal(isoscelesConstruction.success, true,
   "BA=BGと交点由来の三角形ABGから二等辺三角形の底角を導く");
 assert.ok(convertedExam.facts.includes("correspondingAngles(angle(AFE),angle(ABC),line-AB,line-EF,line-BC)"),
   "平行線の角対応を型付き制約から推論事実へ変換する");
 assert.equal(convertedExam.unsupported.some((x) => x.type === "corresponding-angles"), false);
 const parallelAngleProof = Rules.prove(convertedExam.facts, "angle(AFE)=angle(ABC)");
 assert.equal(parallelAngleProof.success, true, "平行線と角対応から同位角の等しさを導く");
 assert.equal(parallelAngleProof.steps.at(-1).ruleId, "parallel.corresponding-angles");
 assert.equal(convertedExam.unsupported.some((x) => x.location === "geometry.dynamicConditions" && x.type === "equal-segments"), false);

console.log("problem-data-engine adapter checks passed");

const convertedSameSegment = Adapter.convert(sampleFile);
assert.ok(convertedSameSegment.facts.includes("sameSegment(AB,C,P)"), "同じ弦の同じ側の位置関係を変換する");

const angleSplitProblem = {
  format: "proof-problem",
  version: 1,
  id: "explicit-angle-split",
  geometry: {
    points: ["A", "B", "E", "G"].map((id) => ({ id })),
    constraints: [{
      type: "ray-inside-angle",
      vertex: "A",
      points: ["B", "E", "G"]
    }],
    constructions: [],
    dynamicConditions: []
  },
  goal: { type: "angle-equality", angles: [["B", "A", "G"], ["B", "A", "E"]] }
};
const angleSplitConverted = Adapter.convert(angleSplitProblem);
assert.ok(angleSplitConverted.facts.includes("rayInsideAngle(A,B,E,G)"));
const angleSplitProof = Rules.prove(angleSplitConverted.facts, "angle(BAG)=angle(BAE)+angle(EAG)");
assert.equal(angleSplitProof.success, true, "明示された内角の半直線から角の加法を導く");
assert.equal(angleSplitProof.steps.at(-1).ruleId, "angle.addition");
