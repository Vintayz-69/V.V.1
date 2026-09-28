/* Income Smoothing Calculator — turn irregular income into a steady monthly salary. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // incomes: array of monthly income after business costs (blank months already removed).
  function calculate(incomes, v) {
    var n = incomes.length;
    var total = incomes.reduce(function (a, b) { return a + b; }, 0);
    var avg = total / n;
    var salary = avg * (1 - v.tax / 100) * (1 - v.safety / 100);
    var running = 0;
    var lowestRunning = 0;
    var rows = incomes.map(function (inc) {
      var taxSetAside = inc * (v.tax / 100);
      var diff = inc - taxSetAside - salary;
      running += diff;
      lowestRunning = Math.min(lowestRunning, running);
      return { income: inc, tax: taxSetAside, diff: diff, running: running };
    });
    return {
      months: n,
      avg: avg,
      salary: salary,
      lowest: Math.min.apply(null, incomes),
      highest: Math.max.apply(null, incomes),
      bufferTarget: salary * v.bufferMonths,
      startBuffer: Math.max(0, -lowestRunning),
      leftOver: running,
      rows: rows
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var MONTHS = [];
  for (var i = 1; i <= 12; i++) MONTHS.push("m" + i);

  var rules = { tax: { min: 0, max: 90 }, safety: { min: 0, max: 50 }, bufferMonths: { min: 0, max: 12 } };
  MONTHS.forEach(function (id) { rules[id] = { min: 0, max: 100000000, optional: true }; });

  var defaults = { tax: "25", safety: "10", bufferMonths: "3" };
  [2500, 2000, 4000, 3000, 6500, 5000, 7000, 4500, 6000, 5500, 3500, 4500].forEach(function (n, i) {
    defaults["m" + (i + 1)] = String(n);
  });

  function incomesOf(v) {
    return MONTHS.map(function (id) { return v[id]; }).filter(function (x) { return x !== null; });
  }

  T.setupCalculator({
    rules: rules,
    defaults: defaults,
    outputs: ["out-salary", "out-avg", "out-range", "out-buffer", "out-start", "out-left"],
    check: function (v) {
      if (incomesOf(v).length < 3) return { m1: "Enter at least 3 months of income." };
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="5">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var signed = function (n) { return (n < 0 ? "−" : "+") + money(Math.abs(n), 0); };
      var r = calculate(incomesOf(v), v);
      T.setText("out-salary", money(r.salary));
      T.setText("out-avg", money(r.avg, 0));
      T.setText("out-range", money(r.lowest, 0) + " – " + money(r.highest, 0));
      T.setText("out-buffer", money(r.bufferTarget, 0));
      T.setText("out-start", money(r.startBuffer, 0));
      T.setText("out-left", money(r.leftOver, 0));

      var monthNo = 0;
      var rows = MONTHS.filter(function (id) { return v[id] !== null; }).map(function (id, i) {
        monthNo = MONTHS.indexOf(id) + 1;
        var row = r.rows[i];
        return ["Month " + monthNo, money(row.income, 0), money(row.tax, 0), signed(row.diff), signed(row.running)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, -1);
    }
  });
})();
