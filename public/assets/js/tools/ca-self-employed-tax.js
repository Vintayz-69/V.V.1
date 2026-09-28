/* Canada Self-Employed Tax Calculator (federal tax + CPP, provincial estimate). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var CA = window.ToolNestCA;

  function calculate(v) {
    return CA.selfEmployed(v.earnings, v.provincial);
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    keepCurrency: true,
    rules: { earnings: { min: 0, max: 100000000 }, provincial: { min: 0, max: 30 } },
    defaults: { earnings: "60000", provincial: "5" },
    outputs: ["out-take", "out-monthly", "out-total", "out-cpp", "out-fed", "out-prov", "out-rate"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML = '<tr><td colspan="4">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n, d) { return T.formatMoney(n, "CAD", d); };
      var r = calculate(v);
      T.setText("out-take", money(r.takeHome));
      T.setText("out-monthly", money(r.takeHome / 12));
      T.setText("out-total", money(r.total));
      T.setText("out-cpp", money(r.cpp.total));
      T.setText("out-fed", money(r.federal));
      T.setText("out-prov", money(r.provincial));
      T.setText("out-rate", T.formatNumber(r.effectiveRate * 100, 1) + "%");

      var levels = [30000, 45000, 60000, 80000, 100000, 150000];
      if (levels.indexOf(v.earnings) === -1) levels.push(v.earnings);
      levels.sort(function (a, b) { return a - b; });
      var rows = levels.map(function (e) {
        var alt = calculate({ earnings: e, provincial: v.provincial });
        return [money(e, 0) + (e === v.earnings ? " (yours)" : ""), money(alt.cpp.total, 0), money(alt.takeHome, 0), T.formatNumber(alt.effectiveRate * 100, 1) + "%"];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, levels.indexOf(v.earnings));
    }
  });
})();
