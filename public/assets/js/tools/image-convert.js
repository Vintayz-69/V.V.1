/* Convert Image: saves pictures as JPG, PNG or WebP (from any type the browser can open, such
   as WebP, PNG, GIF, BMP or AVIF), keeping the same size. Runs in the browser. */

(function () {
  "use strict";

  var I = window.ToolNestImage;

  // "#fff" or "#ffffff" style colour, or the fallback.
  function safeColour(value, fallback) {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "")) ? value : fallback;
  }

  window.ToolNestCalc = { outputType: I.outputType, outName: I.outName, safeColour: safeColour };
  if (!document.getElementById("pdf-tool")) return;

  var el = function (id) { return document.getElementById(id); };
  var quality = el("cv-quality");
  var qualityOut = el("cv-quality-out");
  var background = el("cv-background");
  var runBtn = el("pdf-run");
  var items = [];

  if (!I.canSave("image/webp")) {
    var webp = el("cv-to-webp");
    webp.disabled = true;
    webp.nextElementSibling.querySelector("small").textContent = "Your browser can't save WebP";
  }

  function choice() {
    return document.querySelector("input[name=cv-to]:checked").value;
  }

  function update() {
    var to = choice();
    el("cv-quality-field").hidden = to === "png";
    el("cv-background-field").hidden = !(to === "jpg" && items.some(function (it) { return it.transparent; }));
    qualityOut.textContent = quality.value + "%";
    runBtn.textContent = "Convert to " + I.TYPES[I.outputType("", to)].name;
    runBtn.disabled = !items.length;
  }

  Array.prototype.forEach.call(document.querySelectorAll("input[name=cv-to]"), function (r) {
    r.addEventListener("change", update);
  });
  quality.addEventListener("input", update);

  I.listTool({
    onChange: function (list) {
      items = list.slice();
      update();
    },
    process: function (item) {
      var type = I.outputType(item.type, choice());
      var fill = type === "image/jpeg" ? safeColour(background.value, "#ffffff") : "";
      return I.decode(item.file).then(function (source) {
        var canvas = I.render(source, item.width, item.height, fill);
        I.release(source);
        return I.encode(canvas, type, Number(quality.value) / 100).then(function (out) {
          canvas.width = canvas.height = 0;
          return {
            name: I.outName(item.name, out.type, ""),
            bytes: out.bytes,
            type: out.type,
            detail: I.sizeText(item.width, item.height)
          };
        });
      });
    },
    result: function (files) {
      var n = files.length;
      var name = I.TYPES[files[0].type] ? I.TYPES[files[0].type].name : "pictures";
      var asked = I.outputType("", choice());
      var notes = [];
      if (n > 1) notes.push("Download them one by one, or all together as a ZIP file.");
      if (files.some(function (f) { return f.type !== asked; })) {
        notes.push("Your browser couldn't save as " + I.TYPES[asked].name + ", so it saved PNG files instead. Try Chrome, Edge or Firefox.");
      }
      return {
        title: n === 1 ? "Your " + name + " is ready" : "Your " + n + " pictures are ready",
        summary: n === 1 ? files[0].name + " · " + files[0].detail + "." : n + " pictures converted, each the same size as before.",
        note: notes.join(" "),
        zipName: "converted-pictures.zip"
      };
    }
  });

  update();
})();
