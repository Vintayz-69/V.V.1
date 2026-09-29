/* PDF to JPG: draws each page as a picture (JPG or PNG) at the chosen sharpness.
   Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  // Phones can't draw pictures bigger than about 16.7 million pixels, so we stay under that.
  var MAX_PIXELS = 16000000;

  /*
   * How much to enlarge a page (measured in points, 1/72 inch) to get `dpi` dots per inch,
   * shrunk if needed to stay under maxPixels. Returns { scale, width, height } in pixels.
   */
  function renderSize(widthPt, heightPt, dpi, maxPixels) {
    var scale = dpi / 72;
    var limit = maxPixels || MAX_PIXELS;
    if (widthPt * scale * heightPt * scale > limit) scale = Math.sqrt(limit / (widthPt * heightPt));
    return { scale: scale, width: Math.round(widthPt * scale), height: Math.round(heightPt * scale) };
  }

  function imageName(base, page, total, ext) {
    var digits = String(total).length;
    var n = String(page);
    while (n.length < digits) n = "0" + n;
    return base + "-page-" + n + "." + ext;
  }

  window.ToolNestCalc = { renderSize: renderSize, imageName: imageName };
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var pagesInput = document.getElementById("pick-pages");
  var pagesField = document.getElementById("field-pages");
  var ui = P.singlePdfTool({
    viewOnly: true,
    onOpen: function () {
      pagesInput.value = "";
      showError("");
    }
  });

  function choice(name) {
    var checked = document.querySelector("input[name=" + name + "]:checked");
    return checked ? checked.value : "";
  }

  function showError(text) {
    pagesField.classList.toggle("invalid", !!text);
    pagesInput.setAttribute("aria-invalid", text ? "true" : "false");
    document.getElementById("pick-error").textContent = text;
  }

  function pagesWanted(count) {
    var text = pagesInput.value.trim();
    if (!text) {
      var all = [];
      for (var p = 1; p <= count; p++) all.push(p);
      return { pages: all };
    }
    var parsed = P.parseRanges(text, count);
    return parsed.error ? { error: parsed.error } : { pages: P.rangesToPages(parsed.ranges) };
  }

  pagesInput.addEventListener("input", function () {
    var state = ui.state();
    if (state) showError(pagesWanted(state.pages).error || "");
  });

  function toBytes(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(P.userError("Your browser ran out of memory drawing this page. Try a lower quality."));
        blob.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); }, reject);
      }, type, quality);
    });
  }

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state) return;
    var wanted = pagesWanted(state.pages);
    if (wanted.error) {
      showError(wanted.error);
      pagesInput.focus();
      return;
    }
    var png = choice("format") === "png";
    var dpi = Number(choice("dpi")) || 150;
    var ext = png ? "png" : "jpg";
    var type = png ? "image/png" : "image/jpeg";
    var pages = wanted.pages;

    ui.run(runBtn, "Opening your PDF…", function () {
      return P.openForView(state.bytes).then(function (pdf) {
        var files = [];
        var canvas = document.createElement("canvas");
        return pages.reduce(function (chain, pageNo, i) {
          return chain.then(function () {
            ui.setStatus("Drawing page " + pageNo + " (" + (i + 1) + " of " + pages.length + ")…", "busy");
            return pdf.getPage(pageNo).then(function (page) {
              var base = page.getViewport({ scale: 1 });
              var size = renderSize(base.width, base.height, dpi);
              var viewport = page.getViewport({ scale: size.scale });
              canvas.width = size.width;
              canvas.height = size.height;
              var ctx = canvas.getContext("2d");
              ctx.fillStyle = "#fff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
                page.cleanup();
                return toBytes(canvas, type, 0.9);
              }).then(function (bytes) {
                files.push({
                  name: imageName(state.base, pageNo, state.pages, ext),
                  bytes: bytes, type: type, detail: canvas.width + " × " + canvas.height + " px"
                });
              });
            });
          });
        }, Promise.resolve()).then(function () {
          P.closeView(pdf);
          canvas.width = canvas.height = 0;
          var n = files.length;
          ui.showResult({
            title: n === 1 ? "Your picture is ready" : "Your " + n + " pictures are ready",
            summary: n === 1 ? "Page " + pages[0] + " of " + state.name + " as a " + ext.toUpperCase() + "." : n + " pages of " + state.name + " as " + ext.toUpperCase() + " pictures.",
            files: files,
            noun: ext.toUpperCase(),
            zipName: state.base + "-" + ext + ".zip",
            note: n > 1 ? "Download them one by one, or all together as a ZIP file." : ""
          });
        });
      });
    });
  });
})();
