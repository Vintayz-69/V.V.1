/* BMI (Body Mass Index) Calculator — WHO Standards, 100% in-browser */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var unit = v.unit || "metric";
    var weightKg = 0;
    var heightM = 0;

    if (unit === "imperial") {
      var lbs = Number(v.weightLbs) || 150;
      var ft = Number(v.heightFt) || 5;
      var inch = Number(v.heightIn) || 8;
      var totalInches = ft * 12 + inch;
      weightKg = lbs * 0.45359237;
      heightM = (totalInches * 2.54) / 100;
    } else {
      weightKg = Number(v.weightKg) || 70;
      heightM = (Number(v.heightCm) || 175) / 100;
    }

    if (heightM <= 0 || weightKg <= 0) {
      return { bmi: 0, category: "Unknown", minWeight: 0, maxWeight: 0, prime: 0 };
    }

    var bmi = weightKg / (heightM * heightM);
    bmi = Math.round(bmi * 100) / 100;

    var category = "Normal weight";
    var badgeClass = "badge-success";
    if (bmi < 18.5) {
      category = "Underweight";
      badgeClass = "badge-warning";
    } else if (bmi < 25.0) {
      category = "Normal (Healthy)";
      badgeClass = "badge-success";
    } else if (bmi < 30.0) {
      category = "Overweight";
      badgeClass = "badge-warning";
    } else if (bmi < 35.0) {
      category = "Obese (Class I)";
      badgeClass = "badge-danger";
    } else if (bmi < 40.0) {
      category = "Obese (Class II)";
      badgeClass = "badge-danger";
    } else {
      category = "Obese (Class III)";
      badgeClass = "badge-danger";
    }

    var minHealthyKg = Math.round(18.5 * heightM * heightM * 10) / 10;
    var maxHealthyKg = Math.round(24.9 * heightM * heightM * 10) / 10;
    var prime = Math.round((bmi / 25.0) * 100) / 100;

    return {
      bmi: bmi,
      category: category,
      badgeClass: badgeClass,
      minWeightKg: minHealthyKg,
      maxWeightKg: maxHealthyKg,
      minWeightLbs: Math.round(minHealthyKg * 2.20462 * 10) / 10,
      maxWeightLbs: Math.round(maxHealthyKg * 2.20462 * 10) / 10,
      prime: prime
    };
  }

  window.ToolNestCalc = calculate;

  if (!document.getElementById("calc-form")) return;

  var OUTPUTS = [
    "out-bmi",
    "out-category",
    "out-healthy-range",
    "out-bmi-prime"
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
      weightKg: { min: 20, max: 400 },
      heightCm: { min: 80, max: 250 },
      weightLbs: { min: 44, max: 880 },
      heightFt: { min: 2, max: 8 },
      heightIn: { min: 0, max: 11 }
    },
    defaults: {
      unit: "metric",
      weightKg: "70",
      heightCm: "175",
      weightLbs: "150",
      heightFt: "5",
      heightIn: "8"
    },
    outputs: OUTPUTS,
    render: function (v) {
      var r = calculate(v);

      T.setText("out-bmi", r.bmi);
      T.setText("out-category", r.category);

      var rangeStr = v.unit === "imperial"
        ? r.minWeightLbs + " – " + r.maxWeightLbs + " lbs"
        : r.minWeightKg + " – " + r.maxWeightKg + " kg";
      T.setText("out-healthy-range", rangeStr);

      T.setText("out-bmi-prime", r.prime + " (ratio to 25.0)");
    }
  });

  updateUnitFields();
})();
