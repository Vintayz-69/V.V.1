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

    // Lenders charge whole cents: the payment is rounded to the cent, and so is each month's interest.
    monthlyPI = Math.round(monthlyPI * 100) / 100;
    var plan = schedule(loanAmount, rate / 100 / 12, n, monthlyPI);

    var monthlyTax = propertyTax / 12;
    var monthlyInsurance = homeInsurance / 12;
    var totalMonthly = monthlyPI + monthlyTax + monthlyInsurance;

    return {
      monthlyPI: monthlyPI,
      monthlyTax: Math.round(monthlyTax * 100) / 100,
      monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      loanAmount: Math.round(loanAmount * 100) / 100,
      downPaymentPct: Math.round(downPaymentPct * 10) / 10,
      totalInterest: plan.totalInterest,
      totalCost: Math.round((loanAmount + plan.totalInterest) * 100) / 100,
      firstInterest: plan.firstInterest,
      firstPrincipal: plan.firstPrincipal,
      years: plan.years
    };
  }

  /*
   * Month-by-month repayment schedule, worked in cents.
   *   interest this month  = balance × monthly rate (rounded to the cent)
   *   principal this month = payment − interest
   *   new balance          = balance − principal
   * The last payment clears whatever is left after rounding.
   * Returns totals per year: principal paid, interest paid and the balance at the end of the year.
   */
  function schedule(loan, r, n, payment) {
    var bal = Math.round(loan * 100);
    var pay = Math.round(payment * 100);
    var years = [];
    var yp = 0, yi = 0, totalInt = 0, firstInt = 0, firstPrin = 0;
    for (var m = 1; m <= n && bal > 0; m++) {
      var interest = Math.round(bal * r);
      var principal = m === n ? bal : Math.min(pay - interest, bal);
      bal -= principal;
      yp += principal;
      yi += interest;
      totalInt += interest;
      if (m === 1) { firstInt = interest; firstPrin = principal; }
      if (m % 12 === 0 || m === n || bal === 0) {
        years.push({ year: Math.ceil(m / 12), principal: yp / 100, interest: yi / 100, balance: bal / 100 });
        yp = 0;
        yi = 0;
      }
    }
    return { years: years, totalInterest: totalInt / 100, firstInterest: firstInt / 100, firstPrincipal: firstPrin / 100 };
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
    "out-total-cost",
    "out-first-principal",
    "out-first-interest",
    "out-year1-principal"
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
      T.setText("out-first-principal", money(r.firstPrincipal));
      T.setText("out-first-interest", money(r.firstInterest));
      T.setText("out-year1-principal", r.years.length ? money(r.years[0].principal) : money(0));

      var paid = 0;
      document.getElementById("schedule-body").innerHTML = r.years.length ? T.tableRows(r.years.map(function (y) {
        paid += y.principal;
        return [T.formatNumber(y.year), money(y.principal), money(y.interest), money(paid), money(y.balance)];
      })) : '<tr><td colspan="5">There is no loan to repay.</td></tr>';
    },
    onInvalid: function () {
      document.getElementById("schedule-body").innerHTML =
        '<tr><td colspan="5">Fix the highlighted fields above to see this table.</td></tr>';
    }
  });
})();
