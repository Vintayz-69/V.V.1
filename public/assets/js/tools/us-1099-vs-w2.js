/* US 1099 vs W-2 Calculator — the 1099 rate that matches a W-2 salary package. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var US = window.ToolNestUS;

  function calculate(v) {
    var d = US.data;
    // What the employer pays on top of salary: its half of Social Security (capped) and Medicare.
    var employerTax = Math.min(v.salary, d.selfEmployment.socialSecurityWageBase) * d.employerPayroll.socialSecurityRate +
      v.salary * d.employerPayroll.medicareRate;
    var w2Value = v.salary + v.benefits + employerTax;
    var hours = v.hours * v.weeks;
    var gross1099 = v.rate * hours;
    return {
      employerTax: employerTax,
      w2Value: w2Value,
      hours: hours,
      breakEven: w2Value / hours,
      gross1099: gross1099,
      difference: gross1099 - w2Value
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      salary: { min: 0, max: 100000000 },
      benefits: { min: 0, max: 10000000 },
      rate: { min: 0, max: 100000 },
      hours: { min: 1, max: 80 },
      weeks: { min: 1, max: 52 }
    },
    defaults: { salary: "90000", benefits: "12000", rate: "65", hours: "40", weeks: "48" },
    outputs: ["out-breakeven", "out-verdict", "out-w2", "out-employer", "out-1099", "out-hours"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n, d) { return T.formatMoney(n, "USD", d); };
      var r = calculate(v);
      T.setText("out-breakeven", money(r.breakEven));
      T.setText("out-verdict", (r.difference >= 0 ? "1099 ahead by " : "W-2 ahead by ") + money(Math.abs(r.difference), 0));
      T.setText("out-w2", money(r.w2Value, 0));
      T.setText("out-employer", money(r.employerTax, 0));
      T.setText("out-1099", money(r.gross1099, 0));
      T.setText("out-hours", T.formatNumber(r.hours));

      var levels = [20, 25, 30, 35, 40];
      if (levels.indexOf(v.hours) === -1) levels.push(v.hours);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.map(function (h) {
        var alt = calculate({ salary: v.salary, benefits: v.benefits, rate: v.rate, hours: h, weeks: v.weeks });
        return [T.formatNumber(h) + " hours/week" + (h === v.hours ? " (yours)" : ""), T.formatNumber(alt.hours), money(alt.breakEven)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, levels.indexOf(v.hours));
    }
  });
})();
