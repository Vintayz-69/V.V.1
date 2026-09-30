/* UK Take-Home Pay Calculator (employees, PAYE) for 2026 to 2027.
 * Figures come only from data/tax-uk.js through js/uk-tax.js.
 * Assumes tax code 1257L, one job, no benefits in kind, National Insurance category A, and a
 * pension taken from pay before tax (net pay arrangement) or through salary sacrifice. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var UK = window.ToolNestUK;
  var D = UK.data;

  function studentLoan(earnings, plan, postgraduate) {
    var total = 0;
    var p = D.studentLoans[plan];
    if (p) total += Math.max(0, earnings - p.threshold) * p.rate;
    if (postgraduate) {
      var pg = D.studentLoans.postgraduate;
      total += Math.max(0, earnings - pg.threshold) * pg.rate;
    }
    return total;
  }

  /*
   * v: { salary, region: "ruk" | "scotland", pensionPct, pensionType: "net" | "sacrifice",
   *      plan: "none" | "plan1" | "plan2" | "plan4" | "plan5", postgraduate: boolean }
   */
  function calculate(v) {
    var pension = v.salary * (v.pensionPct || 0) / 100;
    var sacrifice = v.pensionType === "sacrifice";
    // Salary sacrifice lowers pay for tax, NI and student loans. A net pay pension lowers pay
    // for Income Tax only.
    var niPay = sacrifice ? v.salary - pension : v.salary;
    var taxablePay = v.salary - pension;
    var allowance = UK.personalAllowance(taxablePay);
    var taxable = Math.max(0, taxablePay - allowance);
    var incomeTax = UK.incomeTax(taxable, v.region);
    var ni = UK.employeeNI(niPay);
    var loan = studentLoan(niPay, v.plan, v.postgraduate);
    var deductions = incomeTax + ni + loan + pension;
    var takeHome = v.salary - deductions;
    return {
      pension: pension,
      personalAllowance: allowance,
      taxable: taxable,
      incomeTax: incomeTax,
      ni: ni,
      studentLoan: loan,
      deductions: deductions,
      takeHome: takeHome,
      monthly: takeHome / 12,
      weekly: takeHome / 52,
      effectiveRate: v.salary > 0 ? (incomeTax + ni) / v.salary : 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var el = function (id) { return document.getElementById(id); };

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      salary: { min: 0, max: 100000000 },
      pensionPct: { min: 0, max: 100 }
    },
    defaults: { salary: "35000", region: "ruk", pensionPct: "5", pensionType: "net", plan: "plan2", postgraduate: false },
    outputs: ["out-take", "out-monthly", "out-weekly", "out-it", "out-ni", "out-loan", "out-pension", "out-pa", "out-rate"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var input = {
        salary: v.salary, region: el("region").value, pensionPct: v.pensionPct, pensionType: el("pensionType").value,
        plan: el("plan").value, postgraduate: el("postgraduate").checked
      };
      var r = calculate(input);
      T.setText("out-take", money(r.takeHome));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-weekly", money(r.weekly));
      T.setText("out-it", money(r.incomeTax));
      T.setText("out-ni", money(r.ni));
      T.setText("out-loan", money(r.studentLoan));
      T.setText("out-pension", money(r.pension));
      T.setText("out-pa", money(r.personalAllowance));
      T.setText("out-rate", T.formatNumber(r.effectiveRate * 100, 1) + "%");

      var salaries = [20000, 30000, 40000, 50000, 60000, 80000, 100000, 125140];
      if (salaries.indexOf(v.salary) === -1) salaries.push(v.salary);
      salaries.sort(function (a, b) { return a - b; });
      var rows = salaries.map(function (s) {
        var x = calculate({ salary: s, region: input.region, pensionPct: input.pensionPct, pensionType: input.pensionType, plan: input.plan, postgraduate: input.postgraduate });
        return [money(s) + (s === v.salary ? " (yours)" : ""), money(x.takeHome), money(x.monthly), T.formatNumber(x.effectiveRate * 100, 1) + "%"];
      });
      el("whatif-body").innerHTML = T.tableRows(rows, salaries.indexOf(v.salary));
    }
  });
})();
