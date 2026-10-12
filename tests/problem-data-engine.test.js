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
assert.equal(sameRayResult.proof.steps.length, 0, "同じ半直線による角の言い換えは内部処理する");
assert.equal(sameRayResult.proof.reason, "implicit-angle-equivalence");

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

// The exterior-angle theorem must be used by prove(), not only exposed by derive().
const exteriorAngleProof = Rules.prove(
  ["triangle(ABC)", "extends(BC,D)"],
  "angle(ACD)=angle(BAC)+angle(ABC)"
);
assert.equal(exteriorAngleProof.success, true, "三角形の外角は隣り合わない2つの内角の和");
assert.equal(exteriorAngleProof.steps.at(-1).ruleId, "triangle.exterior-angle");
assert.deepEqual(exteriorAngleProof.steps.at(-1).premises, ["triangle(ABC)", "extends(BC,D)"]);

// Collinearity by itself must not infer same/opposite rays.
assert.deepEqual(GeometryRelations.derive([]), []);

const sampleFile = require("../data/problem-examples/shizuoka-2025-proof-7-1.json");
const sampleResult = Adapter.run(sampleFile, Rules, 100, { analyzeConditions: false });
// The example has another proof route using same-segment angles, parallel
// corresponding angles, and the two isosceles-triangle angle equalities.
// It must not depend on the intentionally disabled opposite-segment rule.
assert.equal(sampleResult.status, "proved",
  "有効な別経路がある場合は、無効化した補角ルールを使わずに証明できる");
assert.equal(sampleResult.success, true);
assert.ok(sampleResult.proof.steps.some((step) => step.ruleId === "triangle.similarity-aa"));
assert.equal(sampleResult.proof.steps.some((step) => step.ruleId === "circle.opposite-segment-supplementary-angles"), false);

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
assert.ok(convertedSameSegment.facts.includes("oppositeSegment(AC,B,D)"), "同じ弦の反対側の位置関係を変換する");

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


// The new example specifically exercises angle addition, substitution, and cancellation.
const angleAdditionProblem = require("../data/problem-examples/angle-addition-substitution-similarity.json");
const angleAdditionResult = Adapter.run(angleAdditionProblem, Rules);
assert.equal(angleAdditionResult.success, true, "角の加法と代入から△ABD∽△AEFを導く");
assert.equal(angleAdditionResult.proof.steps.at(-1).ruleId, "triangle.similarity-aa");
assert.ok(angleAdditionResult.proof.steps.some((step) => step.ruleId === "angle.addition"),
  "2つの大きな角をそれぞれ角の加法で表す");
assert.ok(angleAdditionResult.proof.steps.some((step) => step.ruleId === "angle.addition-cancellation"),
  "等しい全体から等しい部分を消去する");
// Same-ray notation can be normalized internally, so an explicit rewrite
// step is optional when the similarity matcher already recognizes the angles.

// Isolate the substitution rule: replace one equal angle inside an addition expression.
const substitutionProbe = Rules.prove([
  "angle(BAC)=angle(BAD)+angle(DAC)",
  "angle(DAC)=angle(DAF)"
], "angle(BAC)=angle(BAD)+angle(DAF)");
assert.equal(substitutionProbe.success, true, "角の加法の式に等しい角を代入できる");
assert.equal(substitutionProbe.steps.at(-1).ruleId, "angle.addition-substitution");

// The 2024 Shizuoka problem is encoded and accepted by the adapter. Its full
// proof remains an engine-coverage task; this smoke test must not assume success.
const shizuoka2024 = require("../data/problem-examples/shizuoka-2024-proof-7-1.json");
const shizuoka2024Result = Adapter.run(shizuoka2024, Rules, 100, { analyzeConditions: false });
assert.equal(shizuoka2024Result.converted.goal, "side(AP)=side(CP)");
assert.ok(shizuoka2024Result.converted.facts.includes("angle(CFE)=angle(ABC)") ||
  shizuoka2024Result.converted.facts.includes("angle(ABC)=angle(CFE)"),
  "動点条件の角の等しさを条件として取り込む");
assert.ok(shizuoka2024Result.converted.facts.includes("side(AB)=side(AD)"));
assert.ok(shizuoka2024Result.converted.facts.includes("extends(DF,E)"),
  "2024年問題の外角定理に必要な、DFをFの先へ延長する条件を正しい形式で渡す");
assert.ok(shizuoka2024Result.converted.facts.includes("triangle(CDF)"),
  "直線AC・BD・CPの交点関係から三角形CDFを認識する");
assert.ok(Rules.derive(shizuoka2024Result.converted.facts).some((rule) =>
  rule.ruleId === "triangle.exterior-angle" &&
  rule.conclusion === "angle(CFE)=angle(DCF)+angle(CDF)"),
  "2024年問題の実データから外角定理を導出できる");

assert.ok(shizuoka2024Result.converted.facts.includes("sameSegment(CE,B,A)"));
assert.equal(shizuoka2024Result.status === "proved", shizuoka2024Result.success);


// Regression checks for the final step of the 2024 PA = PC proof.
assert.ok(shizuoka2024Result.converted.facts.includes("triangle(APC)"),
  "A・P・CはAE・AC・CPという3本の異なる直線から三角形APCとして認識される");
assert.ok(shizuoka2024Result.converted.facts.includes("sameRay(A,P,E)"),
  "A・P・Eの順序から、Aを頂点とするAPとAEの同じ半直線を認識する");
assert.ok(shizuoka2024Result.converted.facts.includes("sameRay(C,F,P)"),
  "P・F・Cの順序から、Cを頂点とするCFとCPの同じ半直線を認識する");
assert.ok(shizuoka2024Result.converted.facts.includes("oppositeRay(F,E,D)"));
assert.ok(shizuoka2024Result.converted.facts.includes("oppositeRay(F,P,C)"));

// Isolate the converse isosceles theorem needed at the end: equal angles
// in the inferred triangle APC must yield PA = PC.
const equalAnglesInAPC = Rules.prove(
  ["triangle(APC)", "angle(PAC)=angle(ACP)"],
  "side(AP)=side(CP)"
);
assert.equal(equalAnglesInAPC.success, true,
  "△APCの∠PAC＝∠ACPから、対辺PA＝PCを導ける");
assert.equal(equalAnglesInAPC.steps.at(-1).ruleId, "triangle.equal-angles-imply-equal-sides");

// The straight-line angle notation rule should cooperate with the converse rule.
const equalAnglesAfterRayReplacement = Rules.prove(
  ["triangle(APC)", "sameRay(A,P,E)", "sameRay(C,F,P)", "angle(EAC)=angle(ACF)"],
  "side(AP)=side(CP)"
);
assert.equal(equalAnglesAfterRayReplacement.success, true,
  "同じ半直線で言い換えた等角を△APCの等角として扱える");
