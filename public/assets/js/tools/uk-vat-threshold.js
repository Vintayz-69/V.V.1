/* UK VAT threshold tracker: rolling 12-month taxable turnover from monthly sales, the month you'd
   go over, and GOV.UK's registration deadline and effective date. Threshold from data/tax-uk.js;
   timing rules from data/vat-registration-uk.js. */
(function () {
  "use strict";

  var THRESHOLD = window.ToolNestTaxUK.vat.registrationThreshold;
  var R = window.ToolNestVatRegistrationUK;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // One amount per line, oldest month first. "$", "£" and thousands commas are ignored; text before
  // the number (such as a month name) is ignored too. Returns null if a line has no number.
  function parseAmounts(text) {
    var out = [];
    var lines = String(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/[£$,\s]/g, "");
      if (!line) continue;
      var m = line.match(/(\d+(?:\.\d+)?)$/);
      if (!m) return null;
      out.push(Number(m[1]));
    }
    return out;
  }

  // year, month (0-11) plus n months → { year, month }
  function addMonths(year, month, n) {
    var t = year * 12 + month + n;
    return { year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 };
  }

  function iso(y, m, d) { return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }

  // v: { startYear, startMonth (0-11): the first month of `sales`; sales: [taxable turnover a month] }
  function calculate(v) {
    var rows = [];
    var over = null;
    for (var i = 0; i < v.sales.length; i++) {
      var total = 0;
      for (var j = Math.max(0, i - 11); j <= i; j++) total += v.sales[j];
      total = round2(total);
      var when = addMonths(v.startYear, v.startMonth, i);
      var isOver = total > THRESHOLD;
      rows.push({ year: when.year, month: when.month, sales: v.sales[i], rolling: total, over: isOver });
      if (isOver && !over) over = rows[rows.length - 1];
    }
    var result = { rows: rows, threshold: THRESHOLD, over: !!over };
    if (over) {
      var lastDay = new Date(Date.UTC(over.year, over.month + 1, 0));
      var deadline = new Date(lastDay.getTime() + R.registerWithinDays * 86400000);
      var eff = addMonths(over.year, over.month, R.effectiveMonthsAfter);
      result.overYear = over.year;
      result.overMonth = over.month;
      result.registerBy = deadline.toISOString().slice(0, 10);
      result.effective = iso(eff.year, eff.month, 1);
    }
    // Room left next month: the threshold minus the last 11 months.
    var last11 = 0;
    for (var k = Math.max(0, v.sales.length - 11); k < v.sales.length; k++) last11 += v.sales[k];
    result.headroom = round2(THRESHOLD - last11);
    var next = addMonths(v.startYear, v.startMonth, v.sales.length);
    result.nextYear = next.year;
    result.nextMonth = next.month;
    return result;
  }

  window.ToolNestCalc = calculate;
  window.ToolNestCalc.parseAmounts = parseAmounts;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var box = document.getElementById("sales");
  var startMonth = document.getElementById("startMonth");
  var startYear = document.getElementById("startYear");
  var money = function (n) { return T.formatMoney(n, "GBP", 0); };
  var longDate = function (s) {
    var p = s.split("-");
    return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
  };

  var form = document.getElementById("calc-form");
  var outs = ["out-main", "out-main-note", "out-deadline", "out-effective", "out-latest", "out-headroom"];

  function render() {
    var sales = parseAmounts(box.value);
    var field = box.closest(".field");
    var ok = !!sales && sales.length > 0 && sales.length <= 36;
    field.classList.toggle("invalid", !ok);
    box.setAttribute("aria-invalid", ok ? "false" : "true");
    if (!ok) {
      outs.forEach(function (id) { T.setText(id, "—"); });
      document.getElementById("months-body").innerHTML = '<tr><td colspan="3">Fix the list of monthly sales above to see this table.</td></tr>';
      return;
    }
    var r = calculate({ startYear: Number(startYear.value), startMonth: Number(startMonth.value), sales: sales });
    var latest = r.rows[r.rows.length - 1];
    if (r.over) {
      T.setText("out-main", MONTHS[r.overMonth] + " " + r.overYear);
      T.setText("out-main-note", "you went over £" + THRESHOLD.toLocaleString("en-GB"));
      T.setText("out-deadline", longDate(r.registerBy));
      T.setText("out-effective", longDate(r.effective));
    } else {
      T.setText("out-main", "Not over");
      T.setText("out-main-note", "the threshold yet");
      T.setText("out-deadline", "Not yet");
      T.setText("out-effective", "Not yet");
    }
    T.setText("out-latest", money(latest.rolling) + " to " + MONTHS[latest.month] + " " + latest.year);
    T.setText("out-headroom", r.headroom > 0 ? money(r.headroom) + " in " + MONTHS[r.nextMonth] + " " + r.nextYear : "None: you'd already be over");
    document.getElementById("months-body").innerHTML = T.tableRows(r.rows.slice().reverse().map(function (row) {
      return [MONTHS[row.month] + " " + row.year, money(row.sales), money(row.rolling) + (row.over ? " (over)" : "")];
    }), -1);
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  document.getElementById("reset").addEventListener("click", function () {
    box.value = box.defaultValue;
    startMonth.value = "10";
    startYear.value = "2025";
    render();
  });
  render();
})();
