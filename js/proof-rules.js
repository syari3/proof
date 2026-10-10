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
      id: "triangle.similarity-aa",
      name: "三角形の相似条件（2組の角）",
      premises: ["angle(A)=angle(D)", "angle(B)=angle(E)", "triangle(ABC)", "triangle(DEF)"],
      conclusion: "similar(ABC,DEF)",
      explain: "2組の角がそれぞれ等しい2つの三角形は相似である。",
      category: "similarity"
    },
    {
      id: "triangle.congruence-sss",
      name: "三角形の合同条件（3組の辺）",
      premises: ["side(AB)=side(DE)", "side(BC)=side(EF)", "side(CA)=side(FD)", "triangle(ABC)", "triangle(DEF)"],
      conclusion: "congruent(ABC,DEF)",
      explain: "3組の辺がそれぞれ等しい2つの三角形は合同である。",
      category: "congruence"
    },
    {
      id: "triangle.congruence-sas",
      name: "三角形の合同条件（2組の辺とその間の角）",
      premises: ["side(AB)=side(DE)", "angle(BAC)=angle(EDF)", "side(AC)=side(DF)", "triangle(ABC)", "triangle(DEF)"],
      conclusion: "congruent(ABC,DEF)",
      explain: "2組の辺とその間の角がそれぞれ等しい2つの三角形は合同である。",
      category: "congruence"
    },
    {
      id: "triangle.congruence-asa",
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


  // sameRay(V,A,D) means A and D lie on the same ray starting at V.
  // Collinearity alone is insufficient: the points could lie on opposite rays.
  function parseAngle(fact) {
    const match = /^angle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
    return match ? { text: fact, first: match[1], vertex: match[2], last: match[3] } : null;
  }

  function findSameAngleNotation(known, goal) {
    const equality = parseEquality(goal);
    if (!equality) return null;
    const a = parseAngle(equality.left);
    const b = parseAngle(equality.right);
    if (!a || !b || a.vertex !== b.vertex) return null;

    const sameRayFacts = known
      .map((fact) => /^sameRay\(([A-Z]),([A-Z]),([A-Z])\)$/.exec(fact))
      .filter(Boolean);

    function raysMatch(first, second, vertex) {
      return first === second || sameRayFacts.some((ray) =>
        ray[1] === vertex &&
        ((ray[2] === first && ray[3] === second) ||
         (ray[2] === second && ray[3] === first))
      );
    }

    if (!raysMatch(a.first, b.first, a.vertex) ||
        !raysMatch(a.last, b.last, a.vertex)) return null;

    const premises = sameRayFacts
      .filter((ray) => ray[1] === a.vertex)
      .filter((ray) => [a.first, b.first].every((point) => ray.slice(2).includes(point)) ||
                       [a.last, b.last].every((point) => ray.slice(2).includes(point)))
      .map((ray) => "sameRay(" + ray[1] + "," + ray[2] + "," + ray[3] + ")");
    return { premises, conclusion: goal };
  }


  function circleCandidates(known) {
    const ins = known.map((fact) => { const m = /^inscribed\(([A-Z]{3}),([A-Z]{2})\)$/.exec(fact); return m && { fact, angle: m[1], arc: m[2] }; }).filter(Boolean);
    const cen = known.map((fact) => { const m = /^central\(([A-Z]{3}),([A-Z]{2})\)$/.exec(fact); return m && { fact, angle: m[1], arc: m[2] }; }).filter(Boolean);
    const arcs = known.map((fact) => { const m = /^equalArc\(([A-Z]{2}),([A-Z]{2})\)$/.exec(fact); return m && { fact, a: m[1], b: m[2] }; }).filter(Boolean);
    const results = [];
    for (let i = 0; i < ins.length; i++) for (let j = i + 1; j < ins.length; j++) {
      const a = ins[i], b = ins[j];
      if (a.arc === b.arc) results.push({ id: "circle.inscribed-angles-same-arc", name: "同じ弧に対する円周角", premises: [a.fact, b.fact], conclusion: "angle(" + a.angle + ")=angle(" + b.angle + ")", explain: "同じ弧に対する円周角は等しい。", category: "circle" });
      const eq = arcs.find((x) => (x.a === a.arc && x.b === b.arc) || (x.a === b.arc && x.b === a.arc));
      if (eq) results.push({ id: "circle.equal-arcs-inscribed-angles", name: "等しい弧に対する円周角", premises: [eq.fact, a.fact, b.fact], conclusion: "angle(" + a.angle + ")=angle(" + b.angle + ")", explain: "等しい弧に対する円周角は等しい。", category: "circle" });
    }
    for (const a of cen) for (const b of ins) if (a.arc === b.arc) {
      results.push({ id: "circle.central-inscribed-angle", name: "中心角と円周角の関係", premises: [a.fact, b.fact], conclusion: "angle(" + a.angle + ")=2*angle(" + b.angle + ")", explain: "同じ弧に対する中心角は円周角の2倍である。", category: "circle" });
    }
    return results;
  }

  // Same-chord inscribed angles are equal only when their vertices are
  // explicitly stated to lie in the same segment of the circle.
  function sameSegmentAngleCandidates(known) {
    const circlePoints = new Set(known.map((fact) => /^onCircle\(([A-Z])\)$/.exec(fact)).filter(Boolean).map((m) => m[1]));
    const results = [];
    for (const fact of known) {
      const match = /^sameSegment\(([A-Z])([A-Z]),([A-Z]),([A-Z])\)$/.exec(fact);
      if (!match) continue;
      const [, x, y, firstVertex, secondVertex] = match;
      if (new Set([x, y, firstVertex, secondVertex]).size !== 4) continue;
      if (![x, y, firstVertex, secondVertex].every((point) => circlePoints.has(point))) continue;
      const a = 'angle(' + x + firstVertex + y + ')';
      const b = 'angle(' + x + secondVertex + y + ')';
      results.push({
        id: 'circle.angles-same-segment',
        name: '同じ弦に対する同じ側の円周角',
        premises: [fact, 'onCircle(' + x + ')', 'onCircle(' + y + ')', 'onCircle(' + firstVertex + ')', 'onCircle(' + secondVertex + ')'],
        conclusion: [a, b].sort().join('='),
        explain: '同じ弦に対する、弦の同じ側にある円周角は等しい。',
        category: 'circle'
      });
    }
    return results;
  }

  // Replace an angle ray endpoint only when the vertex-based same-ray fact
  // explicitly confirms that the two rays coincide.
  function sameRayAngleCandidates(known) {
    const rays = known.map((fact) => /^sameRay\(([A-Z]),([A-Z]),([A-Z])\)$/.exec(fact)).filter(Boolean)
      .map((m) => ({ fact: m[0], vertex: m[1], first: m[2], second: m[3] }));
    const angleLabels = new Set();
    for (const fact of known) {
      for (const match of fact.matchAll(/angle\(([A-Z]{3})\)/g)) angleLabels.add(match[1]);
      const standalone = /^angle\(([A-Z]{3})\)$/.exec(fact);
      if (standalone) angleLabels.add(standalone[1]);
    }
    const angles = [...angleLabels].map((label) => ({ fact: "angle(" + label + ")", first: label[0], vertex: label[1], last: label[2] }));
    const results = [];
    for (const angle of angles) for (const ray of rays) {
      if (angle.vertex !== ray.vertex) continue;
      for (const [from, to] of [[ray.first, ray.second], [ray.second, ray.first]]) {
        let changed = false, a = angle.first, c = angle.last;
        if (a === from && c !== to) { a = to; changed = true; }
        else if (c === from && a !== to) { c = to; changed = true; }
        if (!changed || a === c) continue;
        const replacement = 'angle(' + a + angle.vertex + c + ')';
        results.push({
          id: 'geometry.same-ray-angle', name: '同じ半直線を使った角の置き換え',
          premises: [ray.fact],
          conclusion: [angle.fact, replacement].sort().join('='),
          explain: '同じ半直線上にある点で角を表し直しても、角の大きさは変わらない。',
          category: 'angle'
        });
      }
    }
    return results;
  }

  function circleGoal(known, goal) {
    return circleCandidates(known).find((rule) => rule.conclusion === goal) || null;
  }

  function derive(facts) {
    if (!Array.isArray(facts) || !facts.every((fact) => typeof fact === "string")) {
      throw new TypeError("facts は文字列の配列で指定してください。");
    }
    const staticResults = rules
      .filter((rule) => hasAllPremises(rule, facts))
      .map((rule) => ({
        ruleId: rule.id,
        ruleName: rule.name,
        premises: [...rule.premises],
        conclusion: rule.conclusion,
        explanation: rule.explain,
        category: rule.category
      }));
    const dynamicRules = [
      ...isoscelesBaseAngleCandidates(facts),
      ...triangleAngleSumCandidates(facts),
      ...equalRadiusCandidates(facts),
      ...parallelAngleCandidates(facts),
      ...diameterInscribedAngleCandidates(facts),
      ...circleCandidates(facts),
      ...sameSegmentAngleCandidates(facts),
      ...sameRayAngleCandidates(facts),
      ...verticalAngleCandidates(facts),
      ...exteriorAngleCandidates(facts),
      ...angleAdditionCandidates(facts),
      ...segmentAdditionCandidates(facts),
      ...equalAnglesImplyEqualSidesCandidates(facts),
      ...triangleSimilarityAACandidates(facts),
      ...triangleCongruenceSSSCandidates(facts),
      ...triangleCongruenceSASCandidates(facts),
      ...triangleCongruenceASACandidates(facts)
    ];
    const dynamicResults = dynamicRules.map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      premises: [...rule.premises],
      conclusion: rule.conclusion,
      explanation: rule.explain,
      category: rule.category
    }));
    return [...staticResults, ...dynamicResults];
  }

  // Parse equalities between angle/side expressions, e.g. angle(ABC)=angle(BCA).
  function parseEquality(fact) {
    const match = /^(angle\([^()]+\)|side\([^()]+\))=(angle\([^()]+\)|side\([^()]+\))$/.exec(fact);
    if (!match) return null;
    // Angles can only be chained with angles, and segment lengths with segment lengths.
    // Reject mixed-type equalities so transitivity cannot equate an angle with a length.
    const leftKind = match[1].startsWith("angle(") ? "angle" : "side";
    const rightKind = match[2].startsWith("angle(") ? "angle" : "side";
    if (leftKind !== rightKind) return null;
    return { left: match[1], right: match[2] };
  }

  // Equality is transitive for angles and segment lengths. Generate the
  // actual conclusion from the available facts instead of hard-coding one
  // particular chain of angle names.
  function findTransitiveEquality(known, goal) {
    const equalities = known.map((fact) => ({ fact, equality: parseEquality(fact) })).filter((item) => item.equality);
    for (let i = 0; i < equalities.length; i++) {
      for (let j = i + 1; j < equalities.length; j++) {
        const first = equalities[i], second = equalities[j];
        const a = [first.equality.left, first.equality.right];
        const b = [second.equality.left, second.equality.right];
        for (const shared of a) {
          if (!b.includes(shared)) continue;
          const left = a.find((term) => term !== shared);
          const right = b.find((term) => term !== shared);
          if (!left || !right || left === right) continue;
          const conclusion = left + "=" + right;
          const reverse = right + "=" + left;
          if (goal === reverse && !known.includes(reverse)) {
            return { premises: [first.fact, second.fact], conclusion: reverse };
          }
          if (!known.includes(conclusion) && !known.includes(reverse)) {
            return { premises: [first.fact, second.fact], conclusion };
          }
        }
      }
    }
    return null;
  }
  function sameAngleExpression(first, second) {
    const a = parseAngle(first), b = parseAngle(second);
    return !!a && !!b && a.vertex === b.vertex &&
      ((a.first === b.first && a.last === b.last) || (a.first === b.last && a.last === b.first));
  }

  function sameAngleEquality(first, second) {
    const a = parseEquality(first), b = parseEquality(second);
    if (!a || !b) return false;
    return (sameAngleExpression(a.left, b.left) && sameAngleExpression(a.right, b.right)) ||
      (sameAngleExpression(a.left, b.right) && sameAngleExpression(a.right, b.left));
  }

  function sameSideExpression(first, second) {
    const a = /^side\(([A-Z])([A-Z])\)$/.exec(first);
    const b = /^side\(([A-Z])([A-Z])\)$/.exec(second);
    return !!a && !!b && a[1] !== a[2] && b[1] !== b[2] &&
      a.slice(1).sort().join("") === b.slice(1).sort().join("");
  }

  function sameSideEquality(first, second) {
    const a = parseEquality(first), b = parseEquality(second);
    if (!a || !b) return false;
    return (sameSideExpression(a.left, b.left) && sameSideExpression(a.right, b.right)) ||
      (sameSideExpression(a.left, b.right) && sameSideExpression(a.right, b.left));
  }

  // In a triangle, equal sides imply equal opposite base angles.
  // Explicit triangle/equality facts are required; segment notation is unordered.
  function isoscelesBaseAngleCandidates(known) {
    const triangles = known.map((fact) => {
      const match = /^triangle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      return match ? { fact, vertices: match.slice(1) } : null;
    }).filter(Boolean);
    const equalities = known.map((fact) => ({ fact, equality: parseEquality(fact) }))
      .filter((item) => item.equality && item.equality.left.startsWith("side(") && item.equality.right.startsWith("side("));
    const results = [];
    function parseSide(expression) {
      const match = /^side\(([A-Z])([A-Z])\)$/.exec(expression);
      if (!match || match[1] === match[2]) return null;
      return match.slice(1).sort();
    }
    for (const triangle of triangles) {
      if (new Set(triangle.vertices).size !== 3) continue;
      const vertexSet = new Set(triangle.vertices);
      for (const item of equalities) {
        const left = parseSide(item.equality.left), right = parseSide(item.equality.right);
        if (!left || !right || left.join("") === right.join("")) continue;
        if (![...left, ...right].every((point) => vertexSet.has(point))) continue;
        const shared = left.find((point) => right.includes(point));
        if (!shared) continue;
        const leftBase = left.find((point) => point !== shared);
        const rightBase = right.find((point) => point !== shared);
        if (!leftBase || !rightBase || leftBase === rightBase) continue;
        const angleFor = (vertex) => {
          const index = triangle.vertices.indexOf(vertex);
          const first = index === 1 ? triangle.vertices[0] : triangle.vertices[1];
          const last = index === 0 ? triangle.vertices[2] : index === 1 ? triangle.vertices[2] : triangle.vertices[0];
          return "angle(" + first + vertex + last + ")";
        };
        const leftAngle = angleFor(leftBase), rightAngle = angleFor(rightBase);
        results.push({
          id: "triangle.isosceles-base-angles",
          name: "二等辺三角形の底角",
          premises: [triangle.fact, item.fact],
          conclusion: [leftAngle, rightAngle].sort().join("="),
          explain: "二等辺三角形の等しい辺に対する角は等しい。",
          category: "isosceles"
        });
      }
    }
    return results;
  }

  // AA similarity with arbitrary triangle labels and explicit vertex-angle facts.
  // Two distinct corresponding angle pairs determine the third pair by angle sum.
  function triangleSimilarityAACandidates(known) {
    const triangles = known.map((fact) => {
      const match = /^triangle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      return match ? { fact, vertices: match.slice(1) } : null;
    }).filter(Boolean).filter((triangle) => new Set(triangle.vertices).size === 3);
    // Accept both abstract vertex-angle facts (angle(A)=angle(D)) and
    // geometric angle facts (angle(ABC)=angle(DEF)), so circle/parallel
    // theorems can feed directly into AA similarity.
    const anglePairs = known.map((fact) => {
      const match = /^angle\(([A-Z]{1,3})\)=angle\(([A-Z]{1,3})\)$/.exec(fact);
      if (!match) return null;
      const parse = (text) => text.length === 1
        ? { vertex: text, points: [text] }
        : { vertex: text[1], points: text.split("") };
      const first = parse(match[1]), second = parse(match[2]);
      return { fact, first: first.vertex, second: second.vertex, firstAngle: first, secondAngle: second };
    }).filter(Boolean);
    const results = [];
    for (let i = 0; i < triangles.length; i++) {
      for (let j = i + 1; j < triangles.length; j++) {
        const first = triangles[i], second = triangles[j];
        for (const a of anglePairs) {
          if (!first.vertices.includes(a.first) || !second.vertices.includes(a.second)) continue;
          if (a.firstAngle.points.length === 3 && !a.firstAngle.points.every((p) => first.vertices.includes(p))) continue;
          if (a.secondAngle.points.length === 3 && !a.secondAngle.points.every((p) => second.vertices.includes(p))) continue;
          for (const b of anglePairs) {
            if (a.fact === b.fact || a.first === b.first || a.second === b.second) continue;
            if (!first.vertices.includes(b.first) || !second.vertices.includes(b.second)) continue;
            if (b.firstAngle.points.length === 3 && !b.firstAngle.points.every((p) => first.vertices.includes(p))) continue;
            if (b.secondAngle.points.length === 3 && !b.secondAngle.points.every((p) => second.vertices.includes(p))) continue;
            const mapping = new Map([[a.first, a.second], [b.first, b.second]]);
            if (new Set(mapping.values()).size !== 2) continue;
            const remainingFirst = first.vertices.find((point) => !mapping.has(point));
            const usedSecond = new Set(mapping.values());
            const remainingSecond = second.vertices.find((point) => !usedSecond.has(point));
            if (!remainingFirst || !remainingSecond) continue;
            mapping.set(remainingFirst, remainingSecond);
            const mapped = first.vertices.map((point) => mapping.get(point));
            if (new Set(mapped).size !== 3) continue;
            const conclusion = "similar(" + first.vertices.join("") + "," + mapped.join("") + ")";
            if (results.some((rule) => rule.conclusion === conclusion)) continue;
            results.push({
              id: "triangle.similarity-aa",
              name: "三角形の相似条件（2組の角）",
              premises: [a.fact, b.fact, first.fact, second.fact],
              conclusion,
              explain: "2組の角がそれぞれ等しい2つの三角形は相似である。",
              category: "similarity"
            });
          }
        }
      }
    }
    return results;
  }

  // SSS congruence with arbitrary vertex labels. Side order is unordered,
  // and all three side equalities must support the same one-to-one mapping.
  function triangleCongruenceSSSCandidates(known) {
    const triangles = known.map((fact) => {
      const match = /^triangle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      return match ? { fact, vertices: match.slice(1) } : null;
    }).filter(Boolean).filter((triangle) => new Set(triangle.vertices).size === 3);
    const equalSides = known.map((fact) => {
      const match = /^side\(([A-Z])([A-Z])\)=side\(([A-Z])([A-Z])\)$/.exec(fact);
      if (!match || match[1] === match[2] || match[3] === match[4]) return null;
      return { fact, left: match.slice(1, 3).sort().join(""), right: match.slice(3, 5).sort().join("") };
    }).filter(Boolean);
    const results = [];
    function sideKey(a, b) { return [a, b].sort().join(""); }
    function permutations(values) {
      return [
        [values[0], values[1], values[2]],
        [values[0], values[2], values[1]],
        [values[1], values[0], values[2]],
        [values[1], values[2], values[0]],
        [values[2], values[0], values[1]],
        [values[2], values[1], values[0]]
      ];
    }
    for (let i = 0; i < triangles.length; i++) {
      for (let j = i + 1; j < triangles.length; j++) {
        const first = triangles[i], second = triangles[j];
        for (const mapped of permutations(second.vertices)) {
          const required = [
            [sideKey(first.vertices[0], first.vertices[1]), sideKey(mapped[0], mapped[1])],
            [sideKey(first.vertices[1], first.vertices[2]), sideKey(mapped[1], mapped[2])],
            [sideKey(first.vertices[2], first.vertices[0]), sideKey(mapped[2], mapped[0])]
          ];
          const supporting = required.map(([left, right]) => equalSides.find((item) =>
            (item.left === left && item.right === right) ||
            (item.left === right && item.right === left)
          ));
          if (supporting.some((item) => !item) || new Set(supporting.map((item) => item.fact)).size !== 3) continue;
          const conclusion = "congruent(" + first.vertices.join("") + "," + mapped.join("") + ")";
          if (results.some((rule) => rule.conclusion === conclusion)) continue;
          results.push({
            id: "triangle.congruence-sss",
            name: "三角形の合同条件（3組の辺）",
            premises: [...supporting.map((item) => item.fact), first.fact, second.fact],
            conclusion,
            explain: "3組の辺がそれぞれ等しい2つの三角形は合同である。",
            category: "congruence"
          });
        }
      }
    }
    return results;
  }

  // General SAS: the equal angle must be included between the two equal sides.
  function triangleCongruenceSASCandidates(known) {
    const triangles = known.map((fact) => {
      const match = /^triangle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      return match ? { fact, vertices: match.slice(1) } : null;
    }).filter(Boolean).filter((triangle) => new Set(triangle.vertices).size === 3);
    const sideEqualities = known.map((fact) => {
      const match = /^side\(([A-Z])([A-Z])\)=side\(([A-Z])([A-Z])\)$/.exec(fact);
      if (!match || match[1] === match[2] || match[3] === match[4]) return null;
      return { fact, left: match.slice(1, 3).sort().join(""), right: match.slice(3, 5).sort().join("") };
    }).filter(Boolean);
    const angleEqualities = known.map((fact) => {
      const match = /^angle\(([A-Z])([A-Z])([A-Z])\)=angle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      if (!match) return null;
      return { fact, left: match.slice(1, 4), right: match.slice(4, 7) };
    }).filter(Boolean);
    const results = [];
    const sideKey = (a, b) => [a, b].sort().join("");
    const permutations = (v) => [
      [v[0],v[1],v[2]],[v[0],v[2],v[1]],[v[1],v[0],v[2]],
      [v[1],v[2],v[0]],[v[2],v[0],v[1]],[v[2],v[1],v[0]]
    ];
    const angleMatches = (angle, a, vertex, c) =>
      angle[1] === vertex && [angle[0], angle[2]].sort().join("") === [a, c].sort().join("");
    for (let i = 0; i < triangles.length; i++) for (let j = i + 1; j < triangles.length; j++) {
      const first = triangles[i], second = triangles[j];
      for (const mapped of permutations(second.vertices)) {
        const pairs = new Map(first.vertices.map((v, index) => [v, mapped[index]]));
        const sides = [
          [first.vertices[0], first.vertices[1]],
          [first.vertices[1], first.vertices[2]],
          [first.vertices[2], first.vertices[0]]
        ];
        for (let a = 0; a < sides.length; a++) for (let b = a + 1; b < sides.length; b++) {
          const [u,v] = sides[a], [x,y] = sides[b];
          const s1 = sideEqualities.find((e) => (e.left === sideKey(u,v) && e.right === sideKey(pairs.get(u),pairs.get(v))) || (e.right === sideKey(u,v) && e.left === sideKey(pairs.get(u),pairs.get(v))));
          const s2 = sideEqualities.find((e) => (e.left === sideKey(x,y) && e.right === sideKey(pairs.get(x),pairs.get(y))) || (e.right === sideKey(x,y) && e.left === sideKey(pairs.get(x),pairs.get(y))));
          if (!s1 || !s2 || s1.fact === s2.fact) continue;
          const shared = [u,v].find((p) => p === x || p === y);
          if (!shared) continue;
          const end1 = [u,v].find((p) => p !== shared), end2 = [x,y].find((p) => p !== shared);
          const angle = angleEqualities.find((e) =>
            (angleMatches(e.left, end1, shared, end2) && angleMatches(e.right, pairs.get(end1), pairs.get(shared), pairs.get(end2))) ||
            (angleMatches(e.right, end1, shared, end2) && angleMatches(e.left, pairs.get(end1), pairs.get(shared), pairs.get(end2)))
          );
          if (!angle || [s1.fact,s2.fact,angle.fact].some((fact, idx, all) => all.indexOf(fact) !== idx)) continue;
          const conclusion = "congruent(" + first.vertices.join("") + "," + mapped.join("") + ")";
          if (results.some((r) => r.conclusion === conclusion)) continue;
          results.push({ id:"triangle.congruence-sas", name:"三角形の合同条件（2組の辺とその間の角）",
            premises:[s1.fact, angle.fact, s2.fact, first.fact, second.fact], conclusion,
            explain:"2組の辺とその間の角がそれぞれ等しい2つの三角形は合同である。", category:"congruence" });
        }
      }
    }
    return results;
  }

  // General ASA: the equal side and both endpoint angles must correspond.
  function triangleCongruenceASACandidates(known) {
    const triangles = known.map((fact) => {
      const match = /^triangle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      return match ? { fact, vertices: match.slice(1) } : null;
    }).filter(Boolean).filter((triangle) => new Set(triangle.vertices).size === 3);
    const sideEqualities = known.map((fact) => {
      const match = /^side\(([A-Z])([A-Z])\)=side\(([A-Z])([A-Z])\)$/.exec(fact);
      if (!match || match[1] === match[2] || match[3] === match[4]) return null;
      return { fact, left: match.slice(1, 3).sort().join(""), right: match.slice(3, 5).sort().join("") };
    }).filter(Boolean);
    const angleEqualities = known.map((fact) => {
      const match = /^angle\(([A-Z])([A-Z])([A-Z])\)=angle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      return match ? { fact, left: match.slice(1, 4), right: match.slice(4, 7) } : null;
    }).filter(Boolean);
    const results = [];
    const sideKey = (a,b) => [a,b].sort().join("");
    const permutations = (v) => [
      [v[0],v[1],v[2]],[v[0],v[2],v[1]],[v[1],v[0],v[2]],
      [v[1],v[2],v[0]],[v[2],v[0],v[1]],[v[2],v[1],v[0]]
    ];
    const angleAt = (angle, vertex, other1, other2) =>
      angle[1] === vertex && [angle[0],angle[2]].sort().join("") === [other1,other2].sort().join("");
    for (let i = 0; i < triangles.length; i++) for (let j = i + 1; j < triangles.length; j++) {
      const first = triangles[i], second = triangles[j];
      for (const mapped of permutations(second.vertices)) {
        const pairs = new Map(first.vertices.map((v,index) => [v,mapped[index]]));
        for (const [u,v] of [[first.vertices[0],first.vertices[1]],[first.vertices[1],first.vertices[2]],[first.vertices[2],first.vertices[0]]]) {
          const side = sideEqualities.find((e) =>
            (e.left === sideKey(u,v) && e.right === sideKey(pairs.get(u),pairs.get(v))) ||
            (e.right === sideKey(u,v) && e.left === sideKey(pairs.get(u),pairs.get(v)))
          );
          if (!side) continue;
          const w = first.vertices.find((p) => p !== u && p !== v);
          const mw = pairs.get(w);
          const matchingAngleAt = (vertex, other, mappedVertex, mappedOther) =>
            angleEqualities.find((e) =>
              (angleAt(e.left,vertex,other,w) && angleAt(e.right,mappedVertex,mappedOther,mw)) ||
              (angleAt(e.right,vertex,other,w) && angleAt(e.left,mappedVertex,mappedOther,mw))
            );
          const angleU = matchingAngleAt(u,v,pairs.get(u),pairs.get(v));
          const angleV = matchingAngleAt(v,u,pairs.get(v),pairs.get(u));
          if (!angleU || !angleV || angleU.fact === angleV.fact ||
              angleU.fact === side.fact || angleV.fact === side.fact) continue;
          const conclusion = "congruent(" + first.vertices.join("") + "," + mapped.join("") + ")";
          if (results.some((r) => r.conclusion === conclusion)) continue;
          results.push({ id:"triangle.congruence-asa", name:"三角形の合同条件（1組の辺とその両端の角）",
            premises:[angleU.fact,side.fact,angleV.fact,first.fact,second.fact], conclusion,
            explain:"1組の辺とその両端の角がそれぞれ等しい2つの三角形は合同である。", category:"congruence" });
        }
      }
    }
    return results;
  }

  // A triangle fact licenses its three interior angles to sum to 180 degrees.
  // The vertex order is taken from the explicit triangle(XYZ) fact; no points
  // are guessed from a drawing.
  function triangleAngleSumCandidates(known) {
    const results = [];
    for (const fact of known) {
      const match = /^triangle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      if (!match) continue;
      const [, a, b, c] = match;
      if (new Set([a, b, c]).size !== 3) continue;
      const conclusion = "angle(" + b + a + c + ")+angle(" + a + b + c + ")+angle(" + a + c + b + ")=180";
      results.push({
        id: "triangle.angle-sum",
        name: "三角形の内角の和",
        premises: [fact],
        conclusion,
        explain: "三角形の内角の和は180°である。",
        category: "angle"
      });
    }
    return results;
  }

  // Parallel-angle rules accept arbitrary angle labels but require explicit
  // parallelism, both intersections, and the positional relation fact.
  function parallelAngleCandidates(known) {
    const knownSet = new Set(known);
    const results = [];
    const patterns = [
      { fact: /^alternateAngles\(((?:angle\([^()]+\)|[^,()]+)),((?:angle\([^()]+\)|[^,()]+)),([^,()]+),([^,()]+),([^,()]+)\)$/, id: "parallel.alternate-interior-angles", name: "平行線の錯角", relation: "alternateAngles", explain: "平行線の錯角は等しい。" },
      { fact: /^correspondingAngles\(((?:angle\([^()]+\)|[^,()]+)),((?:angle\([^()]+\)|[^,()]+)),([^,()]+),([^,()]+),([^,()]+)\)$/, id: "parallel.corresponding-angles", name: "平行線の同位角", relation: "correspondingAngles", explain: "平行線の同位角は等しい。" }
    ];
    for (const fact of known) for (const pattern of patterns) {
      const match = pattern.fact.exec(fact);
      if (!match) continue;
      const [, angle1, angle2, transversal, line1, line2] = match;
      if (angle1 === angle2 || line1 === line2 || transversal === line1 || transversal === line2) continue;
      const premises = ["parallel(" + line1 + "," + line2 + ")", "intersects(" + transversal + "," + line1 + ")", "intersects(" + transversal + "," + line2 + ")", fact];
      if (!premises.every((premise) => knownSet.has(premise))) continue;
      results.push({ id: pattern.id, name: pattern.name, premises,
        conclusion: angle1 + "=" + angle2, explain: pattern.explain, category: "parallel" });
    }
    return results;
  }

  // A diameter's endpoints and the angle vertex must be explicitly on the circle.
  // The legacy fact format uses onCircle(P) plus diameter(QR); arbitrary labels work.
  function diameterInscribedAngleCandidates(known) {
    const onCircle = new Set(known.map((fact) => /^onCircle\(([A-Z])\)$/.exec(fact)).filter(Boolean).map((m) => m[1]));
    const diameters = known.map((fact) => {
      const match = /^diameter\(([A-Z])([A-Z])\)$/.exec(fact);
      return match && match[1] !== match[2] ? { fact, first: match[1], last: match[2] } : null;
    }).filter(Boolean);
    const results = [];
    for (const diameter of diameters) {
      if (!onCircle.has(diameter.first) || !onCircle.has(diameter.last)) continue;
      for (const vertex of onCircle) {
        if (vertex === diameter.first || vertex === diameter.last) continue;
        results.push({
          id: "circle.diameter-inscribed-angle",
          name: "直径に対する円周角",
          premises: ["onCircle(" + vertex + ")", "onCircle(" + diameter.first + ")", "onCircle(" + diameter.last + ")", diameter.fact],
          conclusion: "angle(" + diameter.first + vertex + diameter.last + ")=90",
          explain: "直径の両端と円周上の点がつくる円周角は90°である。",
          category: "circle"
        });
      }
    }
    return results;
  }

  // Points explicitly marked on circles with the same center have equal radii.
  function equalRadiusCandidates(known) {
    const points = known.map((fact) => {
      const match = /^onCircle\(([A-Z]),([A-Z])\)$/.exec(fact);
      return match ? { fact, point: match[1], center: match[2] } : null;
    }).filter(Boolean);
    const results = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i], b = points[j];
        if (a.center !== b.center || a.point === b.point) continue;
        const left = "side(" + a.center + a.point + ")";
        const right = "side(" + b.center + b.point + ")";
        const conclusion = [left, right].sort().join("=");
        results.push({
          id: "circle.equal-radii",
          name: "同じ円の半径は等しい",
          premises: [a.fact, b.fact],
          conclusion,
          explain: "同じ円の半径はすべて等しい。",
          category: "circle"
        });
      }
    }
    return results;
  }

  // verticalAngles(ABC,DBE) explicitly states that these two angles are
  // vertically opposite. The positional relation must be supplied; a shared
  // vertex alone is not enough to infer equality.
  function verticalAngleCandidates(known) {
    const results = [];
    for (const fact of known) {
      const match = /^verticalAngles\(([A-Z]{3}),([A-Z]{3})\)$/.exec(fact);
      if (!match) continue;
      const first = match[1], second = match[2];
      if (first[1] !== second[1] || first === second) continue;
      const left = "angle(" + first + ")";
      const right = "angle(" + second + ")";
      results.push({
        id: "angle.vertical-angles",
        name: "対頂角は等しい",
        premises: [fact],
        conclusion: [left, right].sort().join("="),
        explain: "対頂角は等しい。",
        category: "angle"
      });
    }
    return results;
  }

  // extends(BC,D) means side BC is extended beyond C to D.
  // Only explicit triangle and extension facts license the exterior-angle rule.
  function exteriorAngleCandidates(known) {
    const triangles = known.map((fact) => {
      const match = /^triangle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      return match ? { fact, a: match[1], b: match[2], c: match[3] } : null;
    }).filter(Boolean);
    const extensions = known.map((fact) => {
      const match = /^extends\(([A-Z])([A-Z]),([A-Z])\)$/.exec(fact);
      return match ? { fact, first: match[1], through: match[2], point: match[3] } : null;
    }).filter(Boolean);
    const results = [];
    for (const triangle of triangles) {
      const { a, b, c } = triangle;
      if (new Set([a, b, c]).size !== 3) continue;
      for (const extension of extensions) {
        if (extension.first !== b || extension.through !== c ||
            [a, b, c].includes(extension.point)) continue;
        results.push({
          id: "triangle.exterior-angle",
          name: "三角形の外角定理",
          premises: [triangle.fact, extension.fact],
          conclusion: "angle(" + a + c + extension.point + ")=angle(" + b + a + c + ")+angle(" + a + b + c + ")",
          explain: "三角形の外角は、それと隣り合わない2つの内角の和に等しい。",
          category: "angle"
        });
      }
    }
    return results;
  }

  // In a triangle, equal interior angles face equal opposite sides.
  function equalAnglesImplyEqualSidesCandidates(known) {
    const triangles = known.map((fact) => {
      const match = /^triangle\(([A-Z])([A-Z])([A-Z])\)$/.exec(fact);
      return match ? { fact, vertices: match.slice(1) } : null;
    }).filter(Boolean);
    const equalities = known.map((fact) => ({ fact, equality: parseEquality(fact) }))
      .filter((item) => item.equality && item.equality.left.startsWith("angle(") && item.equality.right.startsWith("angle("));
    const results = [];
    for (const triangle of triangles) {
      if (new Set(triangle.vertices).size !== 3) continue;
      for (const item of equalities) {
        const left = parseAngle(item.equality.left);
        const right = parseAngle(item.equality.right);
        if (!left || !right) continue;
        const leftVertices = [left.first, left.vertex, left.last];
        const rightVertices = [right.first, right.vertex, right.last];
        if (new Set(leftVertices).size !== 3 || new Set(rightVertices).size !== 3) continue;
        if (!triangle.vertices.every((point) => leftVertices.includes(point) && rightVertices.includes(point))) continue;
        if (left.vertex === right.vertex) continue;
        const leftSide = "side(" + leftVertices.filter((point) => point !== left.vertex).sort().join("") + ")";
        const rightSide = "side(" + rightVertices.filter((point) => point !== right.vertex).sort().join("") + ")";
        if (leftSide === rightSide) continue;
        results.push({
          id: "triangle.equal-angles-imply-equal-sides",
          name: "等しい角に対する辺は等しい",
          premises: [triangle.fact, item.fact],
          conclusion: [leftSide, rightSide].sort().join("="),
          explain: "三角形で等しい角に対する辺は等しい。",
          category: "triangle"
        });
      }
    }
    return results;
  }

  // rayInsideAngle(O,A,B,C) states that ray OB lies inside angle AOC.
  function angleAdditionCandidates(known) {
    const results = [];
    for (const fact of known) {
      const match = /^rayInsideAngle\(([A-Z]),([A-Z]),([A-Z]),([A-Z])\)$/.exec(fact);
      if (!match) continue;
      const [, o, a, b, c] = match;
      if (new Set([o, a, b, c]).size !== 4) continue;
      results.push({
        id: "angle.addition",
        name: "角の加法",
        premises: [fact],
        conclusion: "angle(" + a + o + c + ")=angle(" + a + o + b + ")+angle(" + b + o + c + ")",
        explain: "大きな角は、内部にある半直線で分けた角の和に等しい。",
        category: "angle"
      });
    }
    return results;
  }

  // between(A,B,C) states that B lies between A and C on one straight line.
  function segmentAdditionCandidates(known) {
    const results = [];
    for (const fact of known) {
      const match = /^between\(([A-Z]),([A-Z]),([A-Z])\)$/.exec(fact);
      if (!match) continue;
      const [, a, b, c] = match;
      if (new Set([a, b, c]).size !== 3) continue;
      results.push({
        id: "segment.addition",
        name: "線分の加法",
        premises: [fact],
        conclusion: "side(" + a + c + ")=side(" + a + b + ")+side(" + b + c + ")",
        explain: "Bが線分AC上にあるとき、AC=AB+BCである。",
        category: "segment"
      });
    }
    return results;
  }

  // Substitute equal angles/segments into a previously derived addition equality.
  // Supported forms are measure = measure + measure; no numerical algebra is assumed.
  function additionSubstitutionCandidates(known) {
    const results = [];
    const additionPattern = /^(angle\([A-Z]{3}\)|side\([A-Z]{2}\))=(angle\([A-Z]{3}\)|side\([A-Z]{2}\))\+(angle\([A-Z]{3}\)|side\([A-Z]{2}\))$/;
    const equalities = known.map((fact) => ({ fact, equality: parseEquality(fact) }))
      .filter((item) => item.equality);
    for (const fact of known) {
      const match = additionPattern.exec(fact);
      if (!match) continue;
      const [, whole, first, second] = match;
      const parts = [first, second];
      for (const equality of equalities) {
        const left = equality.equality.left;
        const right = equality.equality.right;
        const alternatives = [[left, right], [right, left]];
        for (let index = 0; index < parts.length; index++) {
          for (const [from, to] of alternatives) {
            if (parts[index] !== from) continue;
            const replaced = [...parts];
            replaced[index] = to;
            // Angles cannot be substituted for lengths, and vice versa.
            if (whole.startsWith("angle(") !== replaced.every((part) => part.startsWith("angle("))) continue;
            if (whole.startsWith("side(") !== replaced.every((part) => part.startsWith("side("))) continue;
            const conclusion = whole + "=" + replaced[0] + "+" + replaced[1];
            if (known.includes(conclusion)) continue;
            results.push({
              id: whole.startsWith("angle(") ? "angle.addition-substitution" : "segment.addition-substitution",
              name: whole.startsWith("angle(") ? "角の加法への等式の代入" : "線分の加法への等式の代入",
              premises: [fact, equality.fact],
              conclusion,
              explain: "すでに等しいと分かっている角（線分）を、加法の式に代入する。",
              category: whole.startsWith("angle(") ? "angle" : "segment"
            });
          }
        }
      }
    }
    return results;
  }

  function parseAdditionEquality(fact) {
    const match = /^(angle\([A-Z]{3}\)|side\([A-Z]{2}\))=(angle\([A-Z]{3}\)|side\([A-Z]{2}\))\+(angle\([A-Z]{3}\)|side\([A-Z]{2}\))$/.exec(fact);
    if (!match) return null;
    const [, whole, first, second] = match;
    const kind = whole.startsWith("angle(") ? "angle" : "side";
    if ([first, second].some((term) => (term.startsWith("angle(") ? "angle" : "side") !== kind)) return null;
    return { fact, whole, parts: [first, second], kind };
  }

  function termsEquivalent(first, second, known) {
    if (first === second) return true;
    const graph = new Map();
    for (const fact of known) {
      const equality = parseEquality(fact);
      if (!equality) continue;
      if (!graph.has(equality.left)) graph.set(equality.left, new Set());
      if (!graph.has(equality.right)) graph.set(equality.right, new Set());
      graph.get(equality.left).add(equality.right);
      graph.get(equality.right).add(equality.left);
    }
    const visited = new Set([first]);
    const queue = [first];
    while (queue.length) {
      const current = queue.shift();
      for (const next of graph.get(current) || []) {
        if (next === second) return true;
        if (!visited.has(next)) { visited.add(next); queue.push(next); }
      }
    }
    return false;
  }

  // Additive equality rules: substitution/congruence and cancellation.
  // Only infer when the equation types agree and at least the required equalities are known.
  function additionAlgebraCandidates(known) {
    const sums = known.map(parseAdditionEquality).filter(Boolean);
    const results = [];
    const seen = new Set();
    function add(id, name, premises, conclusion, kind, explain) {
      if (known.includes(conclusion) || seen.has(conclusion)) return;
      seen.add(conclusion);
      results.push({ id, name, premises: [...new Set(premises)], conclusion, category: kind, explain });
    }
    for (let i = 0; i < sums.length; i++) {
      for (let j = i + 1; j < sums.length; j++) {
        const a = sums[i], b = sums[j];
        if (a.kind !== b.kind) continue;
        const wholeEqual = termsEquivalent(a.whole, b.whole, known);
        if (wholeEqual) {
          for (let ai = 0; ai < 2; ai++) for (let bi = 0; bi < 2; bi++) {
            if (!termsEquivalent(a.parts[ai], b.parts[bi], known)) continue;
            const left = a.parts[1-ai], right = b.parts[1-bi];
            if (left === right) continue;
            add(a.kind === "angle" ? "angle.addition-cancellation" : "segment.addition-cancellation",
              a.kind === "angle" ? "角の加法の逆（消去）" : "線分の加法の逆（消去）",
              [a.fact,b.fact,...known.filter(f => { const e=parseEquality(f); return e && ((e.left===a.whole&&e.right===b.whole)||(e.left===b.whole&&e.right===a.whole)||(e.left===a.parts[ai]&&e.right===b.parts[bi])||(e.left===b.parts[bi]&&e.right===a.parts[ai])); })],
              left+"="+right,a.kind,"等しい和から、対応して等しい項を取り除くと残りの項も等しい。");
          }
        }
        // Equal corresponding parts imply equal sums.
        for (const swapped of [false,true]) {
          const bParts = swapped ? [b.parts[1],b.parts[0]] : b.parts;
          if (termsEquivalent(a.parts[0],bParts[0],known) && termsEquivalent(a.parts[1],bParts[1],known) && !termsEquivalent(a.whole,b.whole,known)) {
            const premises=[a.fact,b.fact,...known.filter(f=>{const e=parseEquality(f);return e && [a.parts[0],a.parts[1],bParts[0],bParts[1]].some(x=>e.left===x||e.right===x);})];
            add(a.kind==="angle"?"angle.addition-congruence":"segment.addition-congruence",
              a.kind==="angle"?"角の加法（等しい項の和）":"線分の加法（等しい項の和）",
              premises,a.whole+"="+b.whole,a.kind,"それぞれ等しい項どうしの和は等しい。");
          }
        }
      }
    }
    return results;
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
        const equalRadius = equalRadiusCandidates(known).find((rule) => !known.includes(rule.conclusion));
        if (equalRadius) {
          const step = {
            index: steps.length + 1,
            ruleId: equalRadius.id,
            ruleName: equalRadius.name,
            premises: [...equalRadius.premises],
            premiseSources: equalRadius.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: equalRadius.conclusion,
            explanation: equalRadius.explain,
            category: equalRadius.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) {
            return { success: true, goal, facts: known, steps, reason: "proved" };
          }
        }

        const verticalAngles = verticalAngleCandidates(known).find((rule) => !known.includes(rule.conclusion));
        if (verticalAngles) {
          const step = {
            index: steps.length + 1,
            ruleId: verticalAngles.id,
            ruleName: verticalAngles.name,
            premises: [...verticalAngles.premises],
            premiseSources: verticalAngles.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: verticalAngles.conclusion,
            explanation: verticalAngles.explain,
            category: verticalAngles.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) {
            return { success: true, goal, facts: known, steps, reason: "proved" };
          }
        }

        const isoscelesCandidates = isoscelesBaseAngleCandidates(known);
        const isosceles = isoscelesCandidates.find((rule) => sameAngleEquality(rule.conclusion, goal)) || isoscelesCandidates.find((rule) => !known.includes(rule.conclusion));
        if (isosceles) {
          const step = {
            index: steps.length + 1, ruleId: isosceles.id, ruleName: isosceles.name,
            premises: [...isosceles.premises],
            premiseSources: isosceles.premises.map((premise) => ({ fact: premise, ...(sourceByFact.get(premise) || { type: "unknown" }) })),
            conclusion: sameAngleEquality(isosceles.conclusion, goal) ? goal : isosceles.conclusion, explanation: isosceles.explain, category: isosceles.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step); changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: "proved" };
        }

        const equalSideCandidates = equalAnglesImplyEqualSidesCandidates(known);
        const equalSides = equalSideCandidates.find((rule) => sameSideEquality(rule.conclusion, goal) && !known.includes(goal)) ||
          equalSideCandidates.find((rule) => !known.includes(rule.conclusion));
        if (equalSides) {
          const step = {
            index: steps.length + 1,
            ruleId: equalSides.id,
            ruleName: equalSides.name,
            premises: [...equalSides.premises],
            premiseSources: equalSides.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: sameSideEquality(equalSides.conclusion, goal) ? goal : equalSides.conclusion,
            explanation: equalSides.explain,
            category: equalSides.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) {
            return { success: true, goal, facts: known, steps, reason: "proved" };
          }
        }

        const angleAddition = angleAdditionCandidates(known).find((rule) => !known.includes(rule.conclusion));
        if (angleAddition) {
          const step = {
            index: steps.length + 1,
            ruleId: angleAddition.id,
            ruleName: angleAddition.name,
            premises: [...angleAddition.premises],
            premiseSources: angleAddition.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: angleAddition.conclusion,
            explanation: angleAddition.explain,
            category: angleAddition.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) {
            return { success: true, goal, facts: known, steps, reason: "proved" };
          }
        }

        const segmentAddition = segmentAdditionCandidates(known).find((rule) => !known.includes(rule.conclusion));
        if (segmentAddition) {
          const step = {
            index: steps.length + 1,
            ruleId: segmentAddition.id,
            ruleName: segmentAddition.name,
            premises: [...segmentAddition.premises],
            premiseSources: segmentAddition.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: segmentAddition.conclusion,
            explanation: segmentAddition.explain,
            category: segmentAddition.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) {
            return { success: true, goal, facts: known, steps, reason: "proved" };
          }
        }

        const exteriorAngle = exteriorAngleCandidates(known).find((rule) => !known.includes(rule.conclusion));
        if (exteriorAngle) {
          const step = {
            index: steps.length + 1,
            ruleId: exteriorAngle.id,
            ruleName: exteriorAngle.name,
            premises: [...exteriorAngle.premises],
            premiseSources: exteriorAngle.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: exteriorAngle.conclusion,
            explanation: exteriorAngle.explain,
            category: exteriorAngle.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) {
            return { success: true, goal, facts: known, steps, reason: "proved" };
          }
        }

        const congruenceSAS = triangleCongruenceSASCandidates(known).find((rule) => rule.conclusion === goal && !known.includes(rule.conclusion));
        if (congruenceSAS) {
          const step = { index: steps.length + 1, ruleId: congruenceSAS.id, ruleName: congruenceSAS.name,
            premises: [...congruenceSAS.premises],
            premiseSources: congruenceSAS.premises.map((premise) => ({ fact: premise, ...(sourceByFact.get(premise) || { type: "unknown" }) })),
            conclusion: congruenceSAS.conclusion, explanation: congruenceSAS.explain, category: congruenceSAS.category };
          known.push(step.conclusion); sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step); changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: "proved" };
        }

        const congruenceASA = triangleCongruenceASACandidates(known).find((rule) => rule.conclusion === goal && !known.includes(rule.conclusion));
        if (congruenceASA) {
          const step = { index: steps.length + 1, ruleId: congruenceASA.id, ruleName: congruenceASA.name,
            premises: [...congruenceASA.premises],
            premiseSources: congruenceASA.premises.map((premise) => ({ fact: premise, ...(sourceByFact.get(premise) || { type: "unknown" }) })),
            conclusion: congruenceASA.conclusion, explanation: congruenceASA.explain, category: congruenceASA.category };
          known.push(step.conclusion); sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step); changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: "proved" };
        }

        const congruenceSSS = triangleCongruenceSSSCandidates(known).find((rule) => rule.conclusion === goal && !known.includes(rule.conclusion));
        if (congruenceSSS) {
          const step = {
            index: steps.length + 1,
            ruleId: congruenceSSS.id,
            ruleName: congruenceSSS.name,
            premises: [...congruenceSSS.premises],
            premiseSources: congruenceSSS.premises.map((premise) => ({ fact: premise, ...(sourceByFact.get(premise) || { type: "unknown" }) })),
            conclusion: congruenceSSS.conclusion,
            explanation: congruenceSSS.explain,
            category: congruenceSSS.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: "proved" };
        }

        const similarityAA = triangleSimilarityAACandidates(known).find((rule) => rule.conclusion === goal && !known.includes(rule.conclusion));
        if (similarityAA) {
          const step = {
            index: steps.length + 1,
            ruleId: similarityAA.id,
            ruleName: similarityAA.name,
            premises: [...similarityAA.premises],
            premiseSources: similarityAA.premises.map((premise) => ({ fact: premise, ...(sourceByFact.get(premise) || { type: "unknown" }) })),
            conclusion: similarityAA.conclusion,
            explanation: similarityAA.explain,
            category: similarityAA.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: "proved" };
        }

        const angleSum = triangleAngleSumCandidates(known).find((rule) => rule.conclusion === goal && !known.includes(rule.conclusion));
        if (angleSum) {
          const step = {
            index: steps.length + 1,
            ruleId: angleSum.id,
            ruleName: angleSum.name,
            premises: [...angleSum.premises],
            premiseSources: angleSum.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: angleSum.conclusion,
            explanation: angleSum.explain,
            category: angleSum.category
          };
          known.push(step.conclusion);
          sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step);
          changed = true;
          if (step.conclusion === goal) {
            return { success: true, goal, facts: known, steps, reason: "proved" };
          }
        }

        const congruence = known.find((fact) => /^congruent\([A-Z]{3},[A-Z]{3}\)$/.test(fact));
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
        const sameAngle = findSameAngleNotation(known, goal);
        if (sameAngle) {
          const step = {
            index: steps.length + 1,
            ruleId: "same-angle-ray-notation",
            ruleName: "同じ半直線による角の表記",
            premises: sameAngle.premises,
            premiseSources: sameAngle.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "given" })
            })),
            conclusion: sameAngle.conclusion,
            explanation: "頂点が同じで、角をつくる2本の半直線がそれぞれ同じなので、同じ角を表している。",
            category: "angle"
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

      if (steps.length < maxSteps) {
        const parallelCandidates = parallelAngleCandidates(known);
        const parallelAngle = parallelCandidates.find((rule) => sameAngleEquality(rule.conclusion, goal) && !known.includes(rule.conclusion)) ||
          parallelCandidates.find((rule) => !known.includes(rule.conclusion));
        if (parallelAngle) {
          const conclusion = sameAngleEquality(parallelAngle.conclusion, goal) ? goal : parallelAngle.conclusion;
          const step = { index: steps.length + 1, ruleId: parallelAngle.id, ruleName: parallelAngle.name,
            premises: [...parallelAngle.premises],
            premiseSources: parallelAngle.premises.map((p) => ({ fact: p, ...(sourceByFact.get(p) || { type: "unknown" }) })),
            conclusion, explanation: parallelAngle.explain, category: parallelAngle.category };
          known.push(step.conclusion); sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step); changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: "proved" };
        }
        const diameterAngle = diameterInscribedAngleCandidates(known).find((rule) => rule.conclusion === goal && !known.includes(rule.conclusion));
        if (diameterAngle) {
          const step = { index: steps.length + 1, ruleId: diameterAngle.id, ruleName: diameterAngle.name,
            premises: [...diameterAngle.premises],
            premiseSources: diameterAngle.premises.map((p) => ({ fact: p, ...(sourceByFact.get(p) || { type: "unknown" }) })),
            conclusion: diameterAngle.conclusion, explanation: diameterAngle.explain, category: diameterAngle.category };
          known.push(step.conclusion); sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step); changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: "proved" };
        }
        const sameRayCandidatesNow = sameRayAngleCandidates(known);
        const sameRayAngle = sameRayCandidatesNow.find((rule) => sameAngleEquality(rule.conclusion, goal) && !known.includes(goal)) ||
          sameRayCandidatesNow.find((rule) => !known.includes(rule.conclusion));
        if (sameRayAngle) {
          const step = { index: steps.length + 1, ruleId: sameRayAngle.id, ruleName: sameRayAngle.name,
            premises: [...sameRayAngle.premises],
            premiseSources: sameRayAngle.premises.map((p) => ({ fact: p, ...(sourceByFact.get(p) || { type: 'unknown' }) })),
            conclusion: sameAngleEquality(sameRayAngle.conclusion, goal) ? goal : sameRayAngle.conclusion,
            explanation: sameRayAngle.explain, category: 'angle' };
          known.push(step.conclusion); sourceByFact.set(step.conclusion, { type: 'step', index: step.index });
          steps.push(step); changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: 'proved' };
        }
        const sameSegmentCandidatesNow = sameSegmentAngleCandidates(known);
        const sameSegmentAngle = sameSegmentCandidatesNow.find((rule) => sameAngleEquality(rule.conclusion, goal) && !known.includes(goal)) ||
          sameSegmentCandidatesNow.find((rule) => !known.includes(rule.conclusion));
        if (sameSegmentAngle) {
          const step = { index: steps.length + 1, ruleId: sameSegmentAngle.id, ruleName: sameSegmentAngle.name,
            premises: [...sameSegmentAngle.premises],
            premiseSources: sameSegmentAngle.premises.map((p) => ({ fact: p, ...(sourceByFact.get(p) || { type: 'unknown' }) })),
            conclusion: sameAngleEquality(sameSegmentAngle.conclusion, goal) ? goal : sameSegmentAngle.conclusion,
            explanation: sameSegmentAngle.explain, category: 'circle' };
          known.push(step.conclusion); sourceByFact.set(step.conclusion, { type: 'step', index: step.index });
          steps.push(step); changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: 'proved' };
        }
        const circleCandidatesNow = circleCandidates(known);
        // Prefer the requested conclusion, but also retain intermediate circle facts
        // so a later equality-transitivity step can use them.
        const circle = circleCandidatesNow.find((rule) => rule.conclusion === goal && !known.includes(rule.conclusion)) ||
          circleCandidatesNow.find((rule) => !known.includes(rule.conclusion));
        if (circle) {
          const step = { index: steps.length+1, ruleId: circle.id, ruleName: circle.name, premises: circle.premises,
            premiseSources: circle.premises.map(p => ({fact:p, ...(sourceByFact.get(p)||{type:"unknown"})})),
            conclusion: circle.conclusion, explanation: circle.explain, category:"circle" };
          known.push(step.conclusion); sourceByFact.set(step.conclusion,{type:"step",index:step.index}); steps.push(step); changed=true;
          if(step.conclusion===goal) return {success:true,goal,facts:known,steps,reason:"proved"};
        }
        const transitive = findTransitiveEquality(known, goal);
        if (transitive) {
          const step = {
            index: steps.length + 1,
            ruleId: "logic.equality-transitivity",
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

        const algebraCandidates = additionAlgebraCandidates(known);
        const algebra = algebraCandidates.find((rule) => rule.conclusion === goal) ||
          algebraCandidates.find((rule) => !known.includes(rule.conclusion));
        if (algebra && steps.length < maxSteps) {
          const step = {
            index: steps.length + 1, ruleId: algebra.id, ruleName: algebra.name,
            premises: [...algebra.premises],
            premiseSources: algebra.premises.map((premise) => ({ fact: premise, ...(sourceByFact.get(premise) || { type: "unknown" }) })),
            conclusion: algebra.conclusion, explanation: algebra.explain, category: algebra.category
          };
          known.push(step.conclusion); sourceByFact.set(step.conclusion, { type: "step", index: step.index });
          steps.push(step); changed = true;
          if (step.conclusion === goal) return { success: true, goal, facts: known, steps, reason: "proved" };
        }

        const substitution = additionSubstitutionCandidates(known).find((rule) => rule.conclusion === goal) ||
          additionSubstitutionCandidates(known).find((rule) => !known.includes(rule.conclusion));
        if (substitution && steps.length < maxSteps) {
          const step = {
            index: steps.length + 1,
            ruleId: substitution.id,
            ruleName: substitution.name,
            premises: [...substitution.premises],
            premiseSources: substitution.premises.map((premise) => ({
              fact: premise,
              ...(sourceByFact.get(premise) || { type: "unknown" })
            })),
            conclusion: substitution.conclusion,
            explanation: substitution.explain,
            category: substitution.category
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

  // The canonical catalog is loaded before this file in the browser.
  // Keep a graceful fallback for isolated/legacy consumers, but when present,
  // the catalog is the source of truth for theorem names and explanations.
  function getTheorem(id) {
    return root.TheoremCatalog && typeof root.TheoremCatalog.get === "function"
      ? root.TheoremCatalog.get(id)
      : null;
  }

  function catalogStatus(ids) {
    const catalog = root.TheoremCatalog;
    const requested = Array.from(new Set(ids || []));
    if (!catalog || typeof catalog.get !== "function") {
      return { available: false, checked: 0, missing: requested };
    }
    return {
      available: true,
      checked: requested.length,
      missing: requested.filter((id) => !catalog.get(id))
    };
  }

  function applyCatalogMetadata(rule) {
    const entry = getTheorem(rule.ruleId || rule.id);
    if (!entry) return rule;
    return {
      ...rule,
      ruleName: entry.name,
      name: entry.name,
      explanation: entry.reason,
      explain: entry.reason
    };
  }

  const api = Object.freeze({
    list: () => rules.map((rule) => ({ ...rule, premises: [...rule.premises] })),
    derive: (facts) => derive(facts).map(applyCatalogMetadata),
    prove: (facts, goal, maxSteps = 100) => {
      const result = prove(facts, goal, maxSteps);
      return {
        ...result,
        steps: result.steps.map((step) => applyCatalogMetadata(step))
      };
    },
    hasAllPremises,
    getTheorem,
    catalogStatus
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.ProofRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
