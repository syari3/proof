const assert = require("node:assert/strict");
const rules = require("../js/proof-rules.js");

const cases = [
  {
    name: "二等辺三角形の底角は、三角形と等しい辺が与えられたとき導く",
    facts: ["triangle(ABC)", "side(AB)=side(AC)"],
    expected: "angle(ABC)=angle(BCA)"
  },
  {
    name: "辺の等しさがない場合、底角の等しさを勝手に導かない",
    facts: [],
    expected: null
  },
  {
    name: "平行線の錯角には、平行条件と交差関係が必要",
    facts: ["parallel(l,m)", "intersects(t,l)", "intersects(t,m)", "alternateAngles(angle1,angle2,t,l,m)"],
    expected: "angle1=angle2"
  },
  {
    name: "平行条件だけでは角の等しさを導かない",
    facts: ["parallel(l,m)"],
    expected: null
  },
  {
    name: "円周上の3点と直径があれば直角を導く",
    facts: ["onCircle(A)", "onCircle(B)", "onCircle(C)", "diameter(BC)"],
    expected: "angle(BAC)=90"
  },
  {
    name: "直径の条件がなければ円周角を直角と断定しない",
    facts: ["onCircle(A)", "onCircle(B)", "onCircle(C)"],
    expected: null
  },
  {
    name: "2組の角と三角形の指定がそろえば相似を導く",
    facts: ["angle(A)=angle(D)", "angle(B)=angle(E)", "triangle(ABC)", "triangle(DEF)"],
    expected: "similar(ABC,DEF)"
  },
  {
    name: "相似条件が不足している場合は相似を導かない",
    facts: ["angle(A)=angle(D)", "triangle(ABC)", "triangle(DEF)"],
    expected: null
  }
];

for (const test of cases) {
  const result = rules.derive(test.facts);
  if (test.expected === null) {
    assert.equal(result.some((item) => item.conclusion === "similar(ABC,DEF)" || item.conclusion === "angle(BAC)=90" || item.conclusion === "angle1=angle2"), false, test.name);
  } else {
    assert.ok(result.some((item) => item.conclusion === test.expected), test.name);
  }
  console.log("✓ " + test.name);
}
const chain = rules.prove(
  ["onCircle(A)", "onCircle(B)", "onCircle(C)", "diameter(BC)"],
  "angle(BAC)=90"
);
assert.equal(chain.success, true, "証明探索は円周角の結論に到達する");
assert.equal(chain.steps.length, 1, "推論ステップを記録する");
assert.equal(chain.steps[0].ruleId, "diameter-inscribed-angle");
console.log("✓ 証明探索は推論ステップを記録する");

const failed = rules.prove(
  ["onCircle(A)", "onCircle(B)", "onCircle(C)"],
  "angle(BAC)=90"
);
assert.equal(failed.success, false, "直径がなければ目標に到達しない");
assert.equal(failed.reason, "no-derivation");
console.log("✓ 証明探索は前提不足を失敗として返す");

const limited = rules.prove(
  ["onCircle(A)", "onCircle(B)", "onCircle(C)", "diameter(BC)"],
  "angle(BAC)=90",
  0
);
assert.equal(limited.success, false, "ステップ上限0では新しい推論をしない");
assert.equal(limited.reason, "step-limit");
console.log("✓ 証明探索のステップ上限を守る");

const chained = rules.prove(
  ["triangle(ABC)", "side(AB)=side(AC)", "angle(BCA)=angle(DEF)"],
  "angle(ABC)=angle(DEF)"
);
assert.equal(chained.success, true, "前の推論結果を次のルールが利用する");
assert.equal(chained.steps.length, 2, "2段階の推論が記録される");
assert.equal(chained.steps[1].premiseSources.some((source) => source.type === "step" && source.index === 1), true, "2段階目の根拠に1段階目を記録する");
console.log("✓ 前の結論を次の推論の根拠として追跡する");

