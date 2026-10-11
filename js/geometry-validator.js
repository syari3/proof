/* Conservative structural checks for proof-problem geometry data.
 * This module checks references and declaration consistency only; it does not
 * claim that a Euclidean realization exists.
 */
(function (root) {
  "use strict";

  const LINE_TYPES = new Set(["line", "parallel-through-point"]);

  function validate(problem) {
    const errors = [];
    const pending = [];
    const issue = (code, path, message) => errors.push({ code, path, message });
    if (!problem || problem.format !== "proof-problem" || problem.version !== 1) {
      return {
        status: "invalid-geometry-data",
        valid: false,
        errors: [{ code: "unsupported-format", path: "", message: "proof-problem version 1 のデータが必要です。" }],
        pending: [],
        note: "構造チェックのみを行い、図形の実在性は証明しません。"
      };
    }

    const geometry = problem.geometry;
    if (!geometry || !Array.isArray(geometry.points) || !Array.isArray(geometry.objects) ||
        !Array.isArray(geometry.constraints) || !Array.isArray(geometry.constructions)) {
      return {
        status: "invalid-geometry-data",
        valid: false,
        errors: [{ code: "missing-geometry-arrays", path: "geometry", message: "points / objects / constraints / constructions の配列が必要です。" }],
        pending: [],
        note: "構造チェックのみを行い、図形の実在性は証明しません。"
      };
    }

    const pointIds = new Set();
    const objectIds = new Set();
    const pointKnown = (id, path) => {
      if (typeof id !== "string" || !pointIds.has(id)) {
        issue("unknown-point", path, "宣言されていない点を参照しています: " + String(id));
        return false;
      }
      return true;
    };
    const objectKnown = (id, path) => {
      if (typeof id !== "string" || !objectIds.has(id)) {
        issue("unknown-object", path, "宣言されていない図形オブジェクトを参照しています: " + String(id));
        return false;
      }
      return true;
    };
    const pointsIn = (value, path) => {
      if (Array.isArray(value)) value.forEach((v, i) => pointsIn(v, path + "[" + i + "]"));
      else if (typeof value === "string") pointKnown(value, path);
      else issue("invalid-point-list", path, "点IDまたは点IDの配列が必要です。");
    };

    geometry.points.forEach((point, i) => {
      const id = point && point.id;
      if (typeof id !== "string" || !id.trim()) issue("invalid-point-id", "geometry.points[" + i + "].id", "点IDが必要です。");
      else if (pointIds.has(id)) issue("duplicate-point-id", "geometry.points[" + i + "].id", "点IDが重複しています: " + id);
      else pointIds.add(id);
    });
    geometry.objects.forEach((object, i) => {
      const id = object && object.id;
      if (typeof id !== "string" || !id.trim()) issue("invalid-object-id", "geometry.objects[" + i + "].id", "オブジェクトIDが必要です。");
      else if (objectIds.has(id)) issue("duplicate-object-id", "geometry.objects[" + i + "].id", "オブジェクトIDが重複しています: " + id);
      else objectIds.add(id);
    });

    const objectById = new Map(geometry.objects.filter((o) => o && typeof o.id === "string").map((o) => [o.id, o]));
    geometry.objects.forEach((object, i) => {
      const path = "geometry.objects[" + i + "]";
      if (!object || typeof object !== "object") return;
      if (object.type === "circle") {
        pointKnown(object.center, path + ".center");
      } else if (object.type === "line") {
        if (!Array.isArray(object.through) || object.through.length < 2) {
          issue("line-needs-two-points", path + ".through", "直線には少なくとも2点の定義が必要です。");
        } else {
          object.through.forEach((id, j) => pointKnown(id, path + ".through[" + j + "]"));
          if (new Set(object.through).size < 2) issue("line-needs-distinct-points", path + ".through", "直線を定義する点は異なる必要があります。");
        }
      } else if (object.type === "parallel-through-point") {
        if (!Array.isArray(object.through) || object.through.length < 1) {
          issue("parallel-line-needs-point", path + ".through", "平行線の通過点が必要です。");
        } else object.through.forEach((id, j) => pointKnown(id, path + ".through[" + j + "]"));
        if (object.parallelTo) {
          const target = objectById.get(object.parallelTo);
          if (!objectKnown(object.parallelTo, path + ".parallelTo")) continue;
          if (!target || !LINE_TYPES.has(target.type)) issue("parallel-target-not-line", path + ".parallelTo", "平行先は直線オブジェクトである必要があります。");
        } else issue("missing-parallel-target", path + ".parallelTo", "平行先の直線が必要です。");
      } else {
        issue("unsupported-object-type", path + ".type", "未対応の図形オブジェクト型です: " + String(object.type));
      }
    });

    const lineObject = (id, path) => {
      if (!objectKnown(id, path)) return;
      const object = objectById.get(id);
      if (!object || !LINE_TYPES.has(object.type)) issue("expected-line-object", path, "直線オブジェクトを参照する必要があります: " + id);
    };

    geometry.constructions.forEach((construction, i) => {
      const path = "geometry.constructions[" + i + "]";
      if (!construction || typeof construction !== "object") {
        issue("invalid-construction", path, "作図定義が不正です。");
        return;
      }
      pointKnown(construction.point, path + ".point");
      if (construction.type !== "intersection") {
        issue("unsupported-construction-type", path + ".type", "未対応の作図型です: " + String(construction.type));
        return;
      }
      if (!Array.isArray(construction.of) || construction.of.length !== 2) {
        issue("intersection-needs-two-objects", path + ".of", "交点は2つの図形オブジェクトで定義してください。");
      } else construction.of.forEach((id, j) => lineObject(id, path + ".of[" + j + "]"));
      pending.push({ code: "intersection-realizability", path, message: "2直線が一致せず、平行でもなく、交点が一意に存在するかは未検証です。" });
    });

    geometry.constraints.forEach((constraint, i) => {
      const path = "geometry.constraints[" + i + "]";
      if (!constraint || typeof constraint !== "object") {
        issue("invalid-constraint", path, "条件定義が不正です。");
        return;
      }
      switch (constraint.type) {
        case "point-on-circle":
          pointKnown(constraint.point, path + ".point"); objectKnown(constraint.circle, path + ".circle");
          if (objectById.has(constraint.circle) && objectById.get(constraint.circle).type !== "circle")
            issue("expected-circle-object", path + ".circle", "円オブジェクトを参照する必要があります。");
          break;
        case "equal-segments":
          if (!Array.isArray(constraint.segments) || constraint.segments.length !== 2 ||
              constraint.segments.some((s) => !Array.isArray(s) || s.length !== 2)) {
            issue("invalid-segment-pair", path + ".segments", "2本の線分を指定してください。");
          } else constraint.segments.forEach((s, j) => s.forEach((id, k) => pointKnown(id, path + ".segments[" + j + "][" + k + "]")));
          break;
        case "between":
          if (!Array.isArray(constraint.points) || constraint.points.length !== 3) issue("invalid-between", path + ".points", "between は一直線上の3点を順に指定します。");
          else pointsIn(constraint.points, path + ".points");
          break;
        case "same-ray": case "opposite-rays":
          pointKnown(constraint.vertex, path + ".vertex");
          if (!Array.isArray(constraint.points) || constraint.points.length !== 2) issue("invalid-ray-points", path + ".points", "半直線を定義する2点が必要です。");
          else pointsIn(constraint.points, path + ".points");
          break;
        case "same-segment": case "opposite-segment":
          if (!Array.isArray(constraint.chord) || constraint.chord.length !== 2 || !Array.isArray(constraint.vertices) || constraint.vertices.length !== 2)
            issue("invalid-segment-side", path, "弦の両端と位置を示す2点が必要です。");
          else { pointsIn(constraint.chord, path + ".chord"); pointsIn(constraint.vertices, path + ".vertices"); }
          break;
        case "ray-inside-angle":
          pointKnown(constraint.vertex, path + ".vertex");
          if (!Array.isArray(constraint.points) || constraint.points.length !== 3) issue("invalid-angle-rays", path + ".points", "角の両側と内側の半直線を指定してください。");
          else pointsIn(constraint.points, path + ".points");
          break;
        case "parallel-lines":
          if (!Array.isArray(constraint.lines) || constraint.lines.length !== 2) issue("invalid-parallel-lines", path + ".lines", "平行な2直線が必要です。");
          else constraint.lines.forEach((id, j) => lineObject(id, path + ".lines[" + j + "]"));
          break;
        case "corresponding-angles": case "alternate-interior-angles":
          if (!Array.isArray(constraint.angles) || constraint.angles.length !== 2) issue("invalid-angle-pair", path + ".angles", "2つの角が必要です。");
          else constraint.angles.forEach((a, j) => { if (!Array.isArray(a) || a.length !== 3) issue("invalid-angle", path + ".angles[" + j + "]", "角は3点で指定してください。"); else pointsIn(a, path + ".angles[" + j + "]"); });
          if (constraint.transversal) lineObject(constraint.transversal, path + ".transversal");
          if (Array.isArray(constraint.lines)) constraint.lines.forEach((id, j) => lineObject(id, path + ".lines[" + j + "]"));
          else issue("missing-angle-lines", path + ".lines", "対象となる2直線が必要です。");
          break;
        case "inscribed-angle":
          if (!Array.isArray(constraint.angle) || constraint.angle.length !== 3) issue("invalid-inscribed-angle", path + ".angle", "円周角を3点で指定してください.");
          else pointsIn(constraint.angle, path + ".angle");
          if (!Array.isArray(constraint.arc) || constraint.arc.length !== 2) issue("invalid-arc", path + ".arc", "弧の両端が必要です。");
          else pointsIn(constraint.arc, path + ".arc");
          break;
        case "equal-arcs":
          if (!Array.isArray(constraint.arcs) || constraint.arcs.length !== 2) issue("invalid-arc-pair", path + ".arcs", "2つの弧が必要です。");
          else pointsIn(constraint.arcs, path + ".arcs");
          break;
        default:
          issue("unsupported-constraint-type", path + ".type", "未対応の条件型です: " + String(constraint.type));
      }
    });

    (geometry.dynamicConditions || []).forEach((condition, i) => {
      const path = "geometry.dynamicConditions[" + i + "]";
      if (condition.point) pointKnown(condition.point, path + ".point");
      if (condition.circle) objectKnown(condition.circle, path + ".circle");
      if (condition.endpoints) pointsIn(condition.endpoints, path + ".endpoints");
      if (condition.excludedPoints) pointsIn(condition.excludedPoints, path + ".excludedPoints");
      if (condition.type === "moves-on-arc") {
        pending.push({ code: "moving-point-existence", path, message: "弧の選択範囲、除外点、指定条件を満たす動点の存在は未検証です。" });
      } else if (condition.type === "equal-segments") {
        if (!Array.isArray(condition.segments) || condition.segments.length !== 2 ||
            condition.segments.some((s) => !Array.isArray(s) || s.length !== 2)) {
          issue("invalid-dynamic-segments", path + ".segments", "動点条件の2本の線分を指定してください。");
        } else condition.segments.forEach((s, j) => s.forEach((id, k) => pointKnown(id, path + ".segments[" + j + "][" + k + "]")));
        pending.push({ code: "dynamic-condition-solvability", path, message: "動点条件を満たす位置が指定範囲内に存在するかは未検証です。" });
      } else {
        pending.push({ code: "unsupported-dynamic-condition", path, message: "動的条件の意味を幾何学的には検証していません。" });
      }
    });

    if (problem.goal && problem.goal.type === "triangle-similarity" && Array.isArray(problem.goal.triangles)) {
      if (problem.goal.triangles.length !== 2) issue("invalid-similarity-goal", "goal.triangles", "相似目標には2つの三角形が必要です。");
      problem.goal.triangles.forEach((triangle, i) => {
        if (!Array.isArray(triangle) || triangle.length !== 3) issue("invalid-goal-triangle", "goal.triangles[" + i + "]", "三角形は3点で指定してください。");
        else {
          pointsIn(triangle, "goal.triangles[" + i + "]");
          if (new Set(triangle).size !== 3) issue("degenerate-goal-triangle", "goal.triangles[" + i + "]", "三角形の頂点はすべて異なる必要があります。");
        }
      });
    } else {
      pending.push({ code: "goal-geometry-not-checked", path: "goal", message: "この目標型の幾何学的な成立は未検証です。" });
    }

    // A structurally consistent record is not a proof that all constraints can
    // hold simultaneously in the Euclidean plane.
    if (pending.length === 0) pending.push({
      code: "euclidean-realizability-not-proved",
      path: "geometry",
      message: "条件全体が同時に成立するユークリッド平面上の配置は、この構造チェックでは証明していません。"
    });

    return {
      status: errors.length ? "invalid-geometry-data" : "structurally-valid-geometry-review-pending",
      valid: errors.length === 0,
      errors,
      pending,
      note: "valid は参照・データ構造の整合性のみを表します。図形の実在性や動点条件の充足を保証しません。"
    };
  }

  const api = Object.freeze({ validate });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GeometryValidator = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
