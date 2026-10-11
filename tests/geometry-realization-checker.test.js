const assert = require("node:assert/strict");
const Checker = require("../js/geometry-realization-checker.js");

const crossingProblem = {
  format:"proof-problem", version:1,
  geometry:{
    points:[{id:"A"},{id:"B"},{id:"C"},{id:"D"},{id:"E"}],
    objects:[
      {id:"line-AB",type:"line",through:["A","B"]},
      {id:"line-CD",type:"line",through:["C","D"]}
    ],
    constructions:[{point:"E",type:"intersection",of:["line-AB","line-CD"]}],
    constraints:[{type:"between",points:["A","E","B"]}]
  },
  goal:{type:"triangle-similarity",triangles:[["A","B","C"],["A","D","E"]]}
};
const witness={points:{
  A:{x:0,y:0},B:{x:2,y:0},C:{x:0,y:2},D:{x:2,y:-2},E:{x:1,y:0}
}};
const good=Checker.validate(crossingProblem,witness);
assert.equal(good.status,"coordinate-witness-consistent");
assert.equal(good.valid,true);
assert.equal(good.errors.length,0);

const bad=Checker.validate(crossingProblem,{points:{
  A:{x:0,y:0},B:{x:2,y:0},C:{x:0,y:2},D:{x:2,y:2},E:{x:1,y:1}
}});
assert.equal(bad.status,"coordinate-witness-invalid");
assert.ok(bad.errors.length>0);

const parallelProblem={
  format:"proof-problem",version:1,
  geometry:{
    points:[{id:"A"},{id:"B"},{id:"C"}],
    objects:[
      {id:"base",type:"line",through:["A","B"]},
      {id:"parallel",type:"parallel-through-point",through:["C"],parallelTo:"base"}
    ],
    constructions:[],constraints:[{type:"parallel-lines",lines:["base","parallel"]}]
  },
  goal:{type:"triangle-similarity",triangles:[["A","B","C"],["A","B","C"]]}
};
const parallel=Checker.validate(parallelProblem,{points:{A:{x:0,y:0},B:{x:2,y:0},C:{x:0,y:3}}});
assert.equal(parallel.status,"coordinate-witness-consistent");
assert.equal(parallel.valid,true);

const partialProblem={
  format:"proof-problem",version:1,
  geometry:{points:[{id:"A"},{id:"B"},{id:"C"}],objects:[],constructions:[],
    constraints:[{type:"inscribed-angle",angle:["A","B","C"],arc:["A","C"]}]},
  goal:{type:"triangle-similarity",triangles:[["A","B","C"],["A","B","C"]]}
};
const partial=Checker.validate(partialProblem,{points:{A:{x:0,y:0},B:{x:1,y:0},C:{x:0,y:1}}});
assert.equal(partial.status,"coordinate-witness-partial");
assert.ok(partial.pending.some(item=>item.code==="ambiguous-arc-choice"));

const angleArcProblem = {
  format:"proof-problem", version:1,
  geometry:{
    points:[{id:"O"},{id:"A"},{id:"B"},{id:"C"}],
    objects:[{id:"circle-O",type:"circle",center:"O"}],
    constructions:[],
    constraints:[
      ...["A","B","C"].map(point=>({type:"point-on-circle",point,circle:"circle-O"})),
      {type:"inscribed-angle",circle:"circle-O",angle:["A","B","C"],arc:["A","C"],arcChoice:"minor"}
    ]
  },
  goal:{type:"triangle-similarity",triangles:[["A","B","C"],["A","B","C"]]}
};
const angleArcWitness={points:{
  O:{x:0,y:0}, A:{x:1,y:0}, B:{x:-1,y:0}, C:{x:0,y:1}
}};
const integrated=Checker.validate(angleArcProblem,angleArcWitness);
assert.equal(integrated.status,"coordinate-witness-consistent");
assert.equal(integrated.valid,true);
assert.ok(integrated.checked.some(item=>item.path==="geometry.constraints[3]"));

const wrongAngleArc = structuredClone(angleArcProblem);
wrongAngleArc.geometry.constraints[3].arcChoice="major";
const integratedMismatch=Checker.validate(wrongAngleArc,angleArcWitness);
assert.equal(integratedMismatch.status,"coordinate-witness-invalid");
assert.ok(integratedMismatch.errors.some(item=>item.code==="inscribed-angle-mismatch"));

console.log("geometry-realization-checker tests passed");
