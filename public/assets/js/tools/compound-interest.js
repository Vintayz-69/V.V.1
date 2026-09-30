/* Compound Interest Calculator — 100% in-browser (LEGAL.md §2) */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var principal = Math.max(0, Number(v.principal) || 0);
    var monthly = Math.max(0, Number(v.monthlyDeposit) || 0);
    var rate = Math.max(0, Number(v.rate) || 0);
    var years = Math.max(0, Number(v.years) || 0);
    var freq = Number(v.frequency) || 12; // 12 = monthly, 1 = annually, 4 = quarterly

    var totalInvested = principal + monthly * 12 * years;

    if (rate === 0 || years === 0) {
      return {
        futureValue: Math.round(totalInvested * 100) / 100,
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalInterest: 0,
        interestRatio: 0
      };
    }

    var r = rate / 100;
    var fvPrincipal = 0;
    var fvMonthly = 0;

    if (freq === 12) {
      var rMonthly = r / 12;
      var totalMonths = years * 12;
      var compoundFactor = Math.pow(1 + rMonthly, totalMonths);
      fvPrincipal = principal * compoundFactor;
      fvMonthly = monthly * ((compoundFactor - 1) / rMonthly);
    } else {
      var n = freq;
      var periods = years * n;
      var rPeriod = r / n;
      fvPrincipal = principal * Math.pow(1 + rPeriod, periods);
      // Effective monthly compounding rate
      var rEffMonthly = Math.pow(1 + rPeriod, n / 12) - 1;
      if (rEffMonthly > 0) {
        fvMonthly = monthly * ((Math.pow(1 + rEffMonthly, years * 12) - 1) / rEffMonthly);
      } else {
        fvMonthly = monthly * 12 * years;
      }
    }

    var futureValue = fvPrincipal + fvMonthly;
    var totalInterest = Math.max(0, futureValue - totalInvested);
    var interestRatio = futureValue > 0 ? (totalInterest / futureValue) * 100 : 0;

    return {
      futureValue: Math.round(futureValue * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      interestRatio: Math.round(interestRatio * 10) / 10
    };
  }

  window.ToolNestCalc = calculate;

  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = ["out-future-value", "out-total-invested", "out-total-interest", "out-interest-ratio"];

  T.setupCalculator({
    rules: {
      principal: { min: 0, max: 100000000 },
      monthlyDeposit: { min: 0, max: 10000000 },
      rate: { min: 0, max: 100 },
      years: { min: 1, max: 60 }
    },
    defaults: { principal: "5000", monthlyDeposit: "200", rate: "7", years: "10", frequency: "12" },
    outputs: OUTPUTS,
    onInvalid: function () {
      var tbody = document.getElementById("growth-table-body");
      if (tbody) tbody.innerHTML = '<tr><td colspan="4">Fix highlighted fields to see annual growth.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);

      T.setText("out-future-value", money(r.futureValue));
      T.setText("out-total-invested", money(r.totalInvested));
      T.setText("out-total-interest", money(r.totalInterest));
      T.setText("out-interest-ratio", r.interestRatio + "%");

      // Generate Year-by-Year Table
      var tbody = document.getElementById("growth-table-body");
      if (tbody) {
        var numYears = Math.min(Math.max(1, parseInt(v.years, 10) || 1), 60);
        var rows = [];
        for (var yr = 1; yr <= numYears; yr++) {
          var stepRes = calculate({
            principal: v.principal,
            monthlyDeposit: v.monthlyDeposit,
            rate: v.rate,
            years: yr,
            frequency: v.frequency
          });
          rows.push(
            '<tr>' +
              '<td>Year ' + yr + '</td>' +
              '<td class="num">' + money(stepRes.totalInvested) + '</td>' +
              '<td class="num">' + money(stepRes.totalInterest) + '</td>' +
              '<td class="num"><strong>' + money(stepRes.futureValue) + '</strong></td>' +
            '</tr>'
          );
        }
        tbody.innerHTML = rows.join("");
      }
    }
  });
})();
