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
assert.ok(partial.pending.some(item=>item.code==="constraint-needs-angle-arc-model"));
console.log("geometry-realization-checker tests passed");
