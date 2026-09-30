/* E-Commerce ROAS & Break-Even Ad Spend Calculator — 100% in-browser */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var adSpend = Math.max(0, Number(v.adSpend) || 0);
    var revenue = Math.max(0, Number(v.revenue) || 0);
    var cogsPct = Math.max(0, Math.min(100, Number(v.cogs) || 0));
    var other = Math.max(0, Number(v.otherExpenses) || 0);
    var orders = Math.max(0, Number(v.orders) || 0);

    var roas = adSpend > 0 ? revenue / adSpend : 0;
    var roasPct = roas * 100;

    var cogsAmount = revenue * (cogsPct / 100);
    var grossProfit = revenue - cogsAmount;
    var netProfit = grossProfit - adSpend - other;
    var netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    var grossMarginPct = 100 - cogsPct;
    var breakEvenRoas = grossMarginPct > 0 ? 100 / grossMarginPct : 0;

    var cpa = orders > 0 ? adSpend / orders : 0;
    var aov = orders > 0 ? revenue / orders : 0;

    return {
      roas: Math.round(roas * 100) / 100,
      roasPct: Number(roasPct.toFixed(1)),
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin: Number((netMargin + 1e-9).toFixed(1)),
      breakEvenRoas: Math.round(breakEvenRoas * 100) / 100,
      cogsAmount: Math.round(cogsAmount * 100) / 100,
      cpa: Math.round(cpa * 100) / 100,
      aov: Math.round(aov * 100) / 100
    };
  }

  window.ToolNestCalc = calculate;

  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = [
    "out-roas",
    "out-net-profit",
    "out-net-margin",
    "out-breakeven-roas",
    "out-cpa",
    "out-aov"
  ];

  T.setupCalculator({
    rules: {
      adSpend: { min: 0, max: 100000000 },
      revenue: { min: 0, max: 100000000 },
      cogs: { min: 0, max: 100 },
      otherExpenses: { min: 0, max: 10000000 },
      orders: { min: 0, max: 1000000 }
    },
    defaults: {
      adSpend: "2000",
      revenue: "8000",
      cogs: "40",
      otherExpenses: "500",
      orders: "100"
    },
    outputs: OUTPUTS,
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);

      T.setText("out-roas", r.roas + "x (" + r.roasPct + "%)");
      T.setText("out-net-profit", money(r.netProfit));
      T.setText("out-net-margin", r.netMargin + "%");
      T.setText("out-breakeven-roas", r.breakEvenRoas + "x");
      T.setText("out-cpa", money(r.cpa));
      T.setText("out-aov", money(r.aov));
    }
  });
})();
