/* Explicit point-order and ray relations for geometry proof data. */
(function (root) {
  "use strict";

  function derive(constraints) {
    const facts = [];
    const add = (fact) => { if (!facts.includes(fact)) facts.push(fact); };
    for (const item of (constraints || [])) {
      if (item.type === "between" && Array.isArray(item.points) && item.points.length === 3) {
        const [a, b, c] = item.points;
        add("between(" + a + "," + b + "," + c + ")");
        add("oppositeRay(" + b + "," + a + "," + c + ")");
        add("sameRay(" + a + "," + b + "," + c + ")");
        add("sameRay(" + c + "," + b + "," + a + ")");
      } else if (item.type === "same-ray" && item.vertex && item.points && item.points.length === 2) {
        add("sameRay(" + item.vertex + "," + item.points[0] + "," + item.points[1] + ")");
      } else if (item.type === "opposite-rays" && item.vertex && item.points && item.points.length === 2) {
        add("oppositeRay(" + item.vertex + "," + item.points[0] + "," + item.points[1] + ")");
      }
    }

    const opposite = facts.map((fact) => /^oppositeRay\(([A-Z]),([A-Z]),([A-Z])\)$/.exec(fact))
      .filter(Boolean).map((m) => ({ vertex: m[1], a: m[2], c: m[3] }));
    for (let i = 0; i < opposite.length; i++) {
      for (let j = i + 1; j < opposite.length; j++) {
        const x = opposite[i], y = opposite[j];
        if (x.vertex !== y.vertex) continue;
        if ([x.a, x.c].some((p) => [y.a, y.c].includes(p))) continue;
        const v = x.vertex;
        add("verticalAngles(" + x.a + v + y.a + "," + x.c + v + y.c + ")");
        add("verticalAngles(" + x.a + v + y.c + "," + x.c + v + y.a + ")");
      }
    }
    return facts;
  }

  const api = Object.freeze({ derive });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GeometryRelations = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
