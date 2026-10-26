/* UK Marriage Allowance calculator (2026 to 2027): who can claim, and what the couple really saves.
   Figures from data/allowances-uk.js; tax from js/uk-tax.js (data/tax-uk.js). */
(function () {
  "use strict";

  var A = window.ToolNestAllowancesUK;
  var UK = window.ToolNestUK;
  var D = UK.data;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // The partner must pay tax at no more than the basic rate (the intermediate rate in Scotland):
  // taxable income up to the top of the first band (rest of UK) or third band (Scotland).
  function basicRateLimit(region) {
    var bands = D.bands[region];
    return D.personalAllowance + bands[region === "scotland" ? 2 : 0][0];
  }

  // v: { lower: income of the partner who transfers; higher: income of the partner who receives;
  //      region: "ruk" | "scotland" (where the receiving partner lives) }
  function calculate(v) {
    var limit = basicRateLimit(v.region);
    var lowerEligible = v.lower <= D.personalAllowance;
    var higherEligible = v.higher > D.personalAllowance && v.higher <= limit;
    // The partner who transfers keeps a smaller allowance, so may start paying some tax.
    var before = UK.incomeTax(Math.max(0, v.lower - D.personalAllowance), v.region);
    var after = UK.incomeTax(Math.max(0, v.lower - (D.personalAllowance - A.marriageAllowance)), v.region);
    var extraTax = round2(after - before);
    // The other partner's tax is reduced by up to £252, but not below zero.
    var partnerTax = UK.incomeTax(Math.max(0, v.higher - D.personalAllowance), v.region);
    var partnerSaving = round2(Math.min(A.marriageAllowanceSaving, partnerTax));
    var eligible = lowerEligible && higherEligible;
    return {
      limit: limit,
      lowerEligible: lowerEligible,
      higherEligible: higherEligible,
      eligible: eligible,
      partnerSaving: eligible ? partnerSaving : 0,
      extraTax: eligible ? extraTax : 0,
      net: eligible ? round2(partnerSaving - extraTax) : 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var region = document.getElementById("region");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      lower: { min: 0, max: 100000000 },
      higher: { min: 0, max: 100000000 }
    },
    defaults: { lower: "8000", higher: "35000", region: "ruk" },
    outputs: ["out-main", "out-main-note", "out-partner", "out-extra", "out-you", "out-them"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate({ lower: v.lower, higher: v.higher, region: region.value });
      T.setText("out-main", money(r.net));
      T.setText("out-main-note", r.eligible ? (r.net > 0 ? "a year less tax for you as a couple" : "no saving as a couple") : "not eligible");
      T.setText("out-partner", r.eligible ? money(r.partnerSaving) : "—");
      T.setText("out-extra", r.eligible ? money(r.extraTax) : "—");
      T.setText("out-you", r.lowerEligible ? "Yes: under the Personal Allowance" : "No: over the Personal Allowance");
      T.setText("out-them", r.higherEligible ? "Yes: basic rate" : v.higher <= D.personalAllowance ? "No: doesn't pay Income Tax" : "No: pays above the basic rate");
    }
  });
})();
