/* UK Stamp Duty Land Tax Calculator (England and Northern Ireland, residential).
   Figures come only from assets/data/property-tax-uk.js. */
(function () {
  "use strict";

  var S = window.ToolNestPropertyTaxUK.sdlt;

  function round2(n) { return Math.round(n * 100) / 100; }

  // price: purchase price; buyer: "home" | "first" | "additional"; nonResident: true/false.
  // Returns the tax and a row for each band: { from, to, rate, amount, tax }.
  function calculate(v) {
    var reliefLost = v.buyer === "first" && v.price > S.firstTimeBuyer.maxPrice;
    var table = v.buyer === "first" && !reliefLost ? S.firstTimeBuyer.bands : S.standard;
    var extra = 0;
    var surchargeApplies = v.buyer === "additional" && v.price >= S.additional.minPrice;
    if (surchargeApplies) extra += S.additional.surcharge;
    if (v.nonResident) extra += S.nonResident.surcharge;

    var rows = [];
    var lower = 0;
    var tax = 0;
    for (var i = 0; i < table.length; i++) {
      var upper = table[i][0];
      var amount = Math.max(0, Math.min(upper, v.price) - lower);
      var rate = table[i][1] + extra;
      var bandTax = amount * rate;
      rows.push({ from: lower, to: upper, rate: rate, amount: amount, tax: round2(bandTax) });
      tax += bandTax;
      lower = upper;
    }
    tax = round2(tax);
    return {
      tax: tax,
      effective: v.price > 0 ? tax / v.price * 100 : 0,
      rows: rows,
      reliefLost: reliefLost,
      surchargeApplies: surchargeApplies,
      extra: extra
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var el = function (id) { return document.getElementById(id); };
  var buyerOf = function () { return document.querySelector("input[name=buyer]:checked").value; };
  var pct = function (r) { return T.formatNumber(Math.round(r * 1000) / 10) + "%"; };

  T.setupCalculator({
    keepCurrency: true,
    rules: { price: { min: 1, max: 1000000000 } },
    defaults: { price: "295000", nonResident: false },
    outputs: ["out-tax", "out-effective", "out-after"],
    onReset: function () { el("buyer-home").checked = true; },
    onInvalid: function () {
      el("bands-body").innerHTML = '<tr><td colspan="3">Fix the price above to see this table.</td></tr>';
      el("relief-note").hidden = true;
    },
    render: function (v) {
      var money = function (n, d) { return T.formatMoney(n, "GBP", d); };
      var r = calculate({ price: v.price, buyer: buyerOf(), nonResident: el("nonResident").checked });
      T.setText("out-tax", money(r.tax));
      T.setText("out-effective", T.formatNumber(r.effective, 2) + "% of the price");
      T.setText("out-after", money(v.price + r.tax));
      el("relief-note").hidden = !r.reliefLost;
      el("small-note").hidden = !(buyerOf() === "additional" && !r.surchargeApplies);

      var rows = r.rows.filter(function (b) { return b.amount > 0; }).map(function (b) {
        var band = b.from === 0 ? "Up to " + money(b.to, 0)
          : b.to === Infinity ? "Over " + money(b.from, 0)
          : money(b.from + 1, 0) + " to " + money(b.to, 0);
        return [band, pct(b.rate) + " on " + money(b.amount, 0), money(b.tax)];
      });
      el("bands-body").innerHTML = T.tableRows(rows);
    }
  });
})();
