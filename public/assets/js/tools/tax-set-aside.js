/* Freelance Tax Set-Aside Calculator: what share of each payment to keep for tax, in the US, UK,
 * Canada or Australia. Tax comes only from the country engines (js/*-tax.js), which read the
 * official figures in data/tax-*.js (LEGAL.md §6). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var W = window;

  var COUNTRIES = {
    us: { currency: "USD", symbol: "$" },
    uk: { currency: "GBP", symbol: "£" },
    ca: { currency: "CAD", symbol: "$" },
    au: { currency: "AUD", symbol: "$" }
  };

  /*
   * v: { country: "us" | "uk" | "ca" | "au", profit, payment,
   *      status (US), stateRate (US, %), region (UK: "ruk" | "scotland"),
   *      provincial (Canada, % of taxable income), eligible (Australia: small business offset) }
   */
  function calculate(v) {
    var tax;
    if (v.country === "us") {
      tax = W.ToolNestUS.estimate(v.profit, v.status || "single").total + v.profit * (v.stateRate || 0) / 100;
    } else if (v.country === "uk") {
      tax = W.ToolNestUK.soleTrader(v.profit, v.region || "ruk").total;
    } else if (v.country === "ca") {
      tax = W.ToolNestCA.selfEmployed(v.profit, v.provincial || 0).total;
    } else {
      tax = W.ToolNestAU.individual(v.profit, v.eligible === false ? 0 : v.profit).total;
    }
    var rate = v.profit > 0 ? tax / v.profit : 0;
    return {
      tax: tax,
      rate: rate,
      fromPayment: (v.payment || 0) * rate,
      keepFromPayment: (v.payment || 0) * (1 - rate),
      monthly: tax / 12,
      takeHome: v.profit - tax
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var country = document.getElementById("country");
  var status = document.getElementById("status");
  var region = document.getElementById("region");
  var eligible = document.getElementById("eligible");
  var extras = { us: ["field-status", "field-state"], uk: ["field-region"], ca: ["field-provincial"], au: ["field-eligible"] };

  function showFields() {
    Object.keys(extras).forEach(function (c) {
      extras[c].forEach(function (id) { document.getElementById(id).hidden = c !== country.value; });
    });
    var sym = COUNTRIES[country.value].symbol;
    document.querySelectorAll("[data-country-symbol]").forEach(function (el) { el.textContent = sym; });
  }
  country.addEventListener("change", showFields);
  showFields();

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      profit: { min: 0, max: 100000000 },
      payment: { min: 0, max: 100000000 },
      stateRate: { min: 0, max: 15 },
      provincial: { min: 0, max: 25 }
    },
    defaults: { country: "us", profit: "60000", payment: "2000", status: "single", stateRate: "0", region: "ruk", provincial: "5", eligible: "yes" },
    outputs: ["out-rate", "out-payment", "out-keep", "out-tax", "out-monthly", "out-take"],
    onReset: showFields,
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      v.country = country.value;
      v.status = status.value;
      v.region = region.value;
      v.eligible = eligible.value === "yes";
      var cur = COUNTRIES[v.country].currency;
      var money = function (n, d) { return T.formatMoney(n, cur, d); };
      var r = calculate(v);
      T.setText("out-rate", T.formatNumber(r.rate * 100, 1) + "%");
      T.setText("out-payment", money(r.fromPayment));
      T.setText("out-keep", money(r.keepFromPayment));
      T.setText("out-tax", money(r.tax));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-take", money(r.takeHome));

      var levels = [20000, 40000, 60000, 80000, 100000, 150000];
      if (levels.indexOf(v.profit) === -1) levels.push(v.profit);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.map(function (p) {
        var alt = calculate({ country: v.country, profit: p, payment: 0, status: v.status, stateRate: v.stateRate, region: v.region, provincial: v.provincial, eligible: v.eligible });
        return [money(p, 0) + (p === v.profit ? " (yours)" : ""), money(alt.tax, 0), T.formatNumber(alt.rate * 100, 1) + "%"];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, levels.indexOf(v.profit));
    }
  });
})();
