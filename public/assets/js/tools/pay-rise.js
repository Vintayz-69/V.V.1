/* Pay Rise Calculator — the size of a raise in money and percent, and after inflation. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // v: { mode: "percent" | "amount", current, percent, newPay, inflation (percent, may be null) }
  function calculate(v) {
    var current = v.current;
    var next = v.mode === "percent" ? current * (1 + v.percent / 100) : v.newPay;
    var increase = next - current;
    var percent = current > 0 ? (increase / current) * 100 : 0;
    var inflation = v.inflation == null ? null : v.inflation;
    // Real change: how much more the new pay buys, once prices have risen by `inflation`.
    var real = inflation == null ? null : ((1 + percent / 100) / (1 + inflation / 100) - 1) * 100;
    return {
      newPay: next,
      increase: increase,
      percent: percent,
      monthly: increase / 12,
      weekly: increase / 52,
      real: real,
      // The pay needed just to keep up with inflation, and how far above or below it the new pay is.
      keepUp: inflation == null ? null : current * (1 + inflation / 100),
      versusInflation: inflation == null ? null : next - current * (1 + inflation / 100)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var mode = document.getElementById("mode");
  var percentField = document.getElementById("percent").closest(".field");
  var newField = document.getElementById("newPay").closest(".field");

  function applyMode() {
    percentField.hidden = mode.value !== "percent";
    newField.hidden = mode.value === "percent";
  }
  mode.addEventListener("change", applyMode);
  applyMode();

  T.setupCalculator({
    rules: {
      current: { min: 1, max: 100000000 },
      percent: { min: -100, max: 1000 },
      newPay: { min: 0, max: 100000000 },
      inflation: { min: -50, max: 100, optional: true }
    },
    defaults: { mode: "amount", current: "50000", percent: "4", newPay: "53000", inflation: "3" },
    onReset: applyMode,
    outputs: ["out-percent", "out-increase", "out-new", "out-monthly", "out-weekly", "out-real", "out-keepup"],
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var signed = function (n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + money(Math.abs(n)); };
      var pct = function (n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + T.formatNumber(Math.abs(n), 2) + "%"; };
      var r = calculate({ mode: mode.value, current: v.current, percent: v.percent, newPay: v.newPay, inflation: v.inflation });
      T.setText("out-percent", pct(r.percent));
      T.setText("out-increase", signed(r.increase));
      T.setText("out-new", money(r.newPay));
      T.setText("out-monthly", signed(r.monthly));
      T.setText("out-weekly", signed(r.weekly));
      T.setText("out-real", r.real == null ? "Add inflation to see this" : pct(r.real));
      T.setText("out-keepup", r.keepUp == null ? "—" : money(r.keepUp));
      var note = document.getElementById("real-note");
      if (r.real == null) note.textContent = "Add the inflation rate to see whether your raise beats rising prices.";
      else if (r.versusInflation >= 0) note.textContent = "Your new pay is " + money(r.versusInflation) + " a year more than you'd need just to keep up with " + T.formatNumber(v.inflation, 1) + "% inflation.";
      else note.textContent = "Your new pay is " + money(-r.versusInflation) + " a year short of keeping up with " + T.formatNumber(v.inflation, 1) + "% inflation, so it buys a little less than before.";
    }
  });
})();
