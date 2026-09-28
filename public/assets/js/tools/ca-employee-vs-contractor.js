/* Canada Employee vs Contractor Calculator — contractor rate that matches a salaried job. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var CA = window.ToolNestCA;

  function calculate(v) {
    var ei = CA.data.ei;
    var employerCpp = CA.employerCpp(v.salary);        // a contractor pays this half too
    var employeeEi = Math.min(v.salary, ei.maxInsurable) * ei.employeeRate; // saved as a contractor, but no EI cover
    var package_ = v.salary + v.benefits + employerCpp;
    var hours = v.hours * v.weeks;
    var gross = v.rate * hours;
    return {
      employerCpp: employerCpp,
      employeeEi: employeeEi,
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
    defaults: { salary: "75000", benefits: "8000", rate: "55", hours: "37.5", weeks: "46" },
    outputs: ["out-breakeven", "out-verdict", "out-package", "out-cpp", "out-gross", "out-ei"],
    render: function (v) {
      var money = function (n, d) { return T.formatMoney(n, "CAD", d); };
      var r = calculate(v);
      T.setText("out-breakeven", money(r.breakEven));
      T.setText("out-verdict", (r.difference >= 0 ? "Contract ahead by " : "Job ahead by ") + money(Math.abs(r.difference), 0));
      T.setText("out-package", money(r.package, 0));
      T.setText("out-cpp", money(r.employerCpp, 0));
      T.setText("out-gross", money(r.gross, 0));
      T.setText("out-ei", money(r.employeeEi, 0));
    }
  });
})();
