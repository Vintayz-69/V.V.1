/* UK Statutory Redundancy Pay Calculator (England, Scotland and Wales).
 * Figures come only from data/employment-uk.js.
 * Each full year of service, counting back from the redundancy date, earns weeks' pay by the
 * youngest age the employee was during that whole year: 1.5 weeks at 41 or over, 1 week at 22
 * to 40, half a week under 22. Only the last 20 years count, and weekly pay is capped. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var R = window.ToolNestEmploymentUK.redundancy;

  function weeksForAge(age) {
    for (var i = 0; i < R.bands.length; i++) if (age >= R.bands[i][0]) return R.bands[i][1];
    return 0;
  }

  // v: { age (completed years on the redundancy date), years (full years of service), weekly (gross £) }
  function calculate(v) {
    var counted = Math.min(Math.floor(v.years), R.maxYears);
    var rows = [];
    var weeks = 0;
    for (var k = 1; k <= counted; k++) {
      var ageThatYear = v.age - k; // the youngest they were during the k-th year back
      var w = weeksForAge(ageThatYear);
      weeks += w;
      rows.push({ year: k, age: ageThatYear, weeks: w });
    }
    var weekly = Math.min(v.weekly, R.weeklyPayCap);
    var qualifies = Math.floor(v.years) >= R.minYears;
    return {
      qualifies: qualifies,
      counted: counted,
      weeks: weeks,
      weeklyUsed: weekly,
      capped: v.weekly > R.weeklyPayCap,
      pay: qualifies ? weeks * weekly : 0,
      rows: rows
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      age: { min: 16, max: 100 },
      years: { min: 0, max: 80 },
      weekly: { min: 0, max: 1000000 }
    },
    check: function (v) {
      if (v.years > v.age - 14) return { years: "That's longer than you could have worked at your age." };
    },
    defaults: { age: "45", years: "10", weekly: "600" },
    outputs: ["out-pay", "out-weeks", "out-weekly", "out-years"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate(v);
      T.setText("out-pay", money(r.pay));
      T.setText("out-weeks", T.formatNumber(r.weeks, r.weeks % 1 ? 1 : 0) + " weeks");
      T.setText("out-weekly", money(r.weeklyUsed) + (r.capped ? " (capped)" : ""));
      T.setText("out-years", T.formatNumber(r.counted) + (Math.floor(v.years) > R.maxYears ? " (only the last 20 count)" : ""));
      var note = document.getElementById("out-note");
      if (!r.qualifies) note.textContent = "You need at least 2 full years' service to get statutory redundancy pay. Your contract may still give you something.";
      else if (r.capped) note.textContent = "Your weekly pay is over the £" + R.weeklyPayCap + " limit, so £" + R.weeklyPayCap + " is used. Your employer can pay more than the legal minimum.";
      else note.textContent = "This is the legal minimum. Your contract may give you more.";

      var body = document.getElementById("years-body");
      if (!r.rows.length) {
        body.innerHTML = '<tr><td colspan="3">Enter your years of service above.</td></tr>';
        return;
      }
      var rows = r.rows.map(function (row) {
        return [row.year === 1 ? "Most recent year" : T.formatNumber(row.year) + " years back", String(row.age) + "+", T.formatNumber(row.weeks, row.weeks % 1 ? 1 : 0)];
      });
      body.innerHTML = T.tableRows(rows, -1);
    }
  });
})();
