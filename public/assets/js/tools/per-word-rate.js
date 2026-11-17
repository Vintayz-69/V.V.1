/* Per-Word Rate Calculator: a per-word rate as a fee and a real hourly rate, and the per-word rate for a target. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // words: length of the piece; rate: price per word; hours: every hour the piece takes
  // (research, writing, edits, calls); target: optional hourly rate to aim for (null = none).
  function calculate(v) {
    var fee = v.words * v.rate;
    var r = {
      fee: fee,
      hourly: fee / v.hours,
      wordsPerHour: v.words / v.hours,
      per1000: v.rate * 1000
    };
    if (v.target) {
      r.feeForTarget = v.target * v.hours;
      r.rateForTarget = r.feeForTarget / v.words;
      r.gap = r.hourly - v.target;
    }
    return r;
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var FACTORS = [0.5, 0.75, 1, 1.5, 2];

  T.setupCalculator({
    rules: {
      words: { min: 1, max: 1000000 },
      rate: { min: 0.001, max: 100 },
      hours: { min: 0.1, max: 10000 },
      target: { min: 1, max: 100000, optional: true }
    },
    defaults: { words: "1500", rate: "0.15", hours: "5", target: "50" },
    outputs: ["out-fee", "out-hourly", "out-wph", "out-per1000", "out-gap", "out-rate-target", "out-fee-target"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var r = calculate(v);
      T.setText("out-fee", money(r.fee));
      T.setText("out-hourly", money(r.hourly));
      T.setText("out-wph", T.formatNumber(Math.round(r.wordsPerHour)) + " words");
      T.setText("out-per1000", money(r.per1000));
      if (v.target) {
        T.setText("out-gap", r.gap >= 0 ? money(r.gap) + " above" : money(-r.gap) + " below");
        T.setText("out-rate-target", money(r.rateForTarget, 3) + " a word");
        T.setText("out-fee-target", money(r.feeForTarget));
      } else {
        ["out-gap", "out-rate-target", "out-fee-target"].forEach(function (id) { T.setText(id, "Add a target rate"); });
      }

      var rows = FACTORS.map(function (f) {
        var alt = calculate({ words: v.words, rate: v.rate, hours: v.hours * f, target: null });
        var h = Math.round(v.hours * f * 100) / 100;
        return [T.formatNumber(h, h % 1 ? (Math.round(h * 100) % 10 ? 2 : 1) : 0) + " hours" + (f === 1 ? " (yours)" : ""),
                T.formatNumber(Math.round(alt.wordsPerHour)), money(alt.hourly)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, FACTORS.indexOf(1));
    }
  });
})();
