/* UK Holiday Entitlement Calculator — statutory minimum paid holiday (5.6 weeks, capped at 28 days),
 * and 12.07% of hours worked for irregular hours and part-year workers.
 * Figures come only from data/employment-uk.js. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var H = window.ToolNestEmploymentUK.holiday;

  /*
   * v.mode "days":      { days } days worked a week → entitlement in days
   * v.mode "hours":     { hours, days } hours a week over `days` days → entitlement in hours
   * v.mode "irregular": { worked } hours worked in the pay period → holiday earned in hours
   * v.fraction (optional, 0–1): share of the leave year worked, for starting or leaving part way
   */
  function calculate(v) {
    var fraction = v.fraction == null ? 1 : v.fraction;
    if (v.mode === "irregular") {
      return { unit: "hours", entitlement: v.worked * H.irregularRate, capped: false };
    }
    if (v.mode === "hours") {
      var dayLength = v.hours / v.days;
      var full = v.hours * H.weeks;
      var cap = H.maxDays * dayLength;
      return { unit: "hours", full: Math.min(full, cap), entitlement: Math.min(full, cap) * fraction, capped: full > cap, dayLength: dayLength, days: Math.min(full, cap) / dayLength * fraction };
    }
    var fullDays = v.days * H.weeks;
    var capped = fullDays > H.maxDays;
    var entitlement = Math.min(fullDays, H.maxDays);
    return { unit: "days", full: entitlement, entitlement: entitlement * fraction, capped: capped };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var el = function (id) { return document.getElementById(id); };
  var mode = el("mode");
  var partYear = el("partYear");

  function show(id, on) { el(id).closest(".field").hidden = !on; }
  function applyMode() {
    var m = mode.value;
    show("days", m === "days" || m === "hours");
    show("hours", m === "hours");
    show("worked", m === "irregular");
    el("part-year-wrap").hidden = m === "irregular";
    show("months", m !== "irregular" && partYear.checked);
  }
  mode.addEventListener("change", applyMode);
  partYear.addEventListener("change", applyMode);
  applyMode();

  function num(n, d) { return T.formatNumber(n, d === undefined ? (Math.round(n * 100) % 100 ? 2 : 0) : d); }

  T.setupCalculator({
    rules: {
      days: { min: 0.5, max: 7 },
      hours: { min: 0.5, max: 168 },
      worked: { min: 0, max: 100000 },
      months: { min: 0, max: 12 }
    },
    check: function (v) {
      if (mode.value === "hours" && v.hours / v.days > 24) return { hours: "That's more than 24 hours a day." };
    },
    defaults: { mode: "days", days: "5", hours: "37.5", worked: "30", partYear: false, months: "6" },
    onReset: applyMode,
    outputs: ["out-main", "out-weeks", "out-detail"],
    render: function (v) {
      var input = { mode: mode.value, days: v.days, hours: v.hours, worked: v.worked };
      if (mode.value !== "irregular" && partYear.checked) input.fraction = v.months / 12;
      var r = calculate(input);
      var unit = r.unit === "days" ? " days" : " hours";
      T.setText("out-main", num(r.entitlement) + unit);
      if (mode.value === "irregular") {
        T.setText("out-title", "Holiday earned");
        T.setText("out-weeks", num(v.worked) + " hours × 12.07%");
        T.setText("out-detail", "Add this to what you've earned in earlier pay periods. You can't earn more than 5.6 weeks in a leave year.");
        return;
      }
      T.setText("out-title", partYear.checked ? "Your holiday for the part year" : "Your holiday each year");
      T.setText("out-weeks", partYear.checked ? num(r.full) + unit + " a full year × " + num(v.months) + "/12" : "5.6 weeks of your working week");
      var detail = r.capped ? "Capped at the legal maximum of 28 days." : "";
      if (mode.value === "hours") detail = (detail ? detail + " " : "") + "That's about " + num(r.days, 1) + " days of " + num(r.dayLength) + " hours.";
      T.setText("out-detail", detail || "Your employer can include bank holidays in this.");
    }
  });
})();
