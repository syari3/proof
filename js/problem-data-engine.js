/*
 * Adapter from proof-problem v1 JSON to the existing string-fact proof engine.
 * Only facts that can be represented without guessing are emitted.
 */
(function (root) {
  "use strict";

  function assertProblem(problem) {
    if (!problem || problem.format !== "proof-problem" || problem.version !== 1) {
      throw new TypeError("proof-problem version 1 のデータが必要です。");
    }
    if (!problem.geometry || !Array.isArray(problem.geometry.points) ||
        !Array.isArray(problem.geometry.constraints) || !problem.goal) {
      throw new TypeError("geometry.points / geometry.constraints / goal が必要です。");
    }
  }

  function canonicalSegment(a, b) {
    return [a, b].sort().join("");
  }

  // ∠ABC and ∠CBA are the same angle. We canonicalize only endpoint reversal;
  // we do NOT merge different rays just because points are collinear.
  function canonicalAngle(a, vertex, c) {
    const ends = [a, c].sort();
    return "angle(" + ends[0] + vertex + ends[1] + ")";
  }

  function convert(problem) {
    assertProblem(problem);
    const facts = [];
    const unsupported = [];
    const add = (fact) => { if (!facts.includes(fact)) facts.push(fact); };

    for (const triangle of (problem.geometry.triangles || [])) {
      if (triangle.vertices && triangle.vertices.length === 3) {
        add("triangle(" + triangle.vertices.join("") + ")");
      }
    }
    // Goal triangles are valid named triangles for applying the similarity rule.
    if (problem.goal.type === "triangle-similarity" && Array.isArray(problem.goal.triangles)) {
      for (const vertices of problem.goal.triangles) {
        if (Array.isArray(vertices) && vertices.length === 3) add("triangle(" + vertices.join("") + ")");
      }
    }

    for (const constraint of problem.geometry.constraints) {
      if (constraint.type === "equal-segments" && Array.isArray(constraint.segments) &&
          constraint.segments.length === 2 && constraint.segments.every((s) => Array.isArray(s) && s.length === 2)) {
        const [a, b] = constraint.segments;
        add("side(" + canonicalSegment(a[0], a[1]) + ")=side(" + canonicalSegment(b[0], b[1]) + ")");
      } else if (constraint.type === "same-ray" && constraint.vertex && constraint.points && constraint.points.length === 2) {
        add("sameRay(" + constraint.vertex + "," + constraint.points[0] + "," + constraint.points[1] + ")");
      } else if (constraint.type !== "point-on-circle") {
        unsupported.push({ location: "geometry.constraints", type: constraint.type, reason: "この条件型はまだ安全に事実へ変換できません。" });
      }
    }

    for (const condition of (problem.geometry.dynamicConditions || [])) {
      // Only promote a dynamic condition to a theorem premise if the format explicitly
      // marks it as a given fact, rather than as a search condition for a moving point.
      if (condition.role === "given-fact" && condition.type === "equal-segments" &&
          condition.segments && condition.segments.length === 2) {
        const [a, b] = condition.segments;
        add("side(" + canonicalSegment(a[0], a[1]) + ")=side(" + canonicalSegment(b[0], b[1]) + ")");
      } else {
        unsupported.push({ location: "geometry.dynamicConditions", type: condition.type, reason: "動点の選択条件は存在・位置を検証するまで仮定として扱いません。" });
      }
    }

    for (const construction of (problem.geometry.constructions || [])) {
      unsupported.push({ location: "geometry.constructions", type: construction.type, point: construction.point, reason: "構成関係から角・半直線の関係を導く幾何推論は未実装です。" });
    }

    let goal = null;
    if (problem.goal.type === "triangle-similarity" && problem.goal.triangles.length === 2) {
      goal = "similar(" + problem.goal.triangles[0].join("") + "," + problem.goal.triangles[1].join("") + ")";
    } else {
      unsupported.push({ location: "goal", type: problem.goal.type, reason: "この目標型はまだ変換できません。" });
    }

    // Optional explicit facts are useful for carefully reviewed templates.
    for (const fact of (problem.proofFacts || [])) {
      if (typeof fact === "string" && fact.trim()) add(fact);
    }

    return {
      problemId: problem.id,
      facts,
      goal,
      unsupported,
      readyForInference: Boolean(goal),
      note: "未対応の条件は捨てず unsupported に記録し、図の見た目から事実を推測しません。"
    };
  }

  function run(problem, proofRules, maxSteps = 100) {
    if (!proofRules || typeof proofRules.prove !== "function") {
      throw new TypeError("ProofRules.prove が必要です。");
    }
    const converted = convert(problem);
    if (!converted.goal) {
      return { success: false, status: "unsupported-goal", converted, proof: null };
    }
    const proof = proofRules.prove(converted.facts, converted.goal, maxSteps);
    return {
      success: proof.success,
      status: proof.success ? "proved" : "not-proved-with-current-rules",
      converted,
      proof,
      warning: proof.success
        ? "登録済みルールで目標を導出しました。問題条件そのものの幾何学的整合性は別途検証が必要です。"
        : "証明できないことは、命題が偽という意味ではありません。条件変換または推論ルールが不足している可能性があります。"
    };
  }

  const api = Object.freeze({ convert, run, canonicalAngle, canonicalSegment });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ProblemDataEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
