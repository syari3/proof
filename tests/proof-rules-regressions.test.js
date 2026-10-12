const assert = require("node:assert/strict");
const rules = require("../js/proof-rules.js");

const circle1 = rules.prove(["inscribed(ACB,AB)","inscribed(ADB,AB)"],"angle(ACB)=angle(ADB)");
assert.equal(circle1.success,true);
const circle2 = rules.prove(["central(AOB,AB)","inscribed(ACB,AB)"],"angle(AOB)=2*angle(ACB)");
assert.equal(circle2.success,true);
const circle3 = rules.prove(["equalArc(AB,CD)","inscribed(AEB,AB)","inscribed(CFD,CD)"],"angle(AEB)=angle(CFD)");
assert.equal(circle3.success,true);
const circle4 = rules.prove(["inscribed(ACB,AB)","inscribed(ADB,CD)"],"angle(ACB)=angle(ADB)");
assert.equal(circle4.success,false);

const circleChain = rules.prove(
  ["inscribed(ACB,AB)", "inscribed(ADB,AB)", "angle(ADB)=angle(EFG)"],
  "angle(ACB)=angle(EFG)"
);
assert.equal(circleChain.success, true, "円周角の定理で得た角の等しさを推移律につなげる");
assert.equal(circleChain.steps.length, 2);
assert.equal(circleChain.steps[0].ruleId, "circle.inscribed-angles-same-arc");
assert.equal(circleChain.steps[1].ruleId, "logic.equality-transitivity");


const angleSum = rules.prove(
  ["triangle(ABC)"],
  "angle(BAC)+angle(ABC)+angle(ACB)=180"
);
assert.equal(angleSum.success, true, "三角形ABCの内角の和を導く");
assert.equal(angleSum.steps[0].ruleId, "triangle.angle-sum");
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
assert.equal(equalRadii.steps[0].ruleId, "circle.equal-radii");
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
assert.equal(verticalAngles.steps[0].ruleId, "angle.vertical-angles");
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
assert.equal(correspondingAngles.steps[0].ruleId, "parallel.corresponding-angles");
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
assert.equal(exteriorAngle.steps[0].ruleId, "triangle.exterior-angle");
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
assert.equal(angleAddition.steps[0].ruleId, "angle.addition");

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
assert.equal(segmentAddition.steps[0].ruleId, "segment.addition");

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
assert.equal(equalAnglesImplyEqualSides.steps[0].ruleId, "triangle.equal-angles-imply-equal-sides");

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

const reversedGoalEqualSides = rules.prove(
  ["triangle(XZY)", "angle(XZY)=angle(XYZ)"],
  "side(XZ)=side(XY)"
);
assert.equal(reversedGoalEqualSides.success, true, "等しい角に対する辺の結論は左右を逆に指定しても証明できる");
console.log("✓ 等しい角に対する辺は等しい");

const generalizedIsosceles = rules.prove(
  ["triangle(PQR)", "side(PQ)=side(PR)"],
  "angle(PQR)=angle(PRQ)"
);
assert.equal(generalizedIsosceles.success, true, "別の頂点名でも二等辺三角形の底角を導く");
assert.equal(generalizedIsosceles.steps[0].ruleId, "triangle.isosceles-base-angles");

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
assert.equal(genericSimilarity.steps[0].ruleId, "triangle.similarity-aa");

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
assert.equal(genericSSS.steps[0].ruleId, "triangle.congruence-sss");

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
assert.equal(sas.steps[0].ruleId, "triangle.congruence-sas");

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
assert.equal(genericSAS.steps[0].ruleId, "triangle.congruence-sas");

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
assert.equal(genericASA.steps[0].ruleId, "triangle.congruence-asa");

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
assert.equal(asa.steps[0].ruleId, "triangle.congruence-asa");

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
assert.equal(genericDiameter.steps[0].ruleId, "circle.diameter-inscribed-angle");
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
assert.equal(genericAlternate.steps[0].ruleId, "parallel.alternate-interior-angles");

