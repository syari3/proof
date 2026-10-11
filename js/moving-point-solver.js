/* Solve the BA = BG moving-point condition for one fixed coordinate layout.
 * This is a numerical witness search for the supported Shizuoka 2025 pattern,
 * not a general Euclidean geometry solver or theorem prover.
 */
(function (root) {
  "use strict";
  const DEFAULT_TOLERANCE = 1e-7;

  const sub = (a,b) => ({x:a.x-b.x,y:a.y-b.y});
  const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y});
  const mul = (v,s) => ({x:v.x*s,y:v.y*s});
  const dot = (a,b) => a.x*b.x+a.y*b.y;
  const cross = (a,b) => a.x*b.y-a.y*b.x;
  const norm = v => Math.hypot(v.x,v.y);
  const dist = (a,b) => norm(sub(a,b));
  const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const near = (a,b,tol) => Math.abs(a-b) <= tol*Math.max(1,Math.abs(a),Math.abs(b));

  function ccwContains(start, end, target, tol) {
    const tau = 2*Math.PI;
    const normAngle = a => ((a % tau) + tau) % tau;
    const span = normAngle(end-start);
    const offset = normAngle(target-start);
    return offset > tol && offset < span-tol;
  }

  function isOnArcNotContaining(points, pId, endpoints, excluded, tol) {
    const O=points.O, A=points.A, C=points[endpoints[1]], D=points[endpoints[0]], P=points[pId];
    if (![O,A,C,D,P].every(validPoint)) return {ok:false,reason:"missing-arc-point"};
    const angle = q => Math.atan2(q.y-O.y,q.x-O.x);
    const a=angle(A), c=angle(C), d=angle(D), x=angle(P);
    const aOnCcw=ccwContains(d,c,a,tol), pOnCcw=ccwContains(d,c,x,tol);
    const aOnCw=ccwContains(c,d,a,tol), pOnCw=ccwContains(c,d,x,tol);
    let onSelectedArc;
    if (!aOnCcw && aOnCw) onSelectedArc=pOnCcw;
    else if (!aOnCw && aOnCcw) onSelectedArc=pOnCw;
    else return {ok:false,reason:"arc-choice-ambiguous"};
    if (!onSelectedArc) return {ok:false,reason:"point-outside-selected-arc"};
    for (const id of excluded||[]) {
      if (points[id] && dist(P,points[id])<=tol) return {ok:false,reason:"excluded-point",point:id};
    }
    return {ok:true};
  }

  function solve(problem, fixedPoints, options) {
    const tolerance = options && Number.isFinite(options.tolerance) && options.tolerance>0
      ? options.tolerance : DEFAULT_TOLERANCE;
    const fail = (status, reason, extra={}) => ({status,valid:false,reason,...extra});
    if (!problem || problem.format!=="proof-problem" || !problem.geometry ||
        !Array.isArray(problem.geometry.dynamicConditions) || !fixedPoints ||
        typeof fixedPoints!=="object") {
      return fail("invalid-input","problem-and-fixed-points-required");
    }
    const moving = problem.geometry.dynamicConditions.find(c=>c && c.type==="moves-on-arc");
    const selector = problem.geometry.dynamicConditions.find(c=>c && c.type==="equal-segments" &&
      c.role==="select-position-of-moving-point");
    if (!moving || !selector || !Array.isArray(selector.segments) || selector.segments.length!==2) {
      return fail("unsupported-pattern","requires-moves-on-arc-and-equal-segments-selector");
    }
    const first=selector.segments[0], second=selector.segments[1];
    if (!Array.isArray(first)||!Array.isArray(second)||first.length!==2||second.length!==2) {
      return fail("unsupported-pattern","malformed-equal-segments-selector");
    }
    // Supported pattern: BA = BG, with G on BD; P is the second intersection
    // of AG with the circle through A centered at O.
    const [bId,aId]=first;
    const gId=second[1]===bId ? second[0] : second[1];
    const dId=(problem.geometry.constraints||[]).find(c=>c && c.type==="same-ray" &&
      c.vertex===bId && Array.isArray(c.points) && c.points.includes(gId))?.points.find(id=>id!==gId);
    const OId=(problem.geometry.objects||[]).find(o=>o && o.type==="circle")?.center;
    const arcEnds=moving.endpoints;
    if (aId!=="A" || bId!=="B" || gId!=="G" || dId!=="D" || OId!=="O" ||
        !Array.isArray(arcEnds)||arcEnds.length!==2 || moving.arcChoice!=="not-containing-A") {
      return fail("unsupported-pattern","only the encoded A,B,D,O and not-containing-A arc pattern is supported");
    }
    const needed=[aId,bId,dId,OId,arcEnds[0],arcEnds[1]];
    for (const id of new Set(needed)) if (!validPoint(fixedPoints[id]))
      return fail("missing-fixed-point","missing finite coordinates for "+id,{point:id});

    const A=fixedPoints[aId], B=fixedPoints[bId], D=fixedPoints[dId], O=fixedPoints[OId];
    const ba=dist(B,A), bd=dist(B,D);
    if (ba<=tolerance) return fail("degenerate-length","BA must be positive",{BA:ba});
    if (bd<=tolerance) return fail("degenerate-length","BD must be positive",{BD:bd});
    if (ba>bd+tolerance*Math.max(1,ba,bd))
      return fail("no-segment-intersection","BA exceeds BD, so no G lies on segment BD",{BA:ba,BD:bd});

    const u=mul(sub(D,B),1/bd);
    const G=add(B,mul(u,ba));
    if (dist(B,G)<=tolerance || dist(G,D)<=tolerance)
      return fail("endpoint-solution","the calculated G is an endpoint, not an interior point",{G});

    const v=sub(G,A), w=sub(A,O), vv=dot(v,v);
    if (vv<=tolerance*tolerance) return fail("degenerate-line","A and G coincide");
    const t=-2*dot(w,v)/vv;
    if (!(t>1+tolerance))
      return fail("wrong-intersection-order","the second circle intersection does not occur after G on ray AG",{parameter:t,G});
    const P=add(A,mul(v,t));
    const radiusA=dist(A,O), radiusP=dist(P,O);
    if (!near(radiusA,radiusP,tolerance))
      return fail("circle-intersection-numerical-error","calculated P is not on circle O",{radiusA,radiusP});

    const points={...fixedPoints,[gId]:G,[moving.point]:P};
    const arcResult=isOnArcNotContaining(points,moving.point,arcEnds,moving.excludedPoints,tolerance);
    if (!arcResult.ok)
      return fail("arc-condition-failed",arcResult.reason,{G,P,parameter:t,details:arcResult});

    return {
      status:"coordinate-solution-found",valid:true,points:{[gId]:G,[moving.point]:P},
      measurements:{BA:ba,BG:dist(B,G),BD:bd,AG:dist(A,G),circleRadiusAtA:radiusA,circleRadiusAtP:radiusP},
      checks:{equalSegments:near(ba,dist(B,G),tolerance),POnCircle:near(radiusA,radiusP,tolerance),selectedArc:true},
      note:"One numerical coordinate layout has a solution. This does not prove existence for every layout or prove the target theorem."
    };
  }

  const api={solve};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MovingPointSolver=api;
})(typeof globalThis!=="undefined"?globalThis:this);
