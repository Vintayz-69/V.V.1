/*
 * Shared Australian tax engine (resident individuals). Figures come only from window.ToolNestTaxAU.
 * Simplified: full 2% Medicare levy, no Medicare levy surcharge, HELP repayments or other offsets.
 */
(function () {
  "use strict";

  var D = window.ToolNestTaxAU;

  function incomeTax(taxable) {
    var tax = 0;
    var lower = 0;
    D.brackets.forEach(function (b) {
      if (taxable > lower) tax += (Math.min(taxable, b[0]) - lower) * b[1];
      lower = b[0];
    });
    return tax;
  }

  function lito(taxable) {
    var l = D.lito;
    if (taxable <= l.firstTaperStart) return l.max;
    if (taxable <= l.secondTaperStart) return l.max - (taxable - l.firstTaperStart) * l.firstTaperRate;
    return Math.max(0, l.secondTaperBase - (taxable - l.secondTaperStart) * l.secondTaperRate);
  }

  // businessIncome: the part of taxable income that is net small business income.
  function individual(taxable, businessIncome) {
    var basic = incomeTax(taxable);
    var litoAmount = Math.min(basic, lito(taxable));
    var sbShare = taxable > 0 ? Math.min(1, (businessIncome || 0) / taxable) : 0;
    var sbito = Math.min(D.smallBusinessOffset.max, basic * sbShare * D.smallBusinessOffset.rate);
    var afterOffsets = Math.max(0, basic - litoAmount - sbito);
    var medicare = taxable * D.medicareLevy;
    var total = afterOffsets + medicare;
    return {
      basic: basic,
      lito: litoAmount,
      smallBusinessOffset: Math.min(sbito, basic - litoAmount),
      incomeTax: afterOffsets,
      medicare: medicare,
      total: total,
      takeHome: taxable - total,
      effectiveRate: taxable > 0 ? total / taxable : 0
    };
  }

  window.ToolNestAU = { data: D, incomeTax: incomeTax, lito: lito, individual: individual };
})();
