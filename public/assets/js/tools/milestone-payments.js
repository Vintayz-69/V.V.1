/* Milestone Payment Calculator: split a project price into a deposit, milestone payments and a final payment. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // total: project price; deposit and final: % of the total; milestones: number of equal payments between them.
  // Amounts are worked out in cents. Every payment is rounded to the cent except the last one, which takes
  // whatever is left, so the payments always add up to the exact total.
  function calculate(v) {
    var totalCents = Math.round(v.total * 100);
    var depositCents = totalCents * v.deposit / 100;
    var finalCents = totalCents * v.final / 100;
    var plan = [];
    if (v.deposit > 0) plan.push({ label: "Deposit", cents: depositCents });
    var middle = totalCents - depositCents - finalCents;
    for (var i = 1; i <= v.milestones; i++) plan.push({ label: "Milestone " + i, cents: middle / v.milestones });
    if (v.final > 0) plan.push({ label: "Final payment", cents: finalCents });

    var used = 0;
    var payments = plan.map(function (p, idx) {
      var c = idx === plan.length - 1 ? totalCents - used : Math.round(p.cents);
      used += c;
      return { label: p.label, amount: c / 100, percent: totalCents ? c / totalCents * 100 : 0, paidSoFar: used / 100 };
    });

    var first = function (prefix) {
      for (var j = 0; j < payments.length; j++) if (payments[j].label.indexOf(prefix) === 0) return payments[j].amount;
      return 0;
    };
    return {
      payments: payments,
      amounts: payments.map(function (p) { return p.amount; }),
      count: payments.length,
      deposit: first("Deposit"),
      milestone: first("Milestone"),
      final: first("Final"),
      afterDeposit: totalCents / 100 - first("Deposit")
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      total: { min: 1, max: 100000000 },
      deposit: { min: 0, max: 100 },
      milestones: { min: 0, max: 12 },
      final: { min: 0, max: 100 }
    },
    defaults: { total: "6000", deposit: "30", milestones: "2", final: "20" },
    outputs: ["out-deposit", "out-milestone", "out-final", "out-count", "out-after"],
    check: function (v) {
      if (v.milestones % 1 !== 0) return { milestones: "Enter a whole number of payments, from 0 to 12." };
      if (v.deposit + v.final > 100.000001) return { final: "The deposit and final payment add up to more than 100%." };
      if (v.milestones === 0 && Math.abs(v.deposit + v.final - 100) > 0.000001) {
        return { milestones: "With no payments in between, the deposit and final payment must add up to 100%. Add a milestone payment or change the percentages." };
      }
    },
    onInvalid: function () {
      document.getElementById("schedule-body").innerHTML =
        '<tr><td colspan="4">Fix the highlighted fields above to see your schedule.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-deposit", money(r.deposit));
      T.setText("out-milestone", v.milestones ? money(r.milestone) + (v.milestones > 1 ? " each" : "") : "None");
      T.setText("out-final", v.final ? money(r.final) : "None");
      T.setText("out-count", String(r.count));
      T.setText("out-after", money(r.afterDeposit));

      var rows = r.payments.map(function (p) {
        return [p.label, T.formatNumber(Math.round(p.percent * 100) / 100, p.percent % 1 ? 2 : 0) + "%", money(p.amount), money(p.paidSoFar)];
      });
      document.getElementById("schedule-body").innerHTML = T.tableRows(rows);
    }
  });
})();
