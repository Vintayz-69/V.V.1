/* Freelance Hourly Rate Calculator — formula in README §6. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var workingWeeks = 52 - v.weeksOff;
    var billableHours = workingWeeks * v.hours * (v.billable / 100);
    var preTaxProfit = v.income / (1 - v.tax / 100);
    var revenue = preTaxProfit + v.expenses;
    var hourly = revenue / billableHours;
    return {
      billableHours: billableHours,
      preTaxProfit: preTaxProfit,
      tax: preTaxProfit - v.income,
      revenue: revenue,
      hourly: hourly,
      day: hourly * 8,
      monthly: revenue / 12
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = ["out-hourly", "out-day", "out-monthly", "out-revenue", "out-profit", "out-taxamt", "out-hours"];

  T.setupCalculator({
    rules: {
      income: { min: 0, max: 100000000 },
      expenses: { min: 0, max: 100000000 },
      tax: { min: 0, max: 90 },
      weeksOff: { min: 0, max: 51 },
      hours: { min: 1, max: 100 },
      billable: { min: 1, max: 100 }
    },
    defaults: { income: "60000", expenses: "6000", tax: "25", weeksOff: "4", hours: "40", billable: "70" },
    outputs: OUTPUTS,
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-hourly", money(r.hourly));
      T.setText("out-day", money(r.day));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-revenue", money(r.revenue));
      T.setText("out-profit", money(r.preTaxProfit));
      T.setText("out-taxamt", money(r.tax));
      T.setText("out-hours", T.formatNumber(r.billableHours));

      var pcts = [50, 60, 70, 80, 90];
      if (pcts.indexOf(v.billable) === -1) pcts.push(v.billable);
      pcts.sort(function (a, b) { return a - b; });

      var rows = pcts.map(function (pct) {
        var w = calculate({ income: v.income, expenses: v.expenses, tax: v.tax, weeksOff: v.weeksOff, hours: v.hours, billable: pct });
        var label = T.formatNumber(pct) + "%" + (pct === v.billable ? " (yours)" : "");
        return [label, T.formatNumber(w.billableHours), money(w.hourly)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, pcts.indexOf(v.billable));
    }
  });
})();