const genericCorresponding = rules.prove(
  ["parallel(p,q)", "intersects(r,p)", "intersects(r,q)", "correspondingAngles(gamma,delta,r,p,q)"],
  "gamma=delta"
);
assert.equal(genericCorresponding.success, true, "任意の直線・角ラベルで同位角を導く");
assert.equal(genericCorresponding.steps[0].ruleId, "parallel.corresponding-angles");

const missingParallelForGenericAngle = rules.prove(
  ["intersects(r,p)", "intersects(r,q)", "alternateAngles(alpha,beta,r,p,q)"],
  "alpha=beta"
);
assert.equal(missingParallelForGenericAngle.success, false, "平行条件なしに錯角の等しさを導かない");
console.log("✓ 平行線の錯角・同位角（汎用ルール）");


const circleDeriveSameArc = rules.derive(["inscribed(ACB,AB)", "inscribed(ADB,AB)"]);
assert.ok(circleDeriveSameArc.some((rule) => rule.ruleId === "circle.inscribed-angles-same-arc" && rule.conclusion === "angle(ACB)=angle(ADB)"), "同じ弧の円周角をderiveでも列挙する");
const circleDeriveEqualArc = rules.derive(["equalArc(AB,CD)", "inscribed(AEB,AB)", "inscribed(CFD,CD)"]);
assert.ok(circleDeriveEqualArc.some((rule) => rule.ruleId === "circle.equal-arcs-inscribed-angles" && rule.conclusion === "angle(AEB)=angle(CFD)"), "等しい弧の円周角をderiveでも列挙する");
const circleDeriveCentral = rules.derive(["central(AOB,AB)", "inscribed(ACB,AB)"]);
assert.ok(circleDeriveCentral.some((rule) => rule.ruleId === "circle.central-inscribed-angle" && rule.conclusion === "angle(AOB)=2*angle(ACB)"), "中心角と円周角の関係をderiveでも列挙する");
console.log("✓ 円周角・等しい弧・中心角（derive対応）");

 
const reversedSideChain = rules.prove(
  ["side(CD)=side(AB)", "side(EF)=side(CD)"],
  "side(AB)=side(EF)"
);
assert.equal(reversedSideChain.success, true, "等式の左右が逆向きでも推移律を適用する");
assert.equal(reversedSideChain.steps[0].ruleId, "logic.equality-transitivity");

const reversedAngleChain = rules.prove(
  ["angle(DEF)=angle(ABC)", "angle(GHI)=angle(DEF)"],
  "angle(ABC)=angle(GHI)"
);
assert.equal(reversedAngleChain.success, true, "角の等式も左右の向きに依存せずつなぐ");
console.log("✓ 等式の推移（左右の向きを正規化）");

// Regression: circle theorems must feed into AA similarity, not remain isolated facts.
const circleToSimilarity = rules.prove(
  [
    "triangle(ABC)", "triangle(DEF)",
    "equalArc(AB,DE)", "equalArc(BC,EF)",
    "inscribed(ACB,AB)", "inscribed(DFE,DE)",
    "inscribed(BAC,BC)", "inscribed(EDF,EF)"
  ],
  "similar(ABC,DEF)"
);
assert.equal(circleToSimilarity.success, true, "等しい弧→円周角の等しさ→三角形の相似を連続して導く");
assert.equal(circleToSimilarity.steps.filter((step) => step.ruleId === "circle.equal-arcs-inscribed-angles").length >= 2, true,
  "2組の円周角の等しさを導く");
assert.equal(circleToSimilarity.steps.at(-1).ruleId, "triangle.similarity-aa",
  "相似の結論は2組の円周角の等しさから導く");
console.log("✓ 円周角から相似までの複数定理チェーン");

const geometricAnglesNeedTwoPairs = rules.prove(
  ["triangle(ABC)", "triangle(DEF)", "angle(ACB)=angle(DFE)"],
  "similar(ABC,DEF)"
);
assert.equal(geometricAnglesNeedTwoPairs.success, false, "角の等しさ1組だけでは相似と断定しない");
console.log("✓ 相似条件不足のガード");


