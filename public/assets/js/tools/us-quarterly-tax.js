/* US Quarterly Estimated Tax Calculator (Form 1040-ES). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var US = window.ToolNestUS;
  var E = US.data.estimatedTax;

  // v.priorTax / v.priorAgi may be null when not entered.
  function calculate(v) {
    var est = US.estimate(v.profit, v.status);
    var owed = est.total;
    var afterWithholding = owed - v.withholding;
    var required = afterWithholding >= E.minimumOwed;
    var currentYearTarget = owed * E.currentYearPct / 100;
    var priorPct = null;
    var priorYearTarget = Infinity;
    if (v.priorTax !== null) {
      var high = v.priorAgi !== null && v.priorAgi > E.highIncomeAGI[v.status];
      priorPct = high ? E.highIncomePriorYearPct : E.priorYearPct;
      priorYearTarget = v.priorTax * priorPct / 100;
    }
    var safeTarget = Math.min(currentYearTarget, priorYearTarget);
    var safePay = required ? Math.max(0, safeTarget - v.withholding) : 0;
    var fullPay = Math.max(0, afterWithholding);
    return {
      estimate: est,
      owed: owed,
      required: required,
      priorPct: priorPct,
      usesPriorYear: priorYearTarget < currentYearTarget,
      safeTarget: safeTarget,
      safePay: safePay,
      safeQuarterly: safePay / 4,
      fullPay: fullPay,
      fullQuarterly: fullPay / 4
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var status = document.getElementById("status");

  function longDate(iso) {
    var p = iso.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      profit: { min: 0, max: 100000000 },
      withholding: { min: 0, max: 100000000 },
      priorTax: { min: 0, max: 100000000, optional: true },
      priorAgi: { min: 0, max: 1000000000, optional: true }
    },
    defaults: { profit: "80000", status: "single", withholding: "0", priorTax: "", priorAgi: "" },
    outputs: ["out-quarter", "out-full", "out-owed", "out-safe", "out-basis"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      v.status = status.value;
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var r = calculate(v);
      T.setText("out-quarter", r.required ? money(r.safeQuarterly) : "$0.00");
      T.setText("out-full", money(r.fullQuarterly));
      T.setText("out-owed", money(r.owed));
      T.setText("out-safe", r.required ? money(r.safePay) : "Not required");
      T.setText("out-basis", !r.required ? "You'll owe under $1,000" :
        (r.usesPriorYear ? r.priorPct + "% of last year's tax" : E.currentYearPct + "% of this year's tax"));

      var rows = E.dueDates.map(function (d, i) {
        return ["Payment " + (i + 1) + ": " + longDate(d), r.required ? money(r.safeQuarterly) : "—", money(r.fullQuarterly)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, -1);
    }
  });
})();
