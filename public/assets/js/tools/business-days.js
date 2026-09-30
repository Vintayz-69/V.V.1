/* Business Days Calculator — counts working days (Monday to Friday, less public holidays) between
 * two dates, or finds the date a number of working days from a start date.
 * Holiday dates come only from data/holidays.js. Dates are handled in UTC so clock changes can't
 * shift a day. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var HOL = window.ToolNestHolidays;
  var DAY = 86400000;

  function parse(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return null;
    var t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var d = new Date(t);
    return d.getUTCMonth() === Number(m[2]) - 1 ? t : null;
  }

  function iso(t) {
    return new Date(t).toISOString().slice(0, 10);
  }

  function holidayOn(t, region) {
    var r = HOL.regions[region];
    return r ? r.dates[iso(t)] || null : null;
  }

  // Is a date covered by the holiday list for this region?
  function covered(t, region) {
    var r = HOL.regions[region];
    if (!r) return true;
    var d = iso(t);
    return d >= r.from && d <= r.to;
  }

  function isWeekend(t) {
    var wd = new Date(t).getUTCDay();
    return wd === 0 || wd === 6;
  }

  /*
   * Count working days from `start` to `end`. includeStart: count the start date itself.
   * The end date is always counted. Works backwards too (the count is then negative).
   */
  function countBetween(start, end, region, includeStart) {
    var a = parse(start);
    var b = parse(end);
    if (a === null || b === null) return null;
    var sign = b >= a ? 1 : -1;
    var lo = Math.min(a, b);
    var hi = Math.max(a, b);
    var out = { days: 0, calendarDays: Math.round((hi - lo) / DAY) + (includeStart ? 1 : 0), weekends: 0, holidays: [], uncovered: false };
    for (var t = lo; t <= hi; t += DAY) {
      if (t === a && !includeStart) continue;
      if (!covered(t, region)) out.uncovered = true;
      if (isWeekend(t)) { out.weekends++; continue; }
      var h = holidayOn(t, region);
      if (h) { out.holidays.push({ date: iso(t), name: h }); continue; }
      out.days++;
    }
    out.days *= sign;
    return out;
  }

  // The date `n` working days after `start` (before it if n is negative). The start isn't counted.
  function addDays(start, n, region) {
    var t = parse(start);
    if (t === null) return null;
    var step = n >= 0 ? DAY : -DAY;
    var left = Math.abs(Math.round(n));
    var out = { holidays: [], uncovered: false };
    while (left > 0) {
      t += step;
      if (!covered(t, region)) out.uncovered = true;
      if (isWeekend(t)) continue;
      var h = holidayOn(t, region);
      if (h) { out.holidays.push({ date: iso(t), name: h }); continue; }
      left--;
    }
    out.date = iso(t);
    return out;
  }

  window.ToolNestCalc = { countBetween: countBetween, addDays: addDays };
  if (!document.getElementById("calc-form")) return;

  var el = function (id) { return document.getElementById(id); };
  var mode = el("mode");

  function applyMode() {
    var add = mode.value === "add";
    el("end").closest(".field").hidden = add;
    el("includeStart").closest(".check-field").hidden = add;
    el("count").closest(".field").hidden = !add;
    el("out-title").textContent = add ? "The date will be" : "Working days";
  }
  mode.addEventListener("change", applyMode);
  applyMode();

  // "Friday, 18 December 2026" in UK English, "Friday, December 18, 2026" in US English.
  function longDate(isoDate) {
    var t = parse(isoDate);
    var locale = el("region").value === "us" ? "en-US" : "en-GB";
    return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(t));
  }

  function showHolidays(list) {
    var ul = el("out-holidays");
    ul.textContent = "";
    list.forEach(function (h) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.textContent = h.name;
      var when = document.createElement("span");
      when.textContent = longDate(h.date);
      li.appendChild(name);
      li.appendChild(when);
      ul.appendChild(li);
    });
    el("holidays-wrap").hidden = !list.length;
  }

  T.setupCalculator({
    rules: { count: { min: -3650, max: 3650 } },
    check: function () {
      var problems = {};
      if (parse(el("start").value) === null) problems.start = "Choose a start date.";
      if (mode.value !== "add" && parse(el("end").value) === null) problems.end = "Choose an end date.";
      if (!problems.start && !problems.end && mode.value !== "add" && Math.abs(parse(el("end").value) - parse(el("start").value)) > 3650 * DAY) {
        problems.end = "Choose dates no more than 10 years apart.";
      }
      return problems;
    },
    defaults: { mode: "between", start: "2026-10-01", end: "2026-10-31", count: "10", region: "england-and-wales", includeStart: true },
    onReset: applyMode,
    outputs: ["out-main", "out-a", "out-b", "out-c"],
    onInvalid: function () { showHolidays([]); el("coverage-note").hidden = true; },
    render: function (v) {
      var region = el("region").value;
      var r;
      if (mode.value === "add") {
        r = addDays(el("start").value, v.count, region);
        T.setText("out-main", longDate(r.date));
        T.setText("out-a-label", "Working days added");
        T.setText("out-a", T.formatNumber(v.count));
        T.setText("out-b-label", "Public holidays skipped");
        T.setText("out-b", String(r.holidays.length));
        T.setText("out-c-label", "Calendar days later");
        T.setText("out-c", T.formatNumber(Math.round((parse(r.date) - parse(el("start").value)) / DAY)));
      } else {
        r = countBetween(el("start").value, el("end").value, region, el("includeStart").checked);
        T.setText("out-main", T.formatNumber(r.days) + (Math.abs(r.days) === 1 ? " working day" : " working days"));
        T.setText("out-a-label", "Calendar days");
        T.setText("out-a", T.formatNumber(r.calendarDays));
        T.setText("out-b-label", "Weekend days");
        T.setText("out-b", T.formatNumber(r.weekends));
        T.setText("out-c-label", "Public holidays on weekdays");
        T.setText("out-c", String(r.holidays.length));
      }
      showHolidays(r.holidays);
      var note = el("coverage-note");
      var info = HOL.regions[region];
      note.hidden = !(info && r.uncovered);
      if (info) note.textContent = "Public holidays are only included from " + longDate(info.from) + " to " + longDate(info.to) + ", the years the official list covers. Days outside that are counted as weekends only.";
    }
  });
})();
