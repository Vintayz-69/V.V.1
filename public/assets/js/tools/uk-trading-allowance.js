/* UK Trading Allowance Calculator: the £1,000 allowance or your actual expenses, whichever leaves
   less tax. Allowance from data/allowances-uk.js; tax from js/uk-tax.js (data/tax-uk.js). */
(function () {
  "use strict";

  var A = window.ToolNestAllowancesUK;
  var UK = window.ToolNestUK;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // Income Tax and Class 4 NI caused by the side profit, on top of the other income.
  function extraTax(other, profit, region) {
    var p = Math.max(0, profit);
    var before = UK.incomeTax(Math.max(0, other - UK.personalAllowance(other)), region);
    var total = other + p;
    var after = UK.incomeTax(Math.max(0, total - UK.personalAllowance(total)), region);
    return round2(after - before + UK.class4(p));
  }

  // v: { income: gross trading income for the year, expenses: allowable expenses,
  //      other: other taxable income such as a salary, region: "ruk" | "scotland" }
  function calculate(v) {
    var allowance = Math.min(A.trading, v.income);
    var profitAllowance = round2(v.income - allowance);
    var profitExpenses = round2(v.income - v.expenses);
    var taxAllowance = extraTax(v.other, profitAllowance, v.region);
    var taxExpenses = extraTax(v.other, profitExpenses, v.region);
    var best = taxAllowance < taxExpenses ? "allowance" : taxExpenses < taxAllowance ? "expenses" : "same";
    return {
      allowance: allowance,
      profitAllowance: profitAllowance,
      profitExpenses: profitExpenses,
      taxAllowance: taxAllowance,
      taxExpenses: taxExpenses,
      best: best,
      saving: round2(Math.abs(taxAllowance - taxExpenses)),
      underLimit: v.income <= A.trading,
      loss: profitExpenses < 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var region = document.getElementById("region");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      income: { min: 0, max: 100000000 },
      expenses: { min: 0, max: 100000000 },
      other: { min: 0, max: 100000000 }
    },
    defaults: { income: "3000", expenses: "400", other: "30000", region: "ruk" },
    outputs: ["out-main", "out-main-note", "out-pa", "out-pe", "out-ta", "out-te", "out-hmrc"],
    onInvalid: function () {
      document.getElementById("exp-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      v.region = region.value;
      var r = calculate(v);
      T.setText("out-main", money(r.saving));
      T.setText("out-main-note", r.best === "allowance" ? "less tax with the " + T.formatMoney(A.trading, "GBP", 0) + " allowance"
        : r.best === "expenses" ? "less tax with your expenses" : "difference: same tax either way");
      T.setText("out-pa", money(r.profitAllowance));
      T.setText("out-pe", r.loss ? money(r.profitExpenses) + " (a loss)" : money(r.profitExpenses));
      T.setText("out-ta", money(r.taxAllowance));
      T.setText("out-te", money(r.taxExpenses));
      T.setText("out-hmrc", r.underLimit ? "Usually not, if you use the allowance" : "Yes: register for Self Assessment");

      var rows = [0, 250, 500, 1000, 1500, 2000].filter(function (e) { return e <= v.income; }).map(function (e) {
        var x = calculate({ income: v.income, expenses: e, other: v.other, region: v.region });
        return [money(e), money(x.taxExpenses), x.best === "allowance" ? "Allowance" : x.best === "expenses" ? "Expenses" : "Same"];
      });
      document.getElementById("exp-body").innerHTML = rows.length ? T.tableRows(rows, -1)
        : '<tr><td colspan="3">Enter income above to see this table.</td></tr>';
    }
  });
})();
