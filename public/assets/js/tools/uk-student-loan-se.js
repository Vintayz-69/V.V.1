/* UK student loan repayments for the self-employed (through Self Assessment), 2026 to 2027.
   Thresholds and rates from data/tax-uk.js (studentLoans). */
(function () {
  "use strict";

  var L = window.ToolNestTaxUK.studentLoans;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // Plans 1, 2, 4 and 5: 9% of income over the lowest threshold of the plans you have.
  // A Postgraduate Loan: 6% over its own threshold, on top.
  function repayment(income, plans, postgraduate) {
    var main = 0;
    if (plans.length) {
      var lowest = Math.min.apply(null, plans.map(function (p) { return L[p].threshold; }));
      main = Math.max(0, income - lowest) * L[plans[0]].rate;
    }
    var pg = postgraduate ? Math.max(0, income - L.postgraduate.threshold) * L.postgraduate.rate : 0;
    return { main: round2(main), postgraduate: round2(pg), total: round2(main + pg) };
  }

  // v: { profit: self-employed profit; salary: pay from a job; plans: ["plan1", ...]; postgraduate }
  function calculate(v) {
    var total = repayment(v.profit + v.salary, v.plans, v.postgraduate);
    var payroll = repayment(v.salary, v.plans, v.postgraduate);
    return {
      income: round2(v.profit + v.salary),
      main: total.main,
      postgraduate: total.postgraduate,
      total: total.total,
      viaPayroll: payroll.total,
      viaSelfAssessment: round2(total.total - payroll.total)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var planBoxes = ["plan1", "plan2", "plan4", "plan5"].map(function (p) { return document.getElementById(p); });
  var pgBox = document.getElementById("postgraduate");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      profit: { min: 0, max: 100000000 },
      salary: { min: 0, max: 100000000 }
    },
    defaults: { profit: "32000", salary: "10000", plan1: true, plan2: false, plan4: false, plan5: false, postgraduate: false },
    outputs: ["out-main", "out-income", "out-plans", "out-pg", "out-payroll", "out-sa"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var plans = planBoxes.filter(function (b) { return b.checked; }).map(function (b) { return b.id; });
      var r = calculate({ profit: v.profit, salary: v.salary, plans: plans, postgraduate: pgBox.checked });
      T.setText("out-main", money(r.total));
      T.setText("out-income", money(r.income));
      T.setText("out-plans", plans.length ? money(r.main) : "No plan ticked");
      T.setText("out-pg", pgBox.checked ? money(r.postgraduate) : "—");
      T.setText("out-payroll", money(r.viaPayroll));
      T.setText("out-sa", money(r.viaSelfAssessment));
    }
  });
})();
