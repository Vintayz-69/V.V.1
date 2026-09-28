/* Hourly to Annual Income Calculator. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var weekly = v.rate * v.hours;
    var annual = weekly * v.weeks;
    return {
      weekly: weekly,
      annual: annual,
      monthly: annual / 12,
      biweekly: weekly * 2,
      daily: weekly / v.days,
      hoursYear: v.hours * v.weeks
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var RATES = [15, 20, 25, 30, 40, 50, 75, 100, 150];

  T.setupCalculator({
    rules: {
      rate: { min: 0, max: 100000 },
      hours: { min: 1, max: 100 },
      days: { min: 1, max: 7 },
      weeks: { min: 1, max: 52 }
    },
    defaults: { rate: "30", hours: "40", days: "5", weeks: "52" },
    outputs: ["out-annual", "out-monthly", "out-biweekly", "out-weekly", "out-daily", "out-hours"],
    check: function (v) {
      if (v.hours / v.days > 24) return { hours: "That's more than 24 hours a day. Check your hours and days." };
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var r = calculate(v);
      T.setText("out-annual", money(r.annual));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-biweekly", money(r.biweekly));
      T.setText("out-weekly", money(r.weekly));
      T.setText("out-daily", money(r.daily));
      T.setText("out-hours", T.formatNumber(r.hoursYear));

      var rates = RATES.slice();
      if (rates.indexOf(v.rate) === -1) rates.push(v.rate);
      rates.sort(function (a, b) { return a - b; });
      var rows = rates.map(function (rate) {
        var alt = calculate({ rate: rate, hours: v.hours, days: v.days, weeks: v.weeks });
        return [money(rate) + (rate === v.rate ? " (yours)" : ""), money(alt.monthly, 0), money(alt.annual, 0)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, rates.indexOf(v.rate));
    }
  });
})();
