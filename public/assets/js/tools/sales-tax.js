/* Sales Tax Calculator: adds sales tax to a price, or takes it out of a total that includes it, at
   a rate the visitor types. No rates are filled in: they vary by state, county and city. Runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function round2(n) { return Math.round(n * 100) / 100; }

  // mode "add": amount is before tax. mode "remove": amount already includes tax.
  function calculate(v) {
    var rate = (Number(v.rate) || 0) / 100;
    var net = v.mode === "remove" ? v.amount / (1 + rate) : v.amount;
    var tax = net * rate;
    return { net: round2(net), tax: round2(tax), gross: round2(net + tax) };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  function mode() { return document.getElementById("mode-remove").checked ? "remove" : "add"; }

  T.setupCalculator({
    rules: { amount: { min: 0, max: 1000000000 }, rate: { min: 0, max: 100 } },
    defaults: { amount: "100", rate: "8.25" },
    outputs: ["out-gross", "out-net", "out-tax"],
    render: function (v, currency) {
      var r = calculate({ amount: v.amount, rate: v.rate, mode: mode() });
      var money = function (n) { return T.formatMoney(n, currency); };
      var add = mode() === "add";
      T.setText("amount-label", add ? "Price before tax" : "Total including tax");
      T.setText("out-title", add ? "Total with tax" : "Price before tax");
      T.setText("out-gross", money(add ? r.gross : r.net));
      T.setText("out-net", money(r.net));
      T.setText("out-tax", money(r.tax));
      T.setText("out-total", money(r.gross));
    }
  });
})();
