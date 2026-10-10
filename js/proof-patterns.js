(function (root) {
  "use strict";
  const similarityWithParallelLine = {
    id: "isosceles-parallel-similarity",
    title: "二等辺三角形と平行線から相似を証明",
    premises: [
      "side(AB)=side(AC)",
      "side(AB)=side(DB)",
      "parallel(AD,BC)",
      "transversal(AB,AD,BC)",
      "triangle(ABC)",
      "triangle(ABD)"
    ],
    steps: [
      { requires: ["side(AB)=side(AC)", "triangle(ABC)"], conclusion: "angle(ABC)=angle(BCA)", reason: "二等辺三角形の底角", explanation: "AB = AC より、△ABC の底角は等しい。" },
      { requires: ["side(AB)=side(DB)", "triangle(ABD)"], conclusion: "angle(BAD)=angle(ADB)", reason: "二等辺三角形の底角", explanation: "AB = DB より、△ABD の底角は等しい。" },
      { requires: ["parallel(AD,BC)", "transversal(AB,AD,BC)"], conclusion: "angle(ABC)=angle(BAD)", reason: "平行線の錯角", explanation: "AD ∥ BC で、AB が横切る直線なので錯角は等しい。" },
      { requires: ["angle(ABC)=angle(BCA)", "angle(BAD)=angle(ADB)", "angle(ABC)=angle(BAD)"], conclusion: "angle(BCA)=angle(ADB)", reason: "等しい角の推移", explanation: "3つの角が等しい関係をつなぐと、∠BCA = ∠ADB。" },
      { requires: ["angle(ABC)=angle(BAD)", "angle(BCA)=angle(ADB)", "triangle(ABC)", "triangle(BAD)"], conclusion: "similar(ABC,BAD)", reason: "三角形の相似条件（2組の角）", explanation: "対応する2組の角がそれぞれ等しいので、△ABC ∽ △BAD。" }
    ]
  };

  function verify(pattern, givenFacts) {
    const facts = [...givenFacts];
    const output = [];
    for (const step of pattern.steps) {
      const missing = step.requires.filter((fact) => !facts.includes(fact));
      if (missing.length) return { ok: false, missing, facts, steps: output };
      facts.push(step.conclusion);
      output.push({ ...step });
    }
    return { ok: facts.includes("similar(ABC,BAD)"), facts, steps: output };
  }

  root.ProofPatterns = Object.freeze({
    list: () => [{ id: similarityWithParallelLine.id, title: similarityWithParallelLine.title }],
    get: (id) => id === similarityWithParallelLine.id ? similarityWithParallelLine : null,
    verify
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
