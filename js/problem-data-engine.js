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
    // Goal triangles are valid named triangles for similarity and congruence rules.
    if (["triangle-similarity", "triangle-congruence"].includes(problem.goal.type) && Array.isArray(problem.goal.triangles)) {
      for (const vertices of problem.goal.triangles) {
        if (Array.isArray(vertices) && vertices.length === 3) add("triangle(" + vertices.join("") + ")");
      }
    }

    for (const constraint of problem.geometry.constraints) {
      if (constraint.type === "equal-segments" && Array.isArray(constraint.segments) &&
          constraint.segments.length === 2 && constraint.segments.every((s) => Array.isArray(s) && s.length === 2)) {
        const [a, b] = constraint.segments;
        add("side(" + canonicalSegment(a[0], a[1]) + ")=side(" + canonicalSegment(b[0], b[1]) + ")");
      } else if (constraint.type === "collinear" && Array.isArray(constraint.points) && constraint.points.length >= 3) {
        // A collinearity condition is already represented safely when all listed
        // points occur on one explicitly declared line object. Do not infer line
        // order or ray direction from this condition.
        const representedByLine = (problem.geometry.objects || []).some((object) =>
          object.type === "line" && Array.isArray(object.through) &&
          constraint.points.every((point) => object.through.includes(point))
        );
        if (!representedByLine) {
          unsupported.push({ location: "geometry.constraints", type: constraint.type, reason: "点が同じ線オブジェクト上に明示されていないため、共線条件を安全に変換できません。" });
        }
      } else if (constraint.type === "same-ray" && constraint.vertex && constraint.points && constraint.points.length === 2) {
        add("sameRay(" + constraint.vertex + "," + constraint.points[0] + "," + constraint.points[1] + ")");
      } else if (constraint.type === "ray-inside-angle" && constraint.vertex &&
          Array.isArray(constraint.points) && constraint.points.length === 3 &&
          constraint.points.every((point) => typeof point === "string" && /^[A-Z]$/.test(point))) {
        // points are [first side ray, interior ray, second side ray].
        // The interior relation is explicit input; never infer it from collinearity alone.
        add("rayInsideAngle(" + constraint.vertex + "," + constraint.points.join(",") + ")");
      } else if (constraint.type === "point-on-circle" && constraint.point && constraint.circle) {
        add("onCircle(" + constraint.point + ")");
      } else if (constraint.type === "same-segment" && Array.isArray(constraint.chord) && constraint.chord.length === 2 && Array.isArray(constraint.vertices) && constraint.vertices.length === 2) {
        add("sameSegment(" + constraint.chord.slice().sort().join("") + "," + constraint.vertices[0] + "," + constraint.vertices[1] + ")");
      } else if (constraint.type === "opposite-segment" && Array.isArray(constraint.chord) && constraint.chord.length === 2 && Array.isArray(constraint.vertices) && constraint.vertices.length === 2) {
        add("oppositeSegment(" + constraint.chord.slice().sort().join("") + "," + constraint.vertices[0] + "," + constraint.vertices[1] + ")");
      } else if (constraint.type === "opposite-rays" || constraint.type === "between" ||
          constraint.type === "parallel-lines" || constraint.type === "corresponding-angles" ||
          constraint.type === "alternate-interior-angles" || constraint.type === "opposite-segment" || constraint.type === "inscribed-angle" ||
          constraint.type === "equal-arcs") {
        // Converted in the relevant relation pass below; keep these typed constraints supported.
      } else if (constraint.type !== "point-on-circle") {
        unsupported.push({ location: "geometry.constraints", type: constraint.type, reason: "この条件型はまだ安全に事実へ変換できません。" });
      }
    }

    for (const condition of (problem.geometry.dynamicConditions || [])) {
      // Only promote a dynamic condition to a theorem premise if the format explicitly
      // marks it as a given fact, rather than as a search condition for a moving point.
      if (condition.type === "moves-on-arc" && condition.point && condition.circle) {
        // Membership on an arc entails membership on its supporting circle.
        // The chosen arc and excluded-point conditions remain separate constraints.
        add("onCircle(" + condition.point + ")");
        unsupported.push({ location: "geometry.dynamicConditions", type: condition.type, reason: "円周上にあることは変換しましたが、弧の選択範囲・除外点は別途検証が必要です。" });
      } else if (condition.role === "given-fact" && condition.type === "equal-segments" &&
          condition.segments && condition.segments.length === 2) {
        const [a, b] = condition.segments;
        add("side(" + canonicalSegment(a[0], a[1]) + ")=side(" + canonicalSegment(b[0], b[1]) + ")");
      } else if (condition.role === "select-position-of-moving-point" &&
          condition.type === "equal-segments" && condition.segments &&
          condition.segments.length === 2 &&
          condition.segments.every((segment) => Array.isArray(segment) && segment.length === 2)) {
        // The problem asks us to consider the position where this equality holds.
        // Record it as a conditional premise, while keeping the existence/location
        // of such a point as a separate geometric validation task.
        const [a, b] = condition.segments;
        add("side(" + canonicalSegment(a[0], a[1]) + ")=side(" + canonicalSegment(b[0], b[1]) + ")");
      } else if (condition.role === "select-position-of-moving-point" &&
          condition.type === "angle-equality" && Array.isArray(condition.angles) &&
          condition.angles.length === 2 &&
          condition.angles.every((angle) => Array.isArray(angle) && angle.length === 3)) {
        // Treat the stated angle equality as a conditional premise for the selected
        // position of the moving point. Existence of that position is validated separately.
        const [a, b] = condition.angles;
        add(canonicalAngle(a[0], a[1], a[2]) + "=" + canonicalAngle(b[0], b[1], b[2]));
      } else {
        unsupported.push({ location: "geometry.dynamicConditions", type: condition.type, reason: "動点の範囲・存在条件は別途検証が必要です。" });
      }
    }

    // Three distinct points on one circle are non-collinear, so they name a triangle.
    // This lets side equalities apply to the corresponding isosceles triangle without
    // requiring the user to redundantly declare every triangle in the diagram.
    const circlePoints = facts.map((fact) => /^onCircle\(([A-Z])\)$/.exec(fact))
      .filter(Boolean).map((match) => match[1]);
    for (let i = 0; i < circlePoints.length; i++) {
      for (let j = i + 1; j < circlePoints.length; j++) {
        for (let k = j + 1; k < circlePoints.length; k++) {
          add("triangle(" + [circlePoints[i], circlePoints[j], circlePoints[k]].sort().join("") + ")");
        }
      }
    }

    // A parallel-through-point construction explicitly defines a line parallel to
    // another line. Preserve that relation without guessing any angle correspondence.
    for (const object of (problem.geometry.objects || [])) {
      if (object.type === "parallel-through-point" && object.id && object.parallelTo) {
        add("parallel(" + object.id + "," + object.parallelTo + ")");
      }
    }

    // Auto-generate positional angle relations only when point order is explicit.
    // `through` means incidence; `orderedThrough` is the opt-in order contract.
    const parallelPairs = [];
    for (const item of problem.geometry.constraints) {
      if (item.type !== "parallel-lines" || !Array.isArray(item.lines) || item.lines.length !== 2) continue;
      const resolve = (ends) => (problem.geometry.objects || []).filter((o) =>
        o.type === "line" && o.id && Array.isArray(o.orderedThrough) &&
        Array.isArray(ends) && ends.length === 2 && ends.every((p) => o.orderedThrough.includes(p))
      );
      const candidates = item.lines.map(resolve);
      if (candidates.every((list) => list.length === 1)) {
        parallelPairs.push({ first: candidates[0][0], second: candidates[1][0], endpoints: item.lines });
      }
    }
    const pointIndex = (line, point) => line.orderedThrough.indexOf(point);
    const raySide = (line, vertex, point) => {
      const vi = pointIndex(line, vertex), pi = pointIndex(line, point);
      return vi < 0 || pi < 0 || vi === pi ? 0 : (pi < vi ? -1 : 1);
    };
    for (const pair of parallelPairs) {
      const first = pair.first, second = pair.second;
      add("parallel(" + first.id + "," + second.id + ")");
      const lines = (problem.geometry.objects || []).filter((o) =>
        o.type === "line" && o.id && Array.isArray(o.orderedThrough)
      );
      for (const transversal of lines) {
        if ([first.id, second.id].includes(transversal.id)) continue;
        const xs1 = first.orderedThrough.filter((p) => transversal.orderedThrough.includes(p));
        const xs2 = second.orderedThrough.filter((p) => transversal.orderedThrough.includes(p));
        if (xs1.length !== 1 || xs2.length !== 1 || xs1[0] === xs2[0]) continue;
        const [v1, v2] = [xs1[0], xs2[0]];
        const v1Index = pointIndex(transversal, v1), v2Index = pointIndex(transversal, v2);
        if (v1Index < 0 || v2Index < 0) continue;
        add("intersects(" + transversal.id + "," + first.id + ")");
        add("intersects(" + transversal.id + "," + second.id + ")");
        const at = (parallelLine, vertex) => {
          const tRays = transversal.orderedThrough.filter((p) => p !== vertex);
          const pRays = parallelLine.orderedThrough.filter((p) => p !== vertex);
          return tRays.flatMap((t) => pRays.map((q) => ({
            angle: canonicalAngle(t, vertex, q),
            tSide: raySide(transversal, vertex, t),
            pSide: raySide(parallelLine, vertex, q)
          }))).filter((x) => x.tSide && x.pSide);
        };
        const leftAngles = at(first, v1), rightAngles = at(second, v2);
        const firstEnds = pair.endpoints[0], secondEnds = pair.endpoints[1];
        const orientation1 = pointIndex(first, firstEnds[0]) < pointIndex(first, firstEnds[1]) ? 1 : -1;
        const orientation2 = pointIndex(second, secondEnds[0]) < pointIndex(second, secondEnds[1]) ? 1 : -1;
        const parallelOrientation = orientation1 === orientation2 ? 1 : -1;
        const towardOther1 = v1Index < v2Index ? 1 : -1;
        const towardOther2 = -towardOther1;
        for (const a of leftAngles) for (const b of rightAngles) {
          if (a.tSide === b.tSide && a.pSide === b.pSide * parallelOrientation) {
            add("correspondingAngles(" + a.angle + "," + b.angle + "," + transversal.id + "," + first.id + "," + second.id + ")");
          }
          const aInterior = a.tSide === towardOther1 && a.pSide === (a.tSide > 0 ? -1 : 1);
          const bInterior = b.tSide === towardOther2 && b.pSide === (b.tSide > 0 ? -1 : 1) * parallelOrientation;
          if (aInterior && bInterior) {
            add("alternateAngles(" + a.angle + "," + b.angle + "," + transversal.id + "," + first.id + "," + second.id + ")");
          }
        }
      }
    }

    // Convert only explicitly stated parallel-angle and circle-angle conditions.
    for (const item of problem.geometry.constraints) {
      if (item.type === "parallel-lines") {
        const resolved = parallelPairs.find((pair) => JSON.stringify(pair.endpoints) === JSON.stringify(item.lines));
        if (!resolved) {
          const resolve = (ends) => Array.isArray(ends) && ends.length === 2
            ? (problem.geometry.objects || []).filter((o) => o.type === "line" && o.id &&
                Array.isArray(o.through) && ends.every((p) => o.through.includes(p))).map((o) => o.id)
            : [];
          const ids = Array.isArray(item.lines) ? item.lines.map(resolve) : [];
          if (ids.length === 2 && ids.every((list) => list.length === 1) && ids[0][0] !== ids[1][0]) {
            add("parallel(" + ids[0][0] + "," + ids[1][0] + ")");
            const lineObjects = (problem.geometry.objects || []).filter((o) => o.type === "line" && o.id && Array.isArray(o.through));
            for (const transversal of lineObjects) {
              if ([ids[0][0], ids[1][0]].includes(transversal.id)) continue;
              const crosses = ids.map((id) => transversal.through.some((p) =>
                lineObjects.some((o) => o.id === id && o.through.includes(p))));
              if (crosses.every(Boolean)) for (const list of ids) add("intersects(" + transversal.id + "," + list[0] + ")");
            }
          } else {
            unsupported.push({ location: "geometry.constraints", type: item.type,
              reason: "平行線の両端を、一意に対応する直線オブジェクトへ結び付けられません。" });
          }
        }
      }
      if ((item.type === "corresponding-angles" || item.type === "alternate-interior-angles") && item.angles && item.angles.length === 2 && item.transversal && item.lines && item.lines.length === 2) {
        const relation = item.type === "corresponding-angles" ? "correspondingAngles" : "alternateAngles";
        const angleLabel = (angle) => Array.isArray(angle) && angle.length === 3
          ? "angle(" + angle.join("") + ")"
          : Array.isArray(angle) ? angle.join("") : String(angle);
        add(relation + "(" + angleLabel(item.angles[0]) + "," + angleLabel(item.angles[1]) + "," + item.transversal + "," + item.lines[0] + "," + item.lines[1] + ")");
        add("parallel(" + item.lines[0] + "," + item.lines[1] + ")");
        add("intersects(" + item.transversal + "," + item.lines[0] + ")");
        add("intersects(" + item.transversal + "," + item.lines[1] + ")");
      }
      if (item.type === "inscribed-angle" && item.angle && item.arc && item.angle.length === 3 && item.arc.length === 2) {
        add("inscribed(" + item.angle.join("") + "," + item.arc.slice().sort().join("") + ")");
      }
      if (item.type === "equal-arcs" && item.arcs && item.arcs.length === 2) {
        add("equalArc(" + item.arcs[0].slice().sort().join("") + "," + item.arcs[1].slice().sort().join("") + ")");
      }
    }
    // A point explicitly declared on an arc is also on its supporting circle.
    // (The arc-side relation is intentionally not inferred here.)
    // Preserve line incidence from line definitions and intersection constructions.
    // Incidence is safe to infer; ray direction / point order is still not inferred.
    for (const object of (problem.geometry.objects || [])) {
      if (object.type === "line" && object.id && Array.isArray(object.through)) {
        for (const point of object.through) add("onLine(" + point + "," + object.id + ")");
      } else if (object.type === "parallel-through-point" && object.id && Array.isArray(object.through)) {
        for (const point of object.through) add("onLine(" + point + "," + object.id + ")");
      }
    }
    for (const construction of (problem.geometry.constructions || [])) {
      if (construction.type === "intersection" && construction.point && Array.isArray(construction.of)) {
        for (const lineId of construction.of) add("onLine(" + construction.point + "," + lineId + ")");
      }
    }

    // Infer triangles only when each side lies on a known line and the three
    // side-lines are distinct. This uses explicit line incidence, not visual guesses.
    const linesByPoint = new Map();
    for (const fact of facts) {
      const match = /^onLine\(([A-Z]),([^,()]+)\)$/.exec(fact);
      if (!match) continue;
      if (!linesByPoint.has(match[1])) linesByPoint.set(match[1], new Set());
      linesByPoint.get(match[1]).add(match[2]);
    }
    const pointIds = [...linesByPoint.keys()].sort();
    const sharedLine = (a, b) => [...linesByPoint.get(a)].find((lineId) => linesByPoint.get(b).has(lineId)) || null;
    for (let i = 0; i < pointIds.length; i++) for (let j = i + 1; j < pointIds.length; j++) for (let k = j + 1; k < pointIds.length; k++) {
      const [a, b, c] = [pointIds[i], pointIds[j], pointIds[k]];
      const pairLines = [sharedLine(a, b), sharedLine(a, c), sharedLine(b, c)];
      if (pairLines.every(Boolean) && new Set(pairLines).size === 3) add('triangle(' + [a, b, c].join('') + ')');
    }

    // Derive ray relations only from explicit point-order constraints.
    // An intersection alone does not establish which points are on opposite sides.
    const relationFacts = root.GeometryRelations && typeof root.GeometryRelations.derive === "function"
      ? root.GeometryRelations.derive(problem.geometry.constraints)
      : [];
    for (const fact of relationFacts) add(fact);

    for (const construction of (problem.geometry.constructions || [])) {
      unsupported.push({ location: "geometry.constructions", type: construction.type, point: construction.point, reason: "交点だけから点の順序は推測しません。between / same-ray / opposite-rays の明示条件が必要です。" });
    }

    let goal = null;
    if (problem.goal.type === "triangle-similarity" && Array.isArray(problem.goal.triangles) && problem.goal.triangles.length === 2 &&
        problem.goal.triangles.every((vertices) => Array.isArray(vertices) && vertices.length === 3)) {
      goal = "similar(" + problem.goal.triangles[0].join("") + "," + problem.goal.triangles[1].join("") + ")";
    } else if (problem.goal.type === "triangle-congruence" && Array.isArray(problem.goal.triangles) && problem.goal.triangles.length === 2 &&
        problem.goal.triangles.every((vertices) => Array.isArray(vertices) && vertices.length === 3)) {
      goal = "congruent(" + problem.goal.triangles[0].join("") + "," + problem.goal.triangles[1].join("") + ")";
    } else if (problem.goal.type === "angle-equality" && Array.isArray(problem.goal.angles) && problem.goal.angles.length === 2) {
      const [a, b] = problem.goal.angles;
      if (a.length === 3 && b.length === 3) {
        goal = canonicalAngle(a[0], a[1], a[2]) + "=" + canonicalAngle(b[0], b[1], b[2]);
      }
    } else if (problem.goal.type === "segment-equality" && Array.isArray(problem.goal.segments) && problem.goal.segments.length === 2) {
      const [a, b] = problem.goal.segments;
      if (a.length === 2 && b.length === 2) {
        goal = "side(" + canonicalSegment(a[0], a[1]) + ")=side(" + canonicalSegment(b[0], b[1]) + ")";
      }
    }
    if (!goal) {
      unsupported.push({ location: "goal", type: problem.goal.type, reason: "この目標型またはそのデータ形状はまだ変換できません。" });
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
      note: "未対応の条件は unsupported に記録します。同一直線上という情報だけでは半直線の向きを決めず、between / same-ray / opposite-rays の明示情報がある場合だけ角の関係を導きます。"
    };
  }

  // Remove one explicitly supplied input item at a time and rerun the proof.
  // This tests necessity relative to the current encoded problem and rule set,
  // not mathematical necessity in every possible proof.
  function analyzeConditionNecessity(problem, proofRules, maxSteps = 100) {
    const collections = [
      ["geometry.constraints", problem.geometry && problem.geometry.constraints],
      ["geometry.dynamicConditions", problem.geometry && problem.geometry.dynamicConditions],
      ["geometry.objects", problem.geometry && problem.geometry.objects],
      ["geometry.constructions", problem.geometry && problem.geometry.constructions],
      ["geometry.triangles", problem.geometry && problem.geometry.triangles],
      ["proofFacts", problem.proofFacts]
    ];
    const candidates = [];
    for (const [path, items] of collections) {
      if (!Array.isArray(items)) continue;
      items.forEach((item, index) => {
        const clone = JSON.parse(JSON.stringify(problem));
        const parts = path.split(".");
        const target = path === "proofFacts" ? clone : parts.slice(0, -1).reduce((node, key) => node && node[key], clone);
        const key = path === "proofFacts" ? "proofFacts" : parts[parts.length - 1];
        target[key].splice(index, 1);
        const convertedWithoutItem = convert(clone);
        const proofWithoutItem = convertedWithoutItem.goal
          ? proofRules.prove(convertedWithoutItem.facts, convertedWithoutItem.goal, maxSteps)
          : { success: false, reason: "unsupported-goal" };
        candidates.push({
          id: path + "[" + index + "]",
          source: path,
          index,
          type: item && item.type ? item.type : (path === "proofFacts" ? "proofFacts" : "未分類"),
          item,
          status: proofWithoutItem.success ? "not-required-by-current-proof" : "required-by-current-proof",
          proofStillSucceeds: Boolean(proofWithoutItem.success),
          reason: proofWithoutItem.success
            ? "この項目を1つだけ外しても、現在のルールで証明できました。"
            : "この項目を1つだけ外すと、現在のルールでは証明できませんでした。",
          proofReason: proofWithoutItem.reason || null
        });
      });
    }
    return {
      method: "single-item-removal",
      baselineProved: true,
      testedCount: candidates.length,
      candidates,
      note: "各項目を1つずつ外して再実行する検査です。「必要」は現在の問題データと推論ルールに対する必要性であり、数学的に唯一の証明経路だと保証するものではありません。"
    };
  }

  function run(problem, proofRules, maxSteps = 100, options = {}) {
    if (!proofRules || typeof proofRules.prove !== "function") {
      throw new TypeError("ProofRules.prove が必要です。");
    }
    const converted = convert(problem);
    if (!converted.goal) {
      return { success: false, status: "unsupported-goal", converted, proof: null, conditionAnalysis: null };
    }
    const proof = proofRules.prove(converted.facts, converted.goal, maxSteps);
    // The interactive page can prioritize showing the proof immediately and
    // request this expensive single-item-removal analysis separately.
    const conditionAnalysis = proof.success && options.analyzeConditions !== false
      ? analyzeConditionNecessity(problem, proofRules, maxSteps)
      : null;
    return {
      success: proof.success,
      status: proof.success ? "proved" : "not-proved-with-current-rules",
      converted,
      proof,
      conditionAnalysis,
      warning: proof.success
        ? "登録済みルールで目標を導出しました。条件チェックは各入力項目を1つずつ外して再実行しています。問題条件そのものの幾何学的整合性は別途検証が必要です。"
        : "証明できないことは、命題が偽という意味ではありません。条件変換または推論ルールが不足している可能性があります。"
    };
  }

  const api = Object.freeze({ convert, run, analyzeConditionNecessity, canonicalAngle, canonicalSegment });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ProblemDataEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
