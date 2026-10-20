/* UK Maternity and Paternity Pay Calculator (2026 to 2027): Statutory Maternity Pay (SMP) and
   Statutory Paternity Pay (SPP). Figures come only from assets/data/statutory-pay-uk.js. */
(function () {
  "use strict";

  var P = window.ToolNestStatutoryPayUK.parental;

  function round2(n) { return Math.round(n * 100) / 100; }

  // v.type: "maternity" | "paternity"; v.awe: average weekly earnings; v.weeks: paternity weeks (1 or 2).
  function calculate(v) {
    var share = v.awe * P.earningsShare;
    var capped = Math.min(P.flatRate, share);
    var r = { eligibleEarnings: v.awe >= P.lowerEarningsLimit, share: round2(share), capped: round2(capped) };
    if (v.type === "paternity") {
      r.weeks = v.weeks;
      r.weekly = r.capped;
      r.total = round2(capped * v.weeks);
      return r;
    }
    var lowerWeeks = P.maternityWeeks - P.maternityHigherWeeks;
    r.weeks = P.maternityWeeks;
    r.higherWeekly = r.share;
    r.higherTotal = round2(share * P.maternityHigherWeeks);
    r.lowerWeekly = r.capped;
    r.lowerWeeks = lowerWeeks;
    r.lowerTotal = round2(capped * lowerWeeks);
    r.total = round2(r.higherTotal + r.lowerTotal);
    return r;
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var el = function (id) { return document.getElementById(id); };
  var typeOf = function () { return document.querySelector("input[name=pay-type]:checked").value; };

  function showType() {
    var paternity = typeOf() === "paternity";
    el("weeks-field").hidden = !paternity;
    Array.prototype.forEach.call(document.querySelectorAll("[data-only]"), function (li) {
      li.hidden = li.getAttribute("data-only") !== typeOf();
    });
    el("pay-heading").textContent = paternity ? "Estimated Statutory Paternity Pay" : "Estimated Statutory Maternity Pay";
  }

  showType();
  el("calc-form").addEventListener("change", showType);
  T.setupCalculator({
    keepCurrency: true,
    rules: {
      awe: { min: 0.01, max: 100000 },
      weeks: { min: 1, max: 2 }
    },
    defaults: { awe: "500", weeks: "2" },
    outputs: ["out-total", "out-higher", "out-higher-weekly", "out-lower", "out-lower-weekly", "out-pat-weekly", "out-eligible"],
    onReset: function () { el("type-mat").checked = true; showType(); },
    check: function (v) {
      if (v.weeks != null && v.weeks % 1) return { weeks: "Enter 1 or 2." };
    },
    render: function (v) {
      showType();
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate({ type: typeOf(), awe: v.awe, weeks: v.weeks });
      T.setText("out-total", money(r.total));
      if (typeOf() === "paternity") {
        T.setText("out-pat-weekly", money(r.weekly));
      } else {
        T.setText("out-higher-weekly", money(r.higherWeekly));
        T.setText("out-higher", money(r.higherTotal));
        T.setText("out-lower-weekly", money(r.lowerWeekly));
        T.setText("out-lower", money(r.lowerTotal));
      }
      T.setText("out-eligible", r.eligibleEarnings ? "Yes" : "No, under £" + P.lowerEarningsLimit + " a week");
      el("not-eligible-note").hidden = r.eligibleEarnings;
    }
  });
})();
