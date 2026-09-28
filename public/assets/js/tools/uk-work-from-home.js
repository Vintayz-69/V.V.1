/* UK Working From Home Expenses Calculator — simplified flat rate vs share of actual bills. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var UK = window.ToolNestUK;

  function flatRateFor(hours) {
    var rates = UK.data.workFromHome;
    for (var i = 0; i < rates.length; i++) if (hours >= rates[i][0]) return rates[i][1];
    return 0;
  }

  function calculate(v) {
    var perMonth = flatRateFor(v.hours);
    var simplified = perMonth * v.months;
    var actual = v.bills * (v.share / 100);
    return {
      perMonth: perMonth,
      eligible: perMonth > 0,
      simplified: simplified,
      actual: actual,
      best: actual > simplified ? "actual" : "simplified",
      bestAmount: Math.max(simplified, actual)
    };
  }

  window.ToolNestCalc = { calculate: calculate, flatRateFor: flatRateFor };
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      hours: { min: 0, max: 744 },
      months: { min: 1, max: 12 },
      bills: { min: 0, max: 1000000 },
      share: { min: 0, max: 100 }
    },
    defaults: { hours: "120", months: "12", bills: "3000", share: "10" },
    outputs: ["out-best", "out-method", "out-simple", "out-actual", "out-month"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate(v);
      T.setText("out-best", money(r.bestAmount));
      T.setText("out-method", r.best === "actual" ? "Actual costs" : "Simplified flat rate");
      T.setText("out-simple", r.eligible ? money(r.simplified) : "Not eligible (under 25 hours)");
      T.setText("out-actual", money(r.actual));
      T.setText("out-month", r.eligible ? money(r.perMonth) : "£0.00");
    }
  });
})();
