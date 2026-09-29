/* Add a watermark to a PDF: writes a faint word or phrase (like DRAFT or CONFIDENTIAL) across
   each page, over or behind what's already there. Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  var CAP_HEIGHT = 0.718; // Helvetica Bold capital letter height, as a share of the font size
  var SIZES = { small: 0.35, medium: 0.5, large: 0.7 }; // share of the page the text spans
  var COLOURS = { grey: [0.45, 0.45, 0.45], red: [0.78, 0.1, 0.1], blue: [0.1, 0.3, 0.75] };
  var OPACITY = { light: 0.15, medium: 0.3, strong: 0.5 };

  /*
   * Size and position of the watermark on a page as the reader sees it (viewWidth × viewHeight).
   * widthAt1: the text's width at font size 1. Diagonal text runs corner to corner.
   * Returns { size, angle (degrees), x, y } where (x, y) is the start of the text's baseline,
   * placed so the text is centred on the page.
   */
  function watermarkLayout(viewWidth, viewHeight, widthAt1, sizeName, diagonal) {
    var angle = diagonal ? Math.atan2(viewHeight, viewWidth) : 0;
    var span = diagonal ? Math.sqrt(viewWidth * viewWidth + viewHeight * viewHeight) : viewWidth;
    var size = Math.min((span * (SIZES[sizeName] || SIZES.medium)) / widthAt1, Math.min(viewWidth, viewHeight) * 0.3);
    var halfWidth = (widthAt1 * size) / 2;
    var halfCap = (size * CAP_HEIGHT) / 2;
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    return {
      size: size,
      angle: (angle * 180) / Math.PI,
      x: viewWidth / 2 - halfWidth * cos + halfCap * sin,
      y: viewHeight / 2 - halfWidth * sin - halfCap * cos
    };
  }

  /*
   * opts: { text, size: "small"|"medium"|"large", diagonal, colour, opacity, behind, pages }
   * pages: page numbers to mark (1-based), or null for every page. → bytes
   */
  function addWatermark(source, opts) {
    var L; // pdf-lib is loaded on demand, so it's only read once the PDF has been opened
    var text = String(opts.text || "").trim();
    if (!text) return Promise.reject(P.userError("Type the text for your watermark."));
    return P.openPdf(source).then(function (doc) {
      L = window.PDFLib;
      return doc.embedFont(L.StandardFonts.HelveticaBold).then(function (font) {
        var widthAt1;
        try {
          widthAt1 = font.widthOfTextAtSize(text, 1);
        } catch (e) {
          throw P.userError("Some characters in your watermark can't be used. Stick to letters A to Z, numbers and common symbols.");
        }
        var only = opts.pages ? new Set(opts.pages) : null;
        var colour = COLOURS[opts.colour] || COLOURS.grey;
        doc.getPages().forEach(function (page, i) {
          if (only && !only.has(i + 1)) return;
          var view = P.pageView(page);
          var spot = watermarkLayout(view.width, view.height, widthAt1, opts.size, opts.diagonal);
          var pt = view.toPdf(spot.x, spot.y);
          page.drawText(text, {
            x: pt.x, y: pt.y, size: spot.size, font: font,
            color: L.rgb(colour[0], colour[1], colour[2]),
            opacity: OPACITY[opts.opacity] || OPACITY.medium,
            rotate: L.degrees(view.rotation + spot.angle)
          });
          if (opts.behind) sendToBack(page);
        });
        P.touch(doc);
        return P.saveDoc(doc);
      });
    });

    // Moves what we just drew to the start of the page, so the page's own content covers it.
    function sendToBack(page) {
      var contents = page.node.Contents();
      var ref = page.contentStreamRef;
      if (!(contents instanceof L.PDFArray) || !ref) return;
      var at = contents.indexOf(ref);
      if (at === undefined || at <= 0) return;
      contents.remove(at);
      contents.insert(0, ref);
    }
  }

  window.ToolNestCalc = { watermarkLayout: watermarkLayout, addWatermark: addWatermark };
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var textInput = document.getElementById("wm-text");
  var pagesInput = document.getElementById("pick-pages");
  var ui = P.singlePdfTool({ onOpen: check });

  function choice(name) {
    var checked = document.querySelector("input[name=" + name + "]:checked");
    return checked ? checked.value : "";
  }

  function setError(input, text) {
    var field = input.closest(".field");
    field.classList.toggle("invalid", !!text);
    input.setAttribute("aria-invalid", text ? "true" : "false");
    field.querySelector(".error-msg").textContent = text;
  }

  function pagesWanted() {
    var state = ui.state();
    var text = pagesInput.value.trim();
    if (!state || !text) return { pages: null };
    var parsed = P.parseRanges(text, state.pages);
    return parsed.error ? parsed : { pages: P.rangesToPages(parsed.ranges) };
  }

  function check() {
    var textOk = textInput.value.trim() !== "";
    setError(textInput, textOk ? "" : "Type the text for your watermark.");
    var wanted = pagesWanted();
    setError(pagesInput, wanted.error || "");
    runBtn.disabled = !ui.state() || !textOk || !!wanted.error;
  }

  textInput.addEventListener("input", check);
  pagesInput.addEventListener("input", check);

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    var wanted = pagesWanted();
    if (!state || wanted.error) return;
    var opts = {
      text: textInput.value,
      size: document.getElementById("wm-size").value,
      diagonal: choice("wm-angle") !== "flat",
      colour: document.getElementById("wm-colour").value,
      opacity: document.getElementById("wm-opacity").value,
      behind: choice("wm-layer") === "behind",
      pages: wanted.pages
    };
    ui.run(runBtn, "Adding your watermark…", function () {
      return addWatermark(state.bytes, opts).then(function (bytes) {
        var marked = wanted.pages ? wanted.pages.length : state.pages;
        ui.showResult({
          title: "Your watermarked PDF is ready",
          summary: "“" + opts.text.trim() + "” added to " + (marked === state.pages ? "every page" : P.pagesWord(marked)) + ".",
          files: [{ name: state.base + "-watermarked.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(state.pages) }],
          note: opts.behind ? "Behind the page: if a page is a scan or a full-page picture, the watermark may be hidden. If so, choose “Over the page”." : ""
        });
      });
    });
  });
})();
