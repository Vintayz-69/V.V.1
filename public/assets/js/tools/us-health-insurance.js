/* US self-employed health insurance deduction (Form 7206 method) and its federal income tax saving
   for 2026. Tax figures from data/tax-us.js through js/us-tax.js. */
(function () {
  "use strict";

  var US = window.ToolNestUS;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // v: { monthly: premium a month; months: months covered; employerMonths: months you (or your spouse)
  //      could join an employer-subsidized plan; profit: Schedule C net profit; retirement: SEP,
  //      SIMPLE or qualified plan contributions for this business; status: filing status }
  function calculate(v) {
    var se = US.selfEmploymentTax(v.profit, v.status, 0);
    var eligibleMonths = Math.max(0, v.months - v.employerMonths);
    var premiums = round2(v.monthly * eligibleMonths);
    // Form 7206: net profit, minus the deductible part of SE tax, minus retirement contributions.
    var limit = round2(Math.max(0, v.profit - se.deductibleHalf - v.retirement));
    var deduction = round2(Math.min(premiums, limit));
    // The deduction lowers AGI and qualified business income, not self-employment tax.
    var base = v.profit - se.deductibleHalf - v.retirement;
    var without = US.federalIncomeTax(base, base, v.status);
    var withIt = US.federalIncomeTax(base - deduction, base - deduction, v.status);
    return {
      eligibleMonths: eligibleMonths,
      premiums: premiums,
      limit: limit,
      deduction: deduction,
      limited: deduction < premiums,
      taxWithout: round2(without.tax),
      taxWith: round2(withIt.tax),
      saving: round2(without.tax - withIt.tax),
      overQbiThreshold: !without.qbiApplies || !withIt.qbiApplies
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var status = document.getElementById("status");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      monthly: { min: 0, max: 1000000 },
      months: { min: 1, max: 12 },
      employerMonths: { min: 0, max: 12 },
      profit: { min: 0, max: 100000000 },
      retirement: { min: 0, max: 100000000 }
    },
    defaults: { monthly: "500", months: "12", employerMonths: "0", profit: "70000", retirement: "0", status: "single" },
    outputs: ["out-main", "out-premiums", "out-limit", "out-saving", "out-tax"],
    check: function (v) {
      if (v.months % 1) return { months: "Enter a whole number of months, from 1 to 12." };
      if (v.employerMonths % 1 || v.employerMonths > v.months) return { employerMonths: "Enter whole months, no more than the months covered." };
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var r = calculate({ monthly: v.monthly, months: v.months, employerMonths: v.employerMonths, profit: v.profit, retirement: v.retirement, status: status.value });
      T.setText("out-main", money(r.deduction));
      T.setText("out-premiums", money(r.premiums) + " (" + r.eligibleMonths + (r.eligibleMonths === 1 ? " month)" : " months)"));
      T.setText("out-limit", money(r.limit) + (r.limited ? " (this limits you)" : ""));
      T.setText("out-saving", money(r.saving));
      T.setText("out-tax", money(r.taxWithout) + " → " + money(r.taxWith));
      document.getElementById("out-qbi-note").hidden = !r.overQbiThreshold;
    }
  });
})();
