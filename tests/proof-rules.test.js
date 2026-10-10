const assert = require("node:assert/strict");
const rules = require("../js/proof-rules.js");

const cases = [
  {
    name: "二等辺三角形の底角は、等しい辺が与えられたときだけ導く",
    facts: ["side(AB)=side(AC)"],
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
    assert.equal(result.length, 0, test.name);
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
  ["side(AB)=side(AC)", "angle(BCA)=angle(DEF)"],
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

console.log("\\n" + (cases.length + 6) + " tests passed.");