const angleAdditionSubstitution = rules.prove(
  ["rayInsideAngle(O,A,B,C)", "angle(AOB)=angle(XOY)"],
  "angle(AOC)=angle(XOY)+angle(BOC)"
);
assert.equal(angleAdditionSubstitution.success, true, "既知の角の等しさを角の加法に代入できる");
assert.ok(angleAdditionSubstitution.steps.some((step) => step.ruleId === "angle.addition-substitution"));
console.log("✓ 角の加法への等式の代入");

const wholeAngleAdditionSubstitution = rules.prove(
  ["rayInsideAngle(A,F,E,G)", "angle(BAG)=angle(FAG)"],
  "angle(BAG)=angle(FAE)+angle(EAG)"
);
assert.equal(wholeAngleAdditionSubstitution.success, true,
  "角の加法の左辺も、等しい角に置き換えられる");
assert.ok(wholeAngleAdditionSubstitution.steps.some((step) =>
  step.ruleId === "angle.addition-substitution" &&
  step.conclusion === "angle(BAG)=angle(FAE)+angle(EAG)"
));
console.log("✓ 角の加法の左辺への代入");

const reversedNotationWholeAngleSubstitution = rules.prove(
  ["rayInsideAngle(A,F,E,G)", "angle(GAF)=angle(BAG)"],
  "angle(BAG)=angle(FAE)+angle(EAG)"
);
assert.equal(reversedNotationWholeAngleSubstitution.success, true,
  "角の両端の表記順が逆でも、同じ角として左辺への代入に使える");
assert.ok(reversedNotationWholeAngleSubstitution.steps.some((step) =>
  step.ruleId === "angle.addition-substitution" &&
  step.conclusion === "angle(BAG)=angle(FAE)+angle(EAG)"
));
console.log("✓ 角の表記順をまたぐ加法代入");


const derivedWholeAngleSubstitution = rules.derive([
  "rayInsideAngle(A,F,E,G)",
  "angle(FAG)=angle(FAE)+angle(EAG)",
  "angle(BAG)=angle(FAG)"
]);
assert.ok(derivedWholeAngleSubstitution.some((rule) =>
  rule.ruleId === "angle.addition-substitution" &&
  rule.conclusion === "angle(BAG)=angle(FAE)+angle(EAG)"
), "deriveでも角の加法の左辺への代入候補を提示する");



const chainedAngleAdditionSubstitution = rules.prove(
  ["rayInsideAngle(O,A,B,C)", "angle(AOB)=angle(XOY)", "angle(XOY)=angle(MON)"],
  "angle(AOC)=angle(MON)+angle(BOC)"
);
assert.equal(chainedAngleAdditionSubstitution.success, true, "角の等式の推移で得た結果も角の加法に代入できる");
console.log("✓ 角の推移律から角の加法への連鎖");

const segmentAdditionSubstitution = rules.prove(
  ["between(A,B,C)", "side(AB)=side(DE)"],
  "side(AC)=side(DE)+side(BC)"
);
assert.equal(segmentAdditionSubstitution.success, true, "既知の線分の等しさを線分の加法に代入できる");
assert.ok(segmentAdditionSubstitution.steps.some((step) => step.ruleId === "segment.addition-substitution"));
console.log("✓ 線分の加法への等式の代入");

const wholeSegmentAdditionSubstitution = rules.prove(
  ["between(A,B,C)", "side(DE)=side(AC)"],
  "side(DE)=side(AB)+side(BC)"
);
assert.equal(wholeSegmentAdditionSubstitution.success, true,
  "線分の加法の左辺も、等しい線分に置き換えられる");
assert.ok(wholeSegmentAdditionSubstitution.steps.some((step) =>
  step.ruleId === "segment.addition-substitution" &&
  step.conclusion === "side(DE)=side(AB)+side(BC)"
));
console.log("✓ 線分の加法の左辺への代入");


