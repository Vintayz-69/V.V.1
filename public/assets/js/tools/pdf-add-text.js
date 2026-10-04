/* Add text to a PDF: type text in boxes, style each one (font, size, bold, italic, underline,
   colour, alignment), place them on any pages, and save a new PDF. The text is written with the
   PDF's built-in fonts, so it stays sharp and can be selected. Everything happens in the browser:
   the PDF and the text are never uploaded or stored. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  var LINE_GAP = 1.2; // distance between lines, as a multiple of the text size
  var UNDERLINE_DROP = 0.1; // the fonts' own underline position and thickness, as a share of the size
  var UNDERLINE_THICKNESS = 0.05;
  var MIN_SIZE = 4;
  var MAX_SIZE = 200;

  // The PDF's standard fonts: plain, bold, italic, bold italic.
  var FONTS = {
    sans: ["Helvetica", "HelveticaBold", "HelveticaOblique", "HelveticaBoldOblique"],
    serif: ["TimesRoman", "TimesRomanBold", "TimesRomanItalic", "TimesRomanBoldItalic"],
    mono: ["Courier", "CourierBold", "CourierOblique", "CourierBoldOblique"]
  };

  function fontName(font, bold, italic) {
    return (FONTS[font] || FONTS.sans)[(bold ? 1 : 0) + (italic ? 2 : 0)];
  }

  // "Line one\r\n\tLine two  \n\n" → ["Line one", "    Line two"]: tabs become spaces, spaces at
  // the end of a line and empty lines at the start and end are dropped.
  function splitLines(text) {
    var lines = String(text || "").replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n").map(function (l) {
      return l.replace(/\s+$/, "");
    });
    while (lines.length && !lines[0]) lines.shift();
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines;
  }

  // "#1a3fa6" → [0.102, 0.247, 0.651]. Anything else is black.
  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return [0, 0, 0];
    var n = parseInt(m[1], 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /*
   * Where each line of a text box goes on a page as the reader sees it (viewWidth × viewHeight
   * points). spec:
   *   x, y: the box's top-left corner, as a share of the page's width and height from the top-left
   *   size: text size in points
   *   align: "left", "center" or "right" (lines line up inside the box)
   *   widths: each line's width at size 1
   *   ascent, descent: how far the font reaches above and below the line, at size 1
   * The box is as wide as the longest line, and is kept inside the page when it fits.
   * Returns { left, top, width, height, fits, lines: [{ x, y, width }] }, where each line's (x, y)
   * is the start of its baseline measured from the page's bottom-left.
   */
  function textLayout(viewWidth, viewHeight, spec) {
    var size = spec.size;
    var widths = spec.widths.map(function (w) { return w * size; });
    var width = Math.max.apply(null, [0].concat(widths));
    var lineHeight = size * LINE_GAP;
    var height = (spec.ascent + spec.descent) * size + (widths.length - 1) * lineHeight;
    var left = Math.min(Math.max(spec.x * viewWidth, 0), Math.max(viewWidth - width, 0));
    var top = Math.min(Math.max(spec.y * viewHeight, 0), Math.max(viewHeight - height, 0));
    return {
      left: left,
      top: top,
      width: width,
      height: height,
      fits: width <= viewWidth && height <= viewHeight,
      lines: widths.map(function (w, i) {
        var shift = spec.align === "center" ? (width - w) / 2 : spec.align === "right" ? width - w : 0;
        return { x: left + shift, y: viewHeight - top - spec.ascent * size - i * lineHeight, width: w };
      })
    };
  }

  // Measures a box's lines with a pdf-lib font (an embedded PDFFont or a StandardFontEmbedder).
  // Throws if a character can't be written with the PDF's built-in fonts.
  function measure(font, lines) {
    var ascent = font.heightAtSize ? font.heightAtSize(1, { descender: false }) : font.heightOfFontAtSize(1, { descender: false });
    var full = font.heightAtSize ? font.heightAtSize(1) : font.heightOfFontAtSize(1);
    return {
      widths: lines.map(function (l) { return font.widthOfTextAtSize(l, 1); }),
      ascent: ascent,
      descent: full - ascent
    };
  }

  // The characters in some text that the PDF's built-in fonts can't write, each listed once.
  function unusableCharacters(text, L) {
    var check = L.StandardFontEmbedder.for(L.StandardFonts.Helvetica);
    var bad = [];
    Array.from(String(text || "").replace(/[\r\n\t]/g, "")).forEach(function (ch) {
      if (bad.indexOf(ch) >= 0) return;
      try {
        check.widthOfTextAtSize(ch, 1);
      } catch (e) {
        bad.push(ch);
      }
    });
    return bad;
  }

  function badCharactersMessage(bad) {
    return "These characters can't be used: " + bad.join(" ") + ". Use letters A to Z (accents are fine), numbers and common symbols.";
  }

  /*
   * boxes: [{ page (1-based), text, x, y, size, font: "sans"|"serif"|"mono", bold, italic,
   *           underline, colour: "#rrggbb", align }]
   * Boxes with no text are skipped. → bytes
   */
  function addText(source, boxes) {
    var L;
    var used = (boxes || []).filter(function (b) { return splitLines(b.text).length; });
    if (!used.length) return Promise.reject(P.userError("Type some text first."));
    return P.openPdf(source).then(function (doc) {
      L = window.PDFLib;
      var count = doc.getPageCount();
      used.forEach(function (b) {
        if (!(b.page >= 1 && b.page <= count)) throw P.userError("Choose a page from 1 to " + count + ".");
        if (!(b.size >= MIN_SIZE && b.size <= MAX_SIZE)) throw P.userError("Choose a text size from " + MIN_SIZE + " to " + MAX_SIZE + ".");
        var bad = unusableCharacters(b.text, L);
        if (bad.length) throw P.userError(badCharactersMessage(bad));
      });
      var names = [];
      used.forEach(function (b) {
        var name = fontName(b.font, b.bold, b.italic);
        if (names.indexOf(name) < 0) names.push(name);
      });
      return Promise.all(names.map(function (n) { return doc.embedFont(L.StandardFonts[n]); })).then(function (fonts) {
        used.forEach(function (b) {
          var font = fonts[names.indexOf(fontName(b.font, b.bold, b.italic))];
          var lines = splitLines(b.text);
          var page = doc.getPage(b.page - 1);
          var view = P.pageView(page);
          var rgb = hexToRgb(b.colour);
          var colour = L.rgb(rgb[0], rgb[1], rgb[2]);
          var spot = textLayout(view.width, view.height, Object.assign({ x: b.x, y: b.y, size: b.size, align: b.align }, measure(font, lines)));
          spot.lines.forEach(function (line, i) {
            if (!lines[i]) return;
            var start = view.toPdf(line.x, line.y);
            page.drawText(lines[i], { x: start.x, y: start.y, size: b.size, font: font, color: colour, rotate: L.degrees(view.rotation) });
            if (b.underline) {
              var under = line.y - b.size * UNDERLINE_DROP;
              page.drawLine({
                start: view.toPdf(line.x, under),
                end: view.toPdf(line.x + line.width, under),
                thickness: b.size * UNDERLINE_THICKNESS,
                color: colour
              });
            }
          });
        });
        P.touch(doc);
        return P.saveDoc(doc);
      });
    });
  }

  window.ToolNestCalc = {
    fontName: fontName, splitLines: splitLines, hexToRgb: hexToRgb, textLayout: textLayout,
    measure: measure, unusableCharacters: unusableCharacters, addText: addText
  };
  if (!document.getElementById("pdf-tool")) return;

  // ---------------------------------------------------------------- Page

  var el = function (id) { return document.getElementById(id); };
  var runBtn = el("pdf-run");
  var pageInput = el("tt-page");
  var stage = el("tt-stage");
  var pageCanvas = el("tt-page-canvas");
  var overlay = el("tt-overlay");
  var markers = el("tt-markers");
  var textInput = el("tt-text");
  var fontInput = el("tt-font");
  var sizeInput = el("tt-size");
  var colourInput = el("tt-colour");
  var swatches = Array.prototype.slice.call(document.querySelectorAll(".tt-swatch"));

  var PLACEHOLDER = "Type your text";
  var CSS_FONTS = {
    sans: "Helvetica, Arial, \"Liberation Sans\", sans-serif",
    serif: "\"Times New Roman\", Times, \"Liberation Serif\", serif",
    mono: "\"Courier New\", Courier, \"Liberation Mono\", monospace"
  };

  var view = null; // the PDF opened with pdf.js, for the page preview
  var sizes = []; // each page's size as the reader sees it, in points
  var boxes = [];
  var selected = null;
  var nextId = 1;
  var shownPage = 0; // the page drawn on the canvas right now
  var ui = P.singlePdfTool({ onOpen: opened, onReset: closed });

  function lib() { return window.PDFLib; }

  // ---- Boxes

  function newBox(page, x, y) {
    var from = selected || { size: 14, font: "sans", bold: false, italic: false, underline: false, colour: "#000000", align: "left" };
    var box = {
      id: nextId++, page: page, x: x, y: y, text: "",
      size: from.size, font: from.font, bold: from.bold, italic: from.italic, underline: from.underline, colour: from.colour, align: from.align
    };
    boxes.push(box);
    select(box);
    return box;
  }

  function select(box) {
    // Empty boxes that aren't being worked on are just clutter.
    boxes = boxes.filter(function (b) { return b === box || splitLines(b.text).length; });
    selected = box;
    fillForm();
    refresh();
  }

  // The box's lines, sizes and position on its page, using the same maths as the PDF.
  function layoutOf(box) {
    var lines = splitLines(box.text);
    var shown = lines.length ? lines : [PLACEHOLDER];
    var font = lib().StandardFontEmbedder.for(lib().StandardFonts[fontName(box.font, box.bold, box.italic)]);
    var m;
    try {
      m = measure(font, shown);
    } catch (e) {
      // Characters the PDF can't write are measured as "?" so the preview still works.
      shown = shown.map(function (l) { return Array.from(l).map(function (ch) { try { font.widthOfTextAtSize(ch, 1); return ch; } catch (x) { return "?"; } }).join(""); });
      m = measure(font, shown);
    }
    var size = sizes[box.page - 1];
    var lay = textLayout(size.width, size.height, Object.assign({ x: box.x, y: box.y, size: validSize(box.size) || 14, align: box.align }, m));
    lay.text = shown;
    lay.empty = !lines.length;
    return lay;
  }

  function validSize(n) {
    return n >= MIN_SIZE && n <= MAX_SIZE ? n : 0;
  }

  // ---- Form ↔ selected box

  function fillForm() {
    var b = selected;
    textInput.value = b.text;
    fontInput.value = b.font;
    sizeInput.value = String(b.size);
    el("tt-bold").checked = b.bold;
    el("tt-italic").checked = b.italic;
    el("tt-underline").checked = b.underline;
    var align = el("tt-align-" + b.align);
    if (align) align.checked = true;
    colourInput.value = b.colour;
    markSwatch();
  }

  function markSwatch() {
    swatches.forEach(function (s) {
      s.setAttribute("aria-pressed", s.dataset.colour === selected.colour ? "true" : "false");
    });
  }

  textInput.addEventListener("input", function () { selected.text = textInput.value; refresh(); });
  fontInput.addEventListener("change", function () { selected.font = fontInput.value; refresh(); });
  sizeInput.addEventListener("input", function () { selected.size = Number(sizeInput.value); refresh(); });
  ["bold", "italic", "underline"].forEach(function (k) {
    el("tt-" + k).addEventListener("change", function () { selected[k] = el("tt-" + k).checked; refresh(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("input[name=tt-align]"), function (r) {
    r.addEventListener("change", function () { if (r.checked) { selected.align = r.value; refresh(); } });
  });
  colourInput.addEventListener("input", function () { selected.colour = colourInput.value.toLowerCase(); markSwatch(); refresh(); });
  swatches.forEach(function (s) {
    s.addEventListener("click", function () {
      selected.colour = s.dataset.colour;
      colourInput.value = s.dataset.colour;
      markSwatch();
      refresh();
    });
  });

  el("tt-add").addEventListener("click", function () {
    var n = currentPage() || 1;
    newBox(n, 0.1, freeSpot(n));
    textInput.focus();
  });

  el("tt-delete").addEventListener("click", function () {
    var gone = selected;
    boxes = boxes.filter(function (b) { return b !== gone; });
    var n = currentPage() || 1;
    var onPage = boxes.filter(function (b) { return b.page === n; });
    var next = onPage[onPage.length - 1] || boxes[boxes.length - 1];
    selected = null;
    if (next) select(next);
    else newBox(n, 0.1, 0.1);
    if (selected.page !== n) goTo(selected.page);
  });

  // A new box goes under the lowest box already on the page.
  function freeSpot(page) {
    var size = sizes[page - 1];
    var y = 0.1;
    boxes.forEach(function (b) {
      if (b.page !== page || !splitLines(b.text).length) return;
      var lay = layoutOf(b);
      y = Math.max(y, (lay.top + lay.height) / size.height + 0.03);
    });
    return Math.min(y, 0.9);
  }

  // ---- Page preview

  function opened(state) {
    pageInput.max = state.pages;
    pageInput.value = "1";
    el("tt-page-count").textContent = "of " + state.pages;
    boxes = [];
    selected = null;
    return P.openPdf(state.bytes).then(function (doc) {
      sizes = doc.getPages().map(function (p) {
        var v = P.pageView(p);
        return { width: v.width, height: v.height };
      });
      newBox(1, 0.1, 0.1);
      return P.openForView(state.bytes).then(function (pdf) {
        view = pdf;
        return showPage();
      }, function () {
        stage.classList.add("no-preview");
      });
    });
  }

  function closed() {
    if (view) P.closeView(view);
    view = null;
    sizes = [];
    boxes = [];
    selected = null;
    shownPage = 0;
    markers.textContent = "";
  }

  function currentPage() {
    var state = ui.state();
    var n = Math.round(Number(pageInput.value));
    return state && n >= 1 && n <= state.pages ? n : null;
  }

  function showPage() {
    var n = currentPage();
    if (!view || !n) return Promise.resolve();
    return P.drawPage(view, n, pageCanvas, Math.min(stage.clientWidth || 360, 560), 4000000).then(function () {
      shownPage = n;
      stage.classList.remove("no-preview");
      drawBoxes();
    });
  }

  function goTo(n) {
    pageInput.value = String(n);
    refresh();
    showPage();
  }

  // Draws the text of every box on the shown page, and a box around each one to tap or drag.
  function drawBoxes() {
    markers.textContent = "";
    var n = shownPage;
    if (!n || !pageCanvas.width || n !== currentPage()) {
      overlay.width = 1;
      overlay.height = 1;
      return;
    }
    overlay.width = pageCanvas.width;
    overlay.height = pageCanvas.height;
    var size = sizes[n - 1];
    var scale = overlay.width / size.width;
    var ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    boxes.forEach(function (b) {
      if (b.page !== n) return;
      var lay = layoutOf(b);
      var px = (validSize(b.size) || 14) * scale;
      ctx.font = (b.italic ? "italic " : "") + (b.bold ? "bold " : "") + px + "px " + CSS_FONTS[b.font];
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = lay.empty ? "#94a3b8" : b.colour;
      ctx.strokeStyle = ctx.fillStyle;
      lay.lines.forEach(function (line, i) {
        var x = line.x * scale;
        var y = (size.height - line.y) * scale;
        ctx.fillText(lay.text[i], x, y);
        if (b.underline && !lay.empty && line.width) {
          ctx.lineWidth = Math.max(1, px * UNDERLINE_THICKNESS);
          var uy = y + px * UNDERLINE_DROP;
          ctx.beginPath();
          ctx.moveTo(x, uy);
          ctx.lineTo(x + line.width * scale, uy);
          ctx.stroke();
        }
      });

      var m = document.createElement("div");
      m.className = "tt-marker" + (b === selected ? " is-selected" : "");
      m.tabIndex = 0;
      m.setAttribute("role", "button");
      m.setAttribute("aria-label", "Text box: " + (lay.empty ? "empty" : splitLines(b.text).join(" ")) + ". Arrow keys move it, Enter edits it.");
      m.dataset.id = b.id;
      m.style.left = (lay.left / size.width) * 100 + "%";
      m.style.top = (lay.top / size.height) * 100 + "%";
      m.style.width = (lay.width / size.width) * 100 + "%";
      m.style.height = (lay.height / size.height) * 100 + "%";
      markers.appendChild(m);
    });
  }

  function boxById(id) {
    for (var i = 0; i < boxes.length; i++) if (boxes[i].id === Number(id)) return boxes[i];
    return null;
  }

  // Tap a box to choose it and drag it; tap anywhere else to move the chosen box there.
  var drag = null;
  stage.addEventListener("pointerdown", function (e) {
    if (!shownPage || !pageCanvas.width) return;
    var r = pageCanvas.getBoundingClientRect();
    if (!r.width) return;
    var px = (e.clientX - r.left) / r.width;
    var py = (e.clientY - r.top) / r.height;
    var hit = e.target.closest && e.target.closest(".tt-marker");
    var box = hit ? boxById(hit.dataset.id) : selected;
    if (!box) return;
    if (box !== selected) select(box);
    if (box.page !== shownPage) box.page = shownPage;
    var lay = layoutOf(box);
    var size = sizes[shownPage - 1];
    // Dragging a box keeps the same point under your finger; tapping the page puts its corner there.
    drag = hit ? { dx: px - lay.left / size.width, dy: py - lay.top / size.height } : { dx: 0, dy: 0 };
    stage.setPointerCapture(e.pointerId);
    moveTo(px, py);
    var again = markers.querySelector(".tt-marker.is-selected");
    if (again && hit) again.focus({ preventScroll: true });
  });
  stage.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var r = pageCanvas.getBoundingClientRect();
    moveTo((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  ["pointerup", "pointercancel"].forEach(function (t) { stage.addEventListener(t, function () { drag = null; }); });

  // Stores the position the box is actually drawn at, so it never sits off the page.
  function moveTo(px, py) {
    selected.x = Math.min(1, Math.max(0, px - drag.dx));
    selected.y = Math.min(1, Math.max(0, py - drag.dy));
    settle(selected);
    refresh();
  }

  function settle(box) {
    var lay = layoutOf(box);
    var size = sizes[box.page - 1];
    box.x = lay.left / size.width;
    box.y = lay.top / size.height;
  }

  // Keyboard: the arrow keys move the chosen box 1% at a time (10% with Shift); Enter edits it.
  markers.addEventListener("keydown", function (e) {
    var hit = e.target.closest(".tt-marker");
    var box = hit && boxById(hit.dataset.id);
    if (!box) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (box !== selected) select(box);
      textInput.focus();
      return;
    }
    var step = e.shiftKey ? 0.1 : 0.01;
    var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!moves[e.key]) return;
    e.preventDefault();
    if (box !== selected) select(box);
    box.x = Math.min(1, Math.max(0, box.x + moves[e.key][0]));
    box.y = Math.min(1, Math.max(0, box.y + moves[e.key][1]));
    settle(box);
    refresh();
    var again = markers.querySelector(".tt-marker.is-selected");
    if (again) again.focus({ preventScroll: true });
  });
  markers.addEventListener("focusin", function (e) {
    var hit = e.target.closest(".tt-marker");
    var box = hit && boxById(hit.dataset.id);
    if (box && box !== selected) {
      select(box);
      var again = markers.querySelector(".tt-marker.is-selected");
      if (again) again.focus({ preventScroll: true });
    }
  });

  pageInput.addEventListener("input", function () { refresh(); showPage(); });
  el("tt-prev").addEventListener("click", function () { step(-1); });
  el("tt-next").addEventListener("click", function () { step(1); });
  function step(d) {
    var state = ui.state();
    if (!state) return;
    goTo(Math.min(state.pages, Math.max(1, (currentPage() || 1) + d)));
  }

  // ---- Checks and the save button

  function setError(input, text) {
    var field = input.closest(".field");
    field.classList.toggle("invalid", !!text);
    input.setAttribute("aria-invalid", text ? "true" : "false");
    field.querySelector(".error-msg").textContent = text;
  }

  function filled() {
    return boxes.filter(function (b) { return splitLines(b.text).length; });
  }

  function refresh() {
    var state = ui.state();
    if (!state || !selected || !sizes.length) return;
    var pageOk = !!currentPage();
    setError(pageInput, pageOk ? "" : "Choose a page from 1 to " + state.pages + ".");
    setError(sizeInput, validSize(selected.size) ? "" : "Choose a size from " + MIN_SIZE + " to " + MAX_SIZE + ".");

    var bad = unusableCharacters(selected.text, lib());
    var lay = layoutOf(selected);
    setError(textInput, bad.length ? badCharactersMessage(bad) : "");
    el("tt-fit").hidden = lay.fits || lay.empty;

    var done = filled();
    var problems = done.some(function (b) { return !validSize(b.size) || unusableCharacters(b.text, lib()).length; });
    el("tt-count").textContent = done.length
      ? (done.length === 1 ? "1 text box" : done.length + " text boxes") + " on " + (function () {
        var pages = done.map(function (b) { return b.page; }).filter(function (p, i, a) { return a.indexOf(p) === i; });
        return (pages.length === 1 ? "page " : "pages ") + P.describePages(pages);
      })() + "."
      : "";
    el("tt-where").textContent = selected.page === currentPage() ? "" : "The box you're editing is on page " + selected.page + ". Tap this page to move it here.";
    runBtn.disabled = !done.length || problems;
    if (shownPage) drawBoxes();
  }

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    var done = filled();
    if (!state || !done.length) return;
    var copy = done.map(function (b) { return Object.assign({}, b); });
    ui.run(runBtn, "Adding your text…", function () {
      return addText(state.bytes, copy).then(function (bytes) {
        var pages = copy.map(function (b) { return b.page; }).filter(function (p, i, a) { return a.indexOf(p) === i; });
        ui.showResult({
          title: "Your PDF is ready",
          summary: (copy.length === 1 ? "Text added" : copy.length + " text boxes added") + " to " + (pages.length === 1 ? "page " : "pages ") + P.describePages(pages) + ".",
          files: [{ name: state.base + "-edited.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(state.pages) }],
          note: "Open the new PDF and check your text before you send it."
        });
      });
    });
  });

  window.addEventListener("resize", function () { if (shownPage) drawBoxes(); });
})();
