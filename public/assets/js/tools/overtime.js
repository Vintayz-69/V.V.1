/* Overtime Pay Calculator — weekly pay with time-and-a-half and double-time hours. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // v: { rate, regular, overtime, overtimeRate (multiplier), double, weeks }
  function calculate(v) {
    var regularPay = v.rate * v.regular;
    var overtimePay = v.rate * v.overtimeRate * v.overtime;
    var doublePay = v.rate * 2 * v.double;
    var weekly = regularPay + overtimePay + doublePay;
    var hours = v.regular + v.overtime + v.double;
    return {
      overtimeHourly: v.rate * v.overtimeRate,
      doubleHourly: v.rate * 2,
      regularPay: regularPay,
      overtimePay: overtimePay,
      doublePay: doublePay,
      extra: overtimePay + doublePay,
      weekly: weekly,
      hours: hours,
      average: hours > 0 ? weekly / hours : 0,
      yearly: weekly * v.weeks
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      rate: { min: 0, max: 100000 },
      regular: { min: 0, max: 168 },
      overtime: { min: 0, max: 168 },
      overtimeRate: { min: 1, max: 5 },
      double: { min: 0, max: 168 },
      weeks: { min: 1, max: 52 }
    },
    check: function (v) {
      if (v.regular + v.overtime + v.double > 168) return { double: "That's more than the 168 hours in a week." };
    },
    defaults: { rate: "20", regular: "40", overtime: "5", overtimeRate: "1.5", double: "0", weeks: "1" },
    outputs: ["out-weekly", "out-regular", "out-ot", "out-double", "out-extra", "out-hours", "out-average", "out-yearly", "out-ot-rate"],
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-weekly", money(r.weekly));
      T.setText("out-regular", money(r.regularPay));
      T.setText("out-ot-rate", money(r.overtimeHourly) + " an hour");
      T.setText("out-ot", money(r.overtimePay));
      T.setText("out-double", money(r.doublePay));
      T.setText("out-extra", money(r.extra));
      T.setText("out-hours", T.formatNumber(r.hours, r.hours % 1 ? 2 : 0));
      T.setText("out-average", money(r.average));
      T.setText("out-yearly-label", v.weeks === 1 ? "Total for 1 week" : "Total for " + T.formatNumber(v.weeks) + " weeks");
      T.setText("out-yearly", money(r.yearly));
    }
  });
})();
