/* Job Offer Comparison Calculator: puts two offers side by side, counting bonus, benefits,
   commuting costs and commuting time. Before tax. Runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function round2(n) { return Math.round(n * 100) / 100; }

  // o: salary, bonus, benefits (yearly value), hours (per week), days (commuting days a year),
  //    cost (commuting cost per day), time (commuting hours per day, round trip)
  function offer(o) {
    var commuteCost = o.days * o.cost;
    var value = o.salary + o.bonus + o.benefits - commuteCost;
    var hours = o.hours * 52 + o.days * o.time;
    return {
      pay: round2(o.salary + o.bonus + o.benefits),
      commuteCost: round2(commuteCost),
      value: round2(value),
      hours: round2(hours),
      hourly: hours > 0 ? round2(value / hours) : 0
    };
  }

  function calculate(v) {
    var a = offer(v.a);
    var b = offer(v.b);
    return { a: a, b: b, valueGap: round2(b.value - a.value), hourlyGap: round2(b.hourly - a.hourly) };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var KEYS = ["salary", "bonus", "benefits", "hours", "days", "cost", "time"];
  var rules = {};
  var defaults = {};
  var EXAMPLE = {
    a: { salary: 50000, bonus: 0, benefits: 0, hours: 37.5, days: 0, cost: 0, time: 0 },
    b: { salary: 55000, bonus: 5000, benefits: 0, hours: 45, days: 200, cost: 15, time: 1.5 }
  };
  var LIMITS = { salary: 100000000, bonus: 100000000, benefits: 100000000, hours: 100, days: 366, cost: 10000, time: 12 };
  ["a", "b"].forEach(function (side) {
    KEYS.forEach(function (k) {
      rules[side + "-" + k] = { min: k === "hours" ? 1 : 0, max: LIMITS[k] };
      defaults[side + "-" + k] = String(EXAMPLE[side][k]);
    });
  });

  function pick(v, side) {
    var o = {};
    KEYS.forEach(function (k) { o[k] = v[side + "-" + k]; });
    return o;
  }

  T.setupCalculator({
    rules: rules,
    defaults: defaults,
    outputs: ["out-verdict", "out-a-value", "out-b-value", "out-a-hourly", "out-b-hourly", "out-a-commute", "out-b-commute", "out-gap"],
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate({ a: pick(v, "a"), b: pick(v, "b") });
      T.setText("out-a-value", money(r.a.value));
      T.setText("out-b-value", money(r.b.value));
      T.setText("out-a-hourly", money(r.a.hourly));
      T.setText("out-b-hourly", money(r.b.hourly));
      T.setText("out-a-commute", money(r.a.commuteCost) + " · " + T.formatNumber(v["a-days"] * v["a-time"]) + " h");
      T.setText("out-b-commute", money(r.b.commuteCost) + " · " + T.formatNumber(v["b-days"] * v["b-time"]) + " h");
      T.setText("out-gap", (r.valueGap >= 0 ? "Offer B by " : "Offer A by ") + money(Math.abs(r.valueGap)) + " a year");

      var better = r.hourlyGap > 0 ? "Offer B" : r.hourlyGap < 0 ? "Offer A" : "Neither";
      T.setText("out-verdict", better === "Neither" ? "Same per hour" : better);
      var note = document.getElementById("offer-note");
      if (note) {
        note.textContent = (r.valueGap > 0) !== (r.hourlyGap > 0) && r.valueGap !== 0 && r.hourlyGap !== 0
          ? "One offer pays more in total, but the other pays more for each hour of your time once commuting is counted."
          : "This compares money and time only. Think about the work itself, the team, security and progression too.";
      }
    }
  });
})();
