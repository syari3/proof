(function () {
  "use strict";
  const problem = {
    format: "proof-problem",
    version: 1,
    id: "shizuoka-2019-proof-dac-gec",
    geometry: {
      objects: [
        { id: "line-AC", type: "line", through: ["A", "C", "F"] },
        { id: "line-BC", type: "line", through: ["B", "C", "G"] },
        { id: "line-DE", type: "line", through: ["D", "E", "F", "G"] }
      ],
      points: ["A","B","C","D","E","F","G"].map((id) => ({ id })),
      constructions: [],
      constraints: [
        ...["A","B","C","D","E"].map((point) => ({ type: "point-on-circle", point, circle: "circle-O" })),
        { type: "diameter", circle: "circle-O", endpoints: ["B","C"] },
        { type: "perpendicular-lines", lines: ["line-AC","line-DE"] },
        { type: "intersection", point: "F", lines: ["line-AC","line-DE"] },
        { type: "intersection", point: "G", lines: ["line-BC","line-DE"] },
        { type: "between", points: ["D","F","E"] },
        { type: "between", points: ["B","G","C"] }
      ],
      dynamicConditions: []
    },
    goal: { type: "triangle-similarity", triangles: [["D","A","C"],["G","E","C"]] }
  };
  const choice = document.getElementById("angle-choice");
  const feedback = document.getElementById("answer-feedback");
  document.getElementById("check-answer").addEventListener("click", function () {
    if (choice.value === "DEC") {
      feedback.textContent = "その通り！A と E が弦 DC に対して同じ側にあることを原図で確認できれば、∠DAC = ∠DEC と考えられます。E・G・D の半直線の向きも確認して、∠DEC と ∠GEC を結びつけよう。";
    } else if (!choice.value) {
      feedback.textContent = "まずは1つ選んでみよう。弧 DC に注目！";
    } else {
      feedback.textContent = "今回は違います。∠DAC が見ている弧は DC。頂点が A 以外で、同じ弦 DC を見ている円周角を探そう。";
    }
  });
  const result = window.ProblemDataEngine.run(problem, window.ProofRules);
  const status = document.getElementById("engine-status");
  const summary = document.getElementById("engine-summary");
  const list = document.getElementById("proof-steps");
  status.textContent = result.success ? "証明成功" : "未完成";
  summary.textContent = result.success
    ? "登録済みルールで目標まで到達しました。"
    : "直径・垂直・交点の条件変換は対応しましたが、現在の定理セットでは相似の結論まで導けません。未証明を成功扱いにはしていません。";
  list.replaceChildren();
  const facts = result.converted.facts;
  const item = document.createElement("li");
  item.textContent = "変換できた前提：" + facts.length + "件（直径・垂直・交点の条件を含む）";
  list.appendChild(item);
  if (result.proof && result.proof.steps.length) {
    for (const step of result.proof.steps) {
      const li = document.createElement("li");
      li.textContent = step.index + ". " + step.conclusion + " — " + step.ruleName;
      list.appendChild(li);
    }
  } else {
    const li = document.createElement("li");
    li.textContent = "相似の結論は未導出。円周角・直径の円周角・垂直がつくる角を結ぶルールの追加が次の課題です。";
    list.appendChild(li);
  }
  const validation = document.getElementById("validation-note");
  if (result.converted.unsupported.length) {
    validation.textContent = "未対応条件：" + result.converted.unsupported.map((x) => x.type).join("、");
  } else {
    validation.textContent = "構造条件の変換は通過。証明そのものは未完成です。原図の点の位置を確認したうえで、角の関係を結ぶ定理を追加する必要があります。";
  }
})();