const reversedSegmentAdditionSubstitution = rules.prove(
  ["between(A,B,C)", "side(DE)=side(AB)"],
  "side(AC)=side(DE)+side(BC)"
);
assert.equal(reversedSegmentAdditionSubstitution.success, true, "線分の等式の左右が逆でも加法に代入できる");

const noCrossTypeAdditionSubstitution = rules.prove(
  ["between(A,B,C)", "angle(ABO)=side(AB)"],
  "side(AC)=angle(ABO)+side(BC)"
);
assert.equal(noCrossTypeAdditionSubstitution.success, false, "角と線分を混同した代入は認めない");
console.log("✓ 角・線分の型の混同を防止");


const segmentCancellationCommonPart = rules.prove(
  ["side(AC)=side(AB)+side(BC)", "side(DF)=side(DE)+side(BC)", "side(AC)=side(DF)"],
  "side(AB)=side(DE)"
);
assert.equal(segmentCancellationCommonPart.success, true, "等しい2つの和から共通の線分を除いて残りの線分が等しいと導く");
assert.equal(segmentCancellationCommonPart.steps[0].ruleId, "segment.addition-cancellation");

const segmentReverseAddition = rules.prove(
  ["side(AC)=side(AB)+side(BC)", "side(DF)=side(DE)+side(BC)", "side(AB)=side(DE)"],
  "side(AC)=side(DF)"
);
assert.equal(segmentReverseAddition.success, true, "共通の線分と残りの線分がそれぞれ等しければ和も等しいと導く");
assert.equal(segmentReverseAddition.steps[0].ruleId, "segment.addition-congruence");

const segmentSolveMissingPart = rules.prove(
  ["side(AC)=side(AB)+side(BC)", "side(DF)=side(DE)+side(EF)", "side(AC)=side(DF)", "side(AB)=side(DE)"],
  "side(BC)=side(EF)"
);
assert.equal(segmentSolveMissingPart.success, true, "和と一方の項がそれぞれ等しければ他方の項も等しいと導く");

const angleCancellationCommonPart = rules.prove(
  ["angle(AOC)=angle(AOB)+angle(BOC)", "angle(DOF)=angle(DOE)+angle(BOC)", "angle(AOC)=angle(DOF)"],
  "angle(AOB)=angle(DOE)"
);
assert.equal(angleCancellationCommonPart.success, true, "角の加法でも共通する角を除いて残りの角の等しさを導く");

const noMixedAngleSegmentAlgebra = rules.prove(
  ["side(AC)=side(AB)+side(BC)", "angle(DOF)=angle(DOE)+angle(EOF)", "side(AC)=angle(DOF)"],
  "side(AB)=angle(DOE)"
);
assert.equal(noMixedAngleSegmentAlgebra.success, false, "角と線分を混同した加法計算は導かない");
const descriptiveLineIds = rules.prove(
  [
    "parallel(line-EF,line-BC)",
    "intersects(line-AB,line-EF)",
    "intersects(line-AB,line-BC)",
    "correspondingAngles(angle(AFE),angle(ABC),line-AB,line-EF,line-BC)"
  ],
  "angle(AFE)=angle(ABC)"
);
assert.equal(descriptiveLineIds.success, true, "parallel-angle rules accept descriptive line IDs");
assert.equal(descriptiveLineIds.steps[0].ruleId, "parallel.corresponding-angles");

// A parallel-angle theorem can be an intermediate step, not only the final goal.
const parallelAngleFeedsSimilarity = rules.prove(
  [
    "triangle(AFE)", "triangle(BGP)",
    "parallel(line-EF,line-BC)",
    "intersects(line-AB,line-EF)", "intersects(line-AB,line-BC)",
    "correspondingAngles(angle(AFE),angle(BGP),line-AB,line-EF,line-BC)",
    "angle(AEF)=angle(BPG)"
  ],
  "similar(AFE,BGP)"
);
assert.equal(parallelAngleFeedsSimilarity.success, true, "同位角の等しさを導いてからAA相似へつなぐ");
assert.ok(parallelAngleFeedsSimilarity.steps.some((step) => step.ruleId === "parallel.corresponding-angles"));
assert.equal(parallelAngleFeedsSimilarity.steps.at(-1).ruleId, "triangle.similarity-aa");


