/* Tip & Bill Split Calculator — 100% in-browser */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var bill = Math.max(0, Number(v.bill) || 0);
    var tipPct = Math.max(0, Number(v.tipPct) || 0);
    var split = Math.max(1, parseInt(v.split, 10) || 1);
    var roundUp = Boolean(v.roundUp === true || v.roundUp === "true");

    var rawTip = bill * (tipPct / 100);
    var rawTotal = bill + rawTip;

    var total = rawTotal;
    var tipAmount = rawTip;

    if (roundUp && total > 0) {
      total = Math.ceil(total);
      tipAmount = total - bill;
    }

    var effectivePct = bill > 0 ? (tipAmount / bill) * 100 : tipPct;

    var perPersonTotal = total / split;
    var perPersonTip = tipAmount / split;
    var perPersonBill = bill / split;

    return {
      tipAmount: Math.round(tipAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      effectivePct: Math.round(effectivePct * 10) / 10,
      split: split,
      perPersonTotal: Math.round(perPersonTotal * 100) / 100,
      perPersonTip: Math.round(perPersonTip * 100) / 100,
      perPersonBill: Math.round(perPersonBill * 100) / 100
    };
  }

  window.ToolNestCalc = calculate;

  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = [
    "out-per-person",
    "out-tip-total",
    "out-bill-total",
    "out-per-person-tip",
    "out-effective-pct"
  ];

  T.setupCalculator({
    rules: {
      bill: { min: 0, max: 1000000 },
      tipPct: { min: 0, max: 100 },
      split: { min: 1, max: 100 }
    },
    defaults: { bill: "85", tipPct: "18", split: "2" },
    outputs: OUTPUTS,
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var isRound = document.getElementById("roundUp") && document.getElementById("roundUp").checked;
      var r = calculate({
        bill: v.bill,
        tipPct: v.tipPct,
        split: v.split,
        roundUp: isRound
      });

      T.setText("out-per-person", money(r.perPersonTotal));
      T.setText("out-tip-total", money(r.tipAmount));
      T.setText("out-bill-total", money(r.total));
      T.setText("out-per-person-tip", money(r.perPersonTip));
      T.setText("out-effective-pct", r.effectivePct + "%");
    }
  });

  // Handle preset tip buttons
  var tipButtons = document.querySelectorAll(".tip-preset");
  var tipInput = document.getElementById("tipPct");
  if (tipButtons && tipInput) {
    tipButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tipInput.value = btn.getAttribute("data-tip");
        tipButtons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        if (window.__toolNestRecalc) window.__toolNestRecalc();
      });
    });
  }

  var roundCheck = document.getElementById("roundUp");
  if (roundCheck) {
    roundCheck.addEventListener("change", function () {
      if (window.__toolNestRecalc) window.__toolNestRecalc();
    });
  }
})();
