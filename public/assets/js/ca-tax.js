/*
 * Shared Canada tax engine (federal + CPP). Figures come only from window.ToolNestTaxCA.
 * Provincial tax is an estimate entered by the visitor.
 */
(function () {
  "use strict";

  var D = window.ToolNestTaxCA;

  function bracketTax(taxable) {
    var tax = 0;
    var lower = 0;
    D.federalBrackets.forEach(function (b) {
      if (taxable > lower) tax += (Math.min(taxable, b[0]) - lower) * b[1];
      lower = b[0];
    });
    return tax;
  }

  function basicPersonalAmount(netIncome) {
    var b = D.basicPersonalAmount;
    var share = Math.min(1, Math.max(0, (b.phaseOutEnd - netIncome) / (b.phaseOutEnd - b.phaseOutStart)));
    return b.min + (b.max - b.min) * share;
  }

  // CPP on self-employment earnings (both halves).
  function selfEmployedCpp(earnings) {
    var c = D.cpp;
    var cpp1 = Math.max(0, Math.min(earnings, c.ympe) - c.basicExemption) * c.rate * 2;
    var cpp2 = Math.max(0, Math.min(earnings, c.yampe) - c.ympe) * c.cpp2Rate * 2;
    var employeeHalf = cpp1 / 2;
    var baseCredit = employeeHalf * (c.baseRate / c.rate);   // base part of the employee share → credit
    var enhanced = employeeHalf - baseCredit;                // enhanced part of the employee share → deduction
    return {
      cpp1: cpp1,
      cpp2: cpp2,
      total: cpp1 + cpp2,
      deduction: cpp1 / 2 + enhanced + cpp2,
      creditAmount: baseCredit
    };
  }

  // Employer's CPP for an employee's salary.
  function employerCpp(salary) {
    var c = D.cpp;
    return Math.max(0, Math.min(salary, c.ympe) - c.basicExemption) * c.rate +
      Math.max(0, Math.min(salary, c.yampe) - c.ympe) * c.cpp2Rate;
  }

  function selfEmployed(earnings, provincialPct) {
    var cpp = selfEmployedCpp(earnings);
    var netIncome = Math.max(0, earnings - cpp.deduction);
    var bpa = basicPersonalAmount(netIncome);
    var federal = Math.max(0, bracketTax(netIncome) - D.creditRate * (bpa + cpp.creditAmount));
    var provincial = netIncome * (provincialPct / 100);
    var total = federal + provincial + cpp.total;
    return {
      cpp: cpp,
      netIncome: netIncome,
      bpa: bpa,
      federal: federal,
      provincial: provincial,
      total: total,
      takeHome: earnings - total,
      effectiveRate: earnings > 0 ? total / earnings : 0
    };
  }

  window.ToolNestCA = {
    data: D,
    bracketTax: bracketTax,
    basicPersonalAmount: basicPersonalAmount,
    selfEmployedCpp: selfEmployedCpp,
    employerCpp: employerCpp,
    selfEmployed: selfEmployed
  };
})();
