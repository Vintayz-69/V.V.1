/* Australia Voluntary (Concessional) Super Contribution Calculator (2026–27). */
(function () {
  "use strict";

  var T = window.ToolNest;
  var AU = window.ToolNestAU;
  var S = AU.data.super;

  function calculate(v) {
    var before = AU.individual(v.income, 0);
    var after = AU.individual(Math.max(0, v.income - v.extra), 0);
    var taxSaved = before.total - after.total;
    var concessional = v.employer + v.extra;
    // Division 293: extra 15% on concessional contributions when income + contributions exceed $250,000.
    var div293Base = Math.max(0, Math.min(concessional, (v.income - v.extra) + concessional - S.division293Threshold));
    var contributionsTax = v.extra * S.contributionsTax + Math.min(v.extra, div293Base) * S.division293Rate;
    return {
      taxSaved: taxSaved,
      contributionsTax: contributionsTax,
      netBenefit: taxSaved - contributionsTax,
      concessional: concessional,
      capRoom: S.concessionalCap - concessional,
      overCap: concessional > S.concessionalCap,
      takeHomeChange: -(v.extra - taxSaved)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    keepCurrency: true,
    rules: {
      income: { min: 0, max: 100000000 },
      employer: { min: 0, max: 1000000 },
      extra: { min: 0, max: 1000000 }
    },
    defaults: { income: "90000", employer: "10800", extra: "10000" },
    outputs: ["out-benefit", "out-saved", "out-ctax", "out-take", "out-cap"],
    check: function (v) {
      if (v.extra > v.income) return { extra: "Your contribution can't be more than your income." };
    },
    render: function (v) {
      var money = function (n) { return T.formatMoney(n, "AUD"); };
      var r = calculate(v);
      T.setText("out-benefit", money(r.netBenefit));
      T.setText("out-saved", money(r.taxSaved));
      T.setText("out-ctax", money(r.contributionsTax));
      T.setText("out-take", "−" + money(-r.takeHomeChange));
      T.setText("out-cap", r.overCap ? "Over the cap by " + money(-r.capRoom) : money(r.capRoom) + " left");
    }
  });
})();
