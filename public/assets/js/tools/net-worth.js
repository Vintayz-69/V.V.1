/* Net Worth Calculator: what you own minus what you owe. Every box is optional. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var ASSETS = [["cash", "Cash and savings"], ["investments", "Investments"], ["retirement", "Pensions and retirement accounts"],
    ["home", "Home"], ["property", "Other property"], ["vehicles", "Vehicles"], ["otherAssets", "Other things you own"]];
  var DEBTS = [["mortgage", "Mortgage on your home"], ["propertyLoans", "Loans on other property"], ["carLoans", "Car loans"],
    ["cards", "Credit cards"], ["studentLoans", "Student loans"], ["otherDebts", "Other debts"]];

  function sum(v, list) {
    return list.reduce(function (t, item) { return t + (v[item[0]] || 0); }, 0);
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // v: one number for each id in ASSETS and DEBTS (missing or null = 0).
  function calculate(v) {
    var assets = sum(v, ASSETS);
    var debts = sum(v, DEBTS);
    var homeEquity = (v.home || 0) - (v.mortgage || 0);
    return {
      assets: round2(assets),
      debts: round2(debts),
      netWorth: round2(assets - debts),
      debtRatio: assets > 0 ? debts / assets * 100 : null,
      homeEquity: round2(homeEquity),
      withoutHome: round2(assets - debts - homeEquity),
      shares: ASSETS.map(function (item) {
        return { id: item[0], label: item[1], amount: v[item[0]] || 0, share: assets > 0 ? (v[item[0]] || 0) / assets * 100 : 0 };
      })
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var rules = {};
  ASSETS.concat(DEBTS).forEach(function (item) { rules[item[0]] = { min: 0, max: 100000000000, optional: true }; });

  T.setupCalculator({
    rules: rules,
    defaults: { cash: "15000", investments: "20000", retirement: "45000", home: "300000", property: "", vehicles: "12000",
      otherAssets: "", mortgage: "220000", propertyLoans: "", carLoans: "8000", cards: "2500", studentLoans: "15000", otherDebts: "" },
    outputs: ["out-net", "out-assets", "out-debts", "out-ratio", "out-equity", "out-without-home"],
    onInvalid: function () {
      document.getElementById("mix-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency, 0); };
      var r = calculate(v);
      T.setText("out-net", (r.netWorth < 0 ? "−" : "") + money(Math.abs(r.netWorth)));
      T.setText("out-assets", money(r.assets));
      T.setText("out-debts", money(r.debts));
      T.setText("out-ratio", r.debtRatio == null ? "—" : T.formatNumber(r.debtRatio, 1) + "%");
      T.setText("out-equity", (r.homeEquity < 0 ? "−" : "") + money(Math.abs(r.homeEquity)));
      T.setText("out-without-home", (r.withoutHome < 0 ? "−" : "") + money(Math.abs(r.withoutHome)));

      var rows = r.shares.filter(function (s) { return s.amount > 0; }).map(function (s) {
        return [s.label, money(s.amount), T.formatNumber(s.share, 1) + "%"];
      });
      document.getElementById("mix-body").innerHTML = rows.length ? T.tableRows(rows)
        : '<tr><td colspan="3">Enter what you own above to see this table.</td></tr>';
    }
  });
})();
