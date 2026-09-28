/*
 * Shared UK tax engine. Figures come only from window.ToolNestTaxUK (assets/data/tax-uk.js).
 * Simplified: one source of income at a time, no pension relief, student loans or Marriage Allowance.
 */
(function () {
  "use strict";

  var D = window.ToolNestTaxUK;

  function personalAllowance(adjustedNetIncome) {
    var excess = Math.max(0, adjustedNetIncome - D.allowanceTaperStart);
    return Math.max(0, D.personalAllowance - Math.floor(excess / 2));
  }

  // Apply a band table to an amount of taxable income, starting `start` pounds into the bands.
  function applyBands(amount, table, start) {
    var tax = 0;
    var pos = start || 0;
    var end = pos + amount;
    var lower = 0;
    for (var i = 0; i < table.length; i++) {
      var upper = table[i][0];
      var from = Math.max(lower, pos);
      var to = Math.min(upper, end);
      if (to > from) tax += (to - from) * table[i][1];
      lower = upper;
    }
    return tax;
  }

  function incomeTax(taxable, region) {
    return applyBands(taxable, D.bands[region || "ruk"], 0);
  }

  function class4(profit) {
    var c = D.class4;
    var main = Math.max(0, Math.min(profit, c.upperProfitsLimit) - c.lowerProfitsLimit) * c.mainRate;
    var upper = Math.max(0, profit - c.upperProfitsLimit) * c.upperRate;
    return main + upper;
  }

  function employeeNI(salary) {
    var c = D.class1;
    return Math.max(0, Math.min(salary, c.upperEarningsLimit) - c.primaryThreshold) * c.employeeMainRate +
      Math.max(0, salary - c.upperEarningsLimit) * c.employeeUpperRate;
  }

  function employerNI(salary) {
    return Math.max(0, salary - D.class1.secondaryThreshold) * D.class1.employerRate;
  }

  function corporationTax(profit) {
    var c = D.corporationTax;
    if (profit <= 0) return 0;
    if (profit <= c.lowerLimit) return profit * c.smallProfitsRate;
    if (profit >= c.upperLimit) return profit * c.mainRate;
    return profit * c.mainRate - (c.upperLimit - profit) * c.marginalFraction;
  }

  // Dividend tax. Dividends sit on top of other taxable income and use UK-wide bands (Scotland too).
  // The £500 allowance is taxed at 0% but still uses up band space.
  function dividendTax(dividends, otherTaxable) {
    var d = D.dividends;
    var bands = D.bands.ruk;
    var ratesByBand = [d.basicRate, d.higherRate, d.additionalRate];
    var allowance = Math.min(dividends, d.allowance);
    var start = otherTaxable + allowance;
    var taxed = dividends - allowance;
    var tax = 0;
    var lower = 0;
    for (var i = 0; i < bands.length; i++) {
      var upper = bands[i][0];
      var from = Math.max(lower, start);
      var to = Math.min(upper, start + taxed);
      if (to > from) tax += (to - from) * ratesByBand[i];
      lower = upper;
    }
    return tax;
  }

  function soleTrader(profit, region) {
    var pa = personalAllowance(profit);
    var taxable = Math.max(0, profit - pa);
    var it = incomeTax(taxable, region);
    var ni = class4(profit);
    var total = it + ni;
    return {
      personalAllowance: pa,
      taxable: taxable,
      incomeTax: it,
      class4: ni,
      class2Treated: profit >= D.class2.smallProfitsThreshold,
      total: total,
      takeHome: profit - total,
      effectiveRate: profit > 0 ? total / profit : 0
    };
  }

  window.ToolNestUK = {
    data: D,
    personalAllowance: personalAllowance,
    applyBands: applyBands,
    incomeTax: incomeTax,
    class4: class4,
    employeeNI: employeeNI,
    employerNI: employerNI,
    corporationTax: corporationTax,
    dividendTax: dividendTax,
    soleTrader: soleTrader
  };
})();
