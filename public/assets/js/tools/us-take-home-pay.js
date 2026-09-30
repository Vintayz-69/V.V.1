/* US Salaried Take-Home Pay Calculator (2026 Tax Year) — 100% in-browser */
(function () {
  "use strict";

  var T = window.ToolNest;
  // All figures come from assets/data/tax-us.js (IRS and SSA sources listed there).
  var TAX = window.ToolNestTaxUS;

  function calculateFederalTax(taxableIncome, status) {
    if (taxableIncome <= 0) return 0;
    var brackets = (TAX.brackets && TAX.brackets[status]) || TAX.brackets.single;
    var tax = 0;
    var prev = 0;
    for (var i = 0; i < brackets.length; i++) {
      var limit = brackets[i][0];
      var rate = brackets[i][1];
      if (taxableIncome > prev) {
        var chunk = Math.min(taxableIncome - prev, limit - prev);
        tax += chunk * rate;
      }
      prev = limit;
      if (taxableIncome <= limit) break;
    }
    return tax;
  }

  function calculate(v) {
    var salary = Math.max(0, Number(v.salary) || 0);
    var status = v.status || "single";
    var preTax = Math.max(0, Number(v.preTax) || 0); // e.g. 401(k), HSA
    var stateRate = Math.max(0, Number(v.stateRate) || 0) / 100;

    // FICA Taxes
    var ssCap = TAX.selfEmployment.socialSecurityWageBase;
    var ssTax = Math.min(salary, ssCap) * TAX.employerPayroll.socialSecurityRate;
    var medTax = salary * TAX.employerPayroll.medicareRate;
    var addlThreshold = (TAX.additionalMedicare.threshold && TAX.additionalMedicare.threshold[status]) || TAX.additionalMedicare.threshold.single;
    var addlMed = salary > addlThreshold ? (salary - addlThreshold) * TAX.additionalMedicare.rate : 0;
    var totalFica = ssTax + medTax + addlMed;

    // Federal Income Tax
    var stdDed = (TAX.standardDeduction && TAX.standardDeduction[status]) || TAX.standardDeduction.single;
    var adjustedWage = Math.max(0, salary - preTax);
    var taxableIncome = Math.max(0, adjustedWage - stdDed);
    var fedTax = calculateFederalTax(taxableIncome, status);

    // State Tax Estimate
    var stateTax = adjustedWage * stateRate;

    var totalTaxes = fedTax + totalFica + stateTax;
    var netAnnual = Math.max(0, salary - totalTaxes - preTax);
    var netMonthly = netAnnual / 12;
    var netBiweekly = netAnnual / 26;
    var netWeekly = netAnnual / 52;
    var effectiveTaxRate = salary > 0 ? (totalTaxes / salary) * 100 : 0;

    return {
      salary: salary,
      netAnnual: Math.round(netAnnual * 100) / 100,
      netMonthly: Math.round(netMonthly * 100) / 100,
      netBiweekly: Math.round(netBiweekly * 100) / 100,
      netWeekly: Math.round(netWeekly * 100) / 100,
      fedTax: Math.round(fedTax * 100) / 100,
      ssTax: Math.round(ssTax * 100) / 100,
      medTax: Math.round((medTax + addlMed) * 100) / 100,
      totalFica: Math.round(totalFica * 100) / 100,
      stateTax: Math.round(stateTax * 100) / 100,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
      effectiveTaxRate: Math.round(effectiveTaxRate * 10) / 10,
      taxableIncome: Math.round(taxableIncome * 100) / 100
    };
  }

  window.ToolNestCalc = calculate;

  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = [
    "out-net-monthly",
    "out-net-biweekly",
    "out-net-annual",
    "out-net-weekly",
    "out-fed-tax",
    "out-fica-tax",
    "out-state-tax",
    "out-effective-rate"
  ];

  T.setupCalculator({
    rules: {
      salary: { min: 0, max: 100000000 },
      preTax: { min: 0, max: 10000000 },
      stateRate: { min: 0, max: 15 }
    },
    defaults: { salary: "75000", status: "single", preTax: "0", stateRate: "0" },
    outputs: OUTPUTS,
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var r = calculate(v);

      T.setText("out-net-monthly", money(r.netMonthly));
      T.setText("out-net-biweekly", money(r.netBiweekly));
      T.setText("out-net-annual", money(r.netAnnual));
      T.setText("out-net-weekly", money(r.netWeekly));
      T.setText("out-fed-tax", money(r.fedTax));
      T.setText("out-fica-tax", money(r.totalFica));
      T.setText("out-state-tax", money(r.stateTax));
      T.setText("out-effective-rate", r.effectiveTaxRate + "%");
    }
  });
})();
