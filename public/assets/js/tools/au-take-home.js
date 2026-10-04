/* Australia Take-Home Pay Calculator (2026–27) for employees: income tax, the low income tax offset,
   the 2% Medicare levy and super. Figures come only from assets/data/tax-au.js through js/au-tax.js. */
(function () {
  "use strict";

  var AU = window.ToolNestAU;
  var D = AU.data;

  function round2(n) { return Math.round(n * 100) / 100; }

  // v: salary, includesSuper (true when the amount is a package that includes super)
  function calculate(v) {
    var base = v.includesSuper ? v.salary / (1 + D.super.guaranteeRate) : v.salary;
    var r = AU.individual(base, 0);
    return {
      base: round2(base),
      superAmount: round2(base * D.super.guaranteeRate),
      basic: round2(r.basic),
      lito: round2(r.lito),
      incomeTax: round2(r.incomeTax),
      medicare: round2(r.medicare),
      total: round2(r.total),
      takeHome: round2(r.takeHome),
      monthly: round2(r.takeHome / 12),
      fortnightly: round2(r.takeHome / 26),
      weekly: round2(r.takeHome / 52),
      effective: round2(r.effectiveRate * 100)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var pkg = document.getElementById("includesSuper");

  T.setupCalculator({
    keepCurrency: true,
    rules: { salary: { min: 0, max: 100000000 } },
    defaults: { salary: "90000", includesSuper: false },
    outputs: ["out-take", "out-fortnight", "out-month", "out-week", "out-tax", "out-lito", "out-medicare", "out-super", "out-base", "out-rate"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "AUD"); };
      var r = calculate({ salary: v.salary, includesSuper: pkg.checked });
      T.setText("out-take", money(r.takeHome));
      T.setText("out-fortnight", money(r.fortnightly));
      T.setText("out-month", money(r.monthly));
      T.setText("out-week", money(r.weekly));
      T.setText("out-base", money(r.base));
      T.setText("out-tax", money(r.incomeTax));
      T.setText("out-lito", money(r.lito));
      T.setText("out-medicare", money(r.medicare));
      T.setText("out-super", money(r.superAmount));
      T.setText("out-rate", T.formatNumber(r.effective, 1) + "%");
    }
  });
})();
