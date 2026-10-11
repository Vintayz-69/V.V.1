/* Discount Calculator: the sale price after a percentage off (or two, one after the other), the
   money saved, sales tax on top if wanted, and the percentage off between two prices. Runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /*
   * v: { price, off, extra, tax } — off and extra are percentages (extra is taken off the already
   * reduced price); tax is a percentage added to the final price (0 where prices include tax).
   */
  function calculate(v) {
    var price = Number(v.price) || 0;
    var afterFirst = price * (1 - (Number(v.off) || 0) / 100);
    var sale = afterFirst * (1 - (Number(v.extra) || 0) / 100);
    var taxAmount = sale * (Number(v.tax) || 0) / 100;
    return {
      afterFirst: round2(afterFirst),
      sale: round2(sale),
      saved: round2(price - sale),
      totalOff: price > 0 ? Math.round((1 - sale / price) * 10000) / 100 : 0,
      taxAmount: round2(taxAmount),
      toPay: round2(sale + taxAmount)
    };
  }

  // Percentage off from an original price to a sale price.
  function percentOff(original, sale) {
    if (!(original > 0)) return null;
    return Math.round((1 - sale / original) * 10000) / 100;
  }

  calculate.percentOff = percentOff;
  window.ToolNestCalc = calculate;

  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      price: { min: 0, max: 100000000 },
      off: { min: 0, max: 100 },
      extra: { min: 0, max: 100, optional: true },
      tax: { min: 0, max: 100, optional: true }
    },
    defaults: { price: "80", off: "25", extra: "", tax: "" },
    outputs: ["out-sale", "out-saved", "out-total-off", "out-first", "out-tax", "out-pay"],
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-sale", money(r.sale));
      T.setText("out-saved", money(r.saved));
      T.setText("out-total-off", T.formatNumber(r.totalOff, r.totalOff % 1 ? 2 : 0) + "%");
      T.setText("out-first", money(r.afterFirst));
      T.setText("out-tax", money(r.taxAmount));
      T.setText("out-pay", money(r.toPay));
      document.getElementById("row-first").hidden = !v.extra;
    }
  });

  // "What percent off is it?" box below the results.
  var form = document.getElementById("po-form");
  function showPercentOff() {
    var a = T.readNumber(document.getElementById("po-original"));
    var b = T.readNumber(document.getElementById("po-sale"));
    var p = isFinite(a) && isFinite(b) && b >= 0 ? percentOff(a, b) : null;
    T.setText("po-out", p === null ? "—" : (p >= 0 ? T.formatNumber(p, p % 1 ? 2 : 0) + "% off" : T.formatNumber(-p, -p % 1 ? 2 : 0) + "% more than the original"));
  }
  form.addEventListener("input", showPercentOff);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  showPercentOff();
})();
