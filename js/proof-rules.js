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
    },
    {
      id: "triangle-congruence-sss",
      name: "三角形の合同条件（3組の辺）",
      premises: ["side(AB)=side(DE)", "side(BC)=side(EF)", "side(CA)=side(FD)", "triangle(ABC)", "triangle(DEF)"],
      conclusion: "congruent(ABC,DEF)",
      explain: "3組の辺がそれぞれ等しい2つの三角形は合同である。",
      category: "congruence"
    },
    {
      id: "triangle-congruence-sas",
      name: "三角形の合同条件（2組の辺とその間の角）",
      premises: ["side(AB)=side(DE)", "angle(BAC)=angle(EDF)", "side(AC)=side(DF)", "triangle(ABC)", "triangle(DEF)"],
      conclusion: "congruent(ABC,DEF)",
      explain: "2組の辺とその間の角がそれぞれ等しい2つの三角形は合同である。",
      category: "congruence"
    },
    {
      id: "triangle-congruence-asa",
      name: "三角形の合同条件（1組の辺とその両端の角）",
      premises: ["angle(BAC)=angle(EDF)", "side(AB)=side(DE)", "angle(ABC)=angle(DEF)", "triangle(ABC)", "triangle(DEF)"],
      conclusion: "congruent(ABC,DEF)",
      explain: "1組の辺とその両端の角がそれぞれ等しい2つの三角形は合同である。",
      category: "congruence"
    }
  ];

  function hasAllPremises(rule, facts) {
    return rule.premises.every((premise) => facts.includes(premise));
  }

  function congruenceCorrespondences(fact) {
    const match = /^congruent\(([A-Z]{3}),([A-Z]{3})\)$/.exec(fact);
    if (!match) return [];
    const first = match[1];
    const second = match[2];
    const correspondences = [];
    for (let i = 0; i < 3; i++) {
      correspondences.push({
        kind: "side",
        fact: "side(" + first[i] + first[(i + 1) % 3] + ")=side(" + second[i] + second[(i + 1) % 3] + ")"
      });
      correspondences.push({
        kind: "angle",
        fact: "angle(" + first[(i + 2) % 3] + first[i] + first[(i + 1) % 3] + ")=angle(" + second[(i + 2) % 3] + second[i] + second[(i + 1) % 3] + ")"
      });
    }
    return correspondences;
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

  // Parse equalities between angle/side expressions, e.g. angle(ABC)=angle(BCA).
  function parseEquality(fact) {
    const match = /^(angle\([^()]+\)|side\([^()]+\))=(angle\([^()]+\)|side\([^()]+\))$/.exec(fact);
    return match ? { left: match[1], right: match[2] } : null;
  }

  // Equality is transitive for angles and segment lengths. Generate the
  // actual conclusion from the available facts instead of hard-coding one
  // particular chain of angle names.
  function findTransitiveEquality(known) {
    const equalities = known
      .map((fact) => ({ fact, equality: parseEquality(fact) }))
      .filter((item) => item.equality);

    for (const first of equalities) {
      for (const second of equalities) {
        if (first.fact === second.fact) continue;
        const a = first.equality;
        const b = second.equality;
        let left = null;
        let right = null;

        if (a.right === b.left) {
          left = a.left;
          right = b.right;
        }

        if (!left || !right || left === right) continue;
        const conclusion = left + "=" + right;
        if (!known.includes(conclusion)) {
          return { premises: [first.fact, second.fact], conclusion };
        }
      }
    }
    return null;
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
    const sourceByFact = new Map(known.map((fact) => [fact, { type: "given" }]));
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
          premiseSources: rule.premises.map((premise) => ({ fact: premise, ...(sourceByFact.get(premise) || { type: "unknown" }) })),
          conclusion: rule.conclusion,
          explanation: rule.explain,
          category: rule.category
        };
        known.push(rule.conclusion);
        sourceByFact.set(rule.conclusion, { type: "step", index: step.index });
        steps.push(step);
        changed = true;

        if (rule.conclusion === goal) {
          return { success: true, goal, facts: known, steps, reason: "proved" };
        }
      }

      if (steps.length < maxSteps) {
        const congruence = known.find((fact) => /^congruent\\([A-Z]{3},[A-Z]{3}\\)$/.test(fact));
        if (congruence) {
          const generated = congruenceCorrespondences(congruence);
          const correspondence = generated.find((item) => !known.includes(item.fact));
          if (correspondence) {
            const step = {
              index: steps.length + 1,
              ruleId: "corresponding-parts-of-congruent-triangles",
              ruleName: "合同な図形の対応する辺・角",
              premises: [congruence],
              premiseSources: [{ fact: congruence, ...(sourceByFact.get(congruence) || { type: "unknown" }) }],
              conclusion: correspondence.fact,
              explanation: "合同な2つの三角形では、対応する辺の長さと対応する角の大きさがそれぞれ等しい。",
              category: correspondence.kind
            };
            known.push(step.conclusion);
            sourceByFact.set(step.conclusion, { type: "step", index: step.index });
            steps.push(step);
            changed = true;
            if (step.conclusion === goal) {
              return { success: true, goal, facts: known, steps, reason: "proved" };
            }
          }
        }
      }

      if (steps.length < maxSteps) {
        const transitive = findTransitiveEquality(known);
        if (transitive) {
          const step = {
            index: steps.length + 1,
            ruleId: "equality-transitivity",
            ruleName: "等式の推移",
            premises: transitive.premises,
            premiseSources: transitive.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: transitive.conclusion,
            explanation: "等しい2つの量がそれぞれ同じ量に等しいので、その2つの量も等しい。",
            category: transitive.conclusion.startsWith("angle(") ? "angle" : "side"
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) {
            return { success: true, goal, facts: known, steps, reason: "proved" };
          }
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
