/* US Home Office Deduction Calculator — simplified vs regular method (regular excludes depreciation). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var US = window.ToolNestUS;

  function calculate(v) {
    var h = US.data.homeOffice;
    var limit = Math.max(0, v.profit); // can't exceed business income less other business expenses
    var businessPct = v.office / v.home;
    var simplifiedRaw = Math.min(v.office, h.simplifiedMaxSqFt) * h.simplifiedRatePerSqFt;
    var regularRaw = businessPct * v.expenses;
    var simplified = Math.min(simplifiedRaw, limit);
    var regular = Math.min(regularRaw, limit);
    return {
      businessPct: businessPct,
      simplifiedRaw: simplifiedRaw,
      regularRaw: regularRaw,
      simplified: simplified,
      regular: regular,
      best: regular > simplified ? "regular" : "simplified",
      bestAmount: Math.max(simplified, regular),
      capped: simplifiedRaw > limit || regularRaw > limit
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      office: { min: 1, max: 100000 },
      home: { min: 1, max: 1000000 },
      expenses: { min: 0, max: 10000000 },
      profit: { min: 0, max: 100000000 }
    },
    defaults: { office: "200", home: "1500", expenses: "24000", profit: "50000" },
    outputs: ["out-best", "out-method", "out-simple", "out-regular", "out-pct"],
    check: function (v) {
      if (v.office > v.home) return { office: "Your office can't be bigger than your home." };
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var r = calculate(v);
      T.setText("out-best", money(r.bestAmount));
      T.setText("out-method", r.best === "regular" ? "Regular method" : "Simplified method");
      T.setText("out-simple", money(r.simplified));
      T.setText("out-regular", money(r.regular));
      T.setText("out-pct", T.formatNumber(r.businessPct * 100, 1) + "%");
      document.getElementById("cap-note").hidden = !r.capped;
    }
  });
})();
