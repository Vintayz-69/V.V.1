/* Payment Processing Fee Calculator */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var amount = Number(v.amount) || 0;
    var pct = Number(v.pct) || 0;
    var fixed = Number(v.fixedFee) || 0;

    var fee = (amount * (pct / 100)) + fixed;
    var net = Math.max(0, amount - fee);
    var effectiveRate = amount > 0 ? (fee / amount) * 100 : 0;

    var grossUp = (1 - pct / 100) > 0 ? (amount + fixed) / (1 - pct / 100) : 0;
    var grossUpFee = grossUp - amount;

    return {
      fee: fee,
      net: net,
      effectiveRate: effectiveRate,
      grossUp: grossUp,
      grossUpFee: grossUpFee
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  // Standard US rates for online card payments, checked on each provider's own pricing page
  // on 2026-09-30: stripe.com/pricing, paypal.com/us/business/paypal-business-fees,
  // squareup.com/us/en/payments/our-fees. Recheck before relying on them.
  var PRESETS = {
    stripe: { name: "Stripe (US cards)", pct: 2.9, fixed: 0.30 },
    paypal: { name: "PayPal Checkout (US)", pct: 3.49, fixed: 0.49 },
    square: { name: "Square online (US)", pct: 3.3, fixed: 0.30 }
  };

  var OUTPUTS = ["out-fee", "out-net", "out-effective", "out-grossup", "out-grossup-fee"];

  T.setupCalculator({
    rules: {
      amount: { min: 0.01, max: 100000000 },
      pct: { min: 0, max: 99 },
      fixedFee: { min: 0, max: 1000 }
    },
    defaults: { amount: "100", pct: "2.9", fixedFee: "0.30" },
    outputs: OUTPUTS,
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);

      T.setText("out-net", money(r.net));
      T.setText("out-fee", money(r.fee));
      T.setText("out-effective", T.formatNumber(r.effectiveRate) + "%");
      T.setText("out-grossup", money(r.grossUp));
      T.setText("out-grossup-fee", money(r.grossUpFee));

      // Comparison table across major payment gateways
      // The fixed fees are in US dollars, so the table always shows USD.
      var usd = function (n) { return T.formatMoney(n, "USD"); };
      var rows = Object.keys(PRESETS).map(function (key) {
        var gw = PRESETS[key];
        var gRes = calculate({ amount: v.amount, pct: gw.pct, fixedFee: gw.fixed });
        return [
          gw.name + " (" + gw.pct + "% + " + usd(gw.fixed) + ")",
          usd(gRes.fee),
          usd(gRes.net),
          usd(gRes.grossUp)
        ];
      });

      document.getElementById("gateway-table-body").innerHTML = T.tableRows(rows);
    }
  });

  // Preset selector hook
  var presetSelect = document.getElementById("gateway-preset");
  if (presetSelect) {
    // The presets are US rates. Visitors who start in another currency begin on "Custom".
    if (document.getElementById("currency").value !== "USD") presetSelect.value = "custom";
    presetSelect.addEventListener("change", function () {
      var sel = PRESETS[this.value];
      if (sel) {
        // Preset fixed fees are in US dollars, so switch the currency to match.
        var cur = document.getElementById("currency");
        if (cur.value !== "USD") {
          cur.value = "USD";
          cur.dispatchEvent(new Event("change", { bubbles: true }));
        }
        document.getElementById("pct").value = sel.pct;
        document.getElementById("fixedFee").value = sel.fixed.toFixed(2);
        var evt = new Event("input", { bubbles: true });
        document.getElementById("pct").dispatchEvent(evt);
      }
    });
  }
})();
