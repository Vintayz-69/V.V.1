/* Resize Image: makes pictures a new size in pixels or by a percentage, keeping their shape if
   asked, and saves them as JPG, PNG or WebP. Runs in the browser. */

(function () {
  "use strict";

  var I = window.ToolNestImage;
  var P = window.ToolNestPDF;

  window.ToolNestCalc = { fitSize: I.fitSize, downscaleSteps: I.downscaleSteps, outputType: I.outputType, outName: I.outName };
  if (!document.getElementById("pdf-tool")) return;

  var el = function (id) { return document.getElementById(id); };
  var widthIn = el("rs-width");
  var heightIn = el("rs-height");
  var keep = el("rs-keep");
  var percentIn = el("rs-percent");
  var format = el("rs-format");
  var quality = el("rs-quality");
  var qualityOut = el("rs-quality-out");
  var preview = el("rs-preview");
  var runBtn = el("pdf-run");
  var items = [];

  if (!I.canSave("image/webp")) {
    var webp = format.querySelector("option[value=webp]");
    webp.disabled = true;
    webp.textContent = "WebP (your browser can't save WebP)";
  }

  function mode() {
    return document.querySelector("input[name=rs-mode]:checked").value;
  }

  function readInt(input) {
    var raw = String(input.value).replace(/[,\s]/g, "");
    if (raw === "") return 0;
    return /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
  }

  function mark(input, ok) {
    var field = input.closest(".field");
    field.classList.toggle("invalid", !ok);
    input.setAttribute("aria-invalid", ok ? "false" : "true");
  }

  // The settings, or null (with the problem fields marked) if they can't be used.
  function settings() {
    var m = mode();
    if (m === "percent") {
      var p = readInt(percentIn);
      var okP = p >= 1 && p <= 1000;
      mark(percentIn, okP);
      mark(widthIn, true);
      mark(heightIn, true);
      return okP ? { mode: "percent", percent: p } : null;
    }
    var w = readInt(widthIn);
    var h = readInt(heightIn);
    var okW = w === 0 || (w >= 1 && w <= 20000);
    var okH = h === 0 || (h >= 1 && h <= 20000);
    var some = w > 0 || h > 0;
    mark(widthIn, okW && (some || !okH));
    mark(heightIn, okH && (some || !okW));
    mark(percentIn, true);
    if (!okW || !okH || !some) return null;
    return { mode: "pixels", width: Math.round(w), height: Math.round(h), keepRatio: keep.checked };
  }

  function showMode() {
    var pct = mode() === "percent";
    el("rs-pixels").hidden = pct;
    el("rs-percent-field").hidden = !pct;
    update();
  }

  function showQuality() {
    var t = format.value;
    el("rs-quality-field").hidden = t === "png" || (t === "same" && items.length && items.every(function (it) {
      return I.outputType(it.type, "same") === "image/png";
    }));
    qualityOut.textContent = quality.value + "%";
  }

  function update() {
    showQuality();
    var s = settings();
    runBtn.disabled = !items.length || !s;
    if (!items.length) return;
    if (!s) {
      preview.textContent = "Type a width, a height, or both.";
      return;
    }
    if (items.length === 1) {
      var size = I.fitSize(items[0].width, items[0].height, s);
      preview.textContent = "New size: " + I.sizeText(size.width, size.height) + " (was " + I.sizeText(items[0].width, items[0].height) + ")";
    } else if (s.mode === "percent") {
      preview.textContent = "Each picture becomes " + s.percent + "% of its own size.";
    } else if (s.keepRatio && s.width && s.height) {
      preview.textContent = "Each picture is made as big as fits inside " + I.sizeText(s.width, s.height) + ", keeping its shape.";
    } else {
      preview.textContent = "Each picture becomes " + (s.width ? s.width + " px wide" : "") + (s.width && s.height ? " and " : "") + (s.height ? s.height + " px high" : "") + (s.keepRatio ? ", keeping its shape." : ".");
    }
  }

  // With one picture and "keep the shape" on, typing one side fills in the other.
  function linked(changed) {
    if (items.length !== 1 || !keep.checked) return;
    var it = items[0];
    var v = readInt(changed);
    if (!(v > 0)) return;
    if (changed === widthIn) heightIn.value = Math.max(1, Math.round(v * it.height / it.width));
    else widthIn.value = Math.max(1, Math.round(v * it.width / it.height));
  }

  widthIn.addEventListener("input", function () { linked(widthIn); update(); });
  heightIn.addEventListener("input", function () { linked(heightIn); update(); });
  keep.addEventListener("change", function () { linked(widthIn); update(); });
  percentIn.addEventListener("input", update);
  format.addEventListener("change", update);
  quality.addEventListener("input", update);
  Array.prototype.forEach.call(document.querySelectorAll("input[name=rs-mode]"), function (r) {
    r.addEventListener("change", showMode);
  });

  I.listTool({
    onChange: function (list) {
      var grew = list.length > items.length;
      items = list.slice();
      // One picture: start from its own size, so changing one side shows the other.
      if (items.length === 1 && grew) {
        widthIn.value = items[0].width;
        heightIn.value = items[0].height;
      } else if (items.length > 1 && grew && readInt(widthIn) === items[0].width && readInt(heightIn) === items[0].height) {
        heightIn.value = "";
      }
      update();
    },
    process: function (item) {
      var s = settings();
      var size = I.fitSize(item.width, item.height, s);
      var type = I.outputType(item.type, format.value);
      return I.decode(item.file).then(function (source) {
        var canvas = I.render(source, size.width, size.height, type === "image/jpeg" ? "#ffffff" : "");
        I.release(source);
        return I.encode(canvas, type, Number(quality.value) / 100).then(function (out) {
          canvas.width = canvas.height = 0;
          return {
            name: I.outName(item.name, out.type, "-" + size.width + "x" + size.height),
            bytes: out.bytes,
            type: out.type,
            detail: I.sizeText(item.width, item.height).replace(" px", "") + " → " + I.sizeText(size.width, size.height)
          };
        });
      });
    },
    result: function (files) {
      var n = files.length;
      var transparentToJpg = items.some(function (it) { return it.transparent && I.outputType(it.type, format.value) === "image/jpeg"; });
      return {
        title: n === 1 ? "Your picture is resized" : "Your " + n + " pictures are resized",
        summary: n === 1 ? files[0].detail + "." : n + " pictures, each saved as a new file.",
        note: (n > 1 ? "Download them one by one, or all together as a ZIP file. " : "") +
          (transparentToJpg ? "JPG can't be see-through, so transparent areas are now white. Choose PNG or WebP to keep them." : ""),
        zipName: "resized-pictures.zip"
      };
    }
  });

  showMode();
})();
