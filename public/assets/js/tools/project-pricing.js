/* Project Pricing Calculator. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var labour = v.hours * v.rate;
    var subtotal = labour + v.costs;
    var buffer = subtotal * (v.buffer / 100);
    var price = subtotal + buffer;
    var deposit = price * (v.deposit / 100);
    return {
      labour: labour,
      buffer: buffer,
      price: price,
      deposit: deposit,
      balance: price - deposit,
      effective: (price - v.costs) / v.hours
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      hours: { min: 0.5, max: 10000 },
      rate: { min: 0, max: 100000 },
      costs: { min: 0, max: 100000000 },
      buffer: { min: 0, max: 100 },
      deposit: { min: 0, max: 100 }
    },
    defaults: { hours: "40", rate: "75", costs: "200", buffer: "15", deposit: "50" },
    outputs: ["out-price", "out-deposit", "out-balance", "out-labour", "out-costs", "out-buffer", "out-effective"],
    onInvalid: function () {
      document.getElementById("whatif-body").innerHTML =
        '<tr><td colspan="3">Fix the highlighted fields above to see this table.</td></tr>';
    },
    render: function (v, currency) {
      var money = function (n) { return T.formatMoney(n, currency); };
      var r = calculate(v);
      T.setText("out-price", money(r.price));
      T.setText("out-deposit", money(r.deposit));
      T.setText("out-balance", money(r.balance));
      T.setText("out-labour", money(r.labour));
      T.setText("out-costs", money(v.costs));
      T.setText("out-buffer", money(r.buffer));
      T.setText("out-effective", money(r.effective));

      var overruns = [0, 10, 25, 50, 100];
      var rows = overruns.map(function (o) {
        var actual = v.hours * (1 + o / 100);
        var label = o === 0 ? "As estimated" : o + "% longer";
        return [label, T.formatNumber(actual), money((r.price - v.costs) / actual)];
      });
      document.getElementById("whatif-body").innerHTML = T.tableRows(rows, 0);
    }
  });
})();
