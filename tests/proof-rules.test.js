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
    name: "頂角が等しい二等辺三角形どうしでは4つの底角が等しい",
    facts: ["triangle(CAD)", "side(CA)=side(CD)", "triangle(ABG)", "side(BA)=side(BG)", "angle(ACD)=angle(ABG)"],
    expected: "angle(BAG)=angle(CAD)"
  },
  {
    name: "頂角の等しさがない場合、異なる二等辺三角形の底角を等しいとしない",
    facts: ["triangle(CAD)", "side(CA)=side(CD)", "triangle(ABG)", "side(BA)=side(BG)"],
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
assert.equal(chain.steps[0].ruleId, "circle.diameter-inscribed-angle");
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
assert.ok(chained.steps.length >= 2, "必要な推論ステップを記録する");
assert.equal(chained.steps.some((step) => step.premiseSources.some((source) => source.type === "step" && source.index === 1)), true, "後続の根拠に先行する推論を記録する");
console.log("✓ 前の結論を次の推論の根拠として追跡する");

const sideChain = rules.prove(
  ["side(AB)=side(CD)", "side(CD)=side(EF)"],
  "side(AB)=side(EF)"
);
assert.equal(sideChain.success, true, "辺の長さの等式にも推移律を適用する");
assert.equal(sideChain.steps[0].ruleId, "logic.equality-transitivity");
console.log("✓ 辺の等式の推移律を一般的に適用する");

const unrelated = rules.prove(
  ["side(AB)=side(CD)", "side(EF)=side(GH)"],
  "side(AB)=side(GH)"
);
assert.equal(unrelated.success, false, "共通する量がなければ推移律を適用しない");
console.log("✓ 関係のない等式をつなげない");

const mixedQuantityTypes = rules.prove(
  ["angle(A)=side(AB)", "side(AB)=angle(B)"],
  "angle(A)=angle(B)"
);
assert.equal(mixedQuantityTypes.success, false, "角と線分の長さを推移律で混同しない");
console.log("✓ 角と長さを混同しない");

const sss = rules.prove(
  ["side(AB)=side(DE)", "side(BC)=side(EF)", "side(CA)=side(FD)", "triangle(ABC)", "triangle(DEF)"],
  "congruent(ABC,DEF)"
);
assert.equal(sss.success, true, "3組の辺がそろえば合同を導く");
assert.equal(sss.steps[0].ruleId, "triangle.congruence-sss");
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
assert.equal(sameRayAngle.success, true, "同じ半直線上の点による角の表記を内部で同一視する");
assert.equal(sameRayAngle.steps.length, 0, "角の表記の言い換えは証明ステップを消費しない");
console.log("✓ 同じ半直線上の角を内部で同一視（ステップなし）");

const collinearNotEnough = rules.prove(
  ["collinear(A,B,D)"],
  "angle(ABC)=angle(DBC)"
);
assert.equal(collinearNotEnough.success, false, "一直線上という条件だけでは同じ半直線と決めつけない");
console.log("✓ 一直線上だけでは角の同一性を断定しない");

console.log("\\n" + (cases.length + 11) + " tests passed.");

