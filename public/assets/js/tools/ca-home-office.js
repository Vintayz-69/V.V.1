/* Canada business-use-of-home expenses (Form T2125, Part 7) for the self-employed. CRA's method:
   business part of the home by area, times hours a day out of 24 and days a week out of 7 if the
   space is also used personally; the claim can't be more than net business income before it. */
(function () {
  "use strict";

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // v: { space, home: areas in the same unit; mixed: the space is also used personally;
  //      hours: business hours a day; days: business days a week; expenses: yearly home costs;
  //      carried: amount carried forward from last year; income: net business income before this claim }
  function calculate(v) {
    var areaShare = v.space / v.home;
    // CRA rounds to the cent after the area and hours step, then applies the days a week.
    var part = v.mixed ? round2(v.hours / 24 * areaShare * v.expenses) * v.days / 7 : areaShare * v.expenses;
    part = round2(part);
    var available = round2(part + v.carried);
    var claim = round2(Math.max(0, Math.min(available, v.income)));
    return {
      areaShare: areaShare,
      businessPart: part,
      available: available,
      claim: claim,
      carryForward: round2(available - claim),
      limited: claim < available
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var mixed = document.getElementById("mixed");
  var timeFields = document.querySelectorAll(".mixed-only");

  function applyMixed() {
    timeFields.forEach(function (f) { f.hidden = !mixed.checked; });
  }
  mixed.addEventListener("change", applyMixed);
  applyMixed();

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      space: { min: 0.01, max: 100000 },
      home: { min: 0.01, max: 100000 },
      hours: { min: 0.5, max: 24 },
      days: { min: 1, max: 7 },
      expenses: { min: 0, max: 100000000 },
      carried: { min: 0, max: 100000000 },
      income: { min: -100000000, max: 100000000 }
    },
    defaults: { space: "18", home: "180", mixed: false, hours: "8", days: "5", expenses: "13300", carried: "150", income: "7100" },
    onReset: applyMixed,
    outputs: ["out-main", "out-share", "out-part", "out-available", "out-carry"],
    check: function (v) {
      if (v.space > v.home) return { space: "The workspace can't be bigger than your home." };
      if (v.days % 1) return { days: "Enter a whole number of days, from 1 to 7." };
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "CAD"); };
      var r = calculate({ space: v.space, home: v.home, mixed: mixed.checked, hours: v.hours, days: v.days,
        expenses: v.expenses, carried: v.carried, income: v.income });
      T.setText("out-main", money(r.claim));
      T.setText("out-share", T.formatNumber(r.areaShare * 100, 1) + "% of your home");
      T.setText("out-part", money(r.businessPart));
      T.setText("out-available", money(r.available));
      T.setText("out-carry", r.carryForward > 0 ? money(r.carryForward) + " (limited by your income)" : money(0));
    }
  });
})();
