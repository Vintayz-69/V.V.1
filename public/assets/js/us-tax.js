/*
 * Shared US federal tax engine. Figures come only from window.ToolNestTaxUS (assets/data/tax-us.js).
 * Simplified: federal only, standard deduction, no credits, QBI only below the threshold.
 */
(function () {
  "use strict";

  var D = window.ToolNestTaxUS;

  // Tax on taxable income using the bracket table for a filing status.
  function incomeTax(taxable, status) {
    var tax = 0;
    var lower = 0;
    var table = D.brackets[status];
    for (var i = 0; i < table.length && taxable > lower; i++) {
      var upper = table[i][0];
      tax += (Math.min(taxable, upper) - lower) * table[i][1];
      lower = upper;
    }
    return tax;
  }

  function marginalRate(taxable, status) {
    var table = D.brackets[status];
    for (var i = 0; i < table.length; i++) if (taxable <= table[i][0]) return table[i][1];
    return table[table.length - 1][1];
  }

  // Schedule SE. wages = W-2 wages subject to Social Security (they use up the wage base first).
  function selfEmploymentTax(profit, status, wages) {
    var se = D.selfEmployment;
    wages = wages || 0;
    var net = Math.max(0, profit) * se.netEarningsFactor;
    if (net < se.minimumNetEarnings) {
      return { netEarnings: net, socialSecurity: 0, medicare: 0, total: 0, deductibleHalf: 0, additionalMedicare: 0 };
    }
    var ssBase = Math.max(0, Math.min(net, se.socialSecurityWageBase - wages));
    var socialSecurity = ssBase * se.socialSecurityRate;
    var medicare = net * se.medicareRate;
    var total = socialSecurity + medicare;
    // Form 8959: threshold is reduced (not below zero) by wages.
    var threshold = Math.max(0, D.additionalMedicare.threshold[status] - wages);
    var additionalMedicare = Math.max(0, net - threshold) * D.additionalMedicare.rate;
    return {
      netEarnings: net,
      socialSecurity: socialSecurity,
      medicare: medicare,
      total: total,
      deductibleHalf: total / 2,
      additionalMedicare: additionalMedicare
    };
  }

  // Full federal estimate for a self-employed person with no other income.
  function estimate(profit, status) {
    var se = selfEmploymentTax(profit, status, 0);
    var agi = Math.max(0, profit - se.deductibleHalf);
    var beforeQbi = Math.max(0, agi - D.standardDeduction[status]);
    var qbiIncome = Math.max(0, profit - se.deductibleHalf);
    var qbiApplies = beforeQbi <= D.qbi.threshold[status];
    var qbiDeduction = qbiApplies ? D.qbi.rate * Math.min(qbiIncome, beforeQbi) : 0;
    var taxable = beforeQbi - qbiDeduction;
    var incTax = incomeTax(taxable, status);
    var total = incTax + se.total + se.additionalMedicare;
    return {
      se: se,
      agi: agi,
      standardDeduction: D.standardDeduction[status],
      qbiApplies: qbiApplies,
      qbiDeduction: qbiDeduction,
      taxable: taxable,
      incomeTax: incTax,
      marginalRate: marginalRate(taxable, status),
      total: total,
      takeHome: profit - total,
      effectiveRate: profit > 0 ? total / profit : 0
    };
  }

  window.ToolNestUS = {
    data: D,
    incomeTax: incomeTax,
    marginalRate: marginalRate,
    selfEmploymentTax: selfEmploymentTax,
    estimate: estimate,
    STATUS_LABELS: { single: "Single", mfj: "Married filing jointly", mfs: "Married filing separately", hoh: "Head of household" }
  };
})();
