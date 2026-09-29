/* Profit Margin & Markup Calculator */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var cost = Number(v.cost) || 0;
    var revenue = Number(v.revenue) || 0;
    var expenses = Number(v.expenses) || 0;

    var grossProfit = revenue - cost;
    var grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    var markup = cost > 0 ? (grossProfit / cost) * 100 : 0;
    var netProfit = grossProfit - expenses;
    var netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      grossProfit: grossProfit,
      grossMargin: grossMargin,
      markup: markup,
      netProfit: netProfit,
      netMargin: netMargin
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = ["out-gross-profit", "out-gross-margin", "out-markup", "out-net-profit", "out-net-margin"];

  T.setupCalculator({
    rules: {
      cost: { min: 0, max: 100000000 },
      revenue: { min: 0, max: 100000000 },
      expenses: { min: 0, max: 100000000 }
    },
    defaults: { cost: "60", revenue: "100", expenses: "15" },
    outputs: OUTPUTS,
    onInvalid: function () {
      document.getElementById("margin-table-body").innerHTML =
        '<tr><td colspan="3">Fix highlighted fields to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);

      T.setText("out-gross-margin", T.formatNumber(r.grossMargin) + "%");
      T.setText("out-gross-profit", money(r.grossProfit));
      T.setText("out-markup", T.formatNumber(r.markup) + "%");
      T.setText("out-net-profit", money(r.netProfit));
      T.setText("out-net-margin", T.formatNumber(r.netMargin) + "%");

      // What-if table for target gross margins: 20%, 30%, 40%, 50%, 60%
      var targets = [20, 30, 40, 50, 60];
      var rows = targets.map(function (targetMargin) {
        var neededPrice = targetMargin < 100 ? v.cost / (1 - targetMargin / 100) : 0;
        var profit = neededPrice - v.cost;
        return [
          targetMargin + "%",
          money(neededPrice),
          money(profit)
        ];
      });
      document.getElementById("margin-table-body").innerHTML = T.tableRows(rows);
    }
  });
})();
