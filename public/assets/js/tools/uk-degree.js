/* UK Degree Classification Calculator — weighted average of second and final year marks.
 * The 70 / 60 / 50 / 40 boundaries are the ones most UK universities use; each university sets
 * its own weighting and borderline rules, and the page says so. */
(function () {
  "use strict";

  var T = window.ToolNest;

  var CLASSES = [
    { min: 70, name: "First-class honours (1st)" },
    { min: 60, name: "Upper second-class honours (2:1)" },
    { min: 50, name: "Lower second-class honours (2:2)" },
    { min: 40, name: "Third-class honours (3rd)" }
  ];

  function classify(mark) {
    for (var i = 0; i < CLASSES.length; i++) if (mark >= CLASSES[i].min) return CLASSES[i].name;
    return "Below the usual pass mark of 40";
  }

  // v: { year2, year3 (may be null), finalWeight (% of the degree mark from the final year) }
  function calculate(v) {
    var w3 = v.finalWeight / 100;
    var w2 = 1 - w3;
    var out = { needed: {} };
    // Final-year average needed for each class, given the second-year mark.
    CLASSES.forEach(function (c) {
      out.needed[c.min] = w3 > 0 ? (c.min - v.year2 * w2) / w3 : null;
    });
    if (v.year3 != null) {
      out.mark = v.year2 * w2 + v.year3 * w3;
      out.classification = classify(Math.round(out.mark * 100) / 100);
    }
    return out;
  }

  window.ToolNestCalc = { calculate: calculate, classify: classify };
  if (!document.getElementById("calc-form")) return;

  var preset = document.getElementById("preset");
  var weightInput = document.getElementById("finalWeight");
  var weightField = weightInput.closest(".field");
  function applyPreset() {
    weightField.hidden = preset.value !== "custom";
    if (preset.value !== "custom") weightInput.value = String(Math.round(Number(preset.value) * 10) / 10);
  }
  preset.addEventListener("change", applyPreset);
  applyPreset();

  T.setupCalculator({
    rules: {
      year2: { min: 0, max: 100 },
      year3: { min: 0, max: 100, optional: true },
      finalWeight: { min: 0, max: 100 }
    },
    defaults: { year2: "62", year3: "68", preset: "66.6667", finalWeight: "66.6667" },
    onReset: applyPreset,
    outputs: ["out-mark", "out-class"],
    render: function (v) {
      // The weight box is hidden (and so not read) unless "Other" is chosen.
      var weight = preset.value === "custom" ? v.finalWeight : Number(preset.value);
      var r = calculate({ year2: v.year2, year3: v.year3, finalWeight: weight });
      T.setText("out-weight", T.formatNumber(100 - weight, 1) + "% second year, " + T.formatNumber(weight, 1) + "% final year");
      var pct = function (n) { return T.formatNumber(n, 1) + "%"; };
      T.setText("out-mark", r.mark == null ? "Add your final year" : pct(r.mark));
      T.setText("out-class", r.classification || "—");
      var rows = CLASSES.map(function (c) {
        var n = r.needed[c.min];
        var text = n == null ? "Depends on final year" : n <= 0 ? "Already secured" : n > 100 ? "Not reachable" : pct(n);
        return [c.name, text];
      });
      document.getElementById("needed-body").innerHTML = T.tableRows(rows, -1);
    }
  });
})();
