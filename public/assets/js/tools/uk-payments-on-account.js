/* UK Self Assessment Payments on Account Calculator (for tax year 2026 to 2027). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var UK = window.ToolNestUK;
  var P = UK.data.paymentsOnAccount;

  // lastBill: 2025/26 Self Assessment bill (tax + Class 4 NI, after tax paid at source).
  // paidOnAccount: payments on account already made towards 2025/26.
  // atSource: tax already collected for 2025/26 through PAYE etc. nextBill: estimated 2026/27 bill (or null).
  function calculate(v) {
    var totalTax = v.lastBill + v.atSource;
    var atSourceShare = totalTax > 0 ? v.atSource / totalTax : 0;
    var needed = v.lastBill >= P.minimumBill && atSourceShare <= P.collectedAtSourceLimit;
    var eachPayment = needed ? v.lastBill / 2 : 0;
    var balancingLast = Math.max(0, v.lastBill - v.paidOnAccount);
    var january = balancingLast + eachPayment;
    var july = eachPayment;
    var balancingNext = v.nextBill !== null ? v.nextBill - 2 * eachPayment : null;
    return {
      needed: needed,
      reason: v.lastBill < P.minimumBill ? "bill" : (atSourceShare > P.collectedAtSourceLimit ? "source" : ""),
      eachPayment: eachPayment,
      balancingLast: balancingLast,
      january: january,
      july: july,
      balancingNext: balancingNext,
      refundNext: balancingNext !== null && balancingNext < 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      lastBill: { min: 0, max: 100000000 },
      paidOnAccount: { min: 0, max: 100000000 },
      atSource: { min: 0, max: 100000000 },
      nextBill: { min: 0, max: 100000000, optional: true }
    },
    defaults: { lastBill: "8000", paidOnAccount: "0", atSource: "0", nextBill: "9000" },
    outputs: ["out-jan", "out-jul", "out-each", "out-balance", "out-next", "out-status"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate(v);
      T.setText("out-jan", money(r.january));
      T.setText("out-jul", money(r.july));
      T.setText("out-each", money(r.eachPayment));
      T.setText("out-balance", money(r.balancingLast));
      T.setText("out-next", r.balancingNext === null ? "Add an estimate" : (r.refundNext ? "Refund of " + money(-r.balancingNext) : money(r.balancingNext)));
      T.setText("out-status", r.needed ? "Yes" : (r.reason === "bill" ? "No: last bill under £1,000" : "No: over 80% paid at source"));

      var rows = [
        ["31 January 2027", "Balancing payment for 2025 to 2026 + 1st payment on account", money(r.january)],
        ["31 July 2027", "2nd payment on account for 2026 to 2027", money(r.july)],
        ["31 January 2028", "Balancing payment for 2026 to 2027 (plus next year's 1st payment on account)",
          r.balancingNext === null ? "—" : (r.refundNext ? "Refund " + money(-r.balancingNext) : money(r.balancingNext))]
      ];
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, 0);
    }
  });
})();
