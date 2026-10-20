/* Pro Rata Salary Calculator: part-time or part-year pay from a full-time salary. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // salary: full-time yearly salary; ftHours: full-time hours a week; hours: your hours a week;
  // weeks: weeks of the year you'll be paid for (52 = all year).
  function calculate(v) {
    var fte = v.hours / v.ftHours;
    var yearly = v.salary * fte; // pro rata salary for a full year
    return {
      fte: fte,
      percent: fte * 100,
      yearly: yearly,
      thisYear: yearly * v.weeks / 52,
      monthly: yearly / 12,
      weekly: yearly / 52,
      hourly: v.salary / (v.ftHours * 52)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  // Common part-time patterns, as days of a five-day week.
  var DAYS = [4, 3, 2.5, 2, 1];

  T.setupCalculator({
    rules: {
      salary: { min: 1, max: 100000000 },
      ftHours: { min: 1, max: 100 },
      hours: { min: 0.5, max: 100 },
      weeks: { min: 1, max: 52 }
    },
    defaults: { salary: "30000", ftHours: "37.5", hours: "22.5", weeks: "52" },
    outputs: ["out-yearly", "out-fte", "out-this-year", "out-monthly", "out-weekly", "out-hourly"],
    check: function (v) {
      if (v.hours > v.ftHours) return { hours: "Enter no more than the full-time hours." };
    },
    onInvalid: function () {
      document.getElementById("pattern-body").innerHTML =
        '<tr><td colspan="4">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var r = calculate(v);
      T.setText("out-yearly", money(r.yearly, 0));
      T.setText("out-fte", T.formatNumber(r.fte, 2) + " (" + T.formatNumber(r.percent, 1) + "% of full time)");
      T.setText("out-this-year", money(r.thisYear));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-weekly", money(r.weekly));
      T.setText("out-hourly", money(r.hourly));

      var rows = DAYS.map(function (days) {
        var hours = v.ftHours * days / 5;
        var alt = calculate({ salary: v.salary, ftHours: v.ftHours, hours: hours, weeks: 52 });
        return [days + (days === 1 ? " day" : " days") + " a week", String(Math.round(hours * 100) / 100),
          money(alt.yearly, 0), money(alt.monthly)];
      });
      document.getElementById("pattern-body").innerHTML = T.tableRows(rows);
    }
  });
})();
