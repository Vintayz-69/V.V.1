/* Effective Hourly Rate Calculator: what a fixed-price project really paid per hour worked. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // fee: project price before tax; hours: every hour spent on it; feePct: platform or payment fee (%);
  // expenses: costs paid for this project; target: optional hourly rate to compare with (null = none).
  function calculate(v) {
    var feeShare = v.feePct / 100;
    var fees = v.fee * feeShare;
    var net = v.fee - fees - v.expenses;
    var r = {
      fees: fees,
      net: net,
      effective: net / v.hours,
      target: v.target
    };
    if (v.target) {
      r.gap = r.effective - v.target;
      r.hoursAtTarget = net / v.target;
      r.feeNeeded = (v.target * v.hours + v.expenses) / (1 - feeShare);
    }
    return r;
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var FACTORS = [0.75, 1, 1.25, 1.5, 2];

  T.setupCalculator({
    rules: {
      fee: { min: 1, max: 10000000 },
      hours: { min: 0.25, max: 10000 },
      feePct: { min: 0, max: 90 },
      expenses: { min: 0, max: 10000000 },
      target: { min: 1, max: 100000, optional: true }
    },
    defaults: { fee: "2400", hours: "40", feePct: "3", expenses: "100", target: "60" },
    outputs: ["out-effective", "out-net", "out-fees", "out-gap", "out-hours-target", "out-fee-needed"],
    check: function (v) {
      if (v.fee * (1 - v.feePct / 100) - v.expenses <= 0) {
        return { expenses: "Fees and costs take up the whole price, so there's nothing left to pay you." };
      }
    },
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="2">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var r = calculate(v);
      T.setText("out-effective", money(r.effective));
      T.setText("out-net", money(r.net));
      T.setText("out-fees", money(r.fees));
      if (v.target) {
        T.setText("out-gap", r.gap >= 0 ? money(r.gap) + " above" : money(-r.gap) + " below");
        T.setText("out-hours-target", T.formatNumber(Math.round(r.hoursAtTarget * 10) / 10) + " hours");
        T.setText("out-fee-needed", money(r.feeNeeded));
      } else {
        ["out-gap", "out-hours-target", "out-fee-needed"].forEach(function (id) { T.setText(id, "Add a target rate"); });
      }

      var rows = FACTORS.map(function (f) {
        var h = v.hours * f;
        var alt = calculate({ fee: v.fee, hours: h, feePct: v.feePct, expenses: v.expenses, target: null });
        return [T.formatNumber(Math.round(h * 10) / 10) + " hours" + (f === 1 ? " (yours)" : ""), money(alt.effective)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, FACTORS.indexOf(1));
    }
  });
})();
