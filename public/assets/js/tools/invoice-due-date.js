/* Invoice Due Date Calculator: the due date for Net 30, EOM and early-payment discount terms,
   and how many days are left or overdue. Runs in the browser. */
(function () {
  "use strict";

  var D = window.ToolNestDate;

  /*
   * v.date: invoice date { y, m, d }; v.days: payment terms in days (Net 30 = 30);
   * v.eom: count from the last day of the invoice month; v.today: { y, m, d };
   * optional v.amount, v.discPct (%) and v.discDays for terms like 2/10 net 30.
   * The discount period counts from the same day as the payment terms.
   */
  function calculate(v) {
    var start = v.eom ? { y: v.date.y, m: v.date.m, d: D.daysInMonth(v.date.y, v.date.m) } : v.date;
    var due = D.addDays(start, v.days);
    var r = {
      start: start,
      due: due,
      dueIso: D.iso(due),
      weekday: D.WEEKDAYS[D.weekday(due)],
      daysLeft: D.toDays(due) - D.toDays(v.today) // negative when overdue
    };
    if (v.discPct != null && v.discDays != null) {
      var d = v.discPct / 100;
      r.discountBy = D.addDays(start, v.discDays);
      r.discountByIso = D.iso(r.discountBy);
      // Yearly cost of paying on the due date instead of taking the discount (365-day year).
      r.annualCost = v.days > v.discDays ? d / (1 - d) * 365 / (v.days - v.discDays) * 100 : null;
      if (v.amount != null) {
        r.saving = v.amount * d;
        r.discounted = v.amount - r.saving;
      }
    }
    return r;
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var el = function (id) { return document.getElementById(id); };
  var dateIn = el("invDate");
  var eomIn = el("eom");
  var us = D.usOrder();
  var DISCOUNT_OUT = ["out-disc-by", "out-disc-pay", "out-disc-saving", "out-disc-cost"];

  function status(daysLeft) {
    if (daysLeft === 0) return "Due today";
    if (daysLeft > 0) return "Due in " + D.plural(daysLeft, "day");
    return D.plural(-daysLeft, "day") + " overdue";
  }

  dateIn.value = D.iso(D.today());

  var calc = T.setupCalculator({
    rules: {
      days: { min: 0, max: 365 },
      amount: { min: 0.01, max: 1000000000, optional: true },
      discPct: { min: 0.1, max: 50, optional: true },
      discDays: { min: 0, max: 365, optional: true }
    },
    defaults: { days: "30", amount: "5000", discPct: "", discDays: "", eom: false },
    outputs: ["out-due", "out-weekday", "out-status", "out-terms", "out-start", "out-iso"].concat(DISCOUNT_OUT),
    onReset: function () { dateIn.value = D.iso(D.today()); },
    check: function (v) {
      if (!D.parse(dateIn.value)) return { invDate: "Choose a date." };
      if (v.days % 1) return { days: "Enter a whole number of days." };
      if ((v.discPct == null) !== (v.discDays == null)) {
        return v.discPct == null ? { discPct: "Enter the discount, or clear both discount boxes." }
          : { discDays: "Enter the discount days, or clear both discount boxes." };
      }
      if (v.discDays != null && (v.discDays % 1 || v.discDays >= v.days)) {
        return { discDays: "Enter whole days, fewer than the payment terms." };
      }
    },
    onInvalid: function () { el("disc-results").hidden = true; },
    render: function (v, currency) {
      var r = calculate({ date: D.parse(dateIn.value), days: v.days, eom: eomIn.checked, today: D.today(),
        amount: v.amount, discPct: v.discPct, discDays: v.discDays });
      var weekend = r.weekday === "Saturday" || r.weekday === "Sunday";
      T.setText("out-due", D.longDate(r.due, us));
      T.setText("out-weekday", r.weekday + (weekend ? " (a weekend)" : ""));
      T.setText("out-status", status(r.daysLeft));
      T.setText("out-terms", (v.days === 0 ? "Due on receipt" : "Net " + v.days) + (eomIn.checked ? " EOM" : ""));
      T.setText("out-start", D.longDate(r.start, us));
      T.setText("out-iso", r.dueIso);
      el("overdue-note").hidden = r.daysLeft >= 0;

      var hasDiscount = r.discountBy != null;
      el("disc-results").hidden = !hasDiscount;
      if (!hasDiscount) return;
      var money = function (n) { return T.formatMoney(n, currency); };
      T.setText("out-disc-by", D.longDate(r.discountBy, us));
      T.setText("out-disc-pay", r.discounted != null ? money(r.discounted) : "Enter the invoice amount");
      T.setText("out-disc-saving", r.saving != null ? money(r.saving) : "—");
      T.setText("out-disc-cost", T.formatNumber(r.annualCost, 1) + "% a year");
    }
  });

  el("inv-today").addEventListener("click", function () {
    dateIn.value = D.iso(D.today());
    calc.update();
  });

  // Quick picks: "Net 30" etc. set the days box.
  Array.prototype.forEach.call(document.querySelectorAll("[data-net]"), function (b) {
    b.addEventListener("click", function () {
      el("days").value = b.getAttribute("data-net");
      calc.update();
    });
  });

  el("inv-copy").addEventListener("click", function () {
    var text = el("out-iso").textContent;
    var btn = this;
    if (!navigator.clipboard || text === "—") return;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = "Copy"; }, 1500);
    });
  });
})();
