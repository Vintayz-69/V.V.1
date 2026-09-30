/* UK VAT Calculator — add VAT to a price or take it out of a total. Rates from data/tax-uk.js. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var D = window.ToolNestTaxUK.vat;

  // v: { mode: "add" | "remove", amount, rate: "standard" | "reduced" | "zero" }
  function calculate(v) {
    var rate = D[v.rate] !== undefined ? D[v.rate] : D.standard;
    var before = v.mode === "add" ? v.amount : v.amount / (1 + rate);
    var vat = before * rate;
    return { rate: rate, before: before, vat: vat, after: before + vat };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var mode = document.getElementById("mode");
  var rateSelect = document.getElementById("rate");
  var amountLabel = document.getElementById("amount-label");
  function applyMode() {
    amountLabel.textContent = mode.value === "add" ? "Price excluding VAT" : "Price including VAT";
  }
  mode.addEventListener("change", applyMode);
  applyMode();

  T.setupCalculator({
    keepCurrency: true,
    rules: { amount: { min: 0, max: 1000000000 } },
    defaults: { mode: "add", rate: "standard", amount: "1000" },
    onReset: applyMode,
    outputs: ["out-main", "out-before", "out-vat", "out-after"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate({ mode: mode.value, amount: v.amount, rate: rateSelect.value });
      var pct = T.formatNumber(r.rate * 100) + "%";
      document.getElementById("out-title").textContent = mode.value === "add" ? "Price including VAT" : "Price excluding VAT";
      T.setText("out-main", money(mode.value === "add" ? r.after : r.before));
      T.setText("out-before", money(r.before));
      T.setText("out-vat-label", "VAT (" + pct + ")");
      T.setText("out-vat", money(r.vat));
      T.setText("out-after", money(r.after));
    }
  });
})();
