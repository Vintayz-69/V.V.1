/* Final Grade Calculator — the score you need on a final exam to reach a target grade. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // v: { current (%), weight (% of the course grade the final is worth), target (%) }
  function calculate(v) {
    var w = v.weight / 100;
    var needed = (v.target - v.current * (1 - w)) / w;
    return {
      needed: needed,
      possible: needed <= 100,
      alreadyThere: needed <= 0,
      // The course grade you'd end up with for a given final exam score.
      gradeWith: function (score) { return v.current * (1 - w) + score * w; }
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  T.setupCalculator({
    rules: {
      current: { min: 0, max: 150 },
      weight: { min: 1, max: 100 },
      target: { min: 0, max: 150 }
    },
    defaults: { current: "78", weight: "25", target: "80" },
    outputs: ["out-needed"],
    render: function (v) {
      var r = calculate(v);
      var pct = function (n) { return T.formatNumber(n, 1) + "%"; };
      T.setText("out-needed", r.alreadyThere ? "0%" : pct(r.needed));
      var note = document.getElementById("out-verdict");
      if (r.alreadyThere) note.textContent = "You'll reach " + pct(v.target) + " even with 0% on the final.";
      else if (!r.possible) note.textContent = "You'd need more than 100%, so " + pct(v.target) + " isn't reachable unless there's extra credit. The best you can get is " + pct(r.gradeWith(100)) + ".";
      else note.textContent = "Score at least " + pct(r.needed) + " on the final to finish with " + pct(v.target) + ".";
      T.setText("out-best", pct(r.gradeWith(100)));
      T.setText("out-zero", pct(r.gradeWith(0)));

      var scores = [100, 90, 80, 70, 60, 50];
      var rows = scores.map(function (s) { return [s + "% on the final", pct(r.gradeWith(s))]; });
      document.getElementById("grade-table-body").innerHTML = T.tableRows(rows, -1);
    }
  });
})();
