/* UK VAT Flat Rate Scheme Calculator. Rates from data/vat-flat-rate-uk.js; the 20% VAT on sales from data/tax-uk.js. */
(function () {
  "use strict";

  var D = window.ToolNestVatFlatRateUK;
  var VAT = window.ToolNestTaxUK.vat.standard;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  function sectorRate(key) {
    for (var i = 0; i < D.sectors.length; i++) if (D.sectors[i][0] === key) return D.sectors[i][2];
    return null;
  }

  // v: { sales: sales before VAT in the period, months: 1 | 3 | 12, sector, goods: relevant goods
  // bought in the period including VAT, firstYear: true in the first year of VAT registration,
  // costVat: VAT paid on business costs, reclaimable under normal VAT accounting }
  function calculate(v) {
    var vatCharged = round2(v.sales * VAT);
    var turnover = v.sales + vatCharged;
    var goodsLimit = round2(Math.max(turnover * D.limitedCostShare, D.limitedCostYearly * v.months / 12));
    var limitedCost = v.goods < goodsLimit;
    var baseRate = limitedCost ? D.limitedCostRate : sectorRate(v.sector);
    var flatRate = Math.round((v.firstYear ? baseRate - D.firstYearDiscount : baseRate) * 1000) / 1000;
    var flatVat = round2(turnover * flatRate);
    var standardVat = round2(vatCharged - v.costVat);
    return {
      vatCharged: vatCharged,
      turnover: turnover,
      goodsLimit: goodsLimit,
      limitedCost: limitedCost,
      baseRate: baseRate,
      flatRate: flatRate,
      flatVat: flatVat,
      kept: round2(vatCharged - flatVat),
      standardVat: standardVat,
      saving: round2(standardVat - flatVat), // above 0: the Flat Rate Scheme means paying less
      overJoinLimit: v.sales * 12 / v.months > D.joinLimit,
      overLeaveLimit: turnover * 12 / v.months > D.leaveLimit
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;
  var sector = document.getElementById("sector");
  var months = document.getElementById("months");
  var firstYear = document.getElementById("firstYear");
  var pct = function (r) { return T.formatNumber(r * 100) + "%"; };

  sector.innerHTML = D.sectors.map(function (s) {
    return '<option value="' + s[0] + '">' + s[1] + " (" + pct(s[2]) + ")</option>";
  }).join("");
  sector.value = "computer-it";

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      sales: { min: 0.01, max: 1000000000 },
      goods: { min: 0, max: 1000000000 },
      costVat: { min: 0, max: 1000000000 }
    },
    defaults: { sector: "computer-it", months: "3", sales: "15000", goods: "400", costVat: "200", firstYear: false },
    outputs: ["out-main", "out-rate", "out-turnover", "out-charged", "out-kept", "out-standard", "out-compare", "out-goods"],
    onInvalid: function () { document.getElementById("out-limits").hidden = true; },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate({ sales: v.sales, months: Number(months.value), sector: sector.value, goods: v.goods, firstYear: firstYear.checked, costVat: v.costVat });
      var why = r.limitedCost ? "limited cost" : "business type";
      if (firstYear.checked) why += ", first year";
      T.setText("out-main", money(r.flatVat));
      T.setText("out-rate", pct(r.flatRate) + " (" + why + ")");
      T.setText("out-turnover", money(r.turnover));
      T.setText("out-charged", money(r.vatCharged));
      T.setText("out-kept", money(r.kept));
      T.setText("out-standard", money(r.standardVat));
      T.setText("out-compare", r.saving > 0 ? money(r.saving) + " less on the scheme"
        : r.saving < 0 ? money(-r.saving) + " more on the scheme" : "The same");
      T.setText("out-goods", r.limitedCost
        ? "Under " + money(r.goodsLimit) + ", so 16.5% applies"
        : money(r.goodsLimit) + " or more: passed");
      var notes = [];
      if (r.overJoinLimit) notes.push("At this level for a full year, your sales before VAT would be over £150,000, the limit for joining the scheme.");
      if (r.overLeaveLimit) notes.push("At this level for a full year, your income including VAT would be over £230,000, the point where you must leave the scheme.");
      var limits = document.getElementById("out-limits");
      limits.textContent = notes.join(" ");
      limits.hidden = !notes.length;
    }
  });
})();
