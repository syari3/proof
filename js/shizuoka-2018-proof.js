(function () {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const readable = (fact) => {
    if (!fact) return "不明な関係";
    let m;
    if ((m = /^angle\(([A-Z])([A-Z])([A-Z])\)=angle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact))) return "∠" + m[1] + m[2] + m[3] + " = ∠" + m[4] + m[5] + m[6];
    if ((m = /^angle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact))) return "∠" + m[1] + m[2] + m[3];
    if ((m = /^side\(([A-Z]{2})\)=side\(([A-Z]{2})\)$/.exec(fact))) return m[1] + " = " + m[2];
    if ((m = /^similar\(([A-Z]{3}),([A-Z]{3})\)$/.exec(fact))) return "△" + m[1] + " ∽ △" + m[2];
    if ((m = /^sameRay\(([A-Z]),([A-Z]),([A-Z])\)$/.exec(fact))) return "点" + m[2] + "、" + m[3] + "は点" + m[1] + "から同じ向きの半直線上";
    if ((m = /^triangle\(([A-Z]{3})\)$/.exec(fact))) return "△" + m[1];
    return fact.replaceAll("angle(", "∠").replaceAll("side(", "辺(").replaceAll(")", "");
  };
  const goalLabel = (problem) => {
    const goal = problem && problem.goal;
    if (goal && goal.type === "segment-equality" && Array.isArray(goal.segments) && goal.segments.length === 2) {
      return goal.segments.map((segment) => segment.join("")).join(" = ");
    }
    if (goal && goal.type === "angle-equality" && Array.isArray(goal.angles) && goal.angles.length === 2) {
      return goal.angles.map((angle) => "∠" + angle.join("")).join(" = ");
    }
    return goal ? JSON.stringify(goal) : "目標が設定されていません";
  };
  function render(result, problem) {
    const list = $("#proof-steps");
    list.replaceChildren();
    const proof = result && result.proof;
    if (!proof) {
      list.textContent = "証明エンジンから結果を取得できませんでした。";
      $("#proof-status").textContent = "実行エラー";
      $("#validation-note").textContent = "問題データまたは推論エンジンを読み込めませんでした。";
      return;
    }
    $("#proof-goal").textContent = goalLabel(problem);
    (proof.steps || []).forEach((step, index) => {
      const li = document.createElement("li");
      const number = document.createElement("span");
      number.className = "step-number";
      number.textContent = String(index + 1);
      const content = document.createElement("div");
      content.className = "proof-step-content";
      const statement = document.createElement("strong");
      statement.textContent = readable(step.conclusion);
      const explanation = document.createElement("p");
      explanation.textContent = step.explanation || "登録済みの推論ルールを適用しました。";
      const reason = document.createElement("span");
      reason.className = "reason-chip";
      reason.textContent = step.ruleName || step.ruleId || "推論ルール";
      content.append(statement, explanation, reason);
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "根拠を確認";
      const premises = document.createElement("ul");
      premises.className = "premise-list";
      (step.premises || []).forEach((premise) => {
        const item = document.createElement("li");
        item.textContent = readable(premise);
        premises.append(item);
      });
      if (!premises.children.length) {
        const item = document.createElement("li");
        item.textContent = "このルールに追加の前提は記録されていません。";
        premises.append(item);
      }
      details.append(summary, premises);
      content.append(details);
      li.append(number, content);
      list.append(li);
    });
    const count = (proof.steps || []).length;
    $("#step-count").textContent = "（" + count + "ステップ）";
    $("#proof-status").innerHTML = '<span class="status-dot"></span>' + (result.success ? "エンジンで証明済み" : "未証明");
    const note = $("#validation-note");
    note.classList.toggle("validation-warning", !result.success || (result.converted && result.converted.unsupported.length > 0));
    const unsupportedCount = result.converted && result.converted.unsupported ? result.converted.unsupported.length : 0;
    note.textContent = result.success
      ? "推論エンジンは「" + goalLabel(problem) + "」を " + count + " ステップで導きました。未対応条件：" + unsupportedCount + "件。登録条件に対する推論結果であり、原問題・原図との一致は別途確認が必要です。"
      : "現在の推論ルールでは目標を導けませんでした。これは命題が偽という意味ではありません。未対応条件：" + unsupportedCount + "件。";
  }
  fetch("./data/problem-examples/shizuoka-2018-proof-cb-ce.json")
    .then((response) => { if (!response.ok) throw new Error("問題データの読み込みに失敗しました"); return response.json(); })
    .then((problem) => {
      $("#problem-title").textContent = problem.title;
      $("#problem-prompt").textContent = problem.prompt;
      $("#problem-source").textContent = problem.source.region + " " + problem.source.exam + "・" + problem.source.year + "年度 " + problem.source.questionNumber;
      render(window.ProblemDataEngine.run(problem, window.ProofRules), problem);
    })
    .catch((error) => {
      $("#proof-status").textContent = "読み込みエラー";
      $("#validation-note").textContent = error.message;
      $("#proof-steps").textContent = "問題データを読み込めませんでした。";
    });
})();
