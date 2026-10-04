/* Freelance Retainer Calculator: turns an hourly rate, monthly hours and a commitment discount
   into a monthly retainer fee, and shows what the client's real usage does to your hourly rate. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function round2(n) { return Math.round(n * 100) / 100; }

  // v: rate, hours (per month), discount (%), months, used (hours the client really uses a month)
  function calculate(v) {
    var full = v.rate * v.hours;
    var fee = full * (1 - v.discount / 100);
    return {
      full: round2(full),
      fee: round2(fee),
      saving: round2(full - fee),
      effective: v.hours > 0 ? round2(fee / v.hours) : 0,
      atUsage: v.used > 0 ? round2(fee / v.used) : 0,
      contract: round2(fee * v.months),
      unused: Math.max(0, v.hours - v.used)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      rate: { min: 0.01, max: 100000 },
      hours: { min: 0.5, max: 744 },
      discount: { min: 0, max: 90 },
      months: { min: 1, max: 60 },
      used: { min: 0, max: 744 }
    },
    defaults: { rate: "75", hours: "20", discount: "10", months: "6", used: "16" },
    outputs: ["out-fee", "out-full", "out-saving", "out-effective", "out-usage", "out-contract"],
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-fee", money(r.fee));
      T.setText("out-full", money(r.full));
      T.setText("out-saving", money(r.saving));
      T.setText("out-effective", money(r.effective) + " / hour");
      T.setText("out-usage", v.used > 0 ? money(r.atUsage) + " / hour" : "No hours used");
      T.setText("out-contract", money(r.contract));
    }
  });
})();
