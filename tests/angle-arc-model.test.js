const assert = require("node:assert/strict");
const Model = require("../js/angle-arc-model.js");

const problem = {
  format:"proof-problem", version:1,
  geometry:{
    points:[{id:"O"},{id:"A"},{id:"B"},{id:"C"},{id:"D"}],
    objects:[{id:"circle-O",type:"circle",center:"O"}],
    constructions:[],
    constraints:[
      ...["A","B","C","D"].map(point=>({type:"point-on-circle",point,circle:"circle-O"})),
      {type:"inscribed-angle",circle:"circle-O",angle:["A","B","C"],arc:["A","C"],arcChoice:"minor"}
    ]
  }
};
const witness={points:{
  O:{x:0,y:0}, A:{x:1,y:0}, B:{x:0,y:1}, C:{x:-1,y:0}, D:{x:0,y:-1}
}};
const result=Model.validate(problem,witness);
assert.equal(result.status,"angle-arc-witness-consistent");
assert.equal(result.valid,true);
assert.equal(result.errors.length,0);

const wrongArc = structuredClone(problem);
wrongArc.geometry.constraints[4].arcChoice="major";
const mismatch=Model.validate(wrongArc,witness);
assert.equal(mismatch.status,"angle-arc-witness-invalid");
assert.ok(mismatch.errors.some(x=>x.code==="inscribed-angle-mismatch"));

const ambiguous=structuredClone(problem);
delete ambiguous.geometry.constraints[4].arcChoice;
const partial=Model.validate(ambiguous,witness);
assert.equal(partial.status,"angle-arc-witness-partial");
assert.ok(partial.pending.some(x=>x.code==="ambiguous-arc-choice"));

assert.deepEqual(Model.cyclicOrder(["A","B","C","D"],witness.points,witness.points.O),["A","B","C","D"]);
console.log("angle-arc-model tests passed");
