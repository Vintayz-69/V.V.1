/* Canada GST/HST Calculator — add tax to a price, or take it out of a total. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var CA = window.ToolNestCA;

  // pst: provincial sales tax as a decimal (0 for none).
  function calculate(v) {
    var info = CA.data.salesTax[v.province];
    var combined = info.rate + v.pst;
    var before = v.mode === "add" ? v.amount : v.amount / (1 + combined);
    var gst = before * info.rate;
    var pst = before * v.pst;
    return { type: info.type, rate: info.rate, before: before, gst: gst, pst: pst, after: before + gst + pst };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var province = document.getElementById("province");
  var mode = document.getElementById("mode");
  var pstInput = document.getElementById("pst");
  var pstField = pstInput.closest(".field");
  var pstHint = document.getElementById("pst-hint");
  var amountLabel = document.getElementById("amount-label");

  function applyProvince() {
    var info = CA.data.salesTax[province.value];
    pstField.hidden = info.type === "HST";
    if (info.pst === null) {
      pstInput.value = "";
      pstHint.textContent = "Enter the current QST rate from Revenu Québec";
    } else {
      pstInput.value = String(Math.round(info.pst * 10000) / 100);
      pstHint.textContent = info.pst > 0 ? "Provincial sales tax, if it applies to what you sell" : "No provincial sales tax";
    }
  }
  function applyMode() {
    amountLabel.textContent = mode.value === "add" ? "Price before tax" : "Total including tax";
  }
  province.addEventListener("change", applyProvince);
  mode.addEventListener("change", applyMode);
  applyProvince();
  applyMode();

  T.setupCalculator({
    keepCurrency: true,
    rules: { amount: { min: 0, max: 1000000000 }, pst: { min: 0, max: 20, optional: true } },
    defaults: { province: "ON", mode: "add", amount: "1000" },
    onReset: function () { applyProvince(); applyMode(); },
    outputs: ["out-main", "out-before", "out-gst", "out-pst", "out-after"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "CAD"); };
      var r = calculate({ province: province.value, mode: mode.value, amount: v.amount, pst: pstField.hidden ? 0 : (v.pst || 0) / 100 });
      var gstLabel = r.type + " (" + T.formatNumber(r.rate * 100) + "%)";
      document.getElementById("out-gst-label").textContent = gstLabel;
      T.setText("out-main", money(mode.value === "add" ? r.after : r.before));
      document.getElementById("out-title").textContent = mode.value === "add" ? "Total with tax" : "Price before tax";
      T.setText("out-before", money(r.before));
      T.setText("out-gst", money(r.gst));
      T.setText("out-pst", money(r.pst));
      T.setText("out-after", money(r.after));
    }
  });
})();
