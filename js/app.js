const samples = {
  isosceles: {
    topic: "二等辺三角形",
    title: "底角が等しいことを説明しよう",
    text: "△ABC で、AB = AC とする。∠ABC = ∠BCA であることを、二等辺三角形の性質を使って説明しなさい。",
    goal: "∠ABC = ∠BCA",
    steps: [
      { statement: "AB = AC", explanation: "問題文で与えられた条件です。", reason: "仮定" },
      { statement: "∠ABC = ∠BCA", explanation: "二等辺三角形では、等しい辺に対する底角は等しくなります。", reason: "二等辺三角形の底角" }
    ],
    diagram: "isosceles",
    facts: ["side(AB)=side(AC)"],
    expectedConclusion: "angle(ABC)=angle(BCA)"
  },
  parallel: {
    topic: "平行線と角",
    title: "錯角が等しいことを使おう",
    text: "直線 ℓ と m が平行で、直線 t がそれらと交わっている。錯角 ∠1 と ∠2 が等しいことを、平行線の性質を使って説明しなさい。",
    goal: "∠1 = ∠2",
    steps: [
      { statement: "ℓ ∥ m", explanation: "問題文で与えられた条件です。", reason: "仮定" },
      { statement: "∠1 = ∠2", explanation: "平行な2直線に1本の直線が交わると、錯角は等しくなります。", reason: "平行線の錯角" }
    ],
    diagram: "parallel",
    facts: ["parallel(l,m)", "intersects(t,l)", "intersects(t,m)", "alternateAngles(angle1,angle2,t,l,m)"],
    expectedConclusion: "angle1=angle2"
  },
  similarity: {
    topic: "三角形の相似",
    title: "2組の角から相似を示そう",
    text: "△ABC と △DEF で、∠A = ∠D、∠B = ∠E とする。2つの三角形が相似であることを説明しなさい。",
    goal: "△ABC ∽ △DEF",
    steps: [
      { statement: "∠A = ∠D、∠B = ∠E", explanation: "問題文で与えられた2組の角の等しさです。", reason: "仮定" },
      { statement: "△ABC ∽ △DEF", explanation: "2組の角がそれぞれ等しい2つの三角形は相似です。", reason: "三角形の相似条件" }
    ],
    diagram: "similarity",
    facts: ["angle(A)=angle(D)", "angle(B)=angle(E)", "triangle(ABC)", "triangle(DEF)"],
    expectedConclusion: "similar(ABC,DEF)"
  }
};

const select = document.querySelector("#sample-select");
const button = document.querySelector("#show-sample");
const title = document.querySelector("#problem-title");
const text = document.querySelector("#problem-text");
const topic = document.querySelector("#problem-topic");
const goal = document.querySelector("#problem-goal");
const steps = document.querySelector("#proof-steps");
const stepCount = document.querySelector("#step-count");
const diagram = document.querySelector("#diagram");
const note = document.querySelector("#validation-note");

function svgFor(kind) {
  if (kind === "parallel") {
    return `<path d="M30 48 H290 M30 118 H290" class="triangle-line"/><path d="M82 145 L235 22" class="equal-side"/><text x="18" y="44">ℓ</text><text x="18" y="114">m</text><text x="112" y="70">1</text><text x="205" y="111">2</text>`;
  }
  if (kind === "similarity") {
    return `<path d="M24 140 L78 45 L132 140 Z M188 140 L224 77 L260 140 Z" class="triangle-line"/><text x="78" y="36" text-anchor="middle">A</text><text x="16" y="154">B</text><text x="140" y="154">C</text><text x="224" y="68" text-anchor="middle">D</text><text x="180" y="154">E</text><text x="270" y="154">F</text>`;
  }
  return `<path d="M160 22 L65 145 L255 145 Z" class="triangle-line"/><path d="M160 22 L65 145 M160 22 L255 145" class="equal-side"/><text x="160" y="15" text-anchor="middle">A</text><text x="52" y="160" text-anchor="middle">B</text><text x="268" y="160" text-anchor="middle">C</text><text x="98" y="89" class="side-mark">／</text><text x="216" y="89" class="side-mark">／</text>`;
}

function renderSample(key) {
  const sample = samples[key];
  if (!sample) return;
  topic.textContent = sample.topic;
  title.textContent = sample.title;
  text.textContent = sample.text;
  goal.textContent = sample.goal;
  steps.replaceChildren();
  sample.steps.forEach((step, index) => {
    const li = document.createElement("li");
    const number = document.createElement("span");
    number.className = "step-number";
    number.textContent = String(index + 1);
    const content = document.createElement("div");
    const statement = document.createElement("strong");
    statement.textContent = step.statement;
    const explanation = document.createElement("p");
    explanation.textContent = step.explanation;
    const reason = document.createElement("span");
    reason.className = "reason-chip";
    reason.textContent = step.reason;
    content.append(statement, explanation, reason);
    li.append(number, content);
    steps.append(li);
  });
  stepCount.textContent = `${sample.steps.length}ステップ`;
  diagram.innerHTML = svgFor(sample.diagram);
  diagram.setAttribute("aria-label", sample.topic + "の模式図");
  const derivations = window.ProofRules ? window.ProofRules.derive(sample.facts) : [];
  const matchedRule = derivations.find((item) => item.conclusion === sample.expectedConclusion);
  note.textContent = matchedRule
    ? "✓ 初期ルール検証OK：「" + matchedRule.ruleName + "」の前提条件がそろい、結論を導けます。任意の図形を証明する一般的な検証器は、まだ未実装です。"
    : "このサンプルに対応するルールが見つからず、結論を確認できませんでした。";
}

button.addEventListener("click", () => renderSample(select.value));
select.addEventListener("change", () => renderSample(select.value));
