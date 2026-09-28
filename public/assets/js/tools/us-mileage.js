/* US Business Mileage Deduction Calculator (IRS standard mileage rate). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var US = window.ToolNestUS;

  // milesByPeriod: one entry per rate period of the chosen year.
  function calculate(v) {
    var periods = US.data.mileage[v.year];
    var mileage = 0;
    var miles = 0;
    periods.forEach(function (p, i) {
      var m = v.milesByPeriod[i] || 0;
      miles += m;
      mileage += m * p.rate;
    });
    var deduction = mileage + v.extra;
    return { miles: miles, mileage: mileage, deduction: deduction, saving: deduction * (v.taxRate / 100) };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var year = document.getElementById("year");
  var secondField = document.getElementById("miles2").closest(".field");
  var label1 = document.getElementById("miles1-label");
  var rateNote = document.getElementById("rate-note");

  function cents(rate) { return T.formatNumber(rate * 100, rate * 100 % 1 ? 1 : 0) + "¢"; }

  function applyYear() {
    var periods = US.data.mileage[year.value];
    secondField.hidden = periods.length < 2;
    label1.textContent = periods.length < 2 ? "Business miles in " + year.value : "Business miles, January–June " + year.value;
    rateNote.textContent = periods.map(function (p) {
      return cents(p.rate) + " a mile" + (periods.length > 1 ? (p.from.slice(5) === "01-01" ? " (Jan–Jun)" : " (Jul–Dec)") : "");
    }).join(", ");
  }
  year.addEventListener("change", applyYear);
  applyYear();

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      miles1: { min: 0, max: 1000000 },
      miles2: { min: 0, max: 1000000 },
      extra: { min: 0, max: 10000000 },
      taxRate: { min: 0, max: 60 }
    },
    defaults: { year: "2026", miles1: "5000", miles2: "6000", extra: "200", taxRate: "30" },
    onReset: applyYear,
    outputs: ["out-deduction", "out-mileage", "out-extra", "out-saving", "out-miles"],
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "USD"); };
      var r = calculate({ year: year.value, milesByPeriod: [v.miles1, v.miles2 || 0], extra: v.extra, taxRate: v.taxRate });
      T.setText("out-deduction", money(r.deduction));
      T.setText("out-mileage", money(r.mileage));
      T.setText("out-extra", money(v.extra));
      T.setText("out-saving", money(r.saving));
      T.setText("out-miles", T.formatNumber(r.miles));
    }
  });
})();
