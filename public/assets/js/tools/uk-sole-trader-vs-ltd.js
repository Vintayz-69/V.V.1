/* UK Sole Trader vs Limited Company Calculator (2026 to 2027). All company profit is paid out as dividends. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var UK = window.ToolNestUK;

  function limitedCompany(v) {
    var employerNI = UK.employerNI(v.salary); // no Employment Allowance when the director is the only employee
    var employeeNI = UK.employeeNI(v.salary);
    var companyProfit = Math.max(0, v.profit - v.salary - employerNI - v.companyCosts);
    var corpTax = UK.corporationTax(companyProfit);
    var dividends = companyProfit - corpTax;
    var pa = UK.personalAllowance(v.salary + dividends);
    var salaryTaxable = Math.max(0, v.salary - pa);
    var paLeft = Math.max(0, pa - v.salary);
    var salaryTax = UK.incomeTax(salaryTaxable, v.region);
    var divTax = UK.dividendTax(Math.max(0, dividends - paLeft), salaryTaxable);
    var takeHome = v.salary - employeeNI - salaryTax + dividends - divTax;
    return {
      employerNI: employerNI,
      employeeNI: employeeNI,
      companyProfit: companyProfit,
      corporationTax: corpTax,
      dividends: dividends,
      salaryTax: salaryTax,
      dividendTax: divTax,
      totalTax: employerNI + employeeNI + corpTax + salaryTax + divTax,
      takeHome: takeHome
    };
  }

  function calculate(v) {
    var sole = UK.soleTrader(v.profit, v.region);
    var ltd = limitedCompany(v);
    return { sole: sole, ltd: ltd, difference: ltd.takeHome - sole.takeHome };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var region = document.getElementById("region");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      profit: { min: 0, max: 100000000 },
      salary: { min: 0, max: 1000000 },
      companyCosts: { min: 0, max: 1000000 }
    },
    defaults: { profit: "60000", region: "ruk", salary: "12570", companyCosts: "0" },
    outputs: ["out-diff", "out-sole", "out-ltd", "out-sole-tax", "out-ltd-tax", "out-ct", "out-div"],
    check: function (v) {
      if (v.salary > v.profit) return { salary: "Salary can't be more than the business profit." };
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="4">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      v.region = region.value;
      var money = function (n, d) { return T.formatMoney(n, "GBP", d); };
      var r = calculate(v);
      T.setText("out-diff", (r.difference >= 0 ? "Company +" : "Sole trader +") + money(Math.abs(r.difference), 0));
      T.setText("out-sole", money(r.sole.takeHome));
      T.setText("out-ltd", money(r.ltd.takeHome));
      T.setText("out-sole-tax", money(r.sole.total));
      T.setText("out-ltd-tax", money(r.ltd.totalTax));
      T.setText("out-ct", money(r.ltd.corporationTax));
      T.setText("out-div", money(r.ltd.dividends));

      var levels = [30000, 50000, 60000, 80000, 100000, 150000];
      if (levels.indexOf(v.profit) === -1) levels.push(v.profit);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.filter(function (p) { return p >= v.salary; }).map(function (p) {
        var alt = calculate({ profit: p, region: v.region, salary: v.salary, companyCosts: v.companyCosts });
        return [money(p, 0) + (p === v.profit ? " (yours)" : ""), money(alt.sole.takeHome, 0), money(alt.ltd.takeHome, 0),
          (alt.difference >= 0 ? "Company +" : "Sole trader +") + money(Math.abs(alt.difference), 0)];
      });
      var mine = levels.filter(function (p) { return p >= v.salary; }).indexOf(v.profit);
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, mine);
    }
  });
})();
