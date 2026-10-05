/* Monthly Expenses Calculator: adds up monthly bills and spending, shows the yearly and weekly
   totals, the biggest costs, and what's left from take-home pay. Also turns weekly, four-weekly,
   quarterly or yearly bills into a monthly amount. Pure maths, runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // Input id and the name shown in the breakdown table, in form order.
  var CATEGORIES = [
    ["rent", "Rent or mortgage"],
    ["counciltax", "Council tax or property tax"],
    ["energy", "Gas and electricity"],
    ["water", "Water"],
    ["broadband", "Broadband, phone and TV"],
    ["food", "Food and groceries"],
    ["transport", "Transport"],
    ["insurance", "Insurance"],
    ["debt", "Loan and card repayments"],
    ["childcare", "Childcare"],
    ["subscriptions", "Subscriptions"],
    ["other", "Everything else"]
  ];

  // How many times a year each bill frequency is paid.
  var PER_YEAR = { weekly: 52, fortnightly: 26, fourweekly: 13, monthly: 12, quarterly: 4, yearly: 1 };

  function round2(n) { return Math.round(n * 100) / 100; }
  function round1(n) { return Math.round(n * 10) / 10; }

  // A bill paid `freq` times a year, spread evenly over 12 months.
  function toMonthly(amount, freq) {
    return round2(amount * PER_YEAR[freq] / 12);
  }

  // v: one monthly amount per category (blank = null), and income (take-home a month, or null).
  function calculate(v) {
    var total = 0;
    var items = CATEGORIES.map(function (c) {
      var monthly = v[c[0]] || 0;
      total += monthly;
      return { key: c[0], name: c[1], monthly: monthly };
    });
    items = items.filter(function (it) { return it.monthly > 0; });
    items.forEach(function (it) {
      it.yearly = round2(it.monthly * 12);
      it.share = round1(it.monthly / total * 100);
    });
    // Biggest first; equal amounts keep form order.
    items.sort(function (a, b) { return b.monthly - a.monthly; });

    var hasIncome = v.income !== null && v.income !== undefined && v.income > 0;
    return {
      total: round2(total),
      yearly: round2(total * 12),
      weekly: round2(total * 12 / 52),
      items: items,
      biggest: items.length ? items[0] : null,
      leftOver: hasIncome ? round2(v.income - total) : null,
      spentPct: hasIncome ? round1(total / v.income * 100) : null
    };
  }

  window.ToolNestCalc = calculate;
  window.ToolNestCalc.toMonthly = toMonthly;
  if (!document.getElementById("calc-form")) return;

  var rules = { income: { min: 0, max: 100000000, optional: true } };
  var defaults = {
    rent: "950", counciltax: "140", energy: "120", water: "40", broadband: "55", food: "300",
    transport: "120", insurance: "30", debt: "", childcare: "", subscriptions: "25", other: "150",
    income: "2400"
  };
  CATEGORIES.forEach(function (c) { rules[c[0]] = { min: 0, max: 100000000, optional: true }; });

  var lastCurrency = "USD";

  T.setupCalculator({
    rules: rules,
    defaults: defaults,
    outputs: ["out-total", "out-yearly", "out-weekly", "out-biggest", "out-left", "out-spent"],
    check: function (v) {
      var any = CATEGORIES.some(function (c) { return v[c[0]] > 0; });
      if (!any) return { rent: "Enter at least one monthly cost." };
    },
    onInvalid: function () {
      document.getElementById("breakdown-body").innerHTML =
        '<tr><td colspan="4">Enter your costs above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      lastCurrency = currency;
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-total", money(r.total));
      T.setText("out-yearly", money(r.yearly));
      T.setText("out-weekly", money(r.weekly));
      T.setText("out-biggest", r.biggest.name + " (" + T.formatNumber(r.biggest.share, 1) + "%)");
      if (r.leftOver === null) {
        T.setText("out-left", "Add your take-home pay");
        T.setText("out-spent", "—");
      } else {
        T.setText("out-left", r.leftOver < 0 ? "−" + money(-r.leftOver) + " (short)" : money(r.leftOver));
        T.setText("out-spent", T.formatNumber(r.spentPct, 1) + "%");
      }
      document.getElementById("breakdown-body").innerHTML = T.tableRows(r.items.map(function (it) {
        return [it.name, money(it.monthly), money(it.yearly), T.formatNumber(it.share, 1) + "%"];
      }));
      convert();
    }
  });

  // Bill converter: a separate small form under the calculator.
  var convAmount = document.getElementById("conv-amount");
  var convFreq = document.getElementById("conv-freq");
  var convOut = document.getElementById("conv-out");

  function convert() {
    if (!convAmount || !convFreq || !convOut) return;
    var raw = String(convAmount.value).replace(/[,\s]/g, "").trim();
    var n = Number(raw);
    var field = convAmount.closest(".field");
    var ok = raw !== "" && isFinite(n) && n >= 0 && n <= 100000000;
    field.classList.toggle("invalid", raw !== "" && !ok);
    convAmount.setAttribute("aria-invalid", raw !== "" && !ok ? "true" : "false");
    convOut.textContent = ok ? T.formatMoney(toMonthly(n, convFreq.value), lastCurrency) + " a month" : "—";
  }

  if (convAmount && convFreq) {
    convAmount.addEventListener("input", convert);
    convFreq.addEventListener("change", convert);
    var convForm = document.getElementById("conv-form");
    if (convForm) convForm.addEventListener("submit", function (e) { e.preventDefault(); });
    convert();
  }
})();
