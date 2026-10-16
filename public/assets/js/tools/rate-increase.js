/* Freelance Rate Increase Calculator: how much work you can lose after raising your rate and still earn the same. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // oldRate, newRate: hourly (or daily) rates; hours: units billed a month at the old rate;
  // loss: share of that work you expect to lose after the rise (%).
  function calculate(v) {
    var now = v.oldRate * v.hours;
    var keptHours = v.hours * (1 - v.loss / 100);
    var after = v.newRate * keptHours;
    return {
      now: now,
      allStay: v.newRate * v.hours,
      rise: (v.newRate / v.oldRate - 1) * 100,
      breakEvenLoss: (1 - v.oldRate / v.newRate) * 100,
      hoursToMatch: now / v.newRate,
      after: after,
      change: after - now
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var LOSSES = [0, 10, 20, 30, 40];

  T.setupCalculator({
    rules: {
      oldRate: { min: 1, max: 100000 },
      newRate: { min: 1, max: 100000 },
      hours: { min: 1, max: 744 },
      loss: { min: 0, max: 100 }
    },
    defaults: { oldRate: "75", newRate: "90", hours: "100", loss: "10" },
    outputs: ["out-breakeven", "out-rise", "out-now", "out-all-stay", "out-hours-match", "out-after", "out-change"],
    check: function (v) {
      if (v.newRate <= v.oldRate) return { newRate: "Enter a new rate higher than your current rate." };
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var signed = function (n) { return (n >= 0 ? "+" : "−") + money(Math.abs(n)); };
      var r = calculate(v);
      T.setText("out-breakeven", T.formatNumber(r.breakEvenLoss, 1) + "%");
      T.setText("out-rise", T.formatNumber(r.rise, 1) + "%");
      T.setText("out-now", money(r.now));
      T.setText("out-all-stay", money(r.allStay));
      T.setText("out-hours-match", T.formatNumber(Math.round(r.hoursToMatch * 10) / 10));
      T.setText("out-after", money(r.after));
      T.setText("out-change", signed(r.change));

      var losses = LOSSES.slice();
      if (losses.indexOf(v.loss) === -1) losses.push(v.loss);
      losses.sort(function (a, b) { return a - b; });
      var rows = losses.map(function (loss) {
        var alt = calculate({ oldRate: v.oldRate, newRate: v.newRate, hours: v.hours, loss: loss });
        return [loss + "%" + (loss === v.loss ? " (yours)" : ""), money(alt.after), signed(alt.change)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, losses.indexOf(v.loss));
    }
  });
})();
