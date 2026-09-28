/* Billable Hours Calculator. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var unpaid = v.admin + v.sales + v.learning + v.other;
    var week = v.hours - unpaid;
    var workingWeeks = 52 - v.weeksOff;
    var year = week * workingWeeks;
    var revenue = year * v.rate;
    return {
      unpaidWeek: unpaid,
      week: week,
      year: year,
      pct: week / v.hours,
      unpaidYear: unpaid * workingWeeks,
      revenue: revenue,
      perHourWorked: revenue / (v.hours * workingWeeks)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      hours: { min: 1, max: 100 },
      weeksOff: { min: 0, max: 51 },
      admin: { min: 0, max: 100 },
      sales: { min: 0, max: 100 },
      learning: { min: 0, max: 100 },
      other: { min: 0, max: 100 },
      rate: { min: 0, max: 100000 }
    },
    defaults: { hours: "40", weeksOff: "6", admin: "4", sales: "5", learning: "2", other: "1", rate: "75" },
    outputs: ["out-year", "out-pct", "out-week", "out-unpaid", "out-revenue", "out-perhour"],
    check: function (v) {
      if (v.admin + v.sales + v.learning + v.other > v.hours) {
        return { hours: "Unpaid hours add up to more than the hours you work." };
      }
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-year", T.formatNumber(r.year));
      T.setText("out-pct", T.formatNumber(r.pct * 100, 1) + "%");
      T.setText("out-week", T.formatNumber(r.week));
      T.setText("out-unpaid", T.formatNumber(r.unpaidYear));
      T.setText("out-revenue", v.rate > 0 ? money(r.revenue) : "—");
      T.setText("out-perhour", v.rate > 0 ? money(r.perHourWorked) : "—");

      var share = function (h) { return T.formatNumber((h / v.hours) * 100, 1) + "%"; };
      var rows = [
        ["Billable client work", T.formatNumber(r.week), share(r.week)],
        ["Admin", T.formatNumber(v.admin), share(v.admin)],
        ["Sales and marketing", T.formatNumber(v.sales), share(v.sales)],
        ["Learning", T.formatNumber(v.learning), share(v.learning)],
        ["Other unpaid time", T.formatNumber(v.other), share(v.other)]
      ];
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, 0);
    }
  });
})();
