/* Customer Lifetime Value (CLV) Calculator: gross profit a customer brings over their lifetime,
   compared with what it costs to win them. Pure maths, runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function round2(n) { return Math.round(n * 100) / 100; }

  // v: order (average order value), orders (per year), margin (%), years, cac (cost to win a customer)
  function calculate(v) {
    var yearly = v.order * v.orders;
    var lifetimeRevenue = yearly * v.years;
    var clv = lifetimeRevenue * v.margin / 100;
    var monthlyProfit = yearly * v.margin / 100 / 12;
    return {
      yearly: round2(yearly),
      lifetimeRevenue: round2(lifetimeRevenue),
      clv: round2(clv),
      ratio: v.cac > 0 ? round2(clv / v.cac) : null,
      payback: monthlyProfit > 0 ? round2(v.cac / monthlyProfit) : null,
      net: round2(clv - v.cac)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      order: { min: 0.01, max: 100000000 },
      orders: { min: 0.01, max: 10000 },
      margin: { min: 0, max: 100 },
      years: { min: 0.1, max: 50 },
      cac: { min: 0, max: 100000000 }
    },
    defaults: { order: "50", orders: "4", margin: "60", years: "3", cac: "120" },
    outputs: ["out-clv", "out-yearly", "out-revenue", "out-ratio", "out-payback", "out-net"],
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-clv", money(r.clv));
      T.setText("out-yearly", money(r.yearly));
      T.setText("out-revenue", money(r.lifetimeRevenue));
      T.setText("out-ratio", r.ratio === null ? "No cost entered" : T.formatNumber(r.ratio, 2) + " : 1");
      T.setText("out-payback", r.payback === null ? "Never (no profit)" : T.formatNumber(r.payback, 1) + " months");
      T.setText("out-net", money(r.net));
      var note = document.getElementById("clv-note");
      if (note) {
        note.textContent = r.net < 0
          ? "Each customer costs more to win than they bring in. Lower the cost to win them, raise prices or margin, or keep customers longer."
          : "Each customer brings in at least as much gross profit as they cost to win.";
      }
    }
  });
})();
