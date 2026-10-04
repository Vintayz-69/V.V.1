/* Savings Goal Calculator: the monthly amount to save to reach a goal by a set time,
   with interest added monthly. Pure maths, runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function round2(n) { return Math.round(n * 100) / 100; }

  // v: goal, current (savings today), months, rate (yearly %, added monthly)
  function calculate(v) {
    var i = v.rate / 100 / 12;
    var n = v.months;
    var growth = Math.pow(1 + i, n);
    var currentGrows = v.current * growth;
    var needed = Math.max(0, v.goal - currentGrows);
    var monthly = needed === 0 ? 0 : i === 0 ? needed / n : needed * i / (growth - 1);
    var deposits = monthly * n;
    return {
      monthly: round2(monthly),
      deposits: round2(deposits),
      interest: round2(Math.max(v.goal, currentGrows) - v.current - deposits),
      currentGrows: round2(currentGrows),
      noInterest: round2(Math.max(0, v.goal - v.current) / n),
      reached: needed === 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var years = document.getElementById("months-years");

  T.setupCalculator({
    rules: {
      goal: { min: 1, max: 1000000000 },
      current: { min: 0, max: 1000000000 },
      months: { min: 1, max: 600 },
      rate: { min: 0, max: 30 }
    },
    defaults: { goal: "20000", current: "2000", months: "36", rate: "4" },
    outputs: ["out-monthly", "out-deposits", "out-interest", "out-no-interest", "out-weekly"],
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-weekly", money(r.monthly * 12 / 52));
      T.setText("out-deposits", money(r.deposits));
      T.setText("out-interest", money(r.interest));
      T.setText("out-no-interest", money(r.noInterest));
      if (years) years.textContent = "That's " + T.formatNumber(v.months / 12, v.months % 12 ? 1 : 0) + (v.months === 12 ? " year" : " years") + ".";
      var note = document.getElementById("goal-note");
      if (note) {
        note.textContent = r.reached
          ? "Your current savings should reach the goal on their own, at this interest rate."
          : "Interest is an assumption. Real savings rates change, so check your progress now and then.";
      }
    }
  });
})();
