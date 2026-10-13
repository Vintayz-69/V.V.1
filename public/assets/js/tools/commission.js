/* Commission Calculator: commission on sales at a flat rate or two tiers, plus base pay, and the
   sales needed to reach an earnings goal. Runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function round2(n) { return Math.round(n * 100) / 100; }

  /*
   * v: { sales, rate, base, tiered, threshold, rate2 }
   * Tiered: `rate` on sales up to `threshold`, `rate2` on the part above it.
   */
  function calculate(v) {
    var sales = Number(v.sales) || 0;
    var r1 = (Number(v.rate) || 0) / 100;
    var commission;
    if (v.tiered) {
      var t = Math.max(0, Number(v.threshold) || 0);
      var r2 = (Number(v.rate2) || 0) / 100;
      commission = Math.min(sales, t) * r1 + Math.max(0, sales - t) * r2;
    } else {
      commission = sales * r1;
    }
    var base = Number(v.base) || 0;
    return {
      commission: round2(commission),
      total: round2(commission + base),
      effectiveRate: sales > 0 ? Math.round(commission / sales * 10000) / 100 : 0
    };
  }

  // Sales needed for `goal` in commission (not counting base pay). null if it can't be reached.
  function salesNeeded(goal, v) {
    var r1 = (Number(v.rate) || 0) / 100;
    if (!v.tiered) return r1 > 0 ? round2(goal / r1) : null;
    var t = Math.max(0, Number(v.threshold) || 0);
    var r2 = (Number(v.rate2) || 0) / 100;
    var atThreshold = t * r1;
    if (goal <= atThreshold) return r1 > 0 ? round2(goal / r1) : (goal === 0 ? 0 : null);
    return r2 > 0 ? round2(t + (goal - atThreshold) / r2) : null;
  }

  calculate.salesNeeded = salesNeeded;
  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var el = function (id) { return document.getElementById(id); };

  T.setupCalculator({
    rules: {
      sales: { min: 0, max: 1e10 },
      rate: { min: 0, max: 100 },
      base: { min: 0, max: 1e9, optional: true },
      threshold: { min: 0, max: 1e10 },
      rate2: { min: 0, max: 100 },
      goal: { min: 0, max: 1e9, optional: true }
    },
    defaults: { sales: "50000", rate: "5", base: "", threshold: "40000", rate2: "8", goal: "3000", tiered: false },
    outputs: ["out-commission", "out-total", "out-effective", "out-needed"],
    render: function (v, currency) {
      var tiered = el("tiered").checked;
      var o = { sales: v.sales, rate: v.rate, base: v.base, tiered: tiered, threshold: v.threshold, rate2: v.rate2 };
      var r = calculate(o);
      var money = function (n) { return T.formatMoney(n, currency); };
      T.setText("out-commission", money(r.commission));
      T.setText("out-total", money(r.total));
      T.setText("out-effective", T.formatNumber(r.effectiveRate, r.effectiveRate % 1 ? 2 : 0) + "%");
      var need = v.goal === null ? null : salesNeeded(v.goal, o);
      T.setText("out-needed", v.goal === null ? "—" : need === null ? "Can't be reached at these rates" : money(need) + " in sales");
    }
  });

  function showTiers() {
    var on = el("tiered").checked;
    el("field-threshold").hidden = !on;
    el("field-rate2").hidden = !on;
    T.setText("rate-label", on ? "Rate up to the threshold" : "Commission rate");
  }
  el("tiered").addEventListener("change", showTiers);
  el("reset").addEventListener("click", showTiers);
  showTiers();
})();
