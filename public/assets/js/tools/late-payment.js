/* Late Payment Interest Calculator. UK figures come only from assets/data/rates-uk.js. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var UK = window.ToolNestRatesUK;
  var DAY = 86400000;

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  }

  function isoDate(ms) {
    return new Date(ms).toISOString().slice(0, 10);
  }

  // Statutory interest starts the day after the due date. Its reference date is the
  // 31 December or 30 June before that day (Late Payment (Rate of Interest) Order 2002).
  function referenceDate(dueIso) {
    var start = new Date(parseDate(dueIso) + DAY);
    var y = start.getUTCFullYear();
    return start.getUTCMonth() < 6 ? (y - 1) + "-12-31" : y + "-06-30";
  }

  // Bank Rate in force on a date, or null if outside the verified range.
  function bankRateOn(iso) {
    if (iso > UK.checkedUpTo) return null;
    for (var i = 0; i < UK.bankRate.length; i++) {
      if (UK.bankRate[i].from <= iso) return UK.bankRate[i].rate;
    }
    return null;
  }

  function compensationFor(amount) {
    for (var i = 0; i < UK.compensation.length; i++) {
      if (amount < UK.compensation[i].below) return UK.compensation[i].amount;
    }
    return 0;
  }

  function calculate(v) {
    var days = Math.round((parseDate(v.paidDate) - parseDate(v.dueDate)) / DAY);
    var rate = v.mode === "uk" ? UK.statutoryAddOn + v.baseRate : v.customRate;
    var daily = v.amount * (rate / 100) / 365;
    var interest = daily * days;
    var extra = v.mode === "uk" ? (v.includeComp ? compensationFor(v.amount) : 0) : v.fee;
    return {
      days: days,
      rate: rate,
      daily: daily,
      interest: interest,
      extra: extra,
      claim: interest + extra,
      total: v.amount + interest + extra
    };
  }

  window.ToolNestCalc = { calculate: calculate, referenceDate: referenceDate, bankRateOn: bankRateOn, compensationFor: compensationFor };
  if (!document.getElementById("calc-form")) return;

  var mode = document.getElementById("mode");
  var currency = document.getElementById("currency");
  var dueDate = document.getElementById("dueDate");
  var paidDate = document.getElementById("paidDate");
  var baseRate = document.getElementById("baseRate");
  var baseHint = document.getElementById("base-hint");

  function longDate(iso) {
    return new Date(parseDate(iso)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }

  function setDefaultDates() {
    var today = new Date();
    var todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    paidDate.value = isoDate(todayUtc);
    dueDate.value = isoDate(todayUtc - 45 * DAY);
  }

  // Fill the base rate from official figures when the due date or mode changes.
  function fillBaseRate() {
    if (isNaN(parseDate(dueDate.value))) return;
    var ref = referenceDate(dueDate.value);
    var rate = bankRateOn(ref);
    if (rate === null) {
      baseRate.value = "";
      baseHint.textContent = "Enter the Bank of England base rate on " + longDate(ref);
    } else {
      baseRate.value = String(rate);
      baseHint.textContent = "Official rate on " + longDate(ref);
    }
  }

  function applyMode() {
    var uk = mode.value === "uk";
    document.getElementById("currency-field").hidden = uk;
    document.querySelectorAll(".uk-only").forEach(function (el) { el.hidden = !uk; });
    document.querySelectorAll(".custom-only").forEach(function (el) { el.hidden = uk; });
    if (uk) currency.value = "GBP";
    document.getElementById("out-comp-label").textContent = uk ? "Fixed compensation" : "Late fee";
    document.getElementById("out-note").textContent = uk
      ? "UK statutory interest applies to business-to-business debts where your contract doesn't set a different rate."
      : "Only charge interest or fees that were agreed before the work started, and check any legal limits where you are.";
  }

  // These run before the calculator's own listeners, so it always sees fresh values.
  dueDate.addEventListener("change", fillBaseRate);
  dueDate.addEventListener("input", fillBaseRate);
  mode.addEventListener("change", function () {
    applyMode();
    fillBaseRate();
  });

  setDefaultDates();
  applyMode();
  fillBaseRate();

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      amount: { min: 0.01, max: 100000000 },
      baseRate: { min: 0, max: 20 },
      customRate: { min: 0, max: 100 },
      fee: { min: 0, max: 100000000 }
    },
    defaults: { mode: "uk", amount: "5000", includeComp: true, customRate: "10", fee: "0" },
    onReset: function () {
      setDefaultDates();
      applyMode();
      fillBaseRate();
    },
    outputs: ["out-claim", "out-total", "out-interest", "out-comp", "out-rate", "out-days", "out-daily"],
    check: function () {
      var due = parseDate(dueDate.value);
      var paid = parseDate(paidDate.value);
      if (isNaN(due)) return { dueDate: "Enter the date the invoice was due." };
      if (isNaN(paid)) return { paidDate: "Enter the date it was paid, or today's date." };
      if (paid <= due) return { paidDate: "This must be after the due date, otherwise the invoice wasn't late." };
    },
    render: function (v, cur) {
      var money = function (n) { return T.formatMoney(n, cur); };
      var r = calculate({
        mode: mode.value,
        amount: v.amount,
        dueDate: dueDate.value,
        paidDate: paidDate.value,
        baseRate: v.baseRate,
        includeComp: document.getElementById("includeComp").checked,
        customRate: v.customRate,
        fee: v.fee
      });
      T.setText("out-claim", money(r.claim));
      T.setText("out-total", money(r.total));
      T.setText("out-interest", money(r.interest));
      T.setText("out-comp", money(r.extra));
      T.setText("out-rate", T.formatNumber(r.rate, 2) + "% a year");
      T.setText("out-days", T.formatNumber(r.days));
      T.setText("out-daily", money(r.daily));
    }
  });
})();
