/* Canada GST/HST Quick Method calculator. Remittance rates from data/quick-method-ca.js; each
   province's GST/HST rate from data/tax-ca.js. */
(function () {
  "use strict";

  var Q = window.ToolNestQuickMethodCA;
  var P = window.ToolNestTaxCA.salesTax;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // v: { home: province of your business, customers: province where most of your sales are made,
  //      type: "services" | "goods", sales: a fiscal year's sales before GST/HST,
  //      itcs: GST/HST paid on expenses you'd claim back under the regular method }
  function calculate(v) {
    var charged = P[v.customers].rate;
    var column = P[v.home].rate;
    var rate = Q.rates[v.type][String(charged)][String(column)];
    var collected = round2(v.sales * charged);
    var revenue = round2(v.sales + collected);
    var remitRate = Math.max(0, rate);
    var zeroCredit = rate < 0 ? round2(revenue * -rate) : 0;
    var firstCredit = round2(Math.min(revenue, Q.firstSalesLimit) * Q.firstSalesCredit);
    var quick = round2(revenue * remitRate - zeroCredit - firstCredit);
    var regular = round2(collected - v.itcs);
    return {
      chargedRate: charged,
      remitRate: remitRate,
      zeroCredit: zeroCredit,
      collected: collected,
      revenue: revenue,
      firstCredit: firstCredit,
      quick: quick,
      kept: round2(collected - quick),
      regular: regular,
      saving: round2(regular - quick), // above 0: the Quick Method means remitting less
      overLimit: revenue > Q.maxSupplies
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var home = document.getElementById("home");
  var customers = document.getElementById("customers");
  var type = document.getElementById("type");
  var options = Object.keys(P).map(function (k) {
    return '<option value="' + k + '">' + P[k].name + " (" + P[k].type + " " + T.formatNumber(P[k].rate * 100) + "%)</option>";
  }).join("");
  home.innerHTML = options;
  customers.innerHTML = options;
  home.value = "ON";
  customers.value = "ON";

  var pct = function (r) { return T.formatNumber(r * 100) + "%"; };

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      sales: { min: 0.01, max: 1000000000 },
      itcs: { min: 0, max: 1000000000 }
    },
    defaults: { home: "ON", customers: "ON", type: "services", sales: "60000", itcs: "1200" },
    outputs: ["out-main", "out-rate", "out-collected", "out-revenue", "out-credit", "out-kept", "out-regular", "out-compare"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "CAD"); };
      var r = calculate({ home: home.value, customers: customers.value, type: type.value, sales: v.sales, itcs: v.itcs });
      T.setText("out-main", money(r.quick));
      T.setText("out-rate", r.zeroCredit ? "0% (and a " + pct(-Q.rates[type.value][String(r.chargedRate)][String(P[home.value].rate)]) + " credit)" : pct(r.remitRate));
      T.setText("out-collected", money(r.collected));
      T.setText("out-revenue", money(r.revenue));
      T.setText("out-credit", money(r.firstCredit + r.zeroCredit));
      T.setText("out-kept", money(r.kept));
      T.setText("out-regular", money(r.regular));
      T.setText("out-compare", r.saving > 0 ? money(r.saving) + " less with the Quick Method"
        : r.saving < 0 ? money(-r.saving) + " more with the Quick Method" : "The same");
      var note = document.getElementById("out-limit");
      note.hidden = !r.overLimit;
    }
  });
})();
