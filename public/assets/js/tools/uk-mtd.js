/* Making Tax Digital for Income Tax checker. Thresholds and dates from data/mtd-uk.js. */
(function () {
  "use strict";

  var D = window.ToolNestMtdUK;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // v: { year: index into D.thresholds, selfEmployed: turnover before expenses from all sole
  // trades, months: months traded that year (part years are scaled up to a full year, as HMRC
  // does for sole traders), property: your share of property income before expenses }
  function calculate(v) {
    var annualised = round2(v.selfEmployed * 12 / v.months);
    var qualifying = round2(annualised + v.property);
    var rows = D.thresholds.map(function (t) {
      return { year: t.year, threshold: t.threshold, start: t.start, over: qualifying > t.threshold };
    });
    var row = rows[v.year];
    return {
      annualised: annualised,
      qualifying: qualifying,
      threshold: row.threshold,
      start: row.start,
      required: row.over,
      gap: round2(qualifying - row.threshold), // above 0: over the threshold by this much
      rows: rows
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var year = document.getElementById("year");
  year.innerHTML = D.thresholds.map(function (t, i) {
    return '<option value="' + i + '">' + t.year + " (start " + t.start + ")</option>";
  }).join("");
  year.value = "1";

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      selfEmployed: { min: 0, max: 1000000000 },
      months: { min: 1, max: 12 },
      property: { min: 0, max: 1000000000 }
    },
    defaults: { year: "1", selfEmployed: "45000", months: "12", property: "0" },
    outputs: ["out-main", "out-qualifying", "out-annualised", "out-threshold", "out-gap"],
    check: function (v) {
      if (v.months % 1) return { months: "Enter a whole number of months, from 1 to 12." };
    },
    onInvalid: function () {
      document.getElementById("years-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP", 0); };
      var r = calculate({ year: Number(year.value), selfEmployed: v.selfEmployed, months: v.months, property: v.property });
      T.setText("out-main", r.required ? "From " + r.start : "Not from " + r.start);
      T.setText("out-qualifying", money(r.qualifying));
      T.setText("out-annualised", v.months < 12 ? money(r.annualised) + " (" + v.months + " months scaled to 12)" : money(r.annualised));
      T.setText("out-threshold", "More than " + money(r.threshold));
      T.setText("out-gap", r.required ? money(r.gap) + " over" : money(-r.gap) + " under or equal");
      document.getElementById("years-body").innerHTML = T.tableRows(r.rows.map(function (row) {
        return [row.year + " return", "More than " + money(row.threshold), row.over ? "Yes, from " + row.start : "No"];
      }), Number(year.value));
    }
  });
})();
