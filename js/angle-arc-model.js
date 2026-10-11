/* Coordinate-based angle/arc measurements with explicit arc selection.
 * This module checks a supplied witness only; it is not a coordinate solver.
 */
(function (root) {
  "use strict";
  const DEFAULT_TOLERANCE = 1e-7;
  const TAU = Math.PI * 2;
  const mod = (x, n) => ((x % n) + n) % n;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const cross = (a, b, c) => (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x);
  const dot = (a, b, c) => (a.x-b.x)*(c.x-b.x) + (a.y-b.y)*(c.y-b.y);
  const angle = (a, vertex, c) => {
    const u = Math.atan2(a.y-vertex.y, a.x-vertex.x);
    const v = Math.atan2(c.y-vertex.y, c.x-vertex.x);
    return mod(v-u, TAU);
  };
  const minorAngle = (a, vertex, c) => {
    const x = angle(a, vertex, c);
    return Math.min(x, TAU-x);
  };
  const polar = (point, center) => mod(Math.atan2(point.y-center.y, point.x-center.x), TAU);
  const near = (a, b, tolerance) => Math.abs(a-b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
  function validate(problem, realization, options) {
    const tolerance = options && Number.isFinite(options.tolerance) && options.tolerance > 0 ? options.tolerance : DEFAULT_TOLERANCE;
    const errors = [], pending = [], checked = [];
    const fail = (code, path, message, residual) => errors.push({code,path,message,...(Number.isFinite(residual)?{residual}:{})});
    const defer = (code,path,message) => pending.push({code,path,message});
    if (!problem || problem.format !== "proof-problem" || problem.version !== 1 ||
        !problem.geometry || !Array.isArray(problem.geometry.points) ||
        !realization || !realization.points) {
      return {status:"invalid-input",valid:false,errors:[{code:"invalid-input",path:"",message:"proof-problem と座標候補が必要です。"}],pending,checked};
    }
    const points = realization.points;
    const objects = new Map((problem.geometry.objects || []).map(o => [o.id,o]));
    const point = id => points[id];
    const circleCenter = id => {
      const c = objects.get(id);
      return c && c.type === "circle" ? point(c.center) : null;
    };
    const circleRadius = id => {
      const center = circleCenter(id), members = (problem.geometry.constraints || []).filter(c => c.type === "point-on-circle" && c.circle === id).map(c => point(c.point));
      return center && members.length ? dist(center,members[0]) : null;
    };
    const circleAngle = (circleId, pointId) => {
      const center = circleCenter(circleId), q = point(pointId);
      return center && q ? polar(q,center) : null;
    };
    const arcSweep = (circleId, startId, endId, choice, throughId) => {
      const a = circleAngle(circleId,startId), b = circleAngle(circleId,endId);
      if (a === null || b === null) return null;
      const ccw = mod(b-a,TAU), cw = mod(a-b,TAU);
      if (choice === "counterclockwise") return ccw;
      if (choice === "clockwise") return cw;
      if (choice === "minor") return Math.min(ccw,cw);
      if (choice === "major") return Math.max(ccw,cw);
      if (choice === "through-point" && throughId) {
        const t = circleAngle(circleId,throughId);
        if (t === null) return null;
        return mod(t-a,TAU) <= ccw + tolerance ? ccw : cw;
      }
      return null;
    };
    const constraints = problem.geometry.constraints || [];
    const circleIds = [...new Set(constraints.filter(c => c.type === "point-on-circle").map(c => c.circle))];
    for (const circleId of circleIds) {
      const center = circleCenter(circleId), radius = circleRadius(circleId);
      if (!center || !Number.isFinite(radius)) {
        defer("circle-not-resolvable","geometry.objects."+circleId,"円の中心または半径を座標から解決できません。");
        continue;
      }
      for (const c of constraints.filter(c => c.type === "point-on-circle" && c.circle === circleId)) {
        const actual = dist(center,point(c.point)), residual = actual-radius;
        checked.push({path:"point-on-circle."+c.point,ok:near(actual,radius,tolerance),residual});
        if (!near(actual,radius,tolerance)) fail("point-off-circle","point-on-circle."+c.point,"点が指定円周上にありません。",residual);
      }
    }
    constraints.forEach((c,i) => {
      const path = "geometry.constraints["+i+"]";
      if (!c || typeof c !== "object") return;
      if (c.type === "corresponding-angles" || c.type === "alternate-interior-angles") {
        if (!Array.isArray(c.angles) || c.angles.length !== 2 ||
            c.angles.some(a => !Array.isArray(a) || a.length !== 3) ||
            !Array.isArray(c.lines) || c.lines.length !== 2 ||
            !c.transversal) {
          defer("malformed-angle-relation", path, "2つの角、横切る直線、平行関係を指定してください。");
          return;
        }
        const [first, second] = c.angles.map(ids => {
          const [a,v,b] = ids.map(point);
          return a && v && b ? minorAngle(a,v,b) : null;
        });
        const lineById = id => {
          const o = objects.get(id);
          if (!o) return null;
          if (o.type === "line" && Array.isArray(o.through) && o.through.length >= 2) {
            const a=point(o.through[0]), b=point(o.through[1]);
            return a && b && dist(a,b)>tolerance ? [a,b] : null;
          }
          if (o.type === "parallel-through-point" && Array.isArray(o.through) && o.through.length) {
            const base=objects.get(o.parallelTo);
            if (!base || base.type !== "line" || !Array.isArray(base.through) || base.through.length<2) return null;
            const a=point(o.through[0]), b=point(base.through[0]), d=point(base.through[1]);
            return a && b && d && dist(b,d)>tolerance ? [a,{x:a.x+d.x-b.x,y:a.y+d.y-b.y}] : null;
          }
          return null;
        };
        const l1=lineById(c.lines[0]), l2=lineById(c.lines[1]);
        if (first === null || second === null || !l1 || !l2) {
          defer("angle-relation-undetermined", path, "角または直線を座標から解決できません。");
          return;
        }
        const u={x:l1[1].x-l1[0].x,y:l1[1].y-l1[0].y};
        const v={x:l2[1].x-l2[0].x,y:l2[1].y-l2[0].y};
        const determinant=u.x*v.y-u.y*v.x;
        const parallel=Math.abs(determinant)<=tolerance*Math.max(1,Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y));
        const anglesEqual=near(first,second,tolerance) || near(first,Math.PI-second,tolerance);
        const ok=parallel && anglesEqual;
        checked.push({path,ok,firstAngleRadians:first,secondAngleRadians:second,parallel});
        if (!ok) fail("angle-relation-mismatch",path,
          "指定された角の大きさが対応する関係と一致しないか、2直線が平行ではありません。",
          first-second);
      } else if (c.type === "inscribed-angle") {
        if (!Array.isArray(c.angle) || c.angle.length !== 3 || !Array.isArray(c.arc) || c.arc.length !== 2) {
          defer("malformed-inscribed-angle",path,"円周角と弧の端点を指定してください."); return;
        }
        const [aId,vId,bId] = c.angle;
        const circleId = c.circle || (constraints.find(x => x.type === "point-on-circle" && x.point === aId) || {}).circle;
        const choice = c.arcChoice;
        if (!circleId || !choice) {
          defer("ambiguous-arc-choice",path,"円周角の対象円と弧の選択（arcChoice）が明示されていません。"); return;
        }
        const sweep = arcSweep(circleId,c.arc[0],c.arc[1],choice,c.throughPoint);
        const a=point(aId),v=point(vId),b=point(bId);
        if (sweep === null || !a || !v || !b) {
          defer("inscribed-angle-undetermined",path,"座標または弧の向きを解決できません。"); return;
        }
        const measured = minorAngle(a,v,b), expected = sweep/2;
        const ok = near(measured,expected,tolerance);
        checked.push({path,ok,measuredAngleRadians:measured,expectedAngleRadians:expected});
        if (!ok) fail("inscribed-angle-mismatch",path,"円周角と選択した弧の半分が一致しません。",measured-expected);
      } else if (c.type === "equal-arcs") {
        if (!Array.isArray(c.arcs) || c.arcs.length !== 2 || !c.circle || !c.arcChoice) {
          defer("ambiguous-equal-arcs",path,"等しい弧は円と arcChoice（minor/major/clockwise/counterclockwise）を明示してください。"); return;
        }
        const sweeps = c.arcs.map(arc => Array.isArray(arc) && arc.length === 2 ? arcSweep(c.circle,arc[0],arc[1],c.arcChoice) : null);
        if (sweeps.some(s => s === null)) { defer("equal-arcs-undetermined",path,"弧の測度を解決できません。"); return; }
        const ok = near(sweeps[0],sweeps[1],tolerance);
        checked.push({path,ok,arcMeasuresRadians:sweeps});
        if (!ok) fail("unequal-arcs",path,"指定された弧の測度が一致しません。",sweeps[0]-sweeps[1]);
      }
    });
    const status = errors.length ? "angle-arc-witness-invalid" : pending.length ? "angle-arc-witness-partial" : "angle-arc-witness-consistent";
    return {status,valid:errors.length===0,errors,pending,checked,tolerance,
      note:"座標候補の角・弧の数値チェックです。座標探索や、一般配置に対する定理の証明ではありません。"};
  }
  function cyclicOrder(pointIds, points, center) {
    if (!Array.isArray(pointIds) || !points || !center || pointIds.some(id => !points[id])) return null;
    return pointIds.map(id => ({id,angle:polar(points[id],center)})).sort((a,b)=>a.angle-b.angle).map(x=>x.id);
  }
  const api = Object.freeze({validate, angle, minorAngle, polar, cyclicOrder});
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AngleArcModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
