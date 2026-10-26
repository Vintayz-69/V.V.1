/* High Income Child Benefit Charge calculator (2026 to 2027). Figures from data/child-benefit-uk.js. */
(function () {
  "use strict";

  var D = window.ToolNestChildBenefitUK;

  function round2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  // Child Benefit for the year: the eldest child's rate plus the other children's, for `weeks` weeks.
  function benefitFor(children, weeks) {
    return round2((D.eldest + D.other * (children - 1)) * weeks);
  }

  // Whole £200 steps over the threshold, 1% each, up to 100%.
  function chargePercent(ani) {
    return Math.min(100, Math.max(0, Math.floor((ani - D.threshold) / D.step)));
  }

  // v: { income: taxable income, pension: relief-at-source pension contributions you paid,
  //      giftAid: Gift Aid donations you paid, children, weeks: weeks of Child Benefit this year }
  function calculate(v) {
    var ani = round2(v.income - (v.pension + v.giftAid) * D.reliefGrossUp);
    var benefit = benefitFor(v.children, v.weeks);
    var percent = chargePercent(ani);
    var charge = round2(benefit * percent / 100);
    return {
      ani: ani,
      benefit: benefit,
      percent: percent,
      charge: charge,
      kept: round2(benefit - charge),
      overThreshold: ani > D.threshold,
      allRepaid: percent >= 100
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var T = window.ToolNest;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      income: { min: 0, max: 100000000 },
      pension: { min: 0, max: 100000000 },
      giftAid: { min: 0, max: 100000000 },
      children: { min: 1, max: 20 },
      weeks: { min: 1, max: 53 }
    },
    defaults: { income: "70000", pension: "0", giftAid: "0", children: "2", weeks: "52" },
    outputs: ["out-main", "out-ani", "out-percent", "out-benefit", "out-kept"],
    check: function (v) {
      if (v.children % 1) return { children: "Enter a whole number of children." };
      if (v.weeks % 1) return { weeks: "Enter a whole number of weeks, from 1 to 53." };
    },
    onInvalid: function () {
      document.getElementById("steps-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "GBP"); };
      var r = calculate(v);
      T.setText("out-main", money(r.charge));
      T.setText("out-ani", money(r.ani));
      T.setText("out-percent", r.percent + "%" + (r.allRepaid ? " (all of it)" : ""));
      T.setText("out-benefit", money(r.benefit));
      T.setText("out-kept", money(r.kept));

      var rows = [];
      // Ten rows across the taper, each a whole number of £200 steps.
      for (var ani = D.threshold; ani <= D.fullAt; ani += (D.fullAt - D.threshold) / 10) {
        var x = calculate({ income: ani, pension: 0, giftAid: 0, children: v.children, weeks: v.weeks });
        rows.push([money(ani), x.percent + "%", money(x.charge)]);
      }
      document.getElementById("steps-body").innerHTML = T.tableRows(rows, -1);
    }
  });
})();
