/* UK Business Mileage Allowance Calculator (simplified expenses / approved mileage rates). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var UK = window.ToolNestUK;

  function calculate(v) {
    var table = UK.data.mileage[v.year][v.vehicle];
    var allowance = 0;
    var lower = 0;
    table.forEach(function (band) {
      var inBand = Math.max(0, Math.min(v.miles, band[0]) - lower);
      allowance += inBand * band[1];
      lower = band[0];
    });
    return { allowance: allowance, saving: allowance * (v.taxRate / 100) };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var year = document.getElementById("year");
  var vehicle = document.getElementById("vehicle");
  var rateNote = document.getElementById("rate-note");

  function pence(r) { return Math.round(r * 100) + "p"; }

  function describe() {
    var table = UK.data.mileage[year.value][vehicle.value];
    rateNote.textContent = table.length > 1
      ? pence(table[0][1]) + " a mile for the first 10,000 miles, then " + pence(table[1][1])
      : pence(table[0][1]) + " a mile";
  }
  year.addEventListener("change", describe);
  vehicle.addEventListener("change", describe);
  describe();

  T.setupCalculator({
    keepCurrency: true,
    rules: { miles: { min: 0, max: 1000000 }, taxRate: { min: 0, max: 60 } },
    defaults: { year: "2026-27", vehicle: "car", miles: "12000", taxRate: "26" },
    onReset: describe,
    outputs: ["out-allowance", "out-saving"],
    render: function (v) {
      var r = calculate({ year: year.value, vehicle: vehicle.value, miles: v.miles, taxRate: v.taxRate });
      T.setText("out-allowance", T.formatMoney(r.allowance, "GBP"));
      T.setText("out-saving", T.formatMoney(r.saving, "GBP"));
    }
  });
})();
