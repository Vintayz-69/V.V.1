/* Australia GST Calculator — add 10% GST or take it out of a total. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var AU = window.ToolNestAU;

  function calculate(v) {
    var rate = AU.data.gst.rate;
    var before = v.mode === "add" ? v.amount : v.amount / (1 + rate);
    var gst = before * rate;
    return { before: before, gst: gst, after: before + gst };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var mode = document.getElementById("mode");
  var amountLabel = document.getElementById("amount-label");
  function applyMode() {
    amountLabel.textContent = mode.value === "add" ? "Price excluding GST" : "Price including GST";
  }
  mode.addEventListener("change", applyMode);
  applyMode();

  T.setupCalculator({
    keepCurrency: true,
    rules: { amount: { min: 0, max: 1000000000 } },
    defaults: { mode: "add", amount: "1000" },
    onReset: applyMode,
    outputs: ["out-main", "out-before", "out-gst", "out-after"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "AUD"); };
      var r = calculate({ mode: mode.value, amount: v.amount });
      document.getElementById("out-title").textContent = mode.value === "add" ? "Price including GST" : "Price excluding GST";
      T.setText("out-main", money(mode.value === "add" ? r.after : r.before));
      T.setText("out-before", money(r.before));
      T.setText("out-gst", money(r.gst));
      T.setText("out-after", money(r.after));
    }
  });
})();
