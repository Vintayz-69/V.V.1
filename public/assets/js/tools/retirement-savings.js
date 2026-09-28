/* Retirement Savings Calculator — compound growth with monthly contributions. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var n = Math.round((v.retireAge - v.age) * 12);
    var r = Math.pow(1 + v.returnPct / 100, 1 / 12) - 1; // monthly rate equivalent to the yearly return
    var g = Math.pow(1 + r, n);
    var pot = v.current * g + (r === 0 ? v.monthly * n : v.monthly * (g - 1) / r);
    var contributed = v.current + v.monthly * n;
    var yearlyIncome = pot * (v.withdrawPct / 100);
    return {
      months: n,
      pot: pot,
      contributed: contributed,
      growth: pot - contributed,
      yearlyIncome: yearlyIncome,
      monthlyIncome: yearlyIncome / 12
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var LEVELS = [250, 500, 750, 1000, 1500];

  T.setupCalculator({
    rules: {
      age: { min: 16, max: 90 },
      retireAge: { min: 17, max: 100 },
      current: { min: 0, max: 1000000000 },
      monthly: { min: 0, max: 10000000 },
      returnPct: { min: 0, max: 15 },
      withdrawPct: { min: 1, max: 10 }
    },
    defaults: { age: "30", retireAge: "65", current: "10000", monthly: "500", returnPct: "5", withdrawPct: "4" },
    outputs: ["out-pot", "out-contributed", "out-growth", "out-yearly", "out-monthly"],
    check: function (v) {
      if (v.retireAge <= v.age) return { retireAge: "Retirement age must be older than your age now." };
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var r = calculate(v);
      T.setText("out-pot", money(r.pot, 0));
      T.setText("out-contributed", money(r.contributed, 0));
      T.setText("out-growth", money(r.growth, 0));
      T.setText("out-yearly", money(r.yearlyIncome, 0));
      T.setText("out-monthly", money(r.monthlyIncome, 0));

      var levels = LEVELS.slice();
      if (levels.indexOf(v.monthly) === -1) levels.push(v.monthly);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.map(function (m) {
        var alt = calculate({ age: v.age, retireAge: v.retireAge, current: v.current, monthly: m, returnPct: v.returnPct, withdrawPct: v.withdrawPct });
        return [money(m, 0) + " / month" + (m === v.monthly ? " (yours)" : ""), money(alt.pot, 0), money(alt.monthlyIncome, 0)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, levels.indexOf(v.monthly));
    }
  });
})();
