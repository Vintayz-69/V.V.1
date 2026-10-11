/* Week Number Calculator: the ISO 8601 week number of any date (weeks start on Monday; week 1
   holds the year's first Thursday), the US-style week number (weeks start on Sunday; week 1
   holds 1 January), the dates of any week, and a list of every week in a year. Runs in the browser. */

(function () {
  "use strict";

  var D = window.ToolNestDate;

  function dayOfYear(date) {
    return D.toDays(date) - D.toDays({ y: date.y, m: 1, d: 1 }) + 1;
  }

  // Monday = 1 … Sunday = 7
  function isoWeekday(date) {
    return D.weekday(date) || 7;
  }

  // { year, week }: the week's year can differ from the date's near New Year.
  function isoWeek(date) {
    var thursday = D.addDays(date, 4 - isoWeekday(date));
    return { year: thursday.y, week: Math.floor((dayOfYear(thursday) - 1) / 7) + 1 };
  }

  // The Monday that starts ISO week `week` of `year`.
  function isoWeekStart(year, week) {
    var jan4 = { y: year, m: 1, d: 4 }; // 4 January is always in week 1
    return D.addDays(jan4, -(isoWeekday(jan4) - 1) + (week - 1) * 7);
  }

  function weeksInYear(year) {
    return isoWeek({ y: year, m: 12, d: 28 }).week; // 28 December is always in the last week
  }

  // US style: weeks run Sunday to Saturday, and week 1 is the one with 1 January in it.
  function usWeek(date) {
    var jan1 = { y: date.y, m: 1, d: 1 };
    return Math.floor((dayOfYear(date) - 1 + D.weekday(jan1)) / 7) + 1;
  }

  window.ToolNestCalc = {
    isoWeek: isoWeek, isoWeekStart: isoWeekStart, weeksInYear: weeksInYear, usWeek: usWeek, dayOfYear: dayOfYear
  };

  var form = document.getElementById("wk-form");
  if (!form) return;

  var T = window.ToolNest;
  var el = function (id) { return document.getElementById(id); };
  var dateIn = el("wk-date");
  var yearIn = el("wk-year");
  var weekIn = el("wk-week");
  var us = D.usOrder();

  function shortDate(date, withYear) {
    var mo = D.MONTHS[date.m - 1].slice(0, 3);
    var wd = D.WEEKDAYS[D.weekday(date)].slice(0, 3);
    var core = us ? wd + " " + mo + " " + date.d : wd + " " + date.d + " " + mo;
    return withYear ? core + " " + date.y : core;
  }

  function range(start) {
    var end = D.addDays(start, 6);
    return shortDate(start, start.y !== end.y) + " – " + shortDate(end, true);
  }

  function mark(input, ok) {
    input.closest(".field").classList.toggle("invalid", !ok);
    input.setAttribute("aria-invalid", ok ? "false" : "true");
  }

  function showDate() {
    var d = D.parse(dateIn.value);
    mark(dateIn, !!d);
    if (!d) {
      ["wk-out", "wk-out-range", "wk-out-year", "wk-out-us", "wk-out-day", "wk-out-weeks"].forEach(function (id) { T.setText(id, "—"); });
      return;
    }
    var w = isoWeek(d);
    T.setText("wk-out", "Week " + w.week);
    T.setText("wk-out-range", range(isoWeekStart(w.year, w.week)));
    T.setText("wk-out-year", w.year === d.y ? String(w.year) : w.year + " (the date is in " + d.y + ")");
    T.setText("wk-out-us", "Week " + usWeek(d));
    T.setText("wk-out-day", dayOfYear(d) + " of " + (D.isLeap(d.y) ? 366 : 365));
    T.setText("wk-out-weeks", weeksInYear(w.year) + " weeks");
  }

  function showWeek() {
    var y = Number(yearIn.value);
    var okY = /^\d{4}$/.test(String(yearIn.value).trim()) && y >= 1 && y <= 9999;
    var max = okY ? weeksInYear(y) : 53;
    var wk = Number(weekIn.value);
    var okW = /^\d{1,2}$/.test(String(weekIn.value).trim()) && wk >= 1 && wk <= max;
    mark(yearIn, okY);
    mark(weekIn, okW || !okY);
    weekIn.closest(".field").querySelector(".error-msg").textContent = "Enter a week from 1 to " + max + ".";
    T.setText("wk-find-out", okY && okW ? range(isoWeekStart(y, wk)) : "—");
    if (okY) drawYear(y);
  }

  var drawnYear = 0;
  function drawYear(y) {
    if (y === drawnYear) return;
    drawnYear = y;
    el("wk-table-year").textContent = y;
    var tbody = el("wk-table-body");
    tbody.textContent = "";
    var n = weeksInYear(y);
    for (var i = 1; i <= n; i++) {
      var start = isoWeekStart(y, i);
      var tr = document.createElement("tr");
      [String(i), shortDate(start, start.y !== y), shortDate(D.addDays(start, 6), D.addDays(start, 6).y !== y)].forEach(function (text, j) {
        var td = document.createElement(j === 0 ? "th" : "td");
        if (j === 0) td.scope = "row";
        td.textContent = text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  }

  form.addEventListener("input", function (e) {
    if (e.target === dateIn) showDate();
    else showWeek();
  });
  form.addEventListener("change", function (e) {
    if (e.target === dateIn) showDate();
    else showWeek();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("wk-today").addEventListener("click", function () {
    dateIn.value = D.iso(D.today());
    showDate();
  });

  var now = D.today();
  var current = isoWeek(now);
  dateIn.value = D.iso(now);
  yearIn.value = current.year;
  weekIn.value = current.week;
  showDate();
  showWeek();
})();
