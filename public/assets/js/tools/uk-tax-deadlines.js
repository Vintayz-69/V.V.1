/* UK tax deadlines for the self-employed: upcoming dates, days left, and a calendar file made on the
   visitor's device. Dates from data/deadlines-uk.js. */
(function () {
  "use strict";

  var D = window.ToolNestDeadlinesUK;
  var DAY = 86400000;

  function parse(iso) { var p = iso.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }

  // v: { today: "YYYY-MM-DD", poa, mtd, newReturn: booleans for who the visitor is }
  // Returns the deadlines from today on that apply to them, with days left.
  function upcoming(v) {
    var now = parse(v.today);
    return D.events.filter(function (e) {
      if (parse(e.date) < now) return false;
      if (e.who === "poa") return v.poa;
      if (e.who === "mtd") return v.mtd;
      if (e.who === "new") return v.newReturn;
      return true;
    }).map(function (e) {
      return { date: e.date, title: e.title, detail: e.detail, daysLeft: Math.round((parse(e.date) - now) / DAY) };
    });
  }

  function icsEscape(text) { return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,"); }

  // An iCalendar file with one all-day event per deadline (RFC 5545).
  function toIcs(list, stamp) {
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ToolNest by Vintayz//UK tax deadlines//EN", "CALSCALE:GREGORIAN"];
    list.forEach(function (e, i) {
      var start = e.date.replace(/-/g, "");
      var end = new Date(parse(e.date) + DAY).toISOString().slice(0, 10).replace(/-/g, "");
      lines.push("BEGIN:VEVENT", "UID:" + start + "-" + i + "@vintayz.com", "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + start, "DTEND;VALUE=DATE:" + end,
        "SUMMARY:" + icsEscape(e.title), "DESCRIPTION:" + icsEscape(e.detail), "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }

  window.ToolNestCalc = upcoming;
  window.ToolNestCalc.toIcs = toIcs;
  if (!document.getElementById("deadline-form")) return;

  var poa = document.getElementById("poa");
  var mtd = document.getElementById("mtd");
  var newReturn = document.getElementById("newReturn");
  var listEl = document.getElementById("deadline-list");
  var countEl = document.getElementById("deadline-count");
  var download = document.getElementById("download-ics");
  var current = [];

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function longDate(iso) {
    return new Date(parse(iso)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function render() {
    current = upcoming({ today: todayIso(), poa: poa.checked, mtd: mtd.checked, newReturn: newReturn.checked });
    countEl.textContent = current.length ? current.length + (current.length === 1 ? " date" : " dates") : "No dates";
    listEl.innerHTML = current.length ? current.map(function (e) {
      var when = e.daysLeft === 0 ? "Today" : e.daysLeft === 1 ? "Tomorrow" : "In " + e.daysLeft + " days";
      return '<li class="deadline' + (e.daysLeft <= 30 ? " deadline-soon" : "") + '"><div class="deadline-when"><strong>' + esc(longDate(e.date)) +
        "</strong><span>" + when + '</span></div><div class="deadline-what"><strong>' + esc(e.title) + "</strong><span>" + esc(e.detail) + "</span></div></li>";
    }).join("") : '<li class="deadline">No more dates in our list. We add the next year\'s dates before these run out.</li>';
    download.disabled = !current.length;
  }

  download.addEventListener("click", function () {
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    var url = URL.createObjectURL(new Blob([toIcs(current, stamp)], { type: "text/calendar" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = "uk-tax-deadlines.ics";
    a.className = "rf-offscreen";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  });

  document.getElementById("deadline-form").addEventListener("change", render);
  render();
})();
