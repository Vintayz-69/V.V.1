/* ToolNest date helpers, shared by the /time/ tools. Calendar dates are counted as whole days in
 * UTC, so clock changes (daylight saving time) can never add or lose a day. Nothing is stored. */

(function () {
  "use strict";

  var DAY = 86400000;
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  // "2026-10-11" → { y: 2026, m: 10, d: 11 }, or null if it isn't a real date.
  function parse(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || "").trim());
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return { y: y, m: mo, d: d };
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  // Whole days since 1 January 1970 (negative before then).
  function toDays(date) {
    var t = new Date(0);
    t.setUTCFullYear(date.y, date.m - 1, date.d); // works for years before 100 too
    return Math.round(t.getTime() / DAY);
  }

  function fromDays(n) {
    var t = new Date(n * DAY);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }

  function addDays(date, n) {
    return fromDays(toDays(date) + n);
  }

  /*
   * Adds whole months. If the day doesn't exist in the new month (31 January + 1 month), the
   * month's last day is used (28 or 29 February).
   */
  function addMonths(date, n) {
    var index = date.y * 12 + (date.m - 1) + n;
    var y = Math.floor(index / 12);
    var m = index - y * 12 + 1;
    return { y: y, m: m, d: Math.min(date.d, daysInMonth(y, m)) };
  }

  // 0 = Sunday … 6 = Saturday
  function weekday(date) {
    return ((toDays(date) % 7) + 7 + 4) % 7; // 1 January 1970 was a Thursday
  }

  function pad(n, size) {
    var s = String(Math.abs(n));
    while (s.length < (size || 2)) s = "0" + s;
    return (n < 0 ? "-" : "") + s;
  }

  function iso(date) {
    return pad(date.y, 4) + "-" + pad(date.m) + "-" + pad(date.d);
  }

  function compare(a, b) {
    return toDays(a) - toDays(b);
  }

  // "Sunday 11 October 2026" (en-GB order) or "Sunday, October 11, 2026" (en-US order).
  function longDate(date, us) {
    var wd = WEEKDAYS[weekday(date)];
    var mo = MONTHS[date.m - 1];
    return us ? wd + ", " + mo + " " + date.d + ", " + date.y : wd + " " + date.d + " " + mo + " " + date.y;
  }

  // Does the visitor read dates month-first (US) or day-first?
  function usOrder() {
    return typeof navigator !== "undefined" && /-US$/i.test(navigator.language || "");
  }

  // Today's date on the visitor's own device.
  function today() {
    var t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  }

  // Monday to Friday days from `from` up to but not including `to` (from ≤ to).
  function weekdaysBetween(from, to) {
    var a = toDays(from);
    var b = toDays(to);
    var n = b - a;
    var full = Math.floor(n / 7);
    var count = full * 5;
    var wd = weekday(from);
    for (var i = 0; i < n - full * 7; i++) {
      var w = (wd + i) % 7;
      if (w !== 0 && w !== 6) count++;
    }
    return count;
  }

  // "1 day", "3 days"
  function plural(n, word) {
    return n.toLocaleString("en-US") + " " + word + (n === 1 ? "" : "s");
  }

  window.ToolNestDate = {
    DAY: DAY, WEEKDAYS: WEEKDAYS, MONTHS: MONTHS,
    parse: parse, daysInMonth: daysInMonth, isLeap: isLeap, toDays: toDays, fromDays: fromDays,
    addDays: addDays, addMonths: addMonths, weekday: weekday, iso: iso, pad: pad, compare: compare,
    longDate: longDate, usOrder: usOrder, today: today, weekdaysBetween: weekdaysBetween, plural: plural
  };
})();
