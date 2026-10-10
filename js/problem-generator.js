/* Deterministic rule-checked problem template selector. No AI or network calls. */
(function (root) {
  "use strict";
  function generate(templates, proofRules, random = Math.random) {
    if (!templates || !proofRules || typeof proofRules.derive !== "function") {
      throw new TypeError("問題型と証明ルールが必要です。");
    }
    const keys = Object.keys(templates).filter((key) => key !== "random");
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    for (const key of keys) {
      const template = templates[key];
      const derivations = proofRules.derive(template.facts || []);
      if (derivations.some((item) => item.conclusion === template.expectedConclusion)) {
        return { key, problem: template, validation: "passed" };
      }
    }
    return { key: null, problem: null, validation: "failed" };
  }
  const api = Object.freeze({ generate });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ProblemGenerator = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
