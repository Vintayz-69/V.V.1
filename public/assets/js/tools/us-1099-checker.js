/* "Will I get a 1099?" checker for 2026. Thresholds from data/info-returns-us.js; the $400
   self-employment tax rule from data/tax-us.js. */
(function () {
  "use strict";

  var D = window.ToolNestInfoReturnsUS;
  var SE = window.ToolNestTaxUS.selfEmployment;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }
  function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }

  // One amount per line. Text before the number (such as a client's name) is ignored, as are
  // "$" and thousands commas. Returns null if a line has no number.
  function parseAmounts(text) {
    var out = [];
    var lines = String(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/[$,\s]/g, "");
      if (!line) continue;
      var m = line.match(/(\d+(?:\.\d+)?)$/);
      if (!m) return null;
      out.push(Number(m[1]));
    }
    return out;
  }

  // v: { clients: [what each client paid you directly], appTotal, appCount: payment app or
  //      marketplace sales and how many, cardTotal: card payments through a card processor,
  //      expenses: business expenses for the year }
  function calculate(v) {
    var nec = v.clients.filter(function (a) { return a >= D.necThreshold; });
    var necTotal = round2(sum(nec));
    var clientsTotal = round2(sum(v.clients));
    var appForm = v.appTotal > D.kAmount && v.appCount > D.kTransactions;
    var cardForm = v.cardTotal > 0;
    var income = round2(clientsTotal + v.appTotal + v.cardTotal);
    var onForms = round2(necTotal + (appForm ? v.appTotal : 0) + v.cardTotal);
    var profit = round2(income - v.expenses);
    var netEarnings = round2(Math.max(0, profit) * SE.netEarningsFactor);
    return {
      necCount: nec.length,
      necTotal: necTotal,
      underThreshold: round2(clientsTotal - necTotal),
      appForm: appForm,
      cardForm: cardForm,
      forms: nec.length + (appForm ? 1 : 0) + (cardForm ? 1 : 0),
      income: income,
      onForms: onForms,
      notOnForms: round2(income - onForms),
      profit: profit,
      netEarnings: netEarnings,
      seTaxApplies: netEarnings >= SE.minimumNetEarnings
    };
  }

  window.ToolNestCalc = calculate;
  window.ToolNestCalc.parseAmounts = parseAmounts;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var clientsBox = document.getElementById("clients");

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      appTotal: { min: 0, max: 1000000000 },
      appCount: { min: 0, max: 10000000 },
      cardTotal: { min: 0, max: 1000000000 },
      expenses: { min: 0, max: 1000000000 }
    },
    defaults: { clients: "5000\n2500\n1800\n900", appTotal: "3000", appCount: "40", cardTotal: "0", expenses: "2000" },
    outputs: ["out-main", "out-nec", "out-under", "out-k", "out-income", "out-unreported", "out-se"],
    check: function (v) {
      if (v.appCount % 1) return { appCount: "Enter a whole number of payments." };
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var field = clientsBox.closest(".field");
      var clients = parseAmounts(clientsBox.value);
      field.classList.toggle("invalid", !clients);
      clientsBox.setAttribute("aria-invalid", clients ? "false" : "true");
      if (!clients) {
        ["out-main", "out-nec", "out-under", "out-k", "out-income", "out-unreported", "out-se"].forEach(function (id) { T.setText(id, "—"); });
        T.setText("out-main-note", "");
        return;
      }
      var r = calculate({ clients: clients, appTotal: v.appTotal, appCount: v.appCount, cardTotal: v.cardTotal, expenses: v.expenses });
      T.setText("out-main", String(r.forms));
      T.setText("out-main-note", r.forms === 1 ? "Form 1099 likely" : "Forms 1099 likely");
      T.setText("out-nec", r.necCount + (r.necCount === 1 ? " form, " : " forms, ") + money(r.necTotal));
      T.setText("out-under", money(r.underThreshold));
      var k = [];
      if (r.appForm) k.push("payment apps");
      if (r.cardForm) k.push("card processor");
      T.setText("out-k", k.length ? "Yes: " + k.join(" and ") : "Not required");
      T.setText("out-income", money(r.income));
      T.setText("out-unreported", money(r.notOnForms));
      T.setText("out-se", r.seTaxApplies ? "Yes: net earnings " + money(r.netEarnings) : "No: net earnings " + money(r.netEarnings));
    }
  });
})();
