/* Simple Interest Calculator: interest = principal × rate × time, compared with yearly compounding. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var UNIT_YEARS = { years: 1, months: 1 / 12, days: 1 / 365 };

  function round2(n) { return Math.round(n * 100) / 100; }

  // principal; rate: % a year; time in `unit` ("years" | "months" | "days", days on a 365-day year).
  function calculate(v) {
    var years = v.time * UNIT_YEARS[v.unit || "years"];
    var r = v.rate / 100;
    var interest = v.principal * r * years;
    // Yearly compounding: whole years compound, any part year left over earns simple interest.
    var whole = Math.floor(years + 1e-9);
    var compound = v.principal * Math.pow(1 + r, whole) * (1 + r * (years - whole)) - v.principal;
    return {
      years: years,
      interest: round2(interest),
      total: round2(v.principal + interest),
      perYear: round2(v.principal * r),
      perMonth: round2(v.principal * r / 12),
      compoundInterest: round2(compound) + 0, // + 0 turns -0 into 0
      difference: round2(compound - interest) + 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var unitIn = document.getElementById("unit");

  T.setupCalculator({
    rules: {
      principal: { min: 0.01, max: 1000000000 },
      rate: { min: 0, max: 100 },
      time: { min: 0.01, max: 36500 }
    },
    defaults: { principal: "10000", rate: "5", time: "3", unit: "years" },
    outputs: ["out-interest", "out-total", "out-per-year", "out-per-month", "out-compound", "out-difference"],
    check: function (v) {
      if (v.time * UNIT_YEARS[unitIn.value] > 100) return { time: "Enter a time of 100 years or less." };
    },
    onInvalid: function () {
      document.getElementById("years-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate({ principal: v.principal, rate: v.rate, time: v.time, unit: unitIn.value });
      T.setText("out-interest", money(r.interest));
      T.setText("out-total", money(r.total));
      T.setText("out-per-year", money(r.perYear));
      T.setText("out-per-month", money(r.perMonth));
      T.setText("out-compound", money(v.principal + r.compoundInterest));
      T.setText("out-difference", money(r.difference));

      // Year by year, for whole years up to the end (at most 30 rows).
      var rows = [];
      var last = Math.min(30, Math.floor(r.years));
      for (var y = 1; y <= last; y++) {
        var row = calculate({ principal: v.principal, rate: v.rate, time: y, unit: "years" });
        rows.push(["Year " + y, money(row.total), money(v.principal + row.compoundInterest)]);
      }
      document.getElementById("years-body").innerHTML = rows.length ? T.tableRows(rows)
        : '<tr><td colspan="3">Less than a year: see the results above.</td></tr>';
    }
  });
})();
