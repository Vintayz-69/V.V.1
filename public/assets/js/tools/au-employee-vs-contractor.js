/* Australia Employee vs Contractor Calculator — contractor rate that matches a salary plus super. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var AU = window.ToolNestAU;

  function calculate(v) {
    var superAmount = v.salary * AU.data.super.guaranteeRate;
    var package_ = v.salary + superAmount + v.benefits;
    var hours = v.hours * v.weeks;
    var gross = v.rate * hours;
    return {
      super: superAmount,
      package: package_,
      hours: hours,
      breakEven: package_ / hours,
      gross: gross,
      difference: gross - package_
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      salary: { min: 0, max: 100000000 },
      benefits: { min: 0, max: 10000000 },
      rate: { min: 0, max: 100000 },
      hours: { min: 1, max: 80 },
      weeks: { min: 1, max: 52 }
    },
    defaults: { salary: "95000", benefits: "0", rate: "70", hours: "38", weeks: "44" },
    outputs: ["out-breakeven", "out-verdict", "out-package", "out-super", "out-gross", "out-hours"],
    render: function (v) {
      var money = function (n, d) { return T.formatMoney(n, "AUD", d); };
      var r = calculate(v);
      T.setText("out-breakeven", money(r.breakEven));
      T.setText("out-verdict", (r.difference >= 0 ? "Contract ahead by " : "Job ahead by ") + money(Math.abs(r.difference), 0));
      T.setText("out-package", money(r.package, 0));
      T.setText("out-super", money(r.super, 0));
      T.setText("out-gross", money(r.gross, 0));
      T.setText("out-hours", T.formatNumber(r.hours));
    }
  });
})();
