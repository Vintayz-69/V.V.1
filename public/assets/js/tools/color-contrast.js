/* WCAG Color Contrast & Accessibility Checker */
(function () {
  "use strict";

  var T = window.ToolNest;

  function hexToRgb(hex) {
    hex = String(hex || "").replace(/[^0-9a-fA-F]/g, "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) return null;
    var n = parseInt(hex, 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255
    };
  }

  function getLuminance(rgb) {
    var a = [rgb.r, rgb.g, rgb.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function calculate(v) {
    var fgRgb = hexToRgb(v.fg || "#0f172a");
    var bgRgb = hexToRgb(v.bg || "#ffffff");

    if (!fgRgb || !bgRgb) {
      return { ratio: 1, aaNormal: false, aaaNormal: false, aaLarge: false, aaaLarge: false, aaUI: false };
    }

    var l1 = getLuminance(fgRgb);
    var l2 = getLuminance(bgRgb);
    var lighter = Math.max(l1, l2);
    var darker = Math.min(l1, l2);
    var ratio = (lighter + 0.05) / (darker + 0.05);
    var roundedRatio = Math.round(ratio * 100) / 100;

    return {
      ratio: roundedRatio,
      aaNormal: roundedRatio >= 4.5,
      aaaNormal: roundedRatio >= 7.0,
      aaLarge: roundedRatio >= 3.0,
      aaaLarge: roundedRatio >= 4.5,
      aaUI: roundedRatio >= 3.0
    };
  }

  window.ToolNestCalc = calculate;

  var fgInput = document.getElementById("fg-color");
  var bgInput = document.getElementById("bg-color");
  var fgPicker = document.getElementById("fg-picker");
  var bgPicker = document.getElementById("bg-picker");
  if (!fgInput || !bgInput) return;

  function update() {
    var fg = fgInput.value;
    var bg = bgInput.value;
    var r = calculate({ fg: fg, bg: bg });

    document.getElementById("out-contrast-ratio").textContent = r.ratio.toFixed(2) + " : 1";

    function setBadge(id, pass) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = pass ? "Pass" : "Fail";
      el.className = pass ? "badge badge-pass" : "badge badge-fail";
    }

    setBadge("badge-aa-normal", r.aaNormal);
    setBadge("badge-aaa-normal", r.aaaNormal);
    setBadge("badge-aa-large", r.aaLarge);
    setBadge("badge-aaa-large", r.aaaLarge);
    setBadge("badge-aa-ui", r.aaUI);

    var previewBox = document.getElementById("contrast-preview-box");
    if (previewBox) {
      previewBox.style.backgroundColor = bg;
      previewBox.style.color = fg;
    }
  }

  fgInput.addEventListener("input", function () {
    if (hexToRgb(this.value) && fgPicker) fgPicker.value = this.value;
    update();
  });
  bgInput.addEventListener("input", function () {
    if (hexToRgb(this.value) && bgPicker) bgPicker.value = this.value;
    update();
  });

  if (fgPicker) {
    fgPicker.addEventListener("input", function () {
      fgInput.value = this.value;
      update();
    });
  }
  if (bgPicker) {
    bgPicker.addEventListener("input", function () {
      bgInput.value = this.value;
      update();
    });
  }

  var btnSwap = document.getElementById("btn-swap-colors");
  if (btnSwap) {
    btnSwap.addEventListener("click", function () {
      var tmp = fgInput.value;
      fgInput.value = bgInput.value;
      bgInput.value = tmp;
      if (fgPicker) fgPicker.value = fgInput.value;
      if (bgPicker) bgPicker.value = bgInput.value;
      update();
    });
  }

  update();
})();
