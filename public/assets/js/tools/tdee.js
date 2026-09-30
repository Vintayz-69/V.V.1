/* TDEE (Total Daily Energy Expenditure) & Calorie Calculator — 100% in-browser */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var unit = v.unit || "metric";
    var gender = v.gender || "male";
    var age = Math.max(15, Math.min(100, Number(v.age) || 30));
    var activity = Number(v.activity) || 1.2;

    var weightKg = 0;
    var heightCm = 0;

    if (unit === "imperial") {
      var lbs = Number(v.weightLbs) || 160;
      var ft = Number(v.heightFt) || 5;
      var inch = Number(v.heightIn) || 9;
      weightKg = lbs * 0.45359237;
      heightCm = (ft * 12 + inch) * 2.54;
    } else {
      weightKg = Number(v.weightKg) || 70;
      heightCm = Number(v.heightCm) || 175;
    }

    // Mifflin-St Jeor Formula
    var s = (gender === "female") ? -161 : 5;
    var bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + s;
    bmr = Math.max(500, Math.round(bmr));

    var tdee = Math.round(bmr * activity);

    return {
      bmr: bmr,
      tdee: tdee,
      mildLoss: Math.max(1000, tdee - 250),
      weightLoss: Math.max(1000, tdee - 500),
      mildGain: tdee + 250,
      weightGain: tdee + 500
    };
  }

  window.ToolNestCalc = calculate;

  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = [
    "out-tdee",
    "out-bmr",
    "out-mild-loss",
    "out-weight-loss",
    "out-mild-gain",
    "out-weight-gain"
  ];

  function updateUnitFields() {
    var unit = document.getElementById("unit").value;
    var metricFields = document.querySelectorAll(".metric-field");
    var imperialFields = document.querySelectorAll(".imperial-field");
    if (unit === "imperial") {
      metricFields.forEach(function (el) { el.style.display = "none"; });
      imperialFields.forEach(function (el) { el.style.display = ""; });
    } else {
      metricFields.forEach(function (el) { el.style.display = ""; });
      imperialFields.forEach(function (el) { el.style.display = "none"; });
    }
  }

  var unitSelect = document.getElementById("unit");
  if (unitSelect) {
    unitSelect.addEventListener("change", function () {
      updateUnitFields();
      if (window.__toolNestRecalc) window.__toolNestRecalc();
    });
  }

  T.setupCalculator({
    rules: {
      age: { min: 15, max: 100 },
      weightKg: { min: 25, max: 300 },
      heightCm: { min: 90, max: 250 },
      weightLbs: { min: 55, max: 660 },
      heightFt: { min: 3, max: 8 },
      heightIn: { min: 0, max: 11 }
    },
    defaults: {
      unit: "metric",
      gender: "male",
      age: "30",
      activity: "1.55",
      weightKg: "80",
      heightCm: "180",
      weightLbs: "176",
      heightFt: "5",
      heightIn: "11"
    },
    outputs: OUTPUTS,
    render: function (v) {
      var r = calculate(v);

      T.setText("out-tdee", T.formatNumber(r.tdee) + " kcal");
      T.setText("out-bmr", T.formatNumber(r.bmr) + " kcal/day");
      T.setText("out-mild-loss", T.formatNumber(r.mildLoss) + " kcal/day");
      T.setText("out-weight-loss", T.formatNumber(r.weightLoss) + " kcal/day");
      T.setText("out-mild-gain", T.formatNumber(r.mildGain) + " kcal/day");
      T.setText("out-weight-gain", T.formatNumber(r.weightGain) + " kcal/day");

      // Update macro suggestions (30% protein, 40% carbs, 30% fat)
      var proteinGrams = Math.round((r.tdee * 0.3) / 4);
      var carbGrams = Math.round((r.tdee * 0.4) / 4);
      var fatGrams = Math.round((r.tdee * 0.3) / 9);
      T.setText("out-macro-protein", proteinGrams + "g (30%)");
      T.setText("out-macro-carbs", carbGrams + "g (40%)");
      T.setText("out-macro-fat", fatGrams + "g (30%)");
    }
  });

  updateUnitFields();
})();