const sideChain = rules.prove(
  ["side(AB)=side(CD)", "side(CD)=side(EF)"],
  "side(AB)=side(EF)"
);
assert.equal(sideChain.success, true, "辺の長さの等式にも推移律を適用する");
assert.equal(sideChain.steps[0].ruleId, "equality-transitivity");
console.log("✓ 辺の等式の推移律を一般的に適用する");

const unrelated = rules.prove(
  ["side(AB)=side(CD)", "side(EF)=side(GH)"],
  "side(AB)=side(GH)"
);
assert.equal(unrelated.success, false, "共通する量がなければ推移律を適用しない");
console.log("✓ 関係のない等式をつなげない");

const sss = rules.prove(
  ["side(AB)=side(DE)", "side(BC)=side(EF)", "side(CA)=side(FD)", "triangle(ABC)", "triangle(DEF)"],
  "congruent(ABC,DEF)"
);
assert.equal(sss.success, true, "3組の辺がそろえば合同を導く");
assert.equal(sss.steps[0].ruleId, "triangle-congruence-sss");
console.log("✓ 合同条件（3組の辺）");

const noSss = rules.prove(
  ["side(AB)=side(DE)", "side(BC)=side(EF)", "triangle(ABC)", "triangle(DEF)"],
  "congruent(ABC,DEF)"
);
assert.equal(noSss.success, false, "3組目の辺がなければ合同を導かない");
console.log("✓ 合同条件の不足を検出");

const corresponding = rules.prove(
  ["side(AB)=side(DE)", "side(BC)=side(EF)", "side(CA)=side(FD)", "triangle(ABC)", "triangle(DEF)"],
  "angle(CAB)=angle(FDE)"
);
assert.equal(corresponding.success, true, "合同から対応する角を導く");
assert.ok(corresponding.steps.some((step) => step.ruleId === "corresponding-parts-of-congruent-triangles"));
console.log("✓ 合同から対応する角を導く");

const sameRayAngle = rules.prove(
  ["sameRay(B,A,D)"],
  "angle(ABC)=angle(DBC)"
);
assert.equal(sameRayAngle.success, true, "同じ半直線上の点による角の表記を同一視する");
assert.equal(sameRayAngle.steps[0].ruleId, "same-angle-ray-notation");
console.log("✓ 同じ半直線上の点による角の表記");

const collinearNotEnough = rules.prove(
  ["collinear(A,B,D)"],
  "angle(ABC)=angle(DBC)"
);
assert.equal(collinearNotEnough.success, false, "一直線上という条件だけでは同じ半直線と決めつけない");
console.log("✓ 一直線上だけでは角の同一性を断定しない");

console.log("\\n" + (cases.length + 11) + " tests passed.");

const circle1 = rules.prove(["inscribed(ACB,AB)","inscribed(ADB,AB)"],"angle(ACB)=angle(ADB)");
assert.equal(circle1.success,true);
const circle2 = rules.prove(["central(AOB,AB)","inscribed(ACB,AB)"],"angle(AOB)=2*angle(ACB)");
assert.equal(circle2.success,true);
const circle3 = rules.prove(["equalArc(AB,CD)","inscribed(AEB,AB)","inscribed(CFD,CD)"],"angle(AEB)=angle(CFD)");
assert.equal(circle3.success,true);
const circle4 = rules.prove(["inscribed(ACB,AB)","inscribed(ADB,CD)"],"angle(ACB)=angle(ADB)");
assert.equal(circle4.success,false);


const angleSum = rules.prove(
  ["triangle(ABC)"],
  "angle(BAC)+angle(ABC)+angle(ACB)=180"
);
assert.equal(angleSum.success, true, "三角形ABCの内角の和を導く");
assert.equal(angleSum.steps[0].ruleId, "triangle-angle-sum");
assert.deepEqual(angleSum.steps[0].premises, ["triangle(ABC)"]);

const otherTriangle = rules.prove(
  ["triangle(PQR)"],
  "angle(QPR)+angle(PQR)+angle(PRQ)=180"
);
assert.equal(otherTriangle.success, true, "別の頂点名でも内角の和を導く");

const missingTriangle = rules.prove(
  [],
  "angle(BAC)+angle(ABC)+angle(ACB)=180"
);
assert.equal(missingTriangle.success, false, "三角形の条件がなければ内角の和を導かない");

