/* UK director's salary comparison (2026 to 2027): take-home from different salaries, with the rest
   of the company's profit paid as dividends. Tax from js/uk-tax.js (data/tax-uk.js). */
(function () {
  "use strict";

  var UK = window.ToolNestUK;
  var D = UK.data;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // The salaries compared: nothing, the employer NI threshold, the Personal Allowance, and your own.
  function options(custom) {
    var list = [0, D.class1.secondaryThreshold, D.personalAllowance];
    if (custom !== null && list.indexOf(custom) < 0) list.push(custom);
    return list.sort(function (a, b) { return a - b; });
  }

  // v: { profit: company profit before your salary; region; employmentAllowance; custom: a salary to
  //      compare too, or null; costs: company running costs }
  function calculate(v) {
    var rows = options(v.custom).filter(function (s) { return s <= v.profit; }).map(function (s) {
      var r = UK.limitedCompany({ profit: v.profit, salary: s, companyCosts: v.costs, region: v.region, employmentAllowance: v.employmentAllowance });
      return {
        salary: s,
        employerNI: round2(r.employerNI),
        employeeNI: round2(r.employeeNI),
        corporationTax: round2(r.corporationTax),
        dividends: round2(r.dividends),
        personalTax: round2(r.salaryTax + r.dividendTax),
        takeHome: round2(r.takeHome)
      };
    });
    var best = rows.reduce(function (a, b) { return b.takeHome > a.takeHome ? b : a; }, rows[0]);
    return { rows: rows, best: best };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var region = document.getElementById("region");
  var ea = document.getElementById("employmentAllowance");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      profit: { min: 1, max: 100000000 },
      custom: { min: 0, max: 1000000, optional: true },
      costs: { min: 0, max: 1000000 }
    },
    defaults: { profit: "60000", custom: "", costs: "0", region: "ruk", employmentAllowance: false },
    outputs: ["out-main", "out-main-note", "out-take", "out-gap"],
    onInvalid: function () {
      document.getElementById("salary-body").innerHTML = '<tr><td colspan="6">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate({ profit: v.profit, region: region.value, employmentAllowance: ea.checked, custom: v.custom, costs: v.costs });
      var worst = r.rows.reduce(function (a, b) { return b.takeHome < a.takeHome ? b : a; }, r.rows[0]);
      T.setText("out-main", money(r.best.salary));
      T.setText("out-main-note", "salary leaves the most of the options below");
      T.setText("out-take", money(r.best.takeHome));
      T.setText("out-gap", money(r.best.takeHome - worst.takeHome));
      var bestIndex = r.rows.indexOf(r.best);
      document.getElementById("salary-body").innerHTML = T.tableRows(r.rows.map(function (row) {
        return [money(row.salary), money(row.employerNI + row.employeeNI), money(row.corporationTax), money(row.dividends), money(row.personalTax), money(row.takeHome)];
      }), bestIndex);
    }
  });
})();
