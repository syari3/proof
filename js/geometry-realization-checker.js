/* Verify a supplied coordinate witness against supported geometry constraints.
 * This is a checker, not a coordinate solver or a proof of universal realizability.
 */
(function (root) {
  "use strict";

  const DEFAULT_TOLERANCE = 1e-7;

  function validate(problem, realization, options) {
    const tolerance = options && Number.isFinite(options.tolerance) && options.tolerance > 0
      ? options.tolerance : DEFAULT_TOLERANCE;
    const errors = [];
    const pending = [];
    const checked = [];
    const fail = (code, path, message, residual) => {
      const item = { code, path, message };
      if (Number.isFinite(residual)) item.residual = residual;
      errors.push(item);
    };
    const defer = (code, path, message) => pending.push({ code, path, message });
    const check = (path, ok, message, residual) => {
      checked.push({ path, ok, residual: Number.isFinite(residual) ? residual : null });
      if (!ok) fail("constraint-not-satisfied", path, message, residual);
    };
    const near = (a, b, scale) => Math.abs(a - b) <= tolerance * Math.max(1, scale || 1);
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const dotFrom = (origin, a, b) => (a.x - origin.x) * (b.x - origin.x) + (a.y - origin.y) * (b.y - origin.y);
    const coord = (id) => realization && realization.points && realization.points[id];
    const validCoord = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
    if (!problem || problem.format !== "proof-problem" || problem.version !== 1 ||
        !problem.geometry || !Array.isArray(problem.geometry.points)) {
      return { status: "invalid-input", valid: false, errors: [{ code: "invalid-problem", path: "", message: "proof-problem version 1 の図形データが必要です。" }], pending, checked };
    }
    if (!realization || !realization.points || typeof realization.points !== "object") {
      return { status: "invalid-realization", valid: false, errors: [{ code: "missing-coordinate-witness", path: "realization.points", message: "各点の座標を持つ realization.points が必要です。" }], pending, checked };
    }

    const pointIds = new Set(problem.geometry.points.map((p) => p && p.id).filter((id) => typeof id === "string"));
    for (const id of pointIds) {
      if (!validCoord(coord(id))) fail("missing-or-invalid-coordinate", "realization.points." + id, "点 " + id + " の有限な x, y 座標が必要です。");
    }
    const allCoordinatesValid = Array.from(pointIds).every((id) => validCoord(coord(id)));
    if (!allCoordinatesValid) {
      return { status: "invalid-realization", valid: false, errors, pending, checked, tolerance };
    }

    const objects = new Map((problem.geometry.objects || []).map((o) => [o.id, o]));
    const linePoints = (lineId) => {
      const line = objects.get(lineId);
      if (!line) return null;
      if (line.type === "line") {
        if (!Array.isArray(line.through) || line.through.length < 2) return null;
        const ids = line.through;
        if (!ids.every((id) => validCoord(coord(id)))) return null;
        const a = coord(ids[0]), b = coord(ids[1]);
        if (distance(a, b) <= tolerance) return null;
        return [a, b];
      }
      if (line.type === "parallel-through-point") {
        const base = linePoints(line.parallelTo);
        const ids = line.through || [];
        if (!base || !ids.length || !validCoord(coord(ids[0]))) return null;
        const a = coord(ids[0]), b = coord(ids[0]);
        const baseDirection = { x: base[1].x - base[0].x, y: base[1].y - base[0].y };
        return [a, { x: b.x + baseDirection.x, y: b.y + baseDirection.y }];
      }
      return null;
    };
    const lineContains = (lineId, pointId) => {
      const line = linePoints(lineId), p = coord(pointId);
      if (!line || !p) return null;
      const scale = distance(line[0], line[1]) * Math.max(1, distance(line[0], p));
      return near(cross(line[0], line[1], p), 0, scale);
    };
    const circlePoints = new Map();
    for (const c of problem.geometry.constraints || []) {
      if (c && c.type === "point-on-circle") {
        if (!circlePoints.has(c.circle)) circlePoints.set(c.circle, []);
        circlePoints.get(c.circle).push(c.point);
      }
    }

    (problem.geometry.objects || []).forEach((object, i) => {
      const path = "geometry.objects[" + i + "]";
      if (!object || typeof object !== "object") return;
      if (object.type === "line") {
        const line = linePoints(object.id);
        if (!line) fail("degenerate-line", path, "直線を定義する2点は異なる座標である必要があります。");
      } else if (object.type === "parallel-through-point") {
        const line = linePoints(object.id);
        if (!line) fail("invalid-parallel-line", path, "平行線と基準直線を座標から定義できません。");
        else {
          const base = linePoints(object.parallelTo);
          const scale = distance(line[0], line[1]) * distance(base[0], base[1]);
          check(path + ".parallelTo", near(cross(line[0], line[1], base[1]), 0, scale),
            "指定した直線と基準直線が平行ではありません。", cross(line[0], line[1], base[1]));
        }
      } else if (object.type !== "circle") {
        defer("unsupported-object-type", path, "未対応の図形オブジェクトは座標検証できません。");
      }
    });

    (problem.geometry.constructions || []).forEach((construction, i) => {
      const path = "geometry.constructions[" + i + "]";
      if (!construction || construction.type !== "intersection" || !Array.isArray(construction.of) || construction.of.length !== 2) {
        defer("unsupported-construction", path, "未対応または不正な作図定義は座標検証できません。");
        return;
      }
      const [leftId, rightId] = construction.of;
      const left = linePoints(leftId), right = linePoints(rightId), p = coord(construction.point);
      if (!left || !right || !p) {
        fail("unresolvable-intersection", path, "交点を定義する直線または点を解決できません。");
        return;
      }
      const d1 = lineContains(leftId, construction.point);
      const d2 = lineContains(rightId, construction.point);
      if (d1 === null || d2 === null) {
        fail("unresolvable-intersection", path, "交点条件を評価できません。");
        return;
      }
      check(path, d1 && d2, "指定点が2直線の両方に乗っていません。");
      const det = (left[1].x-left[0].x)*(right[1].y-right[0].y) - (left[1].y-left[0].y)*(right[1].x-right[0].x);
      const scale = distance(left[0], left[1]) * distance(right[0], right[1]);
      check(path + ".unique", !near(det, 0, scale), "交点を定義する直線は平行または一致しており、一意な交点がありません。", det);
    });

    const circleRadii = new Map();
    for (const [circleId, ids] of circlePoints) {
      const circle = objects.get(circleId);
      if (!circle || circle.type !== "circle" || !validCoord(coord(circle.center))) {
        fail("invalid-circle-center", "geometry.objects." + circleId, "円の中心座標を解決できません。");
        continue;
      }
      const center = coord(circle.center);
      const radii = ids.map((id) => distance(center, coord(id)));
      if (!radii.length) {
        defer("circle-radius-undetermined", "geometry.objects." + circleId, "円周上の点がなく、半径を定められません。");
        continue;
      }
      const radius = radii[0];
      circleRadii.set(circleId, radius);
      ids.forEach((id, i) => check("constraints.point-on-circle." + id, near(radii[i], radius, Math.max(radius, radii[i])),
        "点 " + id + " が同じ円周上にありません。", radii[i] - radius));
      if (radius <= tolerance) fail("degenerate-circle", "geometry.objects." + circleId, "円の半径が0です。");
    }

    (problem.geometry.constraints || []).forEach((constraint, i) => {
      const path = "geometry.constraints[" + i + "]";
      if (!constraint || typeof constraint !== "object") return;
      switch (constraint.type) {
        case "point-on-circle":
          if (!circleRadii.has(constraint.circle)) {
            defer("circle-membership-undetermined", path, "円の半径を決められず、円周上の条件を評価できません。");
          }
          break;
        case "equal-segments": {
          if (!Array.isArray(constraint.segments) || constraint.segments.length !== 2 || constraint.segments.some((s) => !Array.isArray(s) || s.length !== 2)) {
            defer("malformed-equal-segments", path, "線分の等しさを評価できる形式ではありません。"); break;
          }
          const [s1, s2] = constraint.segments.map((s) => distance(coord(s[0]), coord(s[1])));
          check(path, near(s1, s2, Math.max(s1, s2)), "指定された2線分の長さが等しくありません。", s1-s2);
          break;
        }
        case "between": {
          const ids = constraint.points || [];
          if (ids.length !== 3) { defer("malformed-between", path, "between 条件を評価できません。"); break; }
          const [a,b,c] = ids.map(coord);
          const scale = distance(a,c) * Math.max(1, distance(a,b));
          check(path, near(cross(a,c,b), 0, scale) && dotFrom(a,b,c) >= -tolerance,
            "3点が指定順に同一直線上に並んでいません。", cross(a,c,b));
          break;
        }
        case "parallel-lines": {
          if (!Array.isArray(constraint.lines) || constraint.lines.length !== 2) { defer("malformed-parallel-lines", path, "平行条件を評価できません。"); break; }
          const l1=linePoints(constraint.lines[0]), l2=linePoints(constraint.lines[1]);
          if (!l1 || !l2) { defer("parallel-lines-undetermined", path, "平行な直線を座標から解決できません。"); break; }
          const v1={x:l1[1].x-l1[0].x,y:l1[1].y-l1[0].y}, v2={x:l2[1].x-l2[0].x,y:l2[1].y-l2[0].y};
          const det=v1.x*v2.y-v1.y*v2.x;
          check(path, near(det,0,distance(l1[0],l1[1])*distance(l2[0],l2[1])), "指定された2直線が平行ではありません。", det);
          break;
        }
        case "same-ray": case "opposite-rays": {
          const v=coord(constraint.vertex), ids=constraint.points || [];
          if (ids.length!==2) { defer("malformed-rays",path,"半直線条件を評価できません。"); break; }
          const a=coord(ids[0]), b=coord(ids[1]);
          const cr=cross(v,a,b), dp=dotFrom(v,a,b);
          const same=near(cr,0,distance(v,a)*distance(v,b)) && dp>tolerance;
          const opposite=near(cr,0,distance(v,a)*distance(v,b)) && dp< -tolerance;
          check(path, constraint.type==="same-ray" ? same : opposite, "指定された半直線の向きが条件と一致しません。", cr);
          break;
        }
        case "same-segment": case "opposite-segment": {
          const chord=constraint.chord||[], vertices=constraint.vertices||[];
          if(chord.length!==2||vertices.length!==2){defer("malformed-segment-side",path,"弦に対する位置関係を評価できません。");break;}
          const [a,b]=chord.map(coord), [p,q]=vertices.map(coord);
          const sp=cross(a,b,p), sq=cross(a,b,q);
          const same=sp*sq>tolerance*tolerance;
          check(path, constraint.type==="same-segment" ? same : sp*sq< -tolerance*tolerance,
            "指定された点が弦の同じ側／反対側にありません。", sp*sq);
          break;
        }
        case "ray-inside-angle": {
          const v=coord(constraint.vertex), ids=constraint.points||[];
          if(ids.length!==3){defer("malformed-angle-rays",path,"角の内側条件を評価できません。");break;}
          const [a,b,c]=ids.map(coord);
          const orient=cross(v,a,c), one=cross(v,a,b), two=cross(v,b,c);
          const inside=orient>=0 ? one>=-tolerance && two>=-tolerance : one<=tolerance && two<=tolerance;
          check(path,inside,"指定された半直線が角の内部にありません。");
          break;
        }
        case "corresponding-angles": case "alternate-interior-angles":
        case "inscribed-angle": case "equal-arcs":
          defer("constraint-needs-symbolic-orientation-model", path, "この角・弧条件は向きや弧の選択を含むため、現段階では未対応です。");
          break;
        default:
          defer("unsupported-constraint", path, "未対応の条件型: " + String(constraint.type));
      }
    });

    if (problem.goal && problem.goal.type === "triangle-similarity" && Array.isArray(problem.goal.triangles)) {
      problem.goal.triangles.forEach((triangle, i) => {
        if (!Array.isArray(triangle) || triangle.length !== 3) {
          fail("invalid-goal-triangle", "goal.triangles[" + i + "]", "相似目標の三角形は3頂点が必要です。");
          return;
        }
        const [a,b,c]=triangle.map(coord);
        const area2=Math.abs(cross(a,b,c));
        const scale=Math.max(distance(a,b),distance(b,c),distance(c,a));
        check("goal.triangles[" + i + "]", area2 > tolerance * Math.max(1,scale*scale),
          "相似目標の三角形が退化しています。", area2);
      });
    }

    const valid = errors.length === 0;
    return {
      status: !valid ? "coordinate-witness-invalid" :
        pending.length ? "coordinate-witness-partial" : "coordinate-witness-consistent",
      valid,
      errors,
      pending,
      checked,
      tolerance,
      note: "座標例の検査結果です。座標解の探索や、図形条件が一般に成立することの数学的証明ではありません。"
    };
  }

  const api = { validate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GeometryRealizationChecker = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
