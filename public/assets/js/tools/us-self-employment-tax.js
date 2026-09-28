/* US Self-Employment Tax Calculator (Schedule SE + Additional Medicare). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var US = window.ToolNestUS;

  function calculate(v) {
    var r = US.selfEmploymentTax(v.profit, v.status, v.wages);
    r.effective = v.profit > 0 ? (r.total + r.additionalMedicare) / v.profit : 0;
    return r;
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var status = document.getElementById("status");

  T.setupCalculator({
    keepCurrency: true,
    rules: { profit: { min: 0, max: 100000000 }, wages: { min: 0, max: 100000000 } },
    defaults: { profit: "80000", status: "single", wages: "0" },
    outputs: ["out-total", "out-ss", "out-med", "out-addl", "out-half", "out-net", "out-rate"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      v.status = status.value;
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var r = calculate(v);
      T.setText("out-total", money(r.total));
      T.setText("out-ss", money(r.socialSecurity));
      T.setText("out-med", money(r.medicare));
      T.setText("out-addl", money(r.additionalMedicare));
      T.setText("out-half", money(r.deductibleHalf));
      T.setText("out-net", money(r.netEarnings));
      T.setText("out-rate", T.formatNumber(r.effective * 100, 1) + "%");

      var levels = [25000, 50000, 100000, 150000, 200000, 300000];
      if (levels.indexOf(v.profit) === -1) levels.push(v.profit);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.map(function (p) {
        var alt = calculate({ profit: p, status: v.status, wages: v.wages });
        return [T.formatMoney(p, "USD", 0) + (p === v.profit ? " (yours)" : ""), money(alt.total + alt.additionalMedicare), T.formatNumber(alt.effective * 100, 1) + "%"];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, levels.indexOf(v.profit));
    }
  });
})();
