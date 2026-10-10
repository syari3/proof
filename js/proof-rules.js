/*
 * Proof rules for the proof maker (first verified patterns).
 *
 * Design rule: a conclusion is available only when its listed premises
 * are present. This is a small deterministic rule library, not a general
 * geometry theorem prover.
 */
(function (root) {
  "use strict";

  const rules = [
    {
      id: "isosceles-base-angles",
      name: "二等辺三角形の底角",
      premises: ["side(AB)=side(AC)"],
      conclusion: "angle(ABC)=angle(BCA)",
      explain: "AB = AC なので △ABC は二等辺三角形。底角は等しい。",
      category: "isosceles"
    },
    {
      id: "parallel-alternate-interior",
      name: "平行線の錯角",
      premises: ["parallel(l,m)", "intersects(t,l)", "intersects(t,m)", "alternateAngles(angle1,angle2,t,l,m)"],
      conclusion: "angle1=angle2",
      explain: "平行な2直線に1本の直線が交わると、錯角は等しい。",
      category: "parallel"
    },
    {
      id: "diameter-inscribed-angle",
      name: "直径に対する円周角",
      premises: ["onCircle(A)", "onCircle(B)", "onCircle(C)", "diameter(BC)"],
      conclusion: "angle(BAC)=90",
      explain: "B、Cが直径の両端でAが円周上にあるので、∠BACは90°。",
      category: "circle"
    },
    {
      id: "triangle-similarity-aa",
      name: "三角形の相似条件（2組の角）",
      premises: ["angle(A)=angle(D)", "angle(B)=angle(E)", "triangle(ABC)", "triangle(DEF)"],
      conclusion: "similar(ABC,DEF)",
      explain: "2組の角がそれぞれ等しい2つの三角形は相似である。",
      category: "similarity"
    }
  ];

  function hasAllPremises(rule, facts) {
    return rule.premises.every((premise) => facts.includes(premise));
  }

  function derive(facts) {
    if (!Array.isArray(facts) || !facts.every((fact) => typeof fact === "string")) {
      throw new TypeError("facts は文字列の配列で指定してください。");
    }
    return rules
      .filter((rule) => hasAllPremises(rule, facts))
      .map((rule) => ({
        ruleId: rule.id,
        ruleName: rule.name,
        premises: [...rule.premises],
        conclusion: rule.conclusion,
        explanation: rule.explain,
        category: rule.category
      }));
  }

  // Forward-chain from the supplied facts, recording every inference.
  // This is a bounded rule engine, not a complete geometry prover.
  function prove(facts, goal, maxSteps = 100) {
    if (!Array.isArray(facts) || !facts.every((fact) => typeof fact === "string")) {
      throw new TypeError("facts は文字列の配列で指定してください。");
    }
    if (typeof goal !== "string" || goal.length === 0) {
      throw new TypeError("goal は空でない文字列で指定してください。");
    }
    if (!Number.isInteger(maxSteps) || maxSteps < 0) {
      throw new TypeError("maxSteps は0以上の整数で指定してください。");
    }

    const known = [...new Set(facts)];
    const steps = [];
    if (known.includes(goal)) {
      return { success: true, goal, facts: known, steps, reason: "goal-is-given" };
    }

    let changed = true;
    while (changed && steps.length < maxSteps) {
      changed = false;
      for (const rule of rules) {
        if (steps.length >= maxSteps) break;
        if (!hasAllPremises(rule, known) || known.includes(rule.conclusion)) continue;

        const step = {
          index: steps.length + 1,
          ruleId: rule.id,
          ruleName: rule.name,
          premises: [...rule.premises],
          conclusion: rule.conclusion,
          explanation: rule.explain,
          category: rule.category
        };
        known.push(rule.conclusion);
        steps.push(step);
        changed = true;

        if (rule.conclusion === goal) {
          return { success: true, goal, facts: known, steps, reason: "proved" };
        }
      }
    }

    return {
      success: false,
      goal,
      facts: known,
      steps,
      reason: steps.length >= maxSteps ? "step-limit" : "no-derivation"
    };
  }

  const api = Object.freeze({
    list: () => rules.map((rule) => ({ ...rule, premises: [...rule.premises] })),
    derive,
    prove,
    hasAllPremises
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.ProofRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
