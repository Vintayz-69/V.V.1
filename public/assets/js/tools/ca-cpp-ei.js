/* Canada CPP and EI Calculator (2026) for employees outside Quebec: the employee's CPP, CPP2 and
   EI premiums, and what the employer pays on top. Figures come only from assets/data/tax-ca.js. */
(function () {
  "use strict";

  var D = window.ToolNestTaxCA;

  function round2(n) { return Math.round(n * 100) / 100; }

  // v: salary (yearly pensionable and insurable earnings), periods (pay periods a year)
  function calculate(v) {
    var c = D.cpp;
    var cpp = Math.max(0, Math.min(v.salary, c.ympe) - c.basicExemption) * c.rate;
    var cpp2 = Math.max(0, Math.min(v.salary, c.yampe) - c.ympe) * c.cpp2Rate;
    var ei = Math.min(v.salary, D.ei.maxInsurable) * D.ei.employeeRate;
    var employee = round2(cpp) + round2(cpp2) + round2(ei);
    var employerEi = round2(ei * D.ei.employerMultiplier);
    return {
      cpp: round2(cpp),
      cpp2: round2(cpp2),
      ei: round2(ei),
      employee: round2(employee),
      perPeriod: round2(employee / v.periods),
      employerEi: employerEi,
      employer: round2(round2(cpp) + round2(cpp2) + employerEi),
      cppMax: round2((c.ympe - c.basicExemption) * c.rate),
      cpp2Max: round2((c.yampe - c.ympe) * c.cpp2Rate),
      eiMax: round2(D.ei.maxInsurable * D.ei.employeeRate)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var periods = document.getElementById("periods");

  T.setupCalculator({
    keepCurrency: true,
    rules: { salary: { min: 0, max: 100000000 } },
    defaults: { salary: "60000", periods: "26" },
    outputs: ["out-employee", "out-period", "out-cpp", "out-cpp2", "out-ei", "out-employer", "out-total"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "CAD"); };
      var r = calculate({ salary: v.salary, periods: Number(periods.value) });
      T.setText("out-employee", money(r.employee));
      T.setText("out-period", money(r.perPeriod));
      T.setText("out-cpp", money(r.cpp) + (r.cpp >= r.cppMax ? " (maximum)" : ""));
      T.setText("out-cpp2", money(r.cpp2) + (r.cpp2 >= r.cpp2Max ? " (maximum)" : ""));
      T.setText("out-ei", money(r.ei) + (r.ei >= r.eiMax ? " (maximum)" : ""));
      T.setText("out-employer", money(r.employer));
      T.setText("out-total", money(r.employee + r.employer));
    }
  });
})();