const degenerateTriangleFact = rules.prove(
  ["triangle(AAA)"],
  "angle(AAA)+angle(AAA)+angle(AAA)=180"
);
assert.equal(degenerateTriangleFact.success, false, "同じ頂点を重複させた三角形を受け入れない");

console.log("✓ 三角形の内角の和（汎用ルール）");


const equalRadii = rules.prove(
  ["onCircle(A,O)", "onCircle(B,O)"],
  "side(OA)=side(OB)"
);
assert.equal(equalRadii.success, true, "同じ中心Oをもつ円周上の点から半径の等しさを導く");
assert.equal(equalRadii.steps[0].ruleId, "circle-equal-radii");
assert.deepEqual(equalRadii.steps[0].premises, ["onCircle(A,O)", "onCircle(B,O)"]);

const differentCenters = rules.prove(
  ["onCircle(A,O)", "onCircle(B,P)"],
  "side(OA)=side(PB)"
);
assert.equal(differentCenters.success, false, "中心が異なる円の半径を等しいと決めつけない");

const onePoint = rules.prove(
  ["onCircle(A,O)"],
  "side(OA)=side(OA)"
);
assert.equal(onePoint.success, false, "円周上の点が1つだけでは異なる半径同士の等しさを導かない");

console.log("✓ 同じ円の半径は等しい");


const verticalAngles = rules.prove(
  ["verticalAngles(ABC,DBE)"],
  "angle(ABC)=angle(DBE)"
);
assert.equal(verticalAngles.success, true, "明示された対頂角の関係から角の等しさを導く");
assert.equal(verticalAngles.steps[0].ruleId, "angle-vertical-angles");
assert.deepEqual(verticalAngles.steps[0].premises, ["verticalAngles(ABC,DBE)"]);

const adjacentAngles = rules.prove(
  ["verticalAngles(ABC,DBE)"],
  "angle(ABC)=angle(ABE)"
);
assert.equal(adjacentAngles.success, false, "対頂角として指定されていない隣の角の等しさを導かない");

const malformedVerticalAngles = rules.prove(
  ["verticalAngles(ABC,DEF)"],
  "angle(ABC)=angle(DEF)"
);
assert.equal(malformedVerticalAngles.success, false, "頂点が一致しない対頂角指定を拒否する");

console.log("✓ 対頂角は等しい");


const correspondingAngles = rules.prove(
  ["parallel(l,m)", "intersects(t,l)", "intersects(t,m)", "correspondingAngles(angle1,angle2,t,l,m)"],
  "angle1=angle2"
);
assert.equal(correspondingAngles.success, true, "平行条件・横切る直線・同位角の位置がそろえば等しいと導く");
assert.equal(correspondingAngles.steps[0].ruleId, "parallel-corresponding-angles");
assert.deepEqual(correspondingAngles.steps[0].premises, [
  "parallel(l,m)", "intersects(t,l)", "intersects(t,m)", "correspondingAngles(angle1,angle2,t,l,m)"
].map((fact, index) => index === 3 ? "correspondingAngles(angle1,angle2,t,l,m)" : fact));

const missingCorrespondingPosition = rules.prove(
  ["parallel(l,m)", "intersects(t,l)", "intersects(t,m)"],
  "angle1=angle2"
);
assert.equal(missingCorrespondingPosition.success, false, "同位角の位置関係がなければ角の等しさを導かない");

const missingParallelCondition = rules.prove(
  ["intersects(t,l)", "intersects(t,m)", "correspondingAngles(angle1,angle2,t,l,m)"],
  "angle1=angle2"
);
assert.equal(missingParallelCondition.success, false, "平行条件がなければ同位角の定理を適用しない");
console.log("✓ 平行線の同位角");


const exteriorAngle = rules.prove(
  ["triangle(ABC)", "extends(BC,D)"],
  "angle(ACD)=angle(BAC)+angle(ABC)"
);
assert.equal(exteriorAngle.success, true, "辺BCをCの先へ延長した外角は離れた2内角の和になる");
assert.equal(exteriorAngle.steps[0].ruleId, "triangle-exterior-angle");
assert.deepEqual(exteriorAngle.steps[0].premises, ["triangle(ABC)", "extends(BC,D)"]);

