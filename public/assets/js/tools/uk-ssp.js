/* UK Statutory Sick Pay Calculator (2026 to 2027). Figures come only from assets/data/statutory-pay-uk.js. */
(function () {
  "use strict";

  var D = window.ToolNestStatutoryPayUK.ssp;

  // GOV.UK's worked examples come out rounded down to the penny (6 days a week, 4 sick = £82.16).
  // The tiny extra stops 69.6 being stored as 69.5999… and rounded down to 69.59.
  function pennyDown(n) { return Math.floor(n * 100 + 1e-7) / 100; }

  // awe: average weekly earnings; qdays: qualifying days a week (days normally worked);
  // sick: qualifying days off sick in this spell. The spell is treated as whole weeks first,
  // then the days left over in a final part week.
  function calculate(v) {
    var share = v.awe * D.earningsShare;
    var weekly = Math.min(D.weeklyRate, share);
    var maxDays = D.maxWeeks * v.qdays;
    var paidDays = Math.min(v.sick, maxDays);
    var fullWeeks = Math.floor(paidDays / v.qdays);
    var leftover = paidDays - fullWeeks * v.qdays;
    var partWeek = pennyDown(weekly / v.qdays * leftover);
    return {
      share: share,
      weekly: weekly,
      flatRateApplies: D.weeklyRate <= share,
      daily: weekly / v.qdays,
      fullWeeks: fullWeeks,
      leftover: leftover,
      partWeek: partWeek,
      total: Math.round((fullWeeks * weekly + partWeek) * 100) / 100,
      paidDays: paidDays,
      unpaidDays: v.sick - paidDays,
      maxDays: maxDays
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      awe: { min: 0.01, max: 100000 },
      qdays: { min: 1, max: 7 },
      sick: { min: 1, max: 1000 }
    },
    defaults: { awe: "600", qdays: "5", sick: "3" },
    outputs: ["out-total", "out-weekly", "out-which", "out-daily", "out-weeks", "out-cap"],
    check: function (v) {
      if (v.qdays % 1) return { qdays: "Enter a whole number of days, from 1 to 7." };
      if (v.sick % 1) return { sick: "Enter a whole number of days." };
    },
    onInvalid: function () {
      document.getElementById("days-body").innerHTML =
        '<tr><td colspan="2">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate(v);
      T.setText("out-total", money(r.total));
      T.setText("out-weekly", money(r.weekly));
      T.setText("out-which", r.flatRateApplies ? "Flat rate" : "80% of earnings");
      T.setText("out-daily", money(r.daily));
      var weeks = r.fullWeeks ? r.fullWeeks + (r.fullWeeks === 1 ? " full week" : " full weeks") : "";
      var days = r.leftover ? r.leftover + (r.leftover === 1 ? " day" : " days") : "";
      T.setText("out-weeks", [weeks, days].filter(Boolean).join(" and "));
      T.setText("out-cap", r.unpaidDays > 0 ? r.unpaidDays + " days over, not paid" : "Within the limit");

      var rows = [];
      for (var d = 1; d <= v.qdays; d++) {
        rows.push([d + (d === 1 ? " day" : " days"), money(calculate({ awe: v.awe, qdays: v.qdays, sick: d }).total)]);
      }
      document.getElementById("days-body").innerHTML = T.tableRows(rows, v.sick <= v.qdays ? v.sick - 1 : -1);
    }
  });
})();
