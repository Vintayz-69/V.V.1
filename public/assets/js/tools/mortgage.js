/* Mortgage Payment Calculator — Pure math, no lender comparisons (LEGAL.md §1 & §4) */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var homePrice = Math.max(0, Number(v.homePrice) || 0);
    var downPayment = Math.max(0, Number(v.downPayment) || 0);
    var rate = Math.max(0, Number(v.rate) || 0);
    var termYears = Math.max(1, Number(v.termYears) || 30);
    var propertyTax = Math.max(0, Number(v.propertyTax) || 0);
    var homeInsurance = Math.max(0, Number(v.homeInsurance) || 0);

    var loanAmount = Math.max(0, homePrice - downPayment);
    var downPaymentPct = homePrice > 0 ? (downPayment / homePrice) * 100 : 0;
    var n = termYears * 12;

    var monthlyPI = 0;
    if (loanAmount === 0 || n === 0) {
      monthlyPI = 0;
    } else if (rate === 0) {
      monthlyPI = loanAmount / n;
    } else {
      var r = (rate / 100) / 12;
      var factor = Math.pow(1 + r, n);
      monthlyPI = loanAmount * (r * factor) / (factor - 1);
    }

    var monthlyTax = propertyTax / 12;
    var monthlyInsurance = homeInsurance / 12;
    var totalMonthly = monthlyPI + monthlyTax + monthlyInsurance;

    var totalCost = monthlyPI * n;
    var totalInterest = Math.max(0, totalCost - loanAmount);

    return {
      monthlyPI: Math.round(monthlyPI * 100) / 100,
      monthlyTax: Math.round(monthlyTax * 100) / 100,
      monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      loanAmount: Math.round(loanAmount * 100) / 100,
      downPaymentPct: Math.round(downPaymentPct * 10) / 10,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100
    };
  }

  window.ToolNestCalc = calculate;

  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = [
    "out-total-monthly",
    "out-monthly-pi",
    "out-monthly-tax",
    "out-monthly-insurance",
    "out-loan-amount",
    "out-down-pct",
    "out-total-interest",
    "out-total-cost"
  ];

  T.setupCalculator({
    rules: {
      homePrice: { min: 0, max: 100000000 },
      downPayment: { min: 0, max: 100000000 },
      rate: { min: 0, max: 50 },
      termYears: { min: 1, max: 50 },
      propertyTax: { min: 0, max: 1000000 },
      homeInsurance: { min: 0, max: 1000000 }
    },
    defaults: {
      homePrice: "400000",
      downPayment: "80000",
      rate: "6.5",
      termYears: "30",
      propertyTax: "4000",
      homeInsurance: "1200"
    },
    outputs: OUTPUTS,
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);

      T.setText("out-total-monthly", money(r.totalMonthly));
      T.setText("out-monthly-pi", money(r.monthlyPI));
      T.setText("out-monthly-tax", money(r.monthlyTax));
      T.setText("out-monthly-insurance", money(r.monthlyInsurance));
      T.setText("out-loan-amount", money(r.loanAmount));
      T.setText("out-down-pct", r.downPaymentPct + "%");
      T.setText("out-total-interest", money(r.totalInterest));
      T.setText("out-total-cost", money(r.totalCost));
    }
  });
})();
