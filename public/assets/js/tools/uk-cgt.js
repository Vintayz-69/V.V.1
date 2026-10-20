/* UK Capital Gains Tax Calculator (2026 to 2027). CGT figures come only from assets/data/property-tax-uk.js;
   the Personal Allowance and basic rate band come from assets/data/tax-uk.js through js/uk-tax.js. */
(function () {
  "use strict";

  var UK = window.ToolNestUK;
  var C = window.ToolNestPropertyTaxUK.cgt;
  var BASIC_BAND = UK.data.bands.ruk[0][0];

  function round2(n) { return Math.round(n * 100) / 100; }

  // income: income for the year before the Personal Allowance; gains: total gains this tax year;
  // losses: allowable losses to set against them (0 if none).
  // GOV.UK's method: gains after the allowance sit on top of taxable income; the part inside the
  // basic rate band is taxed at 18%, the rest at 24%.
  function calculate(v) {
    var taxableIncome = Math.max(0, v.income - UK.personalAllowance(v.income));
    var netGains = Math.max(0, v.gains - (v.losses || 0));
    var allowanceUsed = Math.min(netGains, C.allowance);
    var taxableGains = netGains - allowanceUsed;
    var bandLeft = Math.max(0, BASIC_BAND - taxableIncome);
    var atBasic = Math.min(taxableGains, bandLeft);
    var atHigher = taxableGains - atBasic;
    var tax = round2(atBasic * C.basicRate + atHigher * C.higherRate);
    return {
      taxableIncome: taxableIncome,
      netGains: netGains,
      allowanceUsed: allowanceUsed,
      taxableGains: taxableGains,
      bandLeft: bandLeft,
      atBasic: atBasic,
      atHigher: atHigher,
      tax: tax,
      effective: netGains > 0 ? tax / netGains * 100 : 0,
      keep: round2(netGains - tax)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      gains: { min: 0, max: 1000000000 },
      losses: { min: 0, max: 1000000000, optional: true },
      income: { min: 0, max: 1000000000 }
    },
    defaults: { gains: "20000", losses: "", income: "35000" },
    outputs: ["out-tax", "out-keep", "out-effective", "out-taxable-income", "out-band-left", "out-allowance",
      "out-taxable-gains", "out-basic", "out-higher"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate(v);
      T.setText("out-tax", money(r.tax));
      T.setText("out-keep", money(r.keep));
      T.setText("out-effective", T.formatNumber(r.effective, 2) + "%");
      T.setText("out-taxable-income", money(r.taxableIncome));
      T.setText("out-band-left", money(r.bandLeft));
      T.setText("out-allowance", money(r.allowanceUsed));
      T.setText("out-taxable-gains", money(r.taxableGains));
      T.setText("out-basic", money(r.atBasic));
      T.setText("out-higher", money(r.atHigher));
    }
  });
})();
