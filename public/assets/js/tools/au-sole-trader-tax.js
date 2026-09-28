/* Australia Sole Trader Tax Calculator (2026–27). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var AU = window.ToolNestAU;

  function calculate(v) {
    return AU.individual(v.income, v.eligible ? v.income : 0);
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var eligible = document.getElementById("eligible");

  T.setupCalculator({
    keepCurrency: true,
    rules: { income: { min: 0, max: 100000000 } },
    defaults: { income: "80000", eligible: true },
    outputs: ["out-take", "out-monthly", "out-total", "out-tax", "out-medicare", "out-lito", "out-sbito", "out-rate"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="4">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      v.eligible = eligible.checked;
      var money = function (n, d) { return T.formatMoney(n, "AUD", d); };
      var r = calculate(v);
      T.setText("out-take", money(r.takeHome));
      T.setText("out-monthly", money(r.takeHome / 12));
      T.setText("out-total", money(r.total));
      T.setText("out-tax", money(r.incomeTax));
      T.setText("out-medicare", money(r.medicare));
      T.setText("out-lito", money(r.lito));
      T.setText("out-sbito", money(r.smallBusinessOffset));
      T.setText("out-rate", T.formatNumber(r.effectiveRate * 100, 1) + "%");

      var levels = [30000, 45000, 60000, 80000, 100000, 150000, 200000];
      if (levels.indexOf(v.income) === -1) levels.push(v.income);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.map(function (i) {
        var alt = calculate({ income: i, eligible: v.eligible });
        return [money(i, 0) + (i === v.income ? " (yours)" : ""), money(alt.total, 0), money(alt.takeHome, 0), T.formatNumber(alt.effectiveRate * 100, 1) + "%"];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, levels.indexOf(v.income));
    }
  });
})();
