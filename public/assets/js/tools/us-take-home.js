/* US Freelancer Take-Home Pay Calculator (federal income tax + SE tax + optional flat state rate). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var US = window.ToolNestUS;

  function calculate(v) {
    var e = US.estimate(v.profit, v.status);
    var state = v.profit * (v.stateRate / 100);
    var total = e.total + state;
    return {
      federal: e,
      state: state,
      total: total,
      takeHome: v.profit - total,
      monthly: (v.profit - total) / 12,
      effective: v.profit > 0 ? total / v.profit : 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var status = document.getElementById("status");
  var qbiNote = document.getElementById("qbi-note");

  T.setupCalculator({
    keepCurrency: true,
    rules: { profit: { min: 0, max: 100000000 }, stateRate: { min: 0, max: 15 } },
    defaults: { profit: "80000", status: "single", stateRate: "0" },
    outputs: ["out-take", "out-monthly", "out-total", "out-income", "out-se", "out-addl", "out-state", "out-rate", "out-bracket"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="4">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      v.status = status.value;
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var r = calculate(v);
      T.setText("out-take", money(r.takeHome));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-total", money(r.total));
      T.setText("out-income", money(r.federal.incomeTax));
      T.setText("out-se", money(r.federal.se.total));
      T.setText("out-addl", money(r.federal.se.additionalMedicare));
      T.setText("out-state", money(r.state));
      T.setText("out-rate", T.formatNumber(r.effective * 100, 1) + "%");
      T.setText("out-bracket", T.formatNumber(r.federal.marginalRate * 100) + "%");
      qbiNote.hidden = r.federal.qbiApplies;

      var levels = [40000, 60000, 80000, 100000, 150000, 200000];
      if (levels.indexOf(v.profit) === -1) levels.push(v.profit);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.map(function (p) {
        var alt = calculate({ profit: p, status: v.status, stateRate: v.stateRate });
        return [T.formatMoney(p, "USD", 0) + (p === v.profit ? " (yours)" : ""), T.formatMoney(alt.total, "USD", 0), T.formatMoney(alt.takeHome, "USD", 0), T.formatNumber(alt.effective * 100, 1) + "%"];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, levels.indexOf(v.profit));
    }
  });
})();
