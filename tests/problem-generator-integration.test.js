const assert = require("node:assert/strict");
const generator = require("../js/problem-generator.js");
const rules = require("../js/proof-rules.js");

const validSimilarity = {
  facts: [
    "triangle(ABC)",
    "triangle(DEF)",
    "angle(A)=angle(D)",
    "angle(B)=angle(E)"
  ],
  expectedConclusion: "similar(ABC,DEF)"
};
const missingAngle = {
  facts: [
    "triangle(ABC)",
    "triangle(DEF)",
    "angle(A)=angle(D)"
  ],
  expectedConclusion: "similar(ABC,DEF)"
};

// Exercise the generator with the real inference engine, not a mocked prove().
const mixedResult = generator.generate(
  { incomplete: missingAngle, valid: validSimilarity },
  rules,
  () => 0
);
assert.equal(mixedResult.validation, "passed");
assert.equal(mixedResult.key, "valid");
assert.equal(mixedResult.problem, validSimilarity);
assert.equal(mixedResult.problem.expectedConclusion, "similar(ABC,DEF)");
assert.equal(mixedResult.validation, "passed");
assert.equal(
  rules.prove(validSimilarity.facts, validSimilarity.expectedConclusion).success,
  true,
  "2組の角と三角形の前提から相似を証明できる"
);
assert.equal(
  rules.prove(missingAngle.facts, missingAngle.expectedConclusion).success,
  false,
  "角の条件が1組しかない候補は相似を証明できない"
);

const failedResult = generator.generate(
  { incomplete: missingAngle },
  rules,
  () => 0
);
assert.deepEqual(failedResult, {
  key: null,
  problem: null,
  validation: "failed"
});

console.log("✓ 生成器は実推論エンジンで証明できる候補だけを返す");
console.log("✓ 証明できる候補がない場合は失敗を返す");
