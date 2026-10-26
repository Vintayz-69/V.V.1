/* S corporation vs sole proprietor (or single-member LLC) federal tax comparison for 2026.
   Figures come only from data/tax-us.js through js/us-tax.js. */
(function () {
  "use strict";

  var US = window.ToolNestUS;
  var D = US.data;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // Social Security and Medicare on wages: the employer and the employee each pay half of the
  // combined rates (6.2% and 1.45%), Social Security only up to the wage base. Additional
  // Medicare (employee only) on wages over the filing status threshold.
  function payrollTaxes(wages, status) {
    var se = D.selfEmployment;
    var ssWages = Math.min(wages, se.socialSecurityWageBase);
    var half = ssWages * se.socialSecurityRate / 2 + wages * se.medicareRate / 2;
    var additional = Math.max(0, wages - D.additionalMedicare.threshold[status]) * D.additionalMedicare.rate;
    return { employer: half, employee: half + additional };
  }

  // Federal income tax with the standard deduction and the QBI deduction (below the threshold only,
  // as in js/us-tax.js). Wages are not qualified business income.
  function federalIncomeTax(agi, qbi, status) {
    var beforeQbi = Math.max(0, agi - D.standardDeduction[status]);
    var qbiApplies = beforeQbi <= D.qbi.threshold[status];
    var qbiDeduction = qbiApplies ? D.qbi.rate * Math.min(Math.max(0, qbi), beforeQbi) : 0;
    return { tax: US.incomeTax(beforeQbi - qbiDeduction, status), qbiDeduction: qbiDeduction, qbiApplies: qbiApplies };
  }

  // v: { profit: business profit before paying yourself, salary: your S corporation salary,
  //      costs: extra yearly costs of running an S corporation (payroll, accounting, state fees),
  //      status: filing status }
  function calculate(v) {
    // Sole proprietor: self-employment tax on the profit, income tax on the rest.
    var sole = US.estimate(v.profit, v.status);
    var soleTotal = round2(sole.total);

    // S corporation: payroll taxes on the salary; the rest passes through on the K-1.
    var pay = payrollTaxes(v.salary, v.status);
    var k1 = v.profit - v.costs - v.salary - pay.employer;
    var fed = federalIncomeTax(v.salary + k1, k1, v.status);
    var corpTaxes = round2(pay.employer + pay.employee + fed.tax);
    var soleKeep = round2(v.profit - soleTotal);
    var corpKeep = round2(v.profit - v.costs - corpTaxes);
    return {
      soleSE: round2(sole.se.total + sole.se.additionalMedicare),
      soleIncomeTax: round2(sole.incomeTax),
      soleQbi: round2(sole.qbiDeduction),
      soleTotal: soleTotal,
      soleKeep: soleKeep,
      payroll: round2(pay.employer + pay.employee),
      k1: round2(k1),
      corpIncomeTax: round2(fed.tax),
      corpQbi: round2(fed.qbiDeduction),
      corpTaxes: corpTaxes,
      corpKeep: corpKeep,
      difference: round2(corpKeep - soleKeep), // above 0: the S corporation leaves more
      salaryTooHigh: k1 < 0,
      overQbiThreshold: !sole.qbiApplies || !fed.qbiApplies
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var status = document.getElementById("status");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      profit: { min: 1, max: 100000000 },
      salary: { min: 0, max: 100000000 },
      costs: { min: 0, max: 100000000 }
    },
    defaults: { profit: "100000", salary: "50000", costs: "2000", status: "single" },
    outputs: ["out-main", "out-main-note", "out-sole", "out-corp", "out-se", "out-payroll", "out-it-sole", "out-it-corp", "out-qbi"],
    check: function (v) {
      if (v.salary + v.costs > v.profit) return { salary: "Your salary and costs are more than the profit. Lower the salary." };
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var r = calculate({ profit: v.profit, salary: v.salary, costs: v.costs, status: status.value });
      T.setText("out-main", money(Math.abs(r.difference)));
      T.setText("out-main-note", r.difference > 0 ? "more a year as an S corporation" : r.difference < 0 ? "less a year as an S corporation" : "difference");
      T.setText("out-sole", money(r.soleKeep));
      T.setText("out-corp", money(r.corpKeep));
      T.setText("out-se", money(r.soleSE));
      T.setText("out-payroll", money(r.payroll));
      T.setText("out-it-sole", money(r.soleIncomeTax));
      T.setText("out-it-corp", money(r.corpIncomeTax));
      T.setText("out-qbi", money(r.soleQbi) + " vs " + money(r.corpQbi));
      document.getElementById("out-qbi-note").hidden = !r.overQbiThreshold;
    }
  });
})();
