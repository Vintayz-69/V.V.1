/* Break-Even Analysis Calculator */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var fixed = Number(v.fixed) || 0;
    var price = Number(v.price) || 0;
    var variable = Number(v.variable) || 0;

    var cm = price - variable;
    var cmRatio = price > 0 ? (cm / price) * 100 : 0;
    var units = cm > 0 ? fixed / cm : 0;
    var revenue = units * price;

    return {
      contributionMargin: cm,
      cmRatio: cmRatio,
      units: units,
      revenue: revenue
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = ["out-units", "out-revenue", "out-cm", "out-ratio"];

  T.setupCalculator({
    rules: {
      fixed: { min: 0, max: 100000000 },
      price: { min: 0.01, max: 100000000 },
      variable: { min: 0, max: 100000000 }
    },
    defaults: { fixed: "5000", price: "50", variable: "20" },
    outputs: OUTPUTS,
    check: function (v) {
      if (v.variable >= v.price) {
        return { variable: "Variable cost must be less than the selling price." };
      }
      return null;
    },
    onInvalid: function () {
      document.getElementById("breakeven-table-body").innerHTML =
        '<tr><td colspan="4">Fix highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);

      var wholeUnits = Math.ceil(r.units);
      T.setText("out-units", T.formatNumber(wholeUnits) + " units");
      T.setText("out-revenue", money(r.revenue));
      T.setText("out-cm", money(r.contributionMargin) + " / unit");
      T.setText("out-ratio", T.formatNumber(r.cmRatio) + "%");

      // Dynamic profit/loss table around break-even volume
      var steps = [
        Math.max(0, Math.floor(wholeUnits * 0.5)),
        Math.max(0, Math.floor(wholeUnits * 0.75)),
        wholeUnits,
        Math.floor(wholeUnits * 1.25),
        Math.floor(wholeUnits * 1.5)
      ];

      var rows = steps.map(function (u) {
        var rev = u * v.price;
        var totalCost = v.fixed + (u * v.variable);
        var profit = rev - totalCost;
        var status = profit > 0 ? "+" + money(profit) : (profit < 0 ? "-" + money(Math.abs(profit)) : money(0) + " (break-even)");
        return [
          T.formatNumber(u),
          money(rev),
          money(totalCost),
          status
        ];
      });

      document.getElementById("breakeven-table-body").innerHTML = T.tableRows(rows, 2);
    }
  });
})();
