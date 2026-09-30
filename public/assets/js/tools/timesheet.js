/* Timesheet Calculator — adds up hours from start and finish times, less breaks, and multiplies
 * by an hourly rate. A finish time earlier than the start is taken as the next day (a night shift). */
(function () {
  "use strict";

  var T = window.ToolNest;

  // "9:30", "09:30", "930", "9" → minutes after midnight; null if it isn't a time.
  function parseTime(text) {
    var s = String(text || "").trim().toLowerCase().replace(/\s+/g, "");
    if (!s) return null;
    var pm = /pm$/.test(s);
    var am = /am$/.test(s);
    s = s.replace(/[ap]m$/, "");
    var m = /^(\d{1,2})(?::|\.|h)?(\d{2})?$/.exec(s);
    if (!m) return null;
    var h = Number(m[1]);
    var min = m[2] ? Number(m[2]) : 0;
    if (min > 59) return null;
    if (am || pm) {
      if (h < 1 || h > 12) return null;
      if (h === 12) h = 0;
      if (pm) h += 12;
    }
    if (h > 24 || (h === 24 && min > 0)) return null;
    return h * 60 + min;
  }

  // One row: { start, end, breakMin } → worked minutes (null if the times can't be read).
  function rowMinutes(row) {
    var a = parseTime(row.start);
    var b = parseTime(row.end);
    var brk = String(row.breakMin == null ? "" : row.breakMin).trim();
    if (a === null || b === null || (brk && !/^\d+(\.\d+)?$/.test(brk))) return null;
    var span = b - a;
    if (span <= 0) span += 24 * 60; // finishes after midnight
    return Math.max(0, span - (Number(brk) || 0));
  }

  // 450 → "7:30"
  function hhmm(minutes) {
    var m = Math.round(minutes);
    return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0");
  }

  // v: { rows: [{ start, end, breakMin }], rate, overtimeAfter (hours, optional), overtimeRate }
  function calculate(v) {
    var total = 0;
    var perRow = v.rows.map(function (row) {
      var m = rowMinutes(row);
      if (m !== null) total += m;
      return m;
    });
    var hours = total / 60;
    var limit = v.overtimeAfter == null ? Infinity : v.overtimeAfter;
    var regular = Math.min(hours, limit);
    var overtime = Math.max(0, hours - limit);
    var multiplier = v.overtimeRate || 1;
    return {
      perRow: perRow,
      minutes: total,
      hours: hours,
      regularHours: regular,
      overtimeHours: overtime,
      pay: regular * v.rate + overtime * v.rate * multiplier
    };
  }

  window.ToolNestCalc = { calculate: calculate, parseTime: parseTime, rowMinutes: rowMinutes, hhmm: hhmm };
  if (!document.getElementById("calc-form")) return;

  var body = document.getElementById("ts-body");
  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var EXAMPLE = [
    ["09:00", "17:30", "30"], ["09:00", "17:30", "30"], ["09:00", "17:30", "30"],
    ["09:00", "17:30", "30"], ["09:00", "17:30", "30"], ["", "", ""], ["", "", ""]
  ];
  var calc;

  function input(cls, label, value, mode) {
    var i = document.createElement("input");
    i.type = "text";
    i.className = cls;
    i.value = value;
    i.setAttribute("aria-label", label);
    i.setAttribute("autocomplete", "off");
    i.setAttribute("inputmode", mode);
    return i;
  }

  function fill(rows) {
    body.textContent = "";
    DAYS.forEach(function (day, i) {
      var r = rows[i] || ["", "", ""];
      var tr = document.createElement("tr");
      tr.className = "ts-row";
      var th = document.createElement("th");
      th.scope = "row";
      // "Monday" on wide screens, "Mon" on phones (style.css).
      var long = document.createElement("span");
      long.className = "ts-day-long";
      long.textContent = day;
      var short = document.createElement("span");
      short.className = "ts-day-short";
      short.setAttribute("aria-hidden", "true");
      short.textContent = day.slice(0, 3);
      th.appendChild(long);
      th.appendChild(short);
      tr.appendChild(th);
      [["ts-start", day + " start time", r[0], "text"], ["ts-end", day + " finish time", r[1], "text"],
       ["ts-break num", day + " break in minutes", r[2], "numeric"]].forEach(function (c) {
        var td = document.createElement("td");
        td.appendChild(input(c[0], c[1], c[2], c[3]));
        tr.appendChild(td);
      });
      var out = document.createElement("td");
      out.className = "num ts-total";
      tr.appendChild(out);
      body.appendChild(tr);
    });
  }

  function readRows() {
    return Array.prototype.map.call(body.querySelectorAll(".ts-row"), function (tr) {
      return {
        start: tr.querySelector(".ts-start").value,
        end: tr.querySelector(".ts-end").value,
        breakMin: tr.querySelector(".ts-break").value
      };
    });
  }

  fill(EXAMPLE);

  calc = T.setupCalculator({
    rules: {
      rate: { min: 0, max: 100000 },
      overtimeAfter: { min: 0, max: 168, optional: true },
      overtimeRate: { min: 1, max: 5 }
    },
    // Days that can't be read are left out of the totals and highlighted, with a note.
    check: function () {
      var bad = [];
      readRows().forEach(function (row, i) {
        var tr = body.children[i];
        var times = (row.start.trim() || row.end.trim()) && rowMinutes(row) === null;
        var brk = row.breakMin.trim() && !(/^\d+(\.\d+)?$/.test(row.breakMin.trim()) && Number(row.breakMin) < 1440);
        var wrong = !!(times || brk);
        tr.classList.toggle("is-invalid", wrong);
        tr.querySelectorAll("input").forEach(function (i) { i.setAttribute("aria-invalid", wrong ? "true" : "false"); });
        if (wrong) bad.push(DAYS[i]);
      });
      T.setText("ts-error", bad.length ? "Not counted: " + bad.join(", ") + ". Use times like 9:00, 17:30 or 5:30pm, and a break in whole minutes." : "");
      return {};
    },
    defaults: { rate: "25", overtimeAfter: "", overtimeRate: "1.5" },
    onReset: function () { fill(EXAMPLE); },
    outputs: ["out-hours", "out-hhmm", "out-regular", "out-ot", "out-pay"],
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var rows = readRows();
      var r = calculate({ rows: rows, rate: v.rate, overtimeAfter: v.overtimeAfter, overtimeRate: v.overtimeRate });
      Array.prototype.forEach.call(body.querySelectorAll(".ts-total"), function (cell, i) {
        cell.textContent = r.perRow[i] === null ? "" : hhmm(r.perRow[i]);
      });
      T.setText("out-hours", T.formatNumber(r.hours, 2));
      T.setText("out-hhmm", hhmm(r.minutes));
      T.setText("out-regular", T.formatNumber(r.regularHours, 2));
      T.setText("out-ot", T.formatNumber(r.overtimeHours, 2));
      T.setText("out-pay", money(r.pay));
    }
  });

  document.getElementById("ts-clear").addEventListener("click", function () {
    fill([]);
    calc.update();
  });

  var copyBtn = document.getElementById("ts-copy");
  copyBtn.addEventListener("click", function () {
    var currency = document.getElementById("currency").value;
    var rows = readRows();
    var lines = ["Day\tStart\tFinish\tBreak (min)\tHours"];
    rows.forEach(function (row, i) {
      var m = rowMinutes(row);
      if (m === null) return;
      lines.push([DAYS[i], row.start, row.end, row.breakMin || "0", hhmm(m)].join("\t"));
    });
    var rate = T.readNumber(document.getElementById("rate"));
    var r = calculate({ rows: rows, rate: isFinite(rate) ? rate : 0, overtimeAfter: null, overtimeRate: 1 });
    lines.push("Total\t\t\t\t" + hhmm(r.minutes) + " (" + T.formatNumber(r.hours, 2) + " hours)");
    lines.push("Pay\t\t\t\t" + document.getElementById("out-pay").textContent + " (" + currency + ")");
    var text = lines.join("\n");
    var done = function (ok) {
      copyBtn.textContent = ok ? "Copied" : "Couldn't copy";
      setTimeout(function () { copyBtn.textContent = "Copy timesheet"; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
})();
