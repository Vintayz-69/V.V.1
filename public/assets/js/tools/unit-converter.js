/* Universal Unit Converter — 100% in-browser */
(function () {
  "use strict";

  var T = window.ToolNest;

  var UNITS = {
    length: {
      base: "m",
      units: {
        m: { name: "Meters (m)", factor: 1 },
        km: { name: "Kilometers (km)", factor: 1000 },
        cm: { name: "Centimeters (cm)", factor: 0.01 },
        mm: { name: "Millimeters (mm)", factor: 0.001 },
        mi: { name: "Miles (mi)", factor: 1609.344 },
        yd: { name: "Yards (yd)", factor: 0.9144 },
        ft: { name: "Feet (ft)", factor: 0.3048 },
        in: { name: "Inches (in)", factor: 0.0254 }
      }
    },
    weight: {
      base: "kg",
      units: {
        kg: { name: "Kilograms (kg)", factor: 1 },
        g: { name: "Grams (g)", factor: 0.001 },
        mg: { name: "Milligrams (mg)", factor: 0.000001 },
        lb: { name: "Pounds (lbs)", factor: 0.45359237 },
        oz: { name: "Ounces (oz)", factor: 0.028349523125 },
        st: { name: "Stone (st)", factor: 6.35029318 },
        t: { name: "Metric Tons (t)", factor: 1000 }
      }
    },
    volume: {
      base: "l",
      units: {
        l: { name: "Liters (L)", factor: 1 },
        ml: { name: "Milliliters (mL)", factor: 0.001 },
        gal_us: { name: "US Gallons (gal)", factor: 3.785411784 },
        qt_us: { name: "US Quarts (qt)", factor: 0.946352946 },
        pt_us: { name: "US Pints (pt)", factor: 0.473176473 },
        cup_us: { name: "US Cups", factor: 0.2365882365 },
        floz_us: { name: "US Fluid Ounces (fl oz)", factor: 0.0295735295625 },
        gal_uk: { name: "Imperial Gallons", factor: 4.54609 }
      }
    },
    area: {
      base: "m2",
      units: {
        m2: { name: "Square Meters (m²)", factor: 1 },
        km2: { name: "Square Kilometers (km²)", factor: 1000000 },
        ft2: { name: "Square Feet (ft²)", factor: 0.09290304 },
        ac: { name: "Acres", factor: 4046.8564224 },
        ha: { name: "Hectares", factor: 10000 }
      }
    }
  };

  function convertTemp(val, from, to) {
    var c = 0;
    if (from === "c") c = val;
    else if (from === "f") c = (val - 32) * (5 / 9);
    else if (from === "k") c = val - 273.15;

    if (to === "c") return c;
    if (to === "f") return c * (9 / 5) + 32;
    if (to === "k") return c + 273.15;
    return c;
  }

  function calculate(v) {
    var cat = v.category || "length";
    var val = Number(v.value) || 0;
    var from = v.from || "mi";
    var to = v.to || "km";

    if (cat === "temperature") {
      var tempRes = convertTemp(val, from, to);
      return {
        value: val,
        result: Math.round(tempRes * 10000) / 10000,
        rounded: Math.round(tempRes * 100) / 100,
        from: from.toUpperCase(),
        to: to.toUpperCase()
      };
    }

    var group = UNITS[cat] || UNITS.length;
    var uFrom = group.units[from] || Object.values(group.units)[0];
    var uTo = group.units[to] || Object.values(group.units)[1];

    var baseVal = val * uFrom.factor;
    var finalVal = baseVal / uTo.factor;

    return {
      value: val,
      result: Math.round(finalVal * 10000) / 10000,
      rounded: Math.round(finalVal * 100) / 100,
      from: from,
      to: to
    };
  }

  window.ToolNestCalc = calculate;

  var form = document.getElementById("converter-form");
  if (!form) return;

  var catSelect = document.getElementById("conv-category");
  var fromSelect = document.getElementById("conv-from");
  var toSelect = document.getElementById("conv-to");
  var valInput = document.getElementById("conv-value");
  var outPrimary = document.getElementById("out-convert-result");
  var outEquation = document.getElementById("out-convert-equation");

  function populateUnitDropdowns() {
    var cat = catSelect.value;
    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";

    if (cat === "temperature") {
      var temps = [
        { id: "c", name: "Celsius (°C)" },
        { id: "f", name: "Fahrenheit (°F)" },
        { id: "k", name: "Kelvin (K)" }
      ];
      temps.forEach(function (t) {
        fromSelect.add(new Option(t.name, t.id));
        toSelect.add(new Option(t.name, t.id));
      });
      fromSelect.value = "c";
      toSelect.value = "f";
    } else {
      var group = UNITS[cat];
      Object.keys(group.units).forEach(function (key) {
        fromSelect.add(new Option(group.units[key].name, key));
        toSelect.add(new Option(group.units[key].name, key));
      });
      // Pick sensible defaults
      if (cat === "length") { fromSelect.value = "mi"; toSelect.value = "km"; }
      else if (cat === "weight") { fromSelect.value = "lb"; toSelect.value = "kg"; }
      else if (cat === "volume") { fromSelect.value = "gal_us"; toSelect.value = "l"; }
      else if (cat === "area") { fromSelect.value = "ft2"; toSelect.value = "m2"; }
    }
  }

  function update() {
    var res = calculate({
      category: catSelect.value,
      value: valInput.value,
      from: fromSelect.value,
      to: toSelect.value
    });

    outPrimary.textContent = res.result.toLocaleString(undefined, { maximumFractionDigits: 6 });
    var fromName = fromSelect.options[fromSelect.selectedIndex] ? fromSelect.options[fromSelect.selectedIndex].text : res.from;
    var toName = toSelect.options[toSelect.selectedIndex] ? toSelect.options[toSelect.selectedIndex].text : res.to;
    outEquation.textContent = res.value + " " + fromName + " = " + res.result + " " + toName;
  }

  catSelect.addEventListener("change", function () {
    populateUnitDropdowns();
    update();
  });

  fromSelect.addEventListener("change", update);
  toSelect.addEventListener("change", update);
  valInput.addEventListener("input", update);

  var swapBtn = document.getElementById("btn-swap-units");
  if (swapBtn) {
    swapBtn.addEventListener("click", function () {
      var tmp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = tmp;
      update();
    });
  }

  populateUnitDropdowns();
  update();
})();
