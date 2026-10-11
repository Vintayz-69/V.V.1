/* Days Between Dates: counts the days between two dates, and shows the gap in years, months and
   days, in weeks, and in weekdays. Runs in the browser. */

(function () {
  "use strict";

  var D = window.ToolNestDate;

  /*
   * start, end: { y, m, d }. includeEnd: count the end date too (adds one day).
   * Returns { days, weeks, weekDays, years, months, monthDays, weekdays, hours, reversed }.
   * Years, months and days count whole months from the start date; if a day doesn't exist in a
   * month (31 January → February), that month's last day is used.
   */
  function calculate(start, end, includeEnd) {
    var reversed = D.compare(end, start) < 0;
    var a = reversed ? end : start;
    var b = reversed ? start : end;
    var last = includeEnd ? D.addDays(b, 1) : b; // count up to the day after the end date
    var days = D.toDays(last) - D.toDays(a);
    var months = (last.y - a.y) * 12 + (last.m - a.m);
    if (D.compare(D.addMonths(a, months), last) > 0) months--;
    var monthDays = D.toDays(last) - D.toDays(D.addMonths(a, months));
    return {
      days: days,
      weeks: Math.floor(days / 7),
      weekDays: days % 7,
      years: Math.floor(months / 12),
      months: months % 12,
      monthDays: monthDays,
      weekdays: D.weekdaysBetween(a, last),
      hours: days * 24,
      reversed: reversed
    };
  }

  window.ToolNestCalc = calculate;

  var form = document.getElementById("dd-form");
  if (!form) return;

  var T = window.ToolNest;
  var el = function (id) { return document.getElementById(id); };
  var startIn = el("dd-start");
  var endIn = el("dd-end");
  var includeIn = el("dd-include");
  var us = D.usOrder();

  function mark(input, ok) {
    input.closest(".field").classList.toggle("invalid", !ok);
    input.setAttribute("aria-invalid", ok ? "false" : "true");
  }

  function ymd(r) {
    var parts = [];
    if (r.years) parts.push(D.plural(r.years, "year"));
    if (r.months) parts.push(D.plural(r.months, "month"));
    if (r.monthDays || !parts.length) parts.push(D.plural(r.monthDays, "day"));
    return parts.join(", ");
  }

  function update() {
    var s = D.parse(startIn.value);
    var e = D.parse(endIn.value);
    mark(startIn, !!s);
    mark(endIn, !!e);
    if (!s || !e) {
      ["out-days", "out-ymd", "out-weeks", "out-weekdays", "out-hours", "out-start", "out-end"].forEach(function (id) { T.setText(id, "—"); });
      T.setText("out-note", "");
      return;
    }
    var r = calculate(s, e, includeIn.checked);
    T.setText("out-days", r.days.toLocaleString("en-US"));
    T.setText("out-days-word", r.days === 1 ? "day" : "days");
    T.setText("out-ymd", ymd(r));
    T.setText("out-weeks", D.plural(r.weeks, "week") + (r.weekDays ? ", " + D.plural(r.weekDays, "day") : ""));
    T.setText("out-weekdays", r.weekdays.toLocaleString("en-US"));
    T.setText("out-hours", r.hours.toLocaleString("en-US"));
    T.setText("out-start", D.longDate(s, us));
    T.setText("out-end", D.longDate(e, us));
    T.setText("out-note", r.reversed ? "The end date is before the start date, so we've counted backwards from the start." : "");
    el("out-note").hidden = !r.reversed;
  }

  function setToday(input) {
    input.value = D.iso(D.today());
    update();
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", function (ev) { ev.preventDefault(); });
  el("dd-start-today").addEventListener("click", function () { setToday(startIn); });
  el("dd-end-today").addEventListener("click", function () { setToday(endIn); });
  el("dd-swap").addEventListener("click", function () {
    var x = startIn.value;
    startIn.value = endIn.value;
    endIn.value = x;
    update();
  });

  // Start with today and the last day of this year.
  var now = D.today();
  startIn.value = D.iso(now);
  endIn.value = D.iso({ y: now.m === 12 && now.d === 31 ? now.y + 1 : now.y, m: 12, d: 31 });
  update();
})();
