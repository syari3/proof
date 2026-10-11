const assert = require("node:assert/strict");
const Checker = require("../js/geometry-realization-checker.js");

const problem = {
  format: "proof-problem", version: 1,
  geometry: {
    points: [{id:"A"},{id:"B"},{id:"C"},{id:"D"},{id:"E"}],
    objects: [
      {id:"line-AB",type:"line",through:["A","B"]},
      {id:"line-CD",type:"line",through:["C","D"]},
      {id:"parallel-E",type:"parallel-through-point",through:["E"],parallelTo:"line-AB"}
    ],
    constructions: [{point:"E",type:"intersection",of:["line-AB","line-CD"]}],
    constraints: [
      {type:"between",points:["A","E","B"]},
      {type:"parallel-lines",lines:["line-AB","parallel-E"]}
    ]
  },
  goal: {type:"triangle-similarity",triangles:[["A","B","C"],["A","D","E"]]}
};
const realization = {points:{
  A:{x:0,y:0}, B:{x:2,y:0}, C:{x:0,y:2}, D:{x:2,y:-2}, E:{x:1,y:0}
}};
const result = Checker.validate(problem, realization);
assert.equal(result.status, "coordinate-witness-consistent");
assert.equal(result.valid, true);
assert.equal(result.errors.length, 0);

const bad = Checker.validate(problem, {points:{
  A:{x:0,y:0}, B:{x:2,y:0}, C:{x:0,y:2}, D:{x:2,y:2}, E:{x:1,y:1}
}});
assert.equal(bad.status, "coordinate-witness-invalid");
assert.ok(bad.errors.length > 0);

const partialProblem = {
  format:"proof-problem", version:1,
  geometry:{points:[{id:"A"},{id:"B"},{id:"C"}],objects:[],constructions:[],
    constraints:[{type:"inscribed-angle",angle:["A","B","C"],arc:["A","C"]}]},
  goal:{type:"triangle-similarity",triangles:[["A","B","C"],["A","B","C"]]}
};
const partial = Checker.validate(partialProblem,{points:{A:{x:0,y:0},B:{x:1,y:0},C:{x:0,y:1}}});
assert.equal(partial.status,"coordinate-witness-partial");
assert.ok(partial.pending.some((item)=>item.code==="constraint-needs-symbolic-orientation-model"));
console.log("geometry-realization-checker tests passed");
