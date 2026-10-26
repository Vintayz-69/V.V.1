/* Canada GST/HST small supplier tracker: quarterly sales against the $30,000 single-quarter and
   four-quarter tests. Threshold from data/tax-ca.js; timing rules from data/gst-registration-ca.js. */
(function () {
  "use strict";

  var LIMIT = window.ToolNestTaxCA.gstSmallSupplierThreshold;
  var R = window.ToolNestGstRegistrationCA;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // One amount per line, oldest quarter first; "$", commas and leading text are ignored.
  function parseAmounts(text) {
    var out = [];
    var lines = String(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/[$,\s]/g, "");
      if (!line) continue;
      var m = line.match(/(\d+(?:\.\d+)?)$/);
      if (!m) return null;
      out.push(Number(m[1]));
    }
    return out;
  }

  // Quarter index q (0 = January to March) of year y, plus n quarters.
  function addQuarters(y, q, n) {
    var t = y * 4 + q + n;
    return { year: Math.floor(t / 4), quarter: ((t % 4) + 4) % 4 };
  }

  function label(y, q) { return MONTHS[q * 3] + " to " + MONTHS[q * 3 + 2] + " " + y; }

  // v: { startYear, startQuarter (0-3); sales: [revenue from taxable supplies each quarter] }
  function calculate(v) {
    var rows = [];
    var event = null;
    for (var i = 0; i < v.sales.length; i++) {
      var total = 0;
      for (var j = Math.max(0, i - (R.quartersCounted - 1)); j <= i; j++) total += v.sales[j];
      var when = addQuarters(v.startYear, v.startQuarter, i);
      var single = v.sales[i] > LIMIT;
      var four = round2(total) > LIMIT;
      rows.push({ year: when.year, quarter: when.quarter, label: label(when.year, when.quarter), sales: v.sales[i], rolling: round2(total), single: single, four: four });
      if (!event && (single || four)) {
        if (single) {
          event = { test: "single", quarterLabel: label(when.year, when.quarter) };
        } else {
          // End of the month following the quarter.
          var monthAfter = when.quarter * 3 + 3; // 0-based month index of the month after the quarter
          var y = when.year + Math.floor(monthAfter / 12);
          var m = monthAfter % 12;
          var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
          event = { test: "four", quarterLabel: label(when.year, when.quarter),
            stopsOn: y + "-" + String(m + 1).padStart(2, "0") + "-" + String(last).padStart(2, "0") };
        }
      }
    }
    return { rows: rows, limit: LIMIT, event: event };
  }

  window.ToolNestCalc = calculate;
  window.ToolNestCalc.parseAmounts = parseAmounts;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var box = document.getElementById("sales");
  var startQuarter = document.getElementById("startQuarter");
  var startYear = document.getElementById("startYear");
  var money = function (n) { return T.formatMoney(n, "CAD", 0); };
  var longDate = function (s) { var p = s.split("-"); return MONTHS[Number(p[1]) - 1] + " " + Number(p[2]) + ", " + p[0]; };
  var outs = ["out-main", "out-main-note", "out-when", "out-charge", "out-register"];

  function render() {
    var sales = parseAmounts(box.value);
    var ok = !!sales && sales.length > 0 && sales.length <= 24;
    box.closest(".field").classList.toggle("invalid", !ok);
    box.setAttribute("aria-invalid", ok ? "false" : "true");
    if (!ok) {
      outs.forEach(function (id) { T.setText(id, "—"); });
      document.getElementById("quarters-body").innerHTML = '<tr><td colspan="3">Fix the list of quarterly sales above to see this table.</td></tr>';
      return;
    }
    var r = calculate({ startYear: Number(startYear.value), startQuarter: Number(startQuarter.value), sales: sales });
    var e = r.event;
    if (!e) {
      T.setText("out-main", "Still a small supplier");
      T.setText("out-main-note", "in these quarters");
      T.setText("out-when", "Not over $" + LIMIT.toLocaleString("en-CA"));
      T.setText("out-charge", "Not required yet");
      T.setText("out-register", "Not required yet");
    } else if (e.test === "single") {
      T.setText("out-main", "Over in one quarter");
      T.setText("out-main-note", e.quarterLabel);
      T.setText("out-when", "On the sale that took you over, in " + e.quarterLabel);
      T.setText("out-charge", "From that sale");
      T.setText("out-register", "Within " + R.registerWithinDays + " days of that date");
    } else {
      T.setText("out-main", longDate(e.stopsOn));
      T.setText("out-main-note", "you stop being a small supplier");
      T.setText("out-when", "Four quarters to " + e.quarterLabel + " were over $" + LIMIT.toLocaleString("en-CA"));
      T.setText("out-charge", "From your first sale after " + longDate(e.stopsOn));
      T.setText("out-register", "Within " + R.registerWithinDays + " days of that first sale");
    }
    document.getElementById("quarters-body").innerHTML = T.tableRows(r.rows.slice().reverse().map(function (row) {
      return [row.label, money(row.sales) + (row.single ? " (over)" : ""), money(row.rolling) + (row.four ? " (over)" : "")];
    }), -1);
  }

  var form = document.getElementById("calc-form");
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (ev) { ev.preventDefault(); });
  document.getElementById("reset").addEventListener("click", function () {
    box.value = box.defaultValue;
    startQuarter.value = "3";
    startYear.value = "2025";
    render();
  });
  render();
})();
