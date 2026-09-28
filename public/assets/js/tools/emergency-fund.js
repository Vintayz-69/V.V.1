/* Emergency Fund Calculator. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var monthly = v.personal + v.business;
    var target = monthly * v.months;
    var gap = Math.max(0, target - v.saved);
    return {
      monthly: monthly,
      target: target,
      gap: gap,
      covers: v.saved / monthly,
      // Months of saving needed; Infinity when there's a gap but nothing is being saved.
      monthsToGoal: gap === 0 ? 0 : (v.save > 0 ? Math.ceil(gap / v.save) : Infinity)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      personal: { min: 0, max: 100000000 },
      business: { min: 0, max: 100000000 },
      months: { min: 1, max: 24 },
      saved: { min: 0, max: 1000000000 },
      save: { min: 0, max: 100000000 }
    },
    defaults: { personal: "3000", business: "500", months: "6", saved: "5000", save: "800" },
    outputs: ["out-target", "out-monthly", "out-covers", "out-gap", "out-time"],
    check: function (v) {
      if (v.personal + v.business <= 0) return { personal: "Enter your monthly costs so we can size your fund." };
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var r = calculate(v);
      T.setText("out-target", money(r.target, 0));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-covers", T.formatNumber(r.covers, 1) + " months");
      T.setText("out-gap", r.gap === 0 ? "Goal reached" : money(r.gap, 0));
      T.setText("out-time", r.monthsToGoal === 0 ? "Goal reached" :
        (r.monthsToGoal === Infinity ? "Add a monthly amount" : T.formatNumber(r.monthsToGoal) + (r.monthsToGoal === 1 ? " month" : " months")));

      var options = [3, 6, 9, 12];
      if (options.indexOf(v.months) === -1) options.push(v.months);
      options.sort(function (a, b) { return a - b; });
      var rows = options.map(function (m) {
        var alt = calculate({ personal: v.personal, business: v.business, months: m, saved: v.saved, save: v.save });
        var time = alt.monthsToGoal === 0 ? "Reached" : (alt.monthsToGoal === Infinity ? "—" : T.formatNumber(alt.monthsToGoal) + " mo");
        return [T.formatNumber(m) + " months" + (m === v.months ? " (yours)" : ""), money(alt.target, 0), time];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, options.indexOf(v.months));
    }
  });
})();
