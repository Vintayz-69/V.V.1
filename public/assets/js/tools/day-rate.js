/* Contractor Day Rate Calculator. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var days = 260 - v.daysOff - v.benchWeeks * 5;
    var preTaxProfit = v.income / (1 - v.tax / 100);
    var revenue = preTaxProfit + v.expenses;
    var day = revenue / days;
    return {
      days: days,
      revenue: revenue,
      day: day,
      hourly: day / v.hoursPerDay,
      weekly: day * 5,
      monthly: revenue / 12
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      income: { min: 0, max: 100000000 },
      expenses: { min: 0, max: 100000000 },
      tax: { min: 0, max: 90 },
      daysOff: { min: 0, max: 200 },
      benchWeeks: { min: 0, max: 40 },
      hoursPerDay: { min: 1, max: 16 }
    },
    defaults: { income: "60000", expenses: "5000", tax: "30", daysOff: "33", benchWeeks: "4", hoursPerDay: "7.5" },
    outputs: ["out-day", "out-hourly", "out-weekly", "out-monthly", "out-revenue", "out-days"],
    check: function (v) {
      if (260 - v.daysOff - v.benchWeeks * 5 < 1) {
        return { benchWeeks: "Days off and gaps leave no working days. Lower one of them." };
      }
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-day", money(r.day));
      T.setText("out-hourly", money(r.hourly));
      T.setText("out-weekly", money(r.weekly));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-revenue", money(r.revenue));
      T.setText("out-days", T.formatNumber(r.days));

      var weeks = [0, 2, 4, 8, 12];
      if (weeks.indexOf(v.benchWeeks) === -1) weeks.push(v.benchWeeks);
      weeks.sort(function (a, b) { return a - b; });

      var rows = [];
      var mine = -1;
      weeks.forEach(function (w) {
        var alt = calculate({ income: v.income, expenses: v.expenses, tax: v.tax, daysOff: v.daysOff, benchWeeks: w, hoursPerDay: v.hoursPerDay });
        if (alt.days < 1) return;
        if (w === v.benchWeeks) mine = rows.length;
        rows.push([T.formatNumber(w) + (w === 1 ? " week" : " weeks") + (w === v.benchWeeks ? " (yours)" : ""), T.formatNumber(alt.days), money(alt.day)]);
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, mine);
    }
  });
})();
