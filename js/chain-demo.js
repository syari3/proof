(function () {
"use strict";
const facts = [
"side(AB)=side(AC)", "side(AB)=side(DB)", "parallel(AD,BC)",
"transversal(AB,AD,BC)", "triangle(ABC)", "triangle(ABD)", "triangle(BAD)"
];
const plan = {
steps: [
{ requires:["side(AB)=side(AC)","triangle(ABC)"], conclusion:"angle(ABC)=angle(BCA)", reason:"二等辺三角形の底角", explanation:"AB = AC より、△ABC の底角は等しい。" },
{ requires:["side(AB)=side(DB)","triangle(ABD)"], conclusion:"angle(BAD)=angle(ADB)", reason:"二等辺三角形の底角", explanation:"AB = DB より、△ABD の底角は等しい。" },
{ requires:["parallel(AD,BC)","transversal(AB,AD,BC)"], conclusion:"angle(ABC)=angle(BAD)", reason:"平行線の錯角", explanation:"AD ∥ BC で、直線ABが横切るので錯角は等しい。" },
{ requires:["angle(ABC)=angle(BCA)","angle(BAD)=angle(ADB)","angle(ABC)=angle(BAD)"], conclusion:"angle(BCA)=angle(ADB)", reason:"等しい角の推移", explanation:"∠ABC、∠BCA、∠BAD、∠ADB の等しい関係をつなぐ。" },
{ requires:["angle(ABC)=angle(BAD)","angle(BCA)=angle(ADB)","triangle(ABC)","triangle(BAD)"], conclusion:"similar(ABC,BAD)", reason:"三角形の相似条件（2組の角）", explanation:"対応する2組の角がそれぞれ等しいので、△ABC ∽ △BAD。" }
]};
const known = [...facts];
const list = document.querySelector("#proof-steps");
let success = true;
plan.steps.forEach((step, index) => {
  const missing = step.requires.filter((fact) => !known.includes(fact));
  if (missing.length) { success = false; return; }
  known.push(step.conclusion);
  const li = document.createElement("li");
  const number = document.createElement("span"); number.className = "step-number"; number.textContent = String(index + 1);
  const body = document.createElement("div");
  const statement = document.createElement("strong"); statement.textContent = step.conclusion;
  const explanation = document.createElement("p"); explanation.textContent = step.explanation;
  const reason = document.createElement("span"); reason.className = "reason-chip"; reason.textContent = step.reason;
  body.append(statement, explanation, reason); li.append(number, body); list.append(li);
});
document.querySelector("#step-count").textContent = list.children.length + "ステップ";
const finalFact = "similar(ABC,BAD)";
const note = document.querySelector("#validation-note");
note.textContent = success && known.includes(finalFact)
 ? "✓ 証明チェーン検証OK：各ステップの前提がそろい、最後に △ABC ∽ △BAD まで到達しました。"
 : "証明チェーンを完成できませんでした。前提条件を確認してください。";
})();