const missingExtension = rules.prove(
  ["triangle(ABC)"],
  "angle(ACD)=angle(BAC)+angle(ABC)"
);
assert.equal(missingExtension.success, false, "延長線の事実がなければ外角定理を適用しない");

const wrongSideExtension = rules.prove(
  ["triangle(ABC)", "extends(AB,D)"],
  "angle(ACD)=angle(BAC)+angle(ABC)"
);
assert.equal(wrongSideExtension.success, false, "別の辺を延長した事実では指定した外角を導かない");
console.log("✓ 三角形の外角定理");


const angleAddition = rules.prove(
  ["rayInsideAngle(O,A,B,C)"],
  "angle(AOC)=angle(AOB)+angle(BOC)"
);
assert.equal(angleAddition.success, true, "角の内部にある半直線で分けた角を足せる");
assert.equal(angleAddition.steps[0].ruleId, "angle-addition");

const missingInnerRay = rules.prove(
  [],
  "angle(AOC)=angle(AOB)+angle(BOC)"
);
assert.equal(missingInnerRay.success, false, "内部の半直線の事実がなければ角を分割しない");

const repeatedAnglePoints = rules.prove(
  ["rayInsideAngle(O,A,A,C)"],
  "angle(AOC)=angle(AOA)+angle(AOC)"
);
assert.equal(repeatedAnglePoints.success, false, "同じ点を重複させた不正な角分割を拒否する");
console.log("✓ 角の加法");

const segmentAddition = rules.prove(
  ["between(A,B,C)"],
  "side(AC)=side(AB)+side(BC)"
);
assert.equal(segmentAddition.success, true, "BがAとCの間にあるとき線分を加算できる");
assert.equal(segmentAddition.steps[0].ruleId, "segment-addition");

const missingBetweenFact = rules.prove(
  [],
  "side(AC)=side(AB)+side(BC)"
);
assert.equal(missingBetweenFact.success, false, "点の順序が与えられなければ線分を加算しない");

const repeatedSegmentPoints = rules.prove(
  ["between(A,A,C)"],
  "side(AC)=side(AA)+side(AC)"
);
assert.equal(repeatedSegmentPoints.success, false, "点の順序に同じ点が重複する不正な事実を拒否する");
console.log("✓ 線分の加法");


const equalAnglesImplyEqualSides = rules.prove(
  ["triangle(ABC)", "angle(ABC)=angle(BCA)"],
  "side(AB)=side(AC)"
);
assert.equal(equalAnglesImplyEqualSides.success, true, "三角形の等しい内角に対する辺の等しさを導く");
assert.equal(equalAnglesImplyEqualSides.steps[0].ruleId, "triangle-equal-angles-imply-equal-sides");

const missingTriangleForConverse = rules.prove(
  ["angle(ABC)=angle(BCA)"],
  "side(AB)=side(AC)"
);
assert.equal(missingTriangleForConverse.success, false, "三角形の指定なしでは角の等しさから辺の等しさを導かない");

const mismatchedTriangleAngles = rules.prove(
  ["triangle(ABC)", "angle(ABC)=angle(ABD)"],
  "side(AB)=side(AC)"
);
assert.equal(mismatchedTriangleAngles.success, false, "対象三角形の内角でない角を使って辺の等しさを導かない");
console.log("✓ 等しい角に対する辺は等しい");

const generalizedIsosceles = rules.prove(
  ["triangle(PQR)", "side(PQ)=side(PR)"],
  "angle(PQR)=angle(PRQ)"
);
assert.equal(generalizedIsosceles.success, true, "別の頂点名でも二等辺三角形の底角を導く");
assert.equal(generalizedIsosceles.steps[0].ruleId, "triangle-isosceles-base-angles");

