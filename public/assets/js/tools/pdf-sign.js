/* Sign a PDF: draw or type a signature, place it on a page, and save a new PDF. The signature is
   added as a picture (and, if chosen, the date as text). Everything happens in the browser: the
   PDF and the signature are never uploaded or stored. This is not a certified digital signature. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  /*
   * Where the signature goes on a page as the reader sees it (viewWidth × viewHeight points).
   *   cx, cy: the signature's centre, as a share of the page's width and height from the top-left
   *   widthShare: the signature's width as a share of the page's width
   *   aspect: the signature picture's width ÷ height
   * Returns { x, y, width, height }: the picture's bottom-left corner measured from the page's
   * bottom-left, kept inside the page.
   */
  function placement(viewWidth, viewHeight, cx, cy, widthShare, aspect) {
    var width = viewWidth * widthShare;
    var height = width / aspect;
    if (height > viewHeight) {
      height = viewHeight;
      width = height * aspect;
    }
    var left = Math.min(Math.max(cx * viewWidth - width / 2, 0), viewWidth - width);
    var top = Math.min(Math.max(cy * viewHeight - height / 2, 0), viewHeight - height);
    return { x: left, y: viewHeight - top - height, width: width, height: height };
  }

  // The date line under the signature (or above it if there's no room below). → { x, y, size }
  function dateSpot(spot, viewHeight) {
    var size = Math.min(12, Math.max(8, spot.height * 0.22));
    var below = spot.y - size * 1.4;
    return { x: spot.x, y: below >= 4 ? below : Math.min(spot.y + spot.height + size * 0.6, viewHeight - size), size: size };
  }

  /*
   * opts: { png (bytes), aspect, page (1-based), cx, cy, widthShare, dateText (optional) } → bytes
   */
  function signPdf(source, opts) {
    var L;
    if (!opts.png || !opts.png.length) return Promise.reject(P.userError("Draw or type your signature first."));
    return P.openPdf(source).then(function (doc) {
      L = window.PDFLib;
      var count = doc.getPageCount();
      if (!(opts.page >= 1 && opts.page <= count)) throw P.userError("Choose a page from 1 to " + count + ".");
      return Promise.all([doc.embedPng(opts.png), opts.dateText ? doc.embedFont(L.StandardFonts.Helvetica) : null]).then(function (res) {
        var image = res[0];
        var font = res[1];
        var page = doc.getPage(opts.page - 1);
        var view = P.pageView(page);
        var spot = placement(view.width, view.height, opts.cx, opts.cy, opts.widthShare, opts.aspect);
        var pt = view.toPdf(spot.x, spot.y);
        page.drawImage(image, { x: pt.x, y: pt.y, width: spot.width, height: spot.height, rotate: L.degrees(view.rotation) });
        if (font) {
          var text = String(opts.dateText);
          try {
            font.encodeText(text);
          } catch (e) {
            text = text.replace(/[^\x20-\x7e]/g, "");
          }
          var d = dateSpot(spot, view.height);
          var dp = view.toPdf(d.x, d.y);
          page.drawText(text, { x: dp.x, y: dp.y, size: d.size, font: font, color: L.rgb(0.1, 0.1, 0.1), rotate: L.degrees(view.rotation) });
        }
        P.touch(doc);
        return P.saveDoc(doc);
      });
    });
  }

  window.ToolNestCalc = { placement: placement, dateSpot: dateSpot, signPdf: signPdf };
  if (!document.getElementById("pdf-tool")) return;

  // ---------------------------------------------------------------- Page

  var el = function (id) { return document.getElementById(id); };
  var runBtn = el("pdf-run");
  var pageInput = el("sign-page");
  var stage = el("sign-stage");
  var pageCanvas = el("sign-page-canvas");
  var marker = el("sign-marker");
  var sizeInput = el("sign-size");
  var addDate = el("sign-date");
  var pad = el("sign-pad");
  var typed = el("sign-typed");
  var inkColour = function () { return el("sign-colour").value === "blue" ? "#1a3fa6" : "#111111"; };

  var view = null; // the PDF opened with pdf.js, for the page preview
  var pos = { cx: 0.72, cy: 0.86 };
  var signature = null; // { png: Uint8Array, dataUrl, aspect }
  var drawing = { strokes: [], active: null };
  var ui = P.singlePdfTool({ onOpen: opened, onReset: closed });

  // ---- Signature pad (mouse, pen or finger)

  function padSize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var w = pad.clientWidth || 480;
    var h = pad.clientHeight || 160;
    if (pad.width !== Math.round(w * ratio) || pad.height !== Math.round(h * ratio)) {
      pad.width = Math.round(w * ratio);
      pad.height = Math.round(h * ratio);
    }
    return ratio;
  }

  function redrawPad() {
    var ratio = padSize();
    var ctx = pad.getContext("2d");
    ctx.clearRect(0, 0, pad.width, pad.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = inkColour();
    ctx.lineWidth = 2.6 * ratio;
    drawing.strokes.forEach(function (s) {
      ctx.beginPath();
      s.forEach(function (p, i) {
        var x = p[0] * pad.width;
        var y = p[1] * pad.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (s.length === 1) ctx.lineTo(s[0][0] * pad.width + 0.1, s[0][1] * pad.height);
      ctx.stroke();
    });
  }

  function padPoint(e) {
    var r = pad.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  pad.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    drawing.active = [padPoint(e)];
    drawing.strokes.push(drawing.active);
    redrawPad();
  });
  pad.addEventListener("pointermove", function (e) {
    if (!drawing.active) return;
    drawing.active.push(padPoint(e));
    redrawPad();
  });
  ["pointerup", "pointercancel"].forEach(function (type) {
    pad.addEventListener(type, function () {
      if (!drawing.active) return;
      drawing.active = null;
      makeSignature();
    });
  });

  el("sign-clear").addEventListener("click", function () {
    drawing.strokes = [];
    redrawPad();
    makeSignature();
  });

  // ---- Draw / Type switch

  function mode() {
    var checked = document.querySelector("input[name=sign-mode]:checked");
    return checked ? checked.value : "draw";
  }
  function applyMode() {
    el("sign-draw-box").hidden = mode() !== "draw";
    el("sign-type-box").hidden = mode() !== "type";
    if (mode() === "draw") redrawPad();
    makeSignature();
  }
  Array.prototype.forEach.call(document.querySelectorAll("input[name=sign-mode]"), function (r) { r.addEventListener("change", applyMode); });
  typed.addEventListener("input", makeSignature);
  el("sign-font").addEventListener("change", makeSignature);
  el("sign-colour").addEventListener("change", function () { redrawPad(); makeSignature(); });

  // Crops the signature to what was actually drawn (or typed), with a little room around it,
  // on a transparent background. → { png, dataUrl, aspect } or null when empty.
  function makeSignature() {
    var out = document.createElement("canvas");
    var ctx = out.getContext("2d");
    if (mode() === "type") {
      var text = typed.value.trim();
      if (!text) return setSignature(null);
      var family = el("sign-font").value === "script" ? "\"Segoe Script\", \"Brush Script MT\", \"Snell Roundhand\", cursive" : "Georgia, \"Times New Roman\", serif";
      var font = "italic 96px " + family;
      ctx.font = font;
      var w = Math.ceil(ctx.measureText(text).width) + 40;
      out.width = Math.min(w, 4000);
      out.height = 150;
      ctx.font = font;
      ctx.fillStyle = inkColour();
      ctx.textBaseline = "middle";
      ctx.fillText(text, 20, 78, out.width - 40);
      return setSignature(out);
    }
    if (!drawing.strokes.length) return setSignature(null);
    var minX = 1;
    var minY = 1;
    var maxX = 0;
    var maxY = 0;
    drawing.strokes.forEach(function (s) {
      s.forEach(function (p) {
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      });
    });
    var pw = pad.width;
    var ph = pad.height;
    var margin = 12 * Math.min(window.devicePixelRatio || 1, 2);
    var sx = Math.max(0, Math.floor(minX * pw - margin));
    var sy = Math.max(0, Math.floor(minY * ph - margin));
    var sw = Math.min(pw, Math.ceil(maxX * pw + margin)) - sx;
    var sh = Math.min(ph, Math.ceil(maxY * ph + margin)) - sy;
    if (sw < 4 || sh < 4) return setSignature(null);
    out.width = sw;
    out.height = sh;
    ctx.drawImage(pad, sx, sy, sw, sh, 0, 0, sw, sh);
    return setSignature(out);
  }

  function setSignature(canvas) {
    if (!canvas) {
      signature = null;
      marker.hidden = true;
      check();
      return;
    }
    var dataUrl = canvas.toDataURL("image/png");
    var bin = atob(dataUrl.split(",")[1]);
    var png = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) png[i] = bin.charCodeAt(i);
    signature = { png: png, dataUrl: dataUrl, aspect: canvas.width / canvas.height };
    el("sign-marker-img").src = dataUrl;
    placeMarker();
    check();
  }

  // ---- Page preview and placing

  function opened(state) {
    pageInput.max = state.pages;
    pageInput.value = state.pages > 1 ? String(state.pages) : "1"; // signatures usually go on the last page
    el("sign-page-count").textContent = "of " + state.pages;
    el("sign-place").hidden = false;
    redrawPad();
    return P.openForView(state.bytes).then(function (pdf) {
      view = pdf;
      return showPage();
    }, function () {
      stage.classList.add("no-preview");
    });
  }

  function closed() {
    if (view) P.closeView(view);
    view = null;
    el("sign-place").hidden = true;
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
      stage.classList.remove("no-preview");
      placeMarker();
    });
  }

  function placeMarker() {
    if (!signature || !pageCanvas.width) {
      marker.hidden = true;
      return;
    }
    // The same maths as the PDF, in shares of the page, so the preview matches the result.
    var vw = pageCanvas.width;
    var vh = pageCanvas.height;
    var s = placement(vw, vh, pos.cx, pos.cy, Number(sizeInput.value) / 100, signature.aspect);
    marker.hidden = false;
    marker.style.left = (s.x / vw) * 100 + "%";
    marker.style.top = ((vh - s.y - s.height) / vh) * 100 + "%";
    marker.style.width = (s.width / vw) * 100 + "%";
    marker.style.height = (s.height / vh) * 100 + "%";
    el("sign-date-preview").hidden = !addDate.checked;
    el("sign-date-preview").textContent = dateText();
  }

  function moveTo(e) {
    var r = pageCanvas.getBoundingClientRect();
    if (!r.width) return;
    pos.cx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pos.cy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    placeMarker();
  }

  var dragging = false;
  stage.addEventListener("pointerdown", function (e) {
    if (!signature) return;
    dragging = true;
    stage.setPointerCapture(e.pointerId);
    moveTo(e);
  });
  stage.addEventListener("pointermove", function (e) { if (dragging) moveTo(e); });
  ["pointerup", "pointercancel"].forEach(function (t) { stage.addEventListener(t, function () { dragging = false; }); });

  // Keyboard: the arrow keys move the signature 2% at a time.
  marker.addEventListener("keydown", function (e) {
    var step = e.shiftKey ? 0.1 : 0.02;
    var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!moves[e.key]) return;
    e.preventDefault();
    pos.cx = Math.min(1, Math.max(0, pos.cx + moves[e.key][0]));
    pos.cy = Math.min(1, Math.max(0, pos.cy + moves[e.key][1]));
    placeMarker();
  });

  pageInput.addEventListener("input", function () { check(); showPage(); });
  el("sign-prev").addEventListener("click", function () { step(-1); });
  el("sign-next").addEventListener("click", function () { step(1); });
  function step(d) {
    var state = ui.state();
    if (!state) return;
    var n = (currentPage() || 1) + d;
    pageInput.value = String(Math.min(state.pages, Math.max(1, n)));
    check();
    showPage();
  }
  sizeInput.addEventListener("input", placeMarker);
  addDate.addEventListener("change", placeMarker);
  window.addEventListener("resize", function () { if (mode() === "draw") redrawPad(); });

  function dateText() {
    var locale = (navigator.language || "en-GB").toLowerCase().indexOf("en-us") === 0 ? "en-US" : "en-GB";
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  }

  function check() {
    var state = ui.state();
    var pageOk = !!currentPage();
    var field = pageInput.closest(".field");
    field.classList.toggle("invalid", !!state && !pageOk);
    pageInput.setAttribute("aria-invalid", state && !pageOk ? "true" : "false");
    if (state) field.querySelector(".error-msg").textContent = "Choose a page from 1 to " + state.pages + ".";
    el("sign-need").hidden = !!signature;
    runBtn.disabled = !state || !pageOk || !signature;
  }

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state || !signature || !currentPage()) return;
    var opts = {
      png: signature.png, aspect: signature.aspect, page: currentPage(), cx: pos.cx, cy: pos.cy,
      widthShare: Number(sizeInput.value) / 100, dateText: addDate.checked ? dateText() : ""
    };
    ui.run(runBtn, "Adding your signature…", function () {
      return signPdf(state.bytes, opts).then(function (bytes) {
        ui.showResult({
          title: "Your signed PDF is ready",
          summary: "Signature added to page " + opts.page + (opts.dateText ? ", with today's date." : "."),
          files: [{ name: state.base + "-signed.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(state.pages) }],
          note: "Open the new PDF and check the signature is where you want it before you send it."
        });
      });
    });
  });

  applyMode();
})();
