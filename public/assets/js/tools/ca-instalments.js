/* Canada Quarterly Tax Instalments Calculator (2026). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var CA = window.ToolNestCA;
  var I = CA.data.instalments;

  function calculate(v) {
    var threshold = v.quebec ? I.quebecThreshold : I.threshold;
    var required = v.current > threshold && (v.last > threshold || v.before > threshold);
    return {
      threshold: threshold,
      required: required,
      currentYear: required ? v.current / 4 : 0,
      priorYear: required ? v.last / 4 : 0,
      lower: required ? Math.min(v.current, v.last) / 4 : 0
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var province = document.getElementById("province");

  function longDate(iso) {
    var p = iso.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      current: { min: 0, max: 100000000 },
      last: { min: 0, max: 100000000 },
      before: { min: 0, max: 100000000 }
    },
    defaults: { current: "12000", last: "10000", before: "8000", province: "other" },
    outputs: ["out-quarter", "out-required", "out-current", "out-prior"],
    render: function (v) {
      v.quebec = province.value === "QC";
      var money = function (n) { return T.formatMoney(n, "CAD"); };
      var r = calculate(v);
      T.setText("out-quarter", money(r.lower));
      T.setText("out-required", r.required ? "Yes" : "No (net tax owing isn't over " + money(r.threshold).replace(".00", "") + " in the right years)");
      T.setText("out-current", money(r.currentYear));
      T.setText("out-prior", money(r.priorYear));
      var rows = I.dueDates.map(function (d) {
        return [longDate(d), money(r.currentYear), money(r.priorYear)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, -1);
    }
  });
})();