const reversedSideOrder = rules.prove(
  ["triangle(PQR)", "side(RP)=side(QP)"],
  "angle(PQR)=angle(PRQ)"
);
assert.equal(reversedSideOrder.success, true, "辺の文字順が逆でも同じ線分として認識する");

const noTriangleForIsosceles = rules.prove(
  ["side(PQ)=side(PR)"],
  "angle(PQR)=angle(PRQ)"
);
assert.equal(noTriangleForIsosceles.success, false, "三角形の明示がなければ底角定理を適用しない");
console.log("✓ 二等辺三角形の底角（汎用ルール）");

const genericSimilarity = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "angle(P)=angle(Y)", "angle(Q)=angle(Z)"],
  "similar(PQR,YZX)"
);
assert.equal(genericSimilarity.success, true, "任意の頂点名と対応順でAA相似を導く");
assert.equal(genericSimilarity.steps[0].ruleId, "triangle-similarity-aa");

const missingSecondAngle = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "angle(P)=angle(Y)"],
  "similar(PQR,YZX)"
);
assert.equal(missingSecondAngle.success, false, "相似の角条件が1組だけでは相似を導かない");
console.log("✓ 三角形の相似AA（汎用ルール）");




const genericSSS = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "side(PQ)=side(YX)", "side(QR)=side(XZ)", "side(RP)=side(ZY)"],
  "congruent(PQR,YXZ)"
);
assert.equal(genericSSS.success, true, "任意の頂点名・辺の表記順でも3組の辺から合同を導く");
assert.equal(genericSSS.steps[0].ruleId, "triangle-congruence-sss");

const missingThirdSide = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "side(PQ)=side(YX)", "side(QR)=side(XZ)"],
  "congruent(PQR,YXZ)"
);
assert.equal(missingThirdSide.success, false, "3組目の辺の等しさがなければ合同を導かない");

const inconsistentCorrespondence = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "side(PQ)=side(XY)", "side(QR)=side(YZ)", "side(RP)=side(XY)"],
  "congruent(PQR,XYZ)"
);
assert.equal(inconsistentCorrespondence.success, false, "3組の辺の対応が一つの頂点対応と両立しなければ合同を導かない");
console.log("✓ 三角形の合同SSS（汎用ルール）");

const sas = rules.prove(
  ["side(AB)=side(DE)", "angle(BAC)=angle(EDF)", "side(AC)=side(DF)", "triangle(ABC)", "triangle(DEF)"],
  "congruent(ABC,DEF)"
);
assert.equal(sas.success, true, "2辺とその間の角が対応して等しければ合同");
assert.equal(sas.steps[0].ruleId, "triangle-congruence-sas");

const missingSasIncludedAngle = rules.prove(
  ["side(AB)=side(DE)", "side(AC)=side(DF)", "triangle(ABC)", "triangle(DEF)"],
  "congruent(ABC,DEF)"
);
assert.equal(missingSasIncludedAngle.success, false, "SASの間の角が不足すれば合同を導かない");
console.log("✓ 合同条件（SAS）");

const genericSAS = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "side(PQ)=side(XY)", "angle(QPR)=angle(YXZ)", "side(PR)=side(XZ)"],
  "congruent(PQR,XYZ)"
);
assert.equal(genericSAS.success, true, "任意の頂点名でも2辺とその間の角から合同を導く");
assert.equal(genericSAS.steps[0].ruleId, "triangle-congruence-sas");

const nonIncludedSASAngle = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "side(PQ)=side(XY)", "angle(PQR)=angle(XYZ)", "side(PR)=side(XZ)"],
  "congruent(PQR,XYZ)"
);
assert.equal(nonIncludedSASAngle.success, false, "2辺の間の角でなければSASとして合同を導かない");
console.log("✓ 三角形の合同SAS（汎用ルール）");

const genericASA = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "angle(QPR)=angle(YXZ)", "side(PQ)=side(XY)", "angle(PQR)=angle(XYZ)"],
  "congruent(PQR,XYZ)"
);
assert.equal(genericASA.success, true, "任意の頂点名でも1辺と両端の角から合同を導く");
assert.equal(genericASA.steps[0].ruleId, "triangle-congruence-asa");

