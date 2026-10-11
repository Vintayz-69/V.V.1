/* Color Converter: HEX, RGB, HSL, HSV and CMYK, with a colour picker, lighter and darker shades,
   and contrast with white and black text. Runs in the browser. */
(function () {
  "use strict";

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // "#1d4ed8", "1d4ed8", "#14d", "rgb(29, 78, 216)", "29 78 216", "hsl(224, 76%, 48%)" → { r, g, b } or null
  function parse(text) {
    var t = String(text || "").trim().toLowerCase();
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t);
    if (m) {
      var h = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1];
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    m = /^(?:rgba?\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)?$/.exec(t);
    if (m) {
      var rgb = [m[1], m[2], m[3]].map(Number);
      if (rgb.some(function (v) { return v > 255; })) return null;
      return { r: rgb[0], g: rgb[1], b: rgb[2] };
    }
    m = /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(t);
    if (m) {
      var s = Number(m[2]);
      var l = Number(m[3]);
      if (s > 100 || l > 100) return null;
      return fromHsl(Number(m[1]), s, l);
    }
    return null;
  }

  function hex(c) {
    return "#" + [c.r, c.g, c.b].map(function (v) { return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }

  // HSL with h in degrees, s and l in percent (rounded to whole numbers for display).
  function toHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var d = max - min;
    var h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function fromHsl(h, s, l) {
    var hh = ((h % 360) + 360) % 360;
    var ss = clamp(s, 0, 100) / 100, ll = clamp(l, 0, 100) / 100;
    var c = (1 - Math.abs(2 * ll - 1)) * ss;
    var x = c * (1 - Math.abs((hh / 60) % 2 - 1));
    var m = ll - c / 2;
    var p = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return { r: Math.round((p[0] + m) * 255), g: Math.round((p[1] + m) * 255), b: Math.round((p[2] + m) * 255) };
  }

  function toHsv(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var hsl = toHsl(c);
    return { h: hsl.h, s: max ? Math.round((max - min) / max * 100) : 0, v: Math.round(max * 100) };
  }

  // Simple CMYK from RGB (screen colours). Printers use colour profiles, so real ink values differ.
  function toCmyk(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var k = 1 - Math.max(r, g, b);
    if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
    return {
      c: Math.round((1 - r - k) / (1 - k) * 100), m: Math.round((1 - g - k) / (1 - k) * 100),
      y: Math.round((1 - b - k) / (1 - k) * 100), k: Math.round(k * 100)
    };
  }

  function luminance(c) {
    var v = [c.r, c.g, c.b].map(function (x) {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100;
  }

  // Shades from dark to light: the same hue and saturation at lightness 10%, 20% … 90%.
  function shades(c) {
    var hsl = toHsl(c);
    var out = [];
    for (var l = 10; l <= 90; l += 10) out.push(hex(fromHsl(hsl.h, hsl.s, l)));
    return out;
  }

  window.ToolNestCalc = { parse: parse, hex: hex, toHsl: toHsl, fromHsl: fromHsl, toHsv: toHsv, toCmyk: toCmyk, contrast: contrast, shades: shades };

  var form = document.getElementById("cl-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var input = el("cl-input");
  var picker = el("cl-picker");
  var WHITE = { r: 255, g: 255, b: 255 }, BLACK = { r: 0, g: 0, b: 0 };

  function show(c, fromPicker) {
    var h = hex(c);
    var hsl = toHsl(c), hsv = toHsv(c), cmyk = toCmyk(c);
    if (!fromPicker) picker.value = h;
    el("cl-swatch").style.backgroundColor = h;
    el("cl-hex").textContent = h.toUpperCase();
    el("cl-rgb").textContent = "rgb(" + c.r + ", " + c.g + ", " + c.b + ")";
    el("cl-hsl").textContent = "hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)";
    el("cl-hsv").textContent = hsv.h + "°, " + hsv.s + "%, " + hsv.v + "%";
    el("cl-cmyk").textContent = cmyk.c + "%, " + cmyk.m + "%, " + cmyk.y + "%, " + cmyk.k + "%";
    var w = contrast(c, WHITE), b = contrast(c, BLACK);
    el("cl-white").textContent = w + " : 1" + (w >= 4.5 ? " · passes AA" : " · fails AA");
    el("cl-black").textContent = b + " : 1" + (b >= 4.5 ? " · passes AA" : " · fails AA");
    var box = el("cl-shades");
    box.textContent = "";
    shades(c).forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cl-shade";
      btn.style.backgroundColor = s;
      btn.title = s;
      btn.setAttribute("aria-label", "Use " + s);
      btn.addEventListener("click", function () {
        input.value = s;
        update();
      });
      box.appendChild(btn);
    });
  }

  function update() {
    var c = parse(input.value);
    input.closest(".field").classList.toggle("invalid", !c);
    input.setAttribute("aria-invalid", c ? "false" : "true");
    if (c) show(c);
  }

  input.addEventListener("input", update);
  picker.addEventListener("input", function () {
    input.value = picker.value;
    var c = parse(picker.value);
    input.closest(".field").classList.remove("invalid");
    show(c, true);
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
    btn.addEventListener("click", function () {
      var text = el(btn.getAttribute("data-copy")).textContent;
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1500);
      });
    });
  });
  update();
})();
