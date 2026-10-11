/* Add or Subtract Days: finds the date a number of years, months, weeks and days before or after
   a start date. Runs in the browser. */

(function () {
  "use strict";

  var D = window.ToolNestDate;

  /*
   * start: { y, m, d }; amounts: { years, months, weeks, days } (whole numbers, 0 or more);
   * sign: 1 to add, -1 to subtract. Years and months go first (keeping the day of the month, or
   * the month's last day if that day doesn't exist), then weeks and days.
   * Returns { date, days } where days is the gap in calendar days (negative going back).
   */
  function calculate(start, amounts, sign) {
    var s = sign < 0 ? -1 : 1;
    var months = (amounts.years || 0) * 12 + (amounts.months || 0);
    var date = D.addMonths(start, s * months);
    date = D.addDays(date, s * ((amounts.weeks || 0) * 7 + (amounts.days || 0)));
    return { date: date, days: D.toDays(date) - D.toDays(start) };
  }

  window.ToolNestCalc = calculate;

  var form = document.getElementById("da-form");
  if (!form) return;

  var T = window.ToolNest;
  var el = function (id) { return document.getElementById(id); };
  var startIn = el("da-start");
  var inputs = { years: el("da-years"), months: el("da-months"), weeks: el("da-weeks"), days: el("da-days") };
  var us = D.usOrder();

  function mark(input, ok) {
    input.closest(".field").classList.toggle("invalid", !ok);
    input.setAttribute("aria-invalid", ok ? "false" : "true");
  }

  function sign() {
    return document.querySelector("input[name=da-sign]:checked").value === "sub" ? -1 : 1;
  }

  function update() {
    var s = D.parse(startIn.value);
    mark(startIn, !!s);
    var amounts = {};
    var ok = !!s;
    Object.keys(inputs).forEach(function (k) {
      var raw = String(inputs[k].value).replace(/[,\s]/g, "");
      var n = raw === "" ? 0 : (/^\d+$/.test(raw) ? Number(raw) : NaN);
      var good = n >= 0 && n <= 100000;
      mark(inputs[k], good);
      if (!good) ok = false;
      amounts[k] = n;
    });
    if (ok) {
      var y = calculate(s, amounts, sign()).date.y;
      if (y < 1 || y > 9999) ok = false;
    }
    if (!ok) {
      ["out-date", "out-iso", "out-gap", "out-from"].forEach(function (id) { T.setText(id, "—"); });
      return;
    }
    var r = calculate(s, amounts, sign());
    T.setText("out-date", D.longDate(r.date, us));
    T.setText("out-iso", D.iso(r.date));
    T.setText("out-gap", r.days === 0 ? "Same day" : D.plural(Math.abs(r.days), "calendar day") + (r.days < 0 ? " before" : " after"));
    T.setText("out-from", D.longDate(s, us));
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", function (ev) { ev.preventDefault(); });
  el("da-today").addEventListener("click", function () {
    startIn.value = D.iso(D.today());
    update();
  });

  // Quick buttons: "30 days" etc. set the days box and clear the others.
  Array.prototype.forEach.call(form.querySelectorAll("[data-days]"), function (b) {
    b.addEventListener("click", function () {
      inputs.years.value = "";
      inputs.months.value = "";
      inputs.weeks.value = "";
      inputs.days.value = b.getAttribute("data-days");
      el("da-add").checked = true;
      update();
    });
  });

  el("da-copy").addEventListener("click", function () {
    var text = el("out-iso").textContent;
    var btn = this;
    if (!navigator.clipboard || text === "—") return;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = "Copy"; }, 1500);
    });
  });

  startIn.value = D.iso(D.today());
  update();
})();