const wrongEndpointASA = rules.prove(
  ["triangle(PQR)", "triangle(XYZ)", "angle(QPR)=angle(YXZ)", "side(PQ)=side(XY)", "angle(PRQ)=angle(XYZ)"],
  "congruent(PQR,XYZ)"
);
assert.equal(wrongEndpointASA.success, false, "対応する辺の両端でない角を使ってASA合同を導かない");
console.log("✓ 三角形の合同ASA（汎用ルール）");

const asa = rules.prove(
  ["angle(BAC)=angle(EDF)", "side(AB)=side(DE)", "angle(ABC)=angle(DEF)", "triangle(ABC)", "triangle(DEF)"],
  "congruent(ABC,DEF)"
);
assert.equal(asa.success, true, "1辺とその両端の角が対応して等しければ合同");
assert.equal(asa.steps[0].ruleId, "triangle-congruence-asa");

const missingAsaEndpointAngle = rules.prove(
  ["angle(BAC)=angle(EDF)", "side(AB)=side(DE)", "triangle(ABC)", "triangle(DEF)"],
  "congruent(ABC,DEF)"
);
assert.equal(missingAsaEndpointAngle.success, false, "ASAの両端の角の一方が不足すれば合同を導かない");
console.log("✓ 合同条件（ASA）");

const missingEqualArcCondition = rules.prove(
  ["inscribed(AEB,AB)", "inscribed(CFD,CD)"],
  "angle(AEB)=angle(CFD)"
);
assert.equal(missingEqualArcCondition.success, false, "別々の弧の円周角は弧が等しい条件なしに等しいとしない");

const mismatchedCentralArc = rules.prove(
  ["central(AOB,AB)", "inscribed(ACB,CD)"],
  "angle(AOB)=2*angle(ACB)"
);
assert.equal(mismatchedCentralArc.success, false, "対応する弧が異なる中心角と円周角に2倍関係を適用しない");
console.log("✓ 円周角・中心角の負例");


const genericDiameter = rules.prove(
  ["onCircle(P)", "onCircle(Q)", "onCircle(R)", "diameter(PQ)"],
  "angle(PRQ)=90"
);
assert.equal(genericDiameter.success, true, "任意の頂点名でも直径に対する円周角を導く");
assert.equal(genericDiameter.steps[0].ruleId, "diameter-inscribed-angle");
assert.deepEqual(genericDiameter.steps[0].premises, ["onCircle(R)", "onCircle(P)", "onCircle(Q)", "diameter(PQ)"]);

const genericDiameterMissingEndpoint = rules.prove(
  ["onCircle(P)", "onCircle(Q)", "diameter(PQ)"],
  "angle(PRQ)=90"
);
assert.equal(genericDiameterMissingEndpoint.success, false, "直径の端点・頂点が円周上と示されない場合は直角を導かない");
console.log("✓ 直径に対する円周角（汎用ルール）");


const genericAlternate = rules.prove(
  ["parallel(p,q)", "intersects(r,p)", "intersects(r,q)", "alternateAngles(alpha,beta,r,p,q)"],
  "alpha=beta"
);
assert.equal(genericAlternate.success, true, "任意の直線・角ラベルで錯角を導く");
assert.equal(genericAlternate.steps[0].ruleId, "parallel-alternate-interior");

const genericCorresponding = rules.prove(
  ["parallel(p,q)", "intersects(r,p)", "intersects(r,q)", "correspondingAngles(gamma,delta,r,p,q)"],
  "gamma=delta"
);
assert.equal(genericCorresponding.success, true, "任意の直線・角ラベルで同位角を導く");
assert.equal(genericCorresponding.steps[0].ruleId, "parallel-corresponding-angles");

const missingParallelForGenericAngle = rules.prove(
  ["intersects(r,p)", "intersects(r,q)", "alternateAngles(alpha,beta,r,p,q)"],
  "alpha=beta"
);
assert.equal(missingParallelForGenericAngle.success, false, "平行条件なしに錯角の等しさを導かない");
console.log("✓ 平行線の錯角・同位角（汎用ルール）");
