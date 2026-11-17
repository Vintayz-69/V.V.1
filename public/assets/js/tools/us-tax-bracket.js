/* US Federal Tax Bracket Calculator (2026, and 2027 from tax-us.js nextYear): taxable income, tax in each bracket, marginal and
   effective rates. Figures come only from assets/data/tax-us.js through js/us-tax.js. */
(function () {
  "use strict";

  var US = window.ToolNestUS;
  var D = US.data;

  function round2(n) { return Math.round(n * 100) / 100; }

  // The figures for a tax year: the main ones in tax-us.js, or its nextYear block (2027).
  function yearData(year) {
    return D.nextYear && year === D.nextYear.year ? D.nextYear : D;
  }

  // v: income (before deductions), status, itemized (null → standard deduction), year (default: the main year)
  function calculate(v) {
    var Y = yearData(v.year || D.year);
    var deduction = v.itemized == null ? Y.standardDeduction[v.status] : v.itemized;
    var taxable = Math.max(0, v.income - deduction);
    var rows = [];
    var lower = 0;
    var tax = 0;
    Y.brackets[v.status].forEach(function (b) {
      var amount = Math.max(0, Math.min(taxable, b[0]) - lower);
      tax += amount * b[1];
      rows.push({ from: lower, to: b[0], rate: b[1], amount: amount, tax: round2(amount * b[1]) });
      lower = b[0];
    });
    if (Y === D) tax = US.incomeTax(taxable, v.status); // same sum, from the shared engine
    var band = 0;
    while (band < rows.length - 1 && taxable > rows[band].to) band++;
    var marginal = rows[band].rate;
    var next = rows[band].to === Infinity ? null : rows[band];
    return {
      deduction: deduction,
      taxable: taxable,
      tax: round2(tax),
      marginal: marginal,
      effective: v.income > 0 ? round2(tax / v.income * 100) : 0,
      toNextBracket: next ? round2(next.to - taxable) : null,
      band: band,
      rows: rows,
      year: Y.year
    };
  }
  calculate.years = [D.year].concat(D.nextYear ? [D.nextYear.year] : []);

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var status = document.getElementById("status");
  var dedType = document.getElementById("dedType");
  var yearSelect = document.getElementById("taxYear");
  var itemizedField = document.getElementById("itemized").closest(".field");

  function pct(r) { return T.formatNumber(r * 100, r * 100 % 1 ? 1 : 0) + "%"; }

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      income: { min: 0, max: 1000000000 },
      itemized: { min: 0, max: 1000000000 }
    },
    defaults: { income: "75000", taxYear: String(D.year), status: "single", dedType: "standard", itemized: "20000" },
    onReset: function () { itemizedField.hidden = true; },
    outputs: ["out-tax", "out-taxable", "out-deduction", "out-marginal", "out-effective", "out-next", "out-monthly"],
    onInvalid: function () {
      document.getElementById("brackets-body").innerHTML = '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      itemizedField.hidden = dedType.value !== "itemized";
      var money = function (n, d) { return T.formatMoney(n, "USD", d); };
      var r = calculate({ income: v.income, status: status.value, itemized: dedType.value === "itemized" ? v.itemized : null,
                          year: Number(yearSelect.value) });
      document.querySelectorAll("[data-tax-year]").forEach(function (el) { el.textContent = String(r.year); });
      T.setText("out-tax", money(r.tax));
      T.setText("out-taxable", money(r.taxable));
      T.setText("out-deduction", money(r.deduction) + (dedType.value === "itemized" ? " (itemized)" : " (standard)"));
      T.setText("out-marginal", pct(r.marginal));
      T.setText("out-effective", T.formatNumber(r.effective, 2) + "%");
      T.setText("out-monthly", money(r.tax / 12));
      T.setText("out-next", r.toNextBracket === null ? "You're in the top bracket" : money(r.toNextBracket, 0) + " more taxable income");
      var rows = r.rows.map(function (row) {
        var range = money(row.from, 0) + (row.to === Infinity ? " and over" : " – " + money(row.to, 0));
        return [range + " at " + pct(row.rate), money(row.amount, 0), money(row.tax)];
      });
      document.getElementById("brackets-body").innerHTML = T.tableRows(rows, r.band);
    }
  });
})();
