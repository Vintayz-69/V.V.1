/* UK tax on savings interest (England, Wales and Northern Ireland), 2026 to 2027. Allowances from
   data/savings-uk.js; bands and Personal Allowance from js/uk-tax.js (data/tax-uk.js). */
(function () {
  "use strict";

  var S = window.ToolNestSavingsUK;
  var UK = window.ToolNestUK;
  var D = UK.data;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // v: { other: other taxable income (wages, profit, pension, rent); interest: savings interest }
  function calculate(v) {
    var bands = D.bands.ruk;
    var pa = UK.personalAllowance(v.other + v.interest);
    // The Personal Allowance is used on other income first; any left over covers interest.
    var otherTaxable = Math.max(0, v.other - pa);
    var paLeft = Math.max(0, pa - v.other);
    var coveredByPa = Math.min(v.interest, paLeft);
    var rest = v.interest - coveredByPa;

    var startingRate = Math.max(0, S.startingRate - otherTaxable);
    var totalTaxable = otherTaxable + rest;
    var band = totalTaxable <= bands[0][0] ? "basic" : totalTaxable <= bands[1][0] ? "higher" : "additional";
    var psa = S.personalSavingsAllowance[band];

    var pos = otherTaxable;
    var atStartingRate = Math.min(rest, startingRate);
    pos += atStartingRate; rest -= atStartingRate;
    var inPsa = Math.min(rest, psa);
    pos += inPsa; rest -= inPsa;
    var tax = round2(UK.applyBands(rest, bands, pos));
    return {
      personalAllowance: pa,
      coveredByPa: round2(coveredByPa),
      startingRate: round2(startingRate),
      atStartingRate: round2(atStartingRate),
      band: band,
      psa: psa,
      inPsa: round2(inPsa),
      taxed: round2(rest),
      tax: tax,
      taxFree: round2(v.interest - rest),
      keep: round2(v.interest - tax)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var BAND_NAMES = { basic: "Basic rate", higher: "Higher rate", additional: "Additional rate" };

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      other: { min: 0, max: 100000000 },
      interest: { min: 0, max: 100000000 }
    },
    defaults: { other: "30000", interest: "1300" },
    outputs: ["out-main", "out-free", "out-pa", "out-sr", "out-psa", "out-taxed", "out-keep"],
    onInvalid: function () {
      document.getElementById("interest-body").innerHTML = '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate(v);
      T.setText("out-main", money(r.tax));
      T.setText("out-free", money(r.taxFree));
      T.setText("out-pa", money(r.coveredByPa));
      T.setText("out-sr", money(r.atStartingRate) + " of " + money(r.startingRate) + " available");
      T.setText("out-psa", money(r.inPsa) + " of " + money(r.psa) + " (" + BAND_NAMES[r.band].toLowerCase() + ")");
      T.setText("out-taxed", money(r.taxed));
      T.setText("out-keep", money(r.keep));
      var rows = [500, 1000, 2000, 3000, 5000].map(function (i) {
        var x = calculate({ other: v.other, interest: i });
        return [money(i), money(x.tax), money(x.keep)];
      });
      document.getElementById("interest-body").innerHTML = T.tableRows(rows, -1);
    }
  });
})();
