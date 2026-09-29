/* Add page numbers to a PDF: writes "1", "Page 1", "Page 1 of 10" or "1 / 10" on each page, in the
   corner or edge the visitor picks. Turned (rotated) pages are handled so the number is upright.
   Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  var MARGIN = 30; // points from the edge of the page (about 10.6 mm)
  var CAP_HEIGHT = 0.718; // Helvetica capital letter height, as a share of the font size

  function numberText(format, n, total) {
    if (format === "page") return "Page " + n;
    if (format === "page-of") return "Page " + n + " of " + total;
    if (format === "slash") return n + " / " + total;
    return String(n);
  }

  /*
   * Where the text starts (bottom-left of its baseline), measured on the page as the reader sees
   * it. position: "bottom-center" | "bottom-left" | "bottom-right" | "top-center" | "top-left" | "top-right"
   */
  function numberPosition(viewWidth, viewHeight, textWidth, size, position) {
    var parts = position.split("-");
    var x = parts[1] === "left" ? MARGIN : parts[1] === "right" ? viewWidth - MARGIN - textWidth : (viewWidth - textWidth) / 2;
    var y = parts[0] === "top" ? viewHeight - MARGIN - size * CAP_HEIGHT : MARGIN;
    return { x: x, y: y };
  }

  /*
   * opts: { position, format, start (first number), skipFirst (don't number page 1), size }
   * → bytes
   */
  function addPageNumbers(source, opts) {
    return P.openPdf(source).then(function (doc) {
      var L = window.PDFLib; // loaded on demand by openPdf
      return doc.embedFont(L.StandardFonts.Helvetica).then(function (font) {
        var pages = doc.getPages();
        var first = opts.skipFirst ? 1 : 0;
        var total = opts.start + (pages.length - first) - 1;
        pages.forEach(function (page, i) {
          if (i < first) return;
          var text = numberText(opts.format, opts.start + i - first, total);
          var width = font.widthOfTextAtSize(text, opts.size);
          var view = P.pageView(page);
          var at = numberPosition(view.width, view.height, width, opts.size, opts.position);
          var pt = view.toPdf(at.x, at.y);
          page.drawText(text, {
            x: pt.x, y: pt.y, size: opts.size, font: font,
            color: L.rgb(0.1, 0.1, 0.1), rotate: L.degrees(view.rotation)
          });
        });
        P.touch(doc);
        return P.saveDoc(doc);
      });
    });
  }

  window.ToolNestCalc = { numberText: numberText, numberPosition: numberPosition, addPageNumbers: addPageNumbers, MARGIN: MARGIN };
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var startInput = document.getElementById("num-start");
  var preview = document.getElementById("num-preview");
  var ui = P.singlePdfTool({ onOpen: update });

  function options() {
    return {
      position: document.getElementById("num-position").value,
      format: document.getElementById("num-format").value,
      start: Number(startInput.value),
      skipFirst: document.getElementById("num-skip").checked,
      size: Number(document.getElementById("num-size").value)
    };
  }

  function update() {
    var state = ui.state();
    var o = options();
    var ok = /^\d{1,5}$/.test(startInput.value.trim()) && o.start >= 1;
    startInput.closest(".field").classList.toggle("invalid", !ok);
    startInput.setAttribute("aria-invalid", ok ? "false" : "true");
    runBtn.disabled = !ok || !state || (o.skipFirst && state.pages < 2);
    if (!state || !ok) {
      preview.textContent = "";
      return;
    }
    var numbered = state.pages - (o.skipFirst ? 1 : 0);
    var total = o.start + numbered - 1;
    preview.textContent = numbered < 1
      ? "This PDF has only 1 page, so there's nothing left to number."
      : "Page " + (o.skipFirst ? 2 : 1) + " will show “" + numberText(o.format, o.start, total) + "” and the last page “" + numberText(o.format, total, total) + "”.";
  }

  ["num-position", "num-format", "num-start", "num-skip", "num-size"].forEach(function (id) {
    var input = document.getElementById(id);
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  });

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state) return;
    var o = options();
    ui.run(runBtn, "Adding page numbers…", function () {
      return addPageNumbers(state.bytes, o).then(function (bytes) {
        ui.showResult({
          title: "Your numbered PDF is ready",
          summary: preview.textContent,
          files: [{ name: state.base + "-numbered.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(state.pages) }]
        });
      });
    });
  });
})();
