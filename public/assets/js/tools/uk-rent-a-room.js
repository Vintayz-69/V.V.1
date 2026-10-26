/* UK Rent a Room calculator: tax-free limit, then Method A (profit) or Method B (receipts minus the
   limit), whichever leaves less tax. Limits from data/allowances-uk.js; tax from js/uk-tax.js. */
(function () {
  "use strict";

  var A = window.ToolNestAllowancesUK;
  var UK = window.ToolNestUK;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // Income Tax caused by the letting income, on top of the other income (Income Tax only).
  function extraTax(other, taxable, region) {
    var t = Math.max(0, taxable);
    var before = UK.incomeTax(Math.max(0, other - UK.personalAllowance(other)), region);
    var total = other + t;
    return round2(UK.incomeTax(Math.max(0, total - UK.personalAllowance(total)), region) - before);
  }

  // v: { receipts: rent plus payments for meals, cleaning and other services, for the year;
  //      expenses; shared: someone else also gets letting income from the home;
  //      other: other taxable income such as a salary; region: "ruk" | "scotland" }
  function calculate(v) {
    var limit = v.shared ? A.rentARoomShared : A.rentARoom;
    var underLimit = v.receipts <= limit;
    var profitA = round2(v.receipts - v.expenses);
    var profitB = round2(Math.max(0, v.receipts - limit));
    var taxA = extraTax(v.other, profitA, v.region);
    var taxB = extraTax(v.other, profitB, v.region);
    var best = underLimit ? "exempt" : taxB < taxA ? "B" : taxA < taxB ? "A" : "same";
    return {
      limit: limit,
      underLimit: underLimit,
      profitA: profitA,
      profitB: profitB,
      taxA: taxA,
      taxB: underLimit ? 0 : taxB,
      tax: underLimit ? 0 : Math.min(taxA, taxB),
      best: best,
      saving: underLimit ? 0 : round2(Math.abs(taxA - taxB)),
      lossA: profitA < 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var region = document.getElementById("region");
  var shared = document.getElementById("shared");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      receipts: { min: 0, max: 100000000 },
      expenses: { min: 0, max: 100000000 },
      other: { min: 0, max: 100000000 }
    },
    defaults: { receipts: "9600", expenses: "1000", other: "30000", region: "ruk", shared: false },
    outputs: ["out-main", "out-note", "out-limit", "out-a", "out-b", "out-best"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate({ receipts: v.receipts, expenses: v.expenses, shared: shared.checked, other: v.other, region: region.value });
      T.setText("out-main", money(r.tax));
      T.setText("out-note", r.underLimit ? "tax: under the limit" : "estimated extra Income Tax");
      T.setText("out-limit", money(r.limit) + (r.underLimit ? " (you're under it)" : " (you're over it)"));
      T.setText("out-a", money(r.profitA) + (r.lossA ? " (a loss)" : "") + " taxed: " + money(r.taxA));
      T.setText("out-b", r.underLimit ? "Not needed" : money(r.profitB) + " taxed: " + money(r.taxB));
      T.setText("out-best", r.best === "exempt" ? "Tax-free automatically"
        : r.best === "A" ? "Method A, by " + money(r.saving)
        : r.best === "B" ? "Method B, by " + money(r.saving) : "Same tax either way");
    }
  });
})();
