/* Salary to Hourly Calculator */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var salary = Number(v.salary) || 0;
    var hours = Number(v.hours) || 40;
    var days = Number(v.days) || 5;
    var weeks = Number(v.weeks) || 52;

    var annualHours = weeks * hours;
    var hourly = annualHours > 0 ? salary / annualHours : 0;
    var weekly = hourly * hours;
    var daily = days > 0 ? weekly / days : 0;
    var biweekly = weekly * 2;
    var monthly = salary / 12;
    var overtime = hourly * 1.5;

    return {
      annualHours: annualHours,
      hourly: hourly,
      daily: daily,
      weekly: weekly,
      biweekly: biweekly,
      monthly: monthly,
      overtime: overtime
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = ["out-hourly", "out-daily", "out-weekly", "out-biweekly", "out-monthly", "out-overtime", "out-hours"];

  T.setupCalculator({
    rules: {
      salary: { min: 0, max: 100000000 },
      hours: { min: 1, max: 168 },
      days: { min: 1, max: 7 },
      weeks: { min: 1, max: 52 }
    },
    defaults: { salary: "65000", hours: "40", days: "5", weeks: "52" },
    outputs: OUTPUTS,
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);

      T.setText("out-hourly", money(r.hourly));
      T.setText("out-daily", money(r.daily));
      T.setText("out-weekly", money(r.weekly));
      T.setText("out-biweekly", money(r.biweekly));
      T.setText("out-monthly", money(r.monthly));
      T.setText("out-overtime", money(r.overtime));
      T.setText("out-hours", T.formatNumber(r.annualHours));

      // What-if table for different weekly working hours
      var hoursOptions = [20, 30, 35, 37.5, 40, 45, 50];
      var rows = hoursOptions.map(function (h) {
        var res = calculate({ salary: v.salary, hours: h, days: v.days, weeks: v.weeks });
        var label = h + " hrs/wk" + (h === v.hours ? " (yours)" : "");
        return [
          label,
          T.formatNumber(res.annualHours),
          money(res.hourly),
          money(res.monthly)
        ];
      });

      document.getElementById("salary-table-body").innerHTML = T.tableRows(rows, hoursOptions.indexOf(v.hours));
    }
  });
})();
