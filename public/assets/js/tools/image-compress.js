/* Compress Image: makes JPG, PNG and WebP pictures smaller by saving them as JPG or WebP at a
   lower quality, at a chosen quality or to fit under a target file size, and optionally smaller
   in pixels too. Runs in the browser. */

(function () {
  "use strict";

  var I = window.ToolNestImage;
  var P = window.ToolNestPDF;

  var KB = 1024; // 1 KB = 1,024 bytes, as Windows counts

  // Longest side no bigger than `max` pixels (0 = keep the full size). Never enlarges.
  function limitSize(w, h, max) {
    if (!max || (w <= max && h <= max)) return { width: w, height: h };
    return I.fitSize(w, h, { mode: "pixels", width: max, height: max, keepRatio: true });
  }

  window.ToolNestCalc = { limitSize: limitSize, percentSaved: I.percentSaved, searchQuality: I.searchQuality, KB: KB };
  if (!document.getElementById("pdf-tool")) return;

  var el = function (id) { return document.getElementById(id); };
  var quality = el("cp-quality");
  var qualityOut = el("cp-quality-out");
  var target = el("cp-target");
  var format = el("cp-format");
  var maxSide = el("cp-max");
  var runBtn = el("pdf-run");
  var items = [];

  if (!I.canSave("image/webp")) {
    var webp = format.querySelector("option[value=webp]");
    webp.disabled = true;
    webp.textContent = "WebP (your browser can't save WebP)";
  }

  function mode() {
    return document.querySelector("input[name=cp-mode]:checked").value;
  }

  function targetBytes() {
    var raw = String(target.value).replace(/[,\s]/g, "");
    var n = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
    var ok = n >= 5 && n <= 100000;
    target.closest(".field").classList.toggle("invalid", !ok && mode() === "target");
    target.setAttribute("aria-invalid", ok || mode() !== "target" ? "false" : "true");
    return ok ? Math.floor(n * KB) : null;
  }

  function update() {
    var t = mode() === "target";
    el("cp-quality-field").hidden = t;
    el("cp-target-field").hidden = !t;
    qualityOut.textContent = quality.value + "%";
    runBtn.disabled = !items.length || (t && !targetBytes());
    var transparent = items.some(function (it) { return it.transparent; });
    el("cp-transparent").hidden = !(transparent && format.value === "jpg");
  }

  Array.prototype.forEach.call(document.querySelectorAll("input[name=cp-mode]"), function (r) {
    r.addEventListener("change", update);
  });
  [quality, target, format, maxSide].forEach(function (x) {
    x.addEventListener("input", update);
    x.addEventListener("change", update);
  });

  I.listTool({
    onChange: function (list) {
      items = list.slice();
      update();
    },
    process: function (item) {
      var type = format.value === "webp" ? "image/webp" : "image/jpeg";
      var background = type === "image/jpeg" ? "#ffffff" : "";
      var full = limitSize(item.width, item.height, Number(maxSide.value));
      return I.decode(item.file).then(function (source) {
        var canvases = {};
        function canvasAt(scale) {
          if (!canvases[scale]) {
            var w = Math.max(1, Math.round(full.width * scale));
            var h = Math.max(1, Math.round(full.height * scale));
            canvases[scale] = I.render(source, w, h, background);
          }
          return canvases[scale];
        }
        var job;
        if (mode() === "target") {
          var goal = targetBytes();
          job = I.searchQuality(function (q, scale) {
            return I.encode(canvasAt(scale), type, q).then(function (out) { return out.bytes.length; });
          }, goal).then(function (found) {
            var c = canvasAt(found.scale);
            return I.encode(c, type, found.quality).then(function (out) {
              out.met = found.met;
              out.width = c.width;
              out.height = c.height;
              return out;
            });
          });
        } else {
          var c1 = canvasAt(1);
          job = I.encode(c1, type, Number(quality.value) / 100).then(function (out) {
            out.width = c1.width;
            out.height = c1.height;
            return out;
          });
        }
        return job.then(function (out) {
          Object.keys(canvases).forEach(function (k) { canvases[k].width = canvases[k].height = 0; });
          I.release(source);
          var w = out.width;
          var h = out.height;
          var saved = I.percentSaved(item.size, out.bytes.length);
          return {
            name: I.outName(item.name, out.type, "-compressed"),
            bytes: out.bytes,
            type: out.type,
            before: item.size,
            met: out.met !== false,
            detail: I.sizeText(w, h) + " · was " + P.formatBytes(item.size) + (saved > 0 ? ", " + saved + "% smaller" : ", not smaller")
          };
        });
      });
    },
    result: function (files) {
      var n = files.length;
      var before = files.reduce(function (s, f) { return s + f.before; }, 0);
      var after = files.reduce(function (s, f) { return s + f.bytes.length; }, 0);
      var saved = I.percentSaved(before, after);
      var notes = [];
      if (n > 1) notes.push("Download them one by one, or all together as a ZIP file.");
      if (files.some(function (f) { return f.bytes.length >= f.before; })) {
        notes.push("Some pictures were already well compressed, so the new file isn't smaller. Keep the original of those.");
      }
      if (files.some(function (f) { return !f.met; })) {
        notes.push("We couldn't reach your target size even at the lowest quality and a smaller size. Try a bigger target, or a smaller longest side.");
      }
      return {
        title: n === 1 ? "Your picture is compressed" : "Your " + n + " pictures are compressed",
        summary: P.formatBytes(before) + " → " + P.formatBytes(after) + (saved > 0 ? " (" + saved + "% smaller)." : " (not smaller)."),
        note: notes.join(" "),
        zipName: "compressed-pictures.zip"
      };
    }
  });

  update();
})();
