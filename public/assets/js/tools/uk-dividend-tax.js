/* UK Dividend Tax Calculator (2026 to 2027). Dividends sit on top of other income; the Personal
   Allowance is used by other income first. Figures come only from assets/data/tax-uk.js through js/uk-tax.js. */
(function () {
  "use strict";

  var UK = window.ToolNestUK;
  var D = UK.data;

  function round2(n) { return Math.round(n * 100) / 100; }

  // v: other (salary, profit or pension, before the Personal Allowance), dividends, region ("ruk" | "scotland")
  function calculate(v) {
    var pa = UK.personalAllowance(v.other + v.dividends);
    var paOnOther = Math.min(pa, v.other);
    var otherTaxable = v.other - paOnOther;
    var paOnDividends = Math.min(pa - paOnOther, v.dividends);
    var taxableDividends = v.dividends - paOnDividends;

    // How much of the dividends falls in each band (for the breakdown). Band position is set by
    // other taxable income on the UK-wide bands, which Scottish taxpayers also use for dividends.
    var allowance = Math.min(taxableDividends, D.dividends.allowance);
    var rates = [D.dividends.basicRate, D.dividends.higherRate, D.dividends.additionalRate];
    var start = otherTaxable + allowance;
    var end = otherTaxable + taxableDividends;
    var lower = 0;
    var bands = D.bands.ruk.map(function (b, i) {
      var amount = Math.max(0, Math.min(b[0], end) - Math.max(lower, start));
      lower = b[0];
      return { rate: rates[i], amount: amount, tax: amount * rates[i] };
    });

    var dividendTax = UK.dividendTax(taxableDividends, otherTaxable);
    var otherTax = UK.incomeTax(otherTaxable, v.region);
    return {
      personalAllowance: pa,
      paOnDividends: paOnDividends,
      allowanceUsed: allowance,
      basic: bands[0].amount,
      higher: bands[1].amount,
      additional: bands[2].amount,
      dividendTax: round2(dividendTax),
      otherTax: round2(otherTax),
      total: round2(dividendTax + otherTax),
      effective: v.dividends > 0 ? round2(dividendTax / v.dividends * 100) : 0,
      keep: round2(v.dividends - dividendTax)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var region = document.getElementById("region");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      other: { min: 0, max: 100000000 },
      dividends: { min: 0, max: 100000000 }
    },
    defaults: { other: "12570", dividends: "40000", region: "ruk" },
    outputs: ["out-tax", "out-keep", "out-effective", "out-pa", "out-allowance", "out-basic", "out-higher", "out-additional", "out-other-tax"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate({ other: v.other, dividends: v.dividends, region: region.value });
      T.setText("out-tax", money(r.dividendTax));
      T.setText("out-keep", money(r.keep));
      T.setText("out-effective", T.formatNumber(r.effective, 2) + "%");
      T.setText("out-pa", money(r.paOnDividends));
      T.setText("out-allowance", money(r.allowanceUsed));
      T.setText("out-basic", money(r.basic));
      T.setText("out-higher", money(r.higher));
      T.setText("out-additional", money(r.additional));
      T.setText("out-other-tax", money(r.otherTax));
    }
  });
})();