console.log("✓ 角・線分の加法の逆と等しい和の推論");


// Same-chord inscribed angles require an explicit same-segment premise.
const sameSegmentAngles = rules.prove(
  ["onCircle(A)", "onCircle(B)", "onCircle(C)", "onCircle(P)", "sameSegment(AB,C,P)"],
  "angle(ACB)=angle(APB)"
);
assert.equal(sameSegmentAngles.success, true, "同じ弦ABの同じ側にある円周角を導く");
assert.equal(sameSegmentAngles.steps.some((step) => step.ruleId === "circle.angles-same-segment"), true);
const missingSameSegment = rules.prove(
  ["onCircle(A)", "onCircle(B)", "onCircle(C)", "onCircle(P)"],
  "angle(ACB)=angle(APB)"
);
assert.equal(missingSameSegment.success, false, "円周上にあるだけでは円周角の等しさを導かない");
console.log("✓ 同じ弦に対する円周角（同じ側の条件付き）");


// Angle endpoint substitution is allowed only with an explicit same-ray fact.
const sameRayAngleSubstitution = rules.prove(
  ["angle(APB)", "sameRay(P,A,G)"],
  "angle(GPB)=angle(APB)"
);
assert.equal(sameRayAngleSubstitution.success, true, "同じ半直線上の点による角の置き換え");
const missingRay = rules.prove(["angle(APB)"], "angle(GPB)=angle(APB)");
assert.equal(missingRay.success, false, "位置関係なしに角の辺を置き換えない");


const supplementaryAngleProof = rules.prove(
  [
    "onCircle(A)", "onCircle(B)", "onCircle(C)", "onCircle(D)",
    "oppositeSegment(AC,B,D)",
    "oppositeRay(G,A,P)",
    "angle(ADC)=angle(BGA)"
  ],
  "angle(ABC)=angle(BGP)"
);
// The opposite-segment supplementary-angle inference is intentionally disabled.
assert.equal(supplementaryAngleProof.success, false, "無効化した円周角の補角ルールに依存する証明は成功扱いにしない");
assert.equal(supplementaryAngleProof.steps.some((step) => step.ruleId === "circle.opposite-segment-supplementary-angles"), false);
const missingOppositeSegment = rules.prove(
  ["oppositeRay(G,A,P)", "angle(ADC)=angle(BGA)"],
  "angle(ABC)=angle(BGP)"
);
assert.equal(missingOppositeSegment.success, false, "反対側の位置条件なしに円周角の補角関係を仮定しない");
console.log("✓ 反対側の円周角の補角ルールを自動適用しない");



// Ordered collinear points on the same ray can be substituted in angle names.
// A-F-B means AF and AB point in the same direction from A; likewise AE and AC.
const straightLineAngleRenaming = rules.prove(
  ["between(A,F,B)", "between(A,E,C)"],
  "angle(FAE)=angle(BAC)"
);
assert.equal(straightLineAngleRenaming.success, true,
  "2本の直線上で同じ向きの半直線にある点を使い、∠FAEを∠BACに言い換えられる");
assert.equal(straightLineAngleRenaming.steps.length, 0,
  "一直線上の角の言い換えは内部処理し、証明ステップを消費しない");
console.log("✓ 一直線上の点による角の言い換え");

// The same renaming must also feed angle-addition substitution.
const straightLineAngleAddition = rules.prove(
  [
    "between(A,F,B)", "between(A,E,C)",
    "rayInsideAngle(A,F,E,G)",
    "angle(BAG)=angle(FAG)"
  ],
  "angle(BAG)=angle(FAE)+angle(EAG)"
);
assert.equal(straightLineAngleAddition.success, true,
  "一直線上の点による角の言い換えを角の加法への代入につなげる");
console.log("✓ 一直線上の角の言い換えから角の加法へ");
