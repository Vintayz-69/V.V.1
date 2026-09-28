/* UK Self-Employed Tax and National Insurance Calculator (2026 to 2027). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var UK = window.ToolNestUK;

  function calculate(v) {
    return UK.soleTrader(v.profit, v.region);
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var region = document.getElementById("region");
  var class2Note = document.getElementById("class2-note");

  T.setupCalculator({
    keepCurrency: true,
    rules: { profit: { min: 0, max: 100000000 } },
    defaults: { profit: "45000", region: "ruk" },
    outputs: ["out-take", "out-monthly", "out-total", "out-it", "out-ni", "out-pa", "out-rate"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="4">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      v.region = region.value;
      var money = function (n, d) { return T.formatMoney(n, "GBP", d); };
      var r = calculate(v);
      T.setText("out-take", money(r.takeHome));
      T.setText("out-monthly", money(r.takeHome / 12));
      T.setText("out-total", money(r.total));
      T.setText("out-it", money(r.incomeTax));
      T.setText("out-ni", money(r.class4));
      T.setText("out-pa", money(r.personalAllowance, 0));
      T.setText("out-rate", T.formatNumber(r.effectiveRate * 100, 1) + "%");
      class2Note.textContent = r.class2Treated
        ? "Your profits are over £7,105, so Class 2 National Insurance is treated as paid: you get the State Pension credit without paying it."
        : "Your profits are under £7,105. You don't have to pay Class 2 National Insurance, but you can pay it voluntarily (£3.65 a week) to protect your State Pension.";

      var levels = [20000, 30000, 45000, 60000, 80000, 110000, 150000];
      if (levels.indexOf(v.profit) === -1) levels.push(v.profit);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.map(function (p) {
        var alt = calculate({ profit: p, region: v.region });
        return [money(p, 0) + (p === v.profit ? " (yours)" : ""), money(alt.total, 0), money(alt.takeHome, 0), T.formatNumber(alt.effectiveRate * 100, 1) + "%"];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, levels.indexOf(v.profit));
    }
  });
})();
