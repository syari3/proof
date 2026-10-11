/* Check one supplied coordinate witness. This does not search for coordinates or prove
 * that a problem has a realization; unsupported conditions remain pending.
 */
(function (root) {
  "use strict";
  const DEFAULT_TOLERANCE = 1e-7;

  function validate(problem, realization, options) {
    const tolerance = options && Number.isFinite(options.tolerance) && options.tolerance > 0
      ? options.tolerance : DEFAULT_TOLERANCE;
    const errors = [], pending = [], checked = [];
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
    const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
    const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const nearZero = (value, scale=1) => Math.abs(value) <= tolerance*Math.max(1,scale);
    const validPoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);

    if (!problem || problem.format !== "proof-problem" || problem.version !== 1 ||
        !problem.geometry || !Array.isArray(problem.geometry.points)) {
      return { status:"invalid-input", valid:false, errors:[{code:"invalid-problem",path:"",message:"proof-problem version 1 の図形データが必要です。"}], pending, checked };
    }
    if (!realization || !realization.points || typeof realization.points !== "object") {
      return { status:"invalid-realization", valid:false, errors:[{code:"missing-coordinate-witness",path:"realization.points",message:"点の座標を持つ realization.points が必要です。"}], pending, checked };
    }
    const ids = new Set(problem.geometry.points.map(p=>p && p.id).filter(id=>typeof id==="string"));
    for (const id of ids) if (!validPoint(realization.points[id]))
      fail("missing-or-invalid-coordinate","realization.points."+id,"点 "+id+" の有限な x, y 座標が必要です。");
    if (errors.length) return {status:"invalid-realization",valid:false,errors,pending,checked,tolerance};

    const p = id => realization.points[id];
    const objects = new Map((problem.geometry.objects||[]).map(o=>[o.id,o]));
    const line = id => {
      const o=objects.get(id);
      if (!o) return null;
      if (o.type==="line" && Array.isArray(o.through) && o.through.length>=2) {
        const a=p(o.through[0]), b=p(o.through[1]);
        return dist(a,b)>tolerance ? [a,b] : null;
      }
      if (o.type==="parallel-through-point" && Array.isArray(o.through) && o.through.length) {
        const base=objects.get(o.parallelTo);
        if (!base || base.type!=="line" || !Array.isArray(base.through) || base.through.length<2) return null;
        const a=p(o.through[0]), b=p(base.through[0]), c=p(base.through[1]);
        if (dist(b,c)<=tolerance) return null;
        return [a,{x:a.x+c.x-b.x,y:a.y+c.y-b.y}];
      }
      return null;
    };
    const onLine = (lineId, pointId) => {
      const l=line(lineId), q=p(pointId);
      if (!l) return null;
      return nearZero(cross(l[0],l[1],q),dist(l[0],l[1])*Math.max(1,dist(l[0],q)));
    };

    (problem.geometry.objects||[]).forEach((o,i)=>{
      const path="geometry.objects["+i+"]";
      if (o.type==="line" && !line(o.id)) fail("degenerate-line",path,"直線を定義する点の座標が一致しています。");
      else if (o.type==="parallel-through-point") {
        const l=line(o.id), base=line(o.parallelTo);
        if (!l||!base) fail("invalid-parallel-line",path,"平行線または基準直線を座標から定義できません。");
        else {
          const ux=l[1].x-l[0].x, uy=l[1].y-l[0].y, vx=base[1].x-base[0].x, vy=base[1].y-base[0].y;
          const determinant=ux*vy-uy*vx;
          check(path+".parallelTo",nearZero(determinant,dist(l[0],l[1])*dist(base[0],base[1])),"2直線の方向が平行ではありません。",determinant);
        }
      } else if (o.type!=="circle") defer("unsupported-object-type",path,"未対応の図形オブジェクトです。");
    });

    (problem.geometry.constructions||[]).forEach((c,i)=>{
      const path="geometry.constructions["+i+"]";
      if (!c || c.type!=="intersection" || !Array.isArray(c.of) || c.of.length!==2) {
        defer("unsupported-construction",path,"未対応の作図定義です。"); return;
      }
      const a=line(c.of[0]), b=line(c.of[1]);
      if (!a||!b) { fail("unresolvable-intersection",path,"交点を定義する直線を解決できません。"); return; }
      const onA=onLine(c.of[0],c.point), onB=onLine(c.of[1],c.point);
      if (onA===null||onB===null) { fail("unresolvable-intersection",path,"交点条件を評価できません。"); return; }
      check(path,onA&&onB,"指定点が2直線の両方に乗っていません。");
      const ux=a[1].x-a[0].x, uy=a[1].y-a[0].y, vx=b[1].x-b[0].x, vy=b[1].y-b[0].y;
      const determinant=ux*vy-uy*vx;
      check(path+".unique",!nearZero(determinant,dist(a[0],a[1])*dist(b[0],b[1])),"交点を定義する2直線が平行または一致しており、一意な交点がありません。",determinant);
    });

    const circleMembers=new Map();
    for (const c of problem.geometry.constraints||[]) if (c && c.type==="point-on-circle") {
      if (!circleMembers.has(c.circle)) circleMembers.set(c.circle,[]);
      circleMembers.get(c.circle).push(c.point);
    }
    for (const [circleId,members] of circleMembers) {
      const circle=objects.get(circleId);
      if (!circle||circle.type!=="circle"||!validPoint(p(circle.center))) {
        fail("invalid-circle-center","geometry.objects."+circleId,"円の中心を座標から解決できません。"); continue;
      }
      if (!members.length) continue;
      const radii=members.map(id=>dist(p(circle.center),p(id))), radius=radii[0];
      if (radius<=tolerance) fail("degenerate-circle","geometry.objects."+circleId,"円の半径が0です。");
      radii.forEach((r,i)=>check("constraints.point-on-circle."+members[i],nearZero(r-radius,Math.max(r,radius)),"指定点が同じ円周上にありません。",r-radius));
    }

    (problem.geometry.constraints||[]).forEach((c,i)=>{
      const path="geometry.constraints["+i+"]";
      if (!c||typeof c!=="object") return;
      switch(c.type) {
        case "point-on-circle": break;
        case "equal-segments": {
          if (!Array.isArray(c.segments)||c.segments.length!==2||c.segments.some(s=>!Array.isArray(s)||s.length!==2)) { defer("malformed-equal-segments",path,"線分の等しさを評価できません。"); break; }
          const [a,b]=c.segments.map(s=>dist(p(s[0]),p(s[1])));
          check(path,nearZero(a-b,Math.max(a,b)),"指定された2線分の長さが等しくありません。",a-b); break;
        }
        case "between": {
          if (!Array.isArray(c.points)||c.points.length!==3) { defer("malformed-between",path,"between 条件を評価できません。"); break; }
          const [a,b,d]=c.points.map(p), area=cross(a,d,b), order=(b.x-a.x)*(b.x-d.x)+(b.y-a.y)*(b.y-d.y);
          check(path,nearZero(area,dist(a,d)*Math.max(1,dist(a,b)))&&order<=tolerance,"3点が指定順に同一直線上に並んでいません。",area); break;
        }
        case "parallel-lines": {
          if (!Array.isArray(c.lines)||c.lines.length!==2) { defer("malformed-parallel-lines",path,"平行条件を評価できません。"); break; }
          const a=line(c.lines[0]),b=line(c.lines[1]);
          if(!a||!b){defer("parallel-lines-undetermined",path,"平行な直線を座標から解決できません。");break;}
          const ux=a[1].x-a[0].x,uy=a[1].y-a[0].y,vx=b[1].x-b[0].x,vy=b[1].y-b[0].y,det=ux*vy-uy*vx;
          check(path,nearZero(det,dist(a[0],a[1])*dist(b[0],b[1])),"指定された2直線が平行ではありません。",det); break;
        }
        case "same-ray": case "opposite-rays": {
          const ids=c.points||[];
          if(ids.length!==2||!c.vertex){defer("malformed-rays",path,"半直線条件を評価できません。");break;}
          const v=p(c.vertex),a=p(ids[0]),b=p(ids[1]),cr=cross(v,a,b),dp=(a.x-v.x)*(b.x-v.x)+(a.y-v.y)*(b.y-v.y);
          const collinear=nearZero(cr,dist(v,a)*dist(v,b));
          check(path,collinear&&(c.type==="same-ray"?dp>tolerance:dp< -tolerance),"半直線の向きが条件と一致しません。",cr);break;
        }
        case "same-segment": case "opposite-segment": {
          const chord=c.chord||[], vertices=c.vertices||[];
          if(chord.length!==2||vertices.length!==2){defer("malformed-segment-side",path,"弦に対する位置関係を評価できません。");break;}
          const s1=cross(p(chord[0]),p(chord[1]),p(vertices[0])),s2=cross(p(chord[0]),p(chord[1]),p(vertices[1])),product=s1*s2;
          check(path,c.type==="same-segment"?product>tolerance*tolerance:product< -tolerance*tolerance,"点が弦の同じ側／反対側にありません。",product);break;
        }
        case "corresponding-angles": case "alternate-interior-angles": case "inscribed-angle": case "equal-arcs":
          defer("constraint-needs-angle-arc-model",path,"角・弧の向きや弧の選択を扱うモデルが未実装です。");break;
        default: defer("unsupported-constraint",path,"未対応の条件型: "+String(c.type));
      }
    });

    if(problem.goal&&problem.goal.type==="triangle-similarity"&&Array.isArray(problem.goal.triangles)) {
      problem.goal.triangles.forEach((tri,i)=>{
        if(!Array.isArray(tri)||tri.length!==3){fail("invalid-goal-triangle","goal.triangles["+i+"]","三角形は3頂点が必要です。");return;}
        const [a,b,c]=tri.map(p),area=Math.abs(cross(a,b,c)),scale=Math.max(dist(a,b),dist(b,c),dist(c,a));
        check("goal.triangles["+i+"]",area>tolerance*Math.max(1,scale*scale),"相似目標の三角形が退化しています。",area);
      });
    }
    const valid=errors.length===0;
    return {status:!valid?"coordinate-witness-invalid":pending.length?"coordinate-witness-partial":"coordinate-witness-consistent",
      valid,errors,pending,checked,tolerance,
      note:"これは与えられた座標例の検査です。座標解の探索や、図形条件が成立することの一般的な数学的証明ではありません。"};
  }
  const api={validate};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.GeometryRealizationChecker=api;
})(typeof globalThis!=="undefined"?globalThis:this);
