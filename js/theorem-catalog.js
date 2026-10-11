/**
 * Structured theorem catalog — initial executable schema.
 *
 * This file is intentionally separate from proof-rules.js while the new
 * data model is being established. Facts are typed objects, not geometry
 * claims inferred from a drawing. A rule may fire only when its premises
 * match facts already supplied or derived by another rule.
 *
 * This is an initial subset, not yet the complete catalog of all numbered
 * properties in the source materials.
 */
(function (root) {
  "use strict";

  const rules = [
    {
      id: "triangle.isosceles-base-angles",
      name: "二等辺三角形の底角",
      subject: "triangle",
      premises: [
        { type: "triangle", vertices: ["A", "B", "C"] },
        { type: "equal-segments", segments: [["A", "B"], ["A", "C"]] }
      ],
      conclusions: [
        { type: "equal-angles", angles: [["A", "B", "C"], ["B", "C", "A"]] }
      ],
      reason: "二等辺三角形の底角は等しい。",
      level: "initial",
      testCases: {
        positive: "三角形ABCとAB=ACから∠ABC=∠BCAを導ける",
        negative: "等しい2辺が対象三角形の辺でなければ導けない"
      }
    },
    {
      id: "triangle.equal-angles-imply-equal-sides",
      name: "等しい角に対する辺は等しい",
      subject: "triangle",
      premises: [
        { type: "triangle", vertices: ["A", "B", "C"] },
        { type: "equal-angles", angles: [["A", "B", "C"], ["B", "C", "A"]] }
      ],
      conclusions: [
        { type: "equal-segments", segments: [["A", "C"], ["A", "B"]] }
      ],
      reason: "三角形で等しい角に対する辺は等しい。",
      level: "initial",
      testCases: {
        positive: "三角形ABCで∠ABC=∠BCAならAB=ACを導ける",
        negative: "対象三角形の内角でない角の等しさでは導けない"
      }
    },
    {
      id: "angle.vertical-angles",
      name: "対頂角",
      subject: "angle",
      premises: [
        { type: "intersecting-lines", lines: ["l", "m"], point: "O" },
        { type: "vertical-angle-pair", angles: [["A", "O", "B"], ["C", "O", "D"]] }
      ],
      conclusions: [
        { type: "equal-angles", angles: [["A", "O", "B"], ["C", "O", "D"]] }
      ],
      reason: "対頂角は等しい。",
      level: "initial",
      testCases: {
        positive: "2直線の交点で対頂角の位置にある角は等しい",
        negative: "同じ頂点の角でも隣り合う角を対頂角として扱わない"
      }
    },
    {
      id: "triangle.angle-sum",
      name: "三角形の内角の和",
      subject: "triangle",
      premises: [
        { type: "triangle", vertices: ["A", "B", "C"] }
      ],
      conclusions: [
        { type: "angle-sum", angles: [["B", "A", "C"], ["A", "B", "C"], ["B", "C", "A"]], degrees: 180 }
      ],
      reason: "三角形の内角の和は180°である。",
      level: "initial",
      testCases: {
        positive: "三角形ABCの3内角の和を180°とできる",
        negative: "三角形の外角を内角の和に含めない"
      }
    },
    {
      id: "circle.diameter-inscribed-angle",
      name: "直径に対する円周角",
      subject: "circle",
      premises: [
        { type: "circle-point", circle: "O", point: "A" },
        { type: "circle-point", circle: "O", point: "B" },
        { type: "circle-point", circle: "O", point: "C" },
        { type: "diameter", circle: "O", endpoints: ["B", "C"] }
      ],
      conclusions: [
        { type: "angle-measure", angle: ["B", "A", "C"], degrees: 90 }
      ],
      reason: "直径に対する円周角は90°である。",
      level: "initial",
      testCases: {
        positive: "Aが円O上にありBCが直径なら∠BAC=90°",
        negative: "角の頂点が円周上にあることや直径の端点が不明なら導けない"
      }
    },
    {
      id: "circle.equal-radii",
      name: "同じ円の半径は等しい",
      subject: "circle",
      premises: [
        { type: "circle-center", circle: "O", point: "O" },
        { type: "circle-point", circle: "O", point: "A" },
        { type: "circle-point", circle: "O", point: "B" }
      ],
      conclusions: [
        { type: "equal-segments", segments: [["O", "A"], ["O", "B"]] }
      ],
      reason: "同じ円の半径は等しい。",
      level: "initial",
      testCases: {
        positive: "A,Bが同じ円O上ならOA=OB",
        negative: "別々の円の半径を理由なく等しいとしない"
      }
    },
    {
      id: "triangle.similarity-aa",
      name: "三角形の相似条件（2組の角）",
      subject: "similarity",
      premises: [
        { type: "triangle", vertices: ["A", "B", "C"] },
        { type: "triangle", vertices: ["D", "E", "F"] },
        { type: "equal-angles", angles: [["B", "A", "C"], ["E", "D", "F"]] },
        { type: "equal-angles", angles: [["A", "B", "C"], ["D", "E", "F"]] }
      ],
      conclusions: [
        { type: "similar-triangles", triangles: [["A", "B", "C"], ["D", "E", "F"]], correspondence: [["A", "D"], ["B", "E"], ["C", "F"]] }
      ],
      reason: "2組の角がそれぞれ等しい2つの三角形は相似である。",
      level: "initial",
      testCases: {
        positive: "対応する2組の角が等しい三角形は相似",
        negative: "頂点の対応が矛盾する角の組み合わせでは相似を導かない"
      }
    },
    {
      id: "triangle.congruence-sss",
      name: "三角形の合同条件（3組の辺）",
      subject: "congruence",
      premises: [
        { type: "triangle", vertices: ["A", "B", "C"] },
        { type: "triangle", vertices: ["D", "E", "F"] },
        { type: "equal-segments", segments: [["A", "B"], ["D", "E"]] },
        { type: "equal-segments", segments: [["B", "C"], ["E", "F"]] },
        { type: "equal-segments", segments: [["C", "A"], ["F", "D"]] }
      ],
      conclusions: [
        { type: "congruent-triangles", triangles: [["A", "B", "C"], ["D", "E", "F"]], correspondence: [["A", "D"], ["B", "E"], ["C", "F"]] }
      ],
      reason: "3組の辺がそれぞれ等しい2つの三角形は合同である。",
      level: "initial",
      testCases: {
        positive: "対応する3組の辺が等しいとき合同",
        negative: "辺の対応を取り違えた場合は合同と判定しない"
      }
    },
    {
      id: "triangle.congruence-sas",
      name: "三角形の合同条件（2組の辺とその間の角）",
      subject: "congruence",
      premises: [
        { type: "triangle", vertices: ["A", "B", "C"] },
        { type: "triangle", vertices: ["D", "E", "F"] },
        { type: "equal-segments", segments: [["A", "B"], ["D", "E"]] },
        { type: "equal-angles", angles: [["B", "A", "C"], ["E", "D", "F"]] },
        { type: "equal-segments", segments: [["A", "C"], ["D", "F"]] }
      ],
      conclusions: [
        { type: "congruent-triangles", triangles: [["A", "B", "C"], ["D", "E", "F"]], correspondence: [["A", "D"], ["B", "E"], ["C", "F"]] }
      ],
      reason: "2組の辺とその間の角がそれぞれ等しい2つの三角形は合同である。",
      level: "initial",
      testCases: {
        positive: "対応する2辺とその間の角が等しいとき合同",
        negative: "2辺とその間ではない角だけではこの条件を適用しない"
      }
    },
    {
      id: "triangle.congruence-asa",
      name: "三角形の合同条件（1組の辺とその両端の角）",
      subject: "congruence",
      premises: [
        { type: "triangle", vertices: ["A", "B", "C"] },
        { type: "triangle", vertices: ["D", "E", "F"] },
        { type: "equal-angles", angles: [["B", "A", "C"], ["E", "D", "F"]] },
        { type: "equal-segments", segments: [["A", "B"], ["D", "E"]] },
        { type: "equal-angles", angles: [["A", "B", "C"], ["D", "E", "F"]] }
      ],
      conclusions: [
        { type: "congruent-triangles", triangles: [["A", "B", "C"], ["D", "E", "F"]], correspondence: [["A", "D"], ["B", "E"], ["C", "F"]] }
      ],
      reason: "1組の辺とその両端の角がそれぞれ等しい2つの三角形は合同である。",
      level: "initial",
      testCases: {
        positive: "1辺とその両端の2角が対応して等しいとき合同",
        negative: "等しい辺の両端でない角を使ってASAと判定しない"
      }
    },
    {
      id: "parallel.alternate-interior-angles",
      name: "平行線の錯角",
      subject: "parallel",
      premises: [
        { type: "parallel-lines", lines: ["l", "m"] },
        { type: "transversal-intersects-lines", transversal: "t", lines: ["l", "m"] },
        { type: "angle-position", relation: "alternate-interior", angles: ["angle1", "angle2"], transversal: "t", lines: ["l", "m"] }
      ],
      conclusions: [{ type: "equal-angle-symbols", angles: ["angle1", "angle2"] }],
      reason: "平行な2直線に1本の直線が交わると、錯角は等しい。",
      level: "initial",
      testCases: { positive: "平行条件と錯角の位置がそろえば角が等しい", negative: "平行条件または錯角の位置が不明なら導けない" }
    },
    {
      id: "parallel.corresponding-angles",
      name: "平行線の同位角",
      subject: "parallel",
      premises: [
        { type: "parallel-lines", lines: ["l", "m"] },
        { type: "transversal-intersects-lines", transversal: "t", lines: ["l", "m"] },
        { type: "angle-position", relation: "corresponding", angles: ["angle1", "angle2"], transversal: "t", lines: ["l", "m"] }
      ],
      conclusions: [{ type: "equal-angle-symbols", angles: ["angle1", "angle2"] }],
      reason: "平行な2直線に1本の直線が交わると、同位角は等しい。",
      level: "initial",
      testCases: { positive: "平行条件と同位角の位置がそろえば角が等しい", negative: "角の位置が同位角でなければ導けない" }
    },
    {
      id: "triangle.exterior-angle",
      name: "三角形の外角定理",
      subject: "triangle",
      premises: [
        { type: "triangle", vertices: ["A", "B", "C"] },
        { type: "side-extension", side: ["B", "C"], through: "C", extensionPoint: "D" }
      ],
      conclusions: [{ type: "angle-sum-equals", leftAngle: ["A", "C", "D"], rightAngles: [["B", "A", "C"], ["A", "B", "C"]] }],
      reason: "三角形の外角は、それと隣り合わない2つの内角の和に等しい。",
      level: "initial",
      testCases: { positive: "正しく指定した外角は離れた2内角の和", negative: "隣接する内角を外角定理の右辺に含めない" }
    },
    {
      id: "angle.addition",
      name: "角の加法",
      subject: "angle",
      premises: [
        { type: "ray-inside-angle", vertex: "O", outerRays: ["OA", "OC"], innerRay: "OB" }
      ],
      conclusions: [{ type: "angle-sum-equals", leftAngle: ["A", "O", "C"], rightAngles: [["A", "O", "B"], ["B", "O", "C"]] }],
      reason: "大きな角は、内部にある半直線で分けた角の和に等しい。",
      level: "initial",
      testCases: { positive: "OBが∠AOCの内部にあれば∠AOC=∠AOB+∠BOC", negative: "半直線が角の内部にあると確認できなければ加法を使わない" }
    },
    {
      id: "segment.addition",
      name: "線分の加法",
      subject: "segment",
      premises: [
        { type: "collinear-point-order", points: ["A", "B", "C"], middle: "B" }
      ],
      conclusions: [{ type: "segment-sum-equals", whole: ["A", "C"], parts: [["A", "B"], ["B", "C"]] }],
      reason: "Bが線分AC上にあるとき、AC=AB+BCである。",
      level: "initial",
      testCases: { positive: "BがAとCの間にあればAC=AB+BC", negative: "点の順序が分からない場合は線分の加法を使わない" }
    },
    {
      id: "angle.addition-substitution",
      name: "角の加法への等式の代入",
      subject: "angle",
      premises: [
        { type: "angle-sum-equals", leftAngle: ["A", "O", "C"], rightAngles: [["A", "O", "B"], ["B", "O", "C"]] },
        { type: "equal-angles", angles: [["A", "O", "B"], ["X", "O", "Y"]] }
      ],
      conclusions: [{ type: "angle-sum-equals", leftAngle: ["A", "O", "C"], rightAngles: [["X", "O", "Y"], ["B", "O", "C"]] }],
      reason: "等しい角は、角の加法で表した和の中で互いに置き換えられる。",
      level: "initial",
      testCases: { positive: "和の一部の角と等しい角が分かっていれば置き換えられる", negative: "等しいと示されていない角を置き換えない" }
    },
    {
      id: "segment.addition-substitution",
      name: "線分の加法への等式の代入",
      subject: "segment",
      premises: [
        { type: "segment-sum-equals", whole: ["A", "C"], parts: [["A", "B"], ["B", "C"]] },
        { type: "equal-segments", segments: [["A", "B"], ["D", "E"]] }
      ],
      conclusions: [{ type: "segment-sum-equals", whole: ["A", "C"], parts: [["D", "E"], ["B", "C"]] }],
      reason: "等しい線分は、線分の加法で表した和の中で互いに置き換えられる。",
      level: "initial",
      testCases: { positive: "和の一部の線分と等しい線分が分かっていれば置き換えられる", negative: "等しいと示されていない線分を置き換えない" }
    },
    {
      id: "angle.addition-cancellation",
      name: "角の加法の逆（消去）",
      subject: "angle",
      premises: [
        { type: "angle-sum-equals", leftAngle: ["A", "O", "C"], rightAngles: [["A", "O", "B"], ["B", "O", "C"]] },
        { type: "angle-sum-equals", leftAngle: ["D", "O", "F"], rightAngles: [["D", "O", "E"], ["B", "O", "C"]] },
        { type: "equal-angles", angles: [["A", "O", "C"], ["D", "O", "F"]] }
      ],
      conclusions: [{ type: "equal-angles", angles: [["A", "O", "B"], ["D", "O", "E"]] }],
      reason: "等しい角の和から共通する角を取り除くと、残りの角も等しい。",
      level: "initial",
      testCases: { positive: "等しい全体の角と共通する一部分の角があれば残りも等しい", negative: "全体の角が等しいと分からない場合は残りの角を等しいとしない" }
    },
    {
      id: "segment.addition-cancellation",
      name: "線分の加法の逆（消去）",
      subject: "segment",
      premises: [
        { type: "segment-sum-equals", whole: ["A", "C"], parts: [["A", "B"], ["B", "C"]] },
        { type: "segment-sum-equals", whole: ["D", "F"], parts: [["D", "E"], ["B", "C"]] },
        { type: "equal-segments", segments: [["A", "C"], ["D", "F"]] }
      ],
      conclusions: [{ type: "equal-segments", segments: [["A", "B"], ["D", "E"]] }],
      reason: "等しい線分の和から共通する線分を取り除くと、残りの線分も等しい。",
      level: "initial",
      testCases: { positive: "等しい全体の線分と共通する一部分の線分があれば残りも等しい", negative: "全体の線分が等しいと分からない場合は残りの線分を等しいとしない" }
    },
    {
      id: "angle.addition-congruence",
      name: "角の加法（等しい項の和）",
      subject: "angle",
      premises: [
        { type: "angle-sum-equals", leftAngle: ["A", "O", "C"], rightAngles: [["A", "O", "B"], ["B", "O", "C"]] },
        { type: "angle-sum-equals", leftAngle: ["D", "O", "F"], rightAngles: [["D", "O", "E"], ["E", "O", "F"]] },
        { type: "equal-angles", angles: [["A", "O", "B"], ["D", "O", "E"]] },
        { type: "equal-angles", angles: [["B", "O", "C"], ["E", "O", "F"]] }
      ],
      conclusions: [{ type: "equal-angles", angles: [["A", "O", "C"], ["D", "O", "F"]] }],
      reason: "それぞれ等しい角どうしの和は等しい。",
      level: "initial",
      testCases: { positive: "対応する2組の角がそれぞれ等しければ全体の角も等しい", negative: "対応する角の等しさが不足している場合は全体を等しいとしない" }
    },
    {
      id: "segment.addition-congruence",
      name: "線分の加法（等しい項の和）",
      subject: "segment",
      premises: [
        { type: "segment-sum-equals", whole: ["A", "C"], parts: [["A", "B"], ["B", "C"]] },
        { type: "segment-sum-equals", whole: ["D", "F"], parts: [["D", "E"], ["E", "F"]] },
        { type: "equal-segments", segments: [["A", "B"], ["D", "E"]] },
        { type: "equal-segments", segments: [["B", "C"], ["E", "F"]] }
      ],
      conclusions: [{ type: "equal-segments", segments: [["A", "C"], ["D", "F"]] }],
      reason: "それぞれ等しい線分どうしの和は等しい。",
      level: "initial",
      testCases: { positive: "対応する2組の線分がそれぞれ等しければ全体の線分も等しい", negative: "対応する線分の等しさが不足している場合は全体を等しいとしない" }
    },
    {
      id: "logic.equality-transitivity",
      name: "等式の推移",
      subject: "logic",
      premises: [
        { type: "equal-quantities", left: "X", right: "Y", quantityKind: "same" },
        { type: "equal-quantities", left: "Y", right: "Z", quantityKind: "same" }
      ],
      conclusions: [{ type: "equal-quantities", left: "X", right: "Z", quantityKind: "same" }],
      reason: "同じ種類の量について、X=Y、Y=ZならX=Zである。",
      level: "initial",
      testCases: { positive: "等しい角や等しい長さをつなげて結論を導ける", negative: "角度と長さなど異なる種類の量はつながない" }
    },
    {
      id: "circle.inscribed-angles-same-arc",
      name: "同じ弧に対する円周角",
      subject: "circle",
      premises: [
        { type: "circle-point", circle: "O", point: "A" },
        { type: "inscribed-angle", circle: "O", angle: ["A", "C", "B"], interceptedArc: ["A", "B"] },
        { type: "inscribed-angle", circle: "O", angle: ["A", "D", "B"], interceptedArc: ["A", "B"] }
      ],
      conclusions: [{ type: "equal-angles", angles: [["A", "C", "B"], ["A", "D", "B"]] }],
      reason: "同じ弧に対する円周角は等しい。",
      level: "initial",
      testCases: { positive: "同じ円の同じ弧に対する2つの円周角は等しい", negative: "円または対応する弧が異なる場合は導けない" }
    },
    {
      id: "circle.equal-arcs-inscribed-angles",
      name: "等しい弧に対する円周角",
      subject: "circle",
      premises: [
        { type: "equal-arcs", circle: "O", arcs: [["A", "B"], ["C", "D"]] },
        { type: "inscribed-angle", circle: "O", angle: ["A", "E", "B"], interceptedArc: ["A", "B"] },
        { type: "inscribed-angle", circle: "O", angle: ["C", "F", "D"], interceptedArc: ["C", "D"] }
      ],
      conclusions: [{ type: "equal-angles", angles: [["A", "E", "B"], ["C", "F", "D"]] }],
      reason: "同じ円の等しい弧に対する円周角は等しい。",
      level: "initial",
      testCases: { positive: "同じ円の等しい弧に対する円周角は等しい", negative: "等しい弧の条件がなければ導けない" }
    },
    {
      id: "circle.central-inscribed-angle",
      name: "中心角と円周角の関係",
      subject: "circle",
      premises: [
        { type: "central-angle", circle: "O", angle: ["A", "O", "B"], interceptedArc: ["A", "B"] },
        { type: "inscribed-angle", circle: "O", angle: ["A", "C", "B"], interceptedArc: ["A", "B"] }
      ],
      conclusions: [{ type: "angle-measure-ratio", largerAngle: ["A", "O", "B"], smallerAngle: ["A", "C", "B"], ratio: 2 }],
      reason: "同じ弧に対する中心角は円周角の2倍である。",
      level: "initial",
      testCases: { positive: "同じ円の同じ弧に対する中心角と円周角には2倍の関係がある", negative: "対応する弧が違う場合は2倍の関係を導かない" }
    },

  ];

  const ruleIds = new Set();
  for (const rule of rules) {
    if (ruleIds.has(rule.id)) throw new Error("Duplicate theorem rule id: " + rule.id);
    ruleIds.add(rule.id);
    if (!rule.premises.length || !rule.conclusions.length) {
      throw new Error("Every theorem rule needs premises and conclusions: " + rule.id);
    }
    if (!rule.testCases || !rule.testCases.positive || !rule.testCases.negative) {
      throw new Error("Every theorem rule needs positive and negative test descriptions: " + rule.id);
    }
  }

  root.TheoremCatalog = Object.freeze({
    list: () => rules.map(({ id, name, subject, reason, level }) => ({ id, name, subject, reason, level })),
    get: (id) => rules.find((rule) => rule.id === id) || null,
    all: () => rules.map((rule) => ({
      ...rule,
      premises: rule.premises.map((item) => ({ ...item })),
      conclusions: rule.conclusions.map((item) => ({ ...item })),
      testCases: { ...rule.testCases }
    }))
  });

  if (typeof module !== "undefined" && module.exports) module.exports = root.TheoremCatalog;
})(typeof globalThis !== "undefined" ? globalThis : this);
