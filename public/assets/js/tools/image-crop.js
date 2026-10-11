/* Crop Image: drag a box (free or a fixed shape such as square or 16:9) over a picture, turn or
   flip it if needed, and save the part inside the box as JPG, PNG or WebP. Runs in the browser. */

(function () {
  "use strict";

  var I = window.ToolNestImage;
  var P = window.ToolNestPDF;

  // ---------------------------------------------------------------- Box maths (tested)

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  // Moves box by dx, dy (picture pixels), keeping it inside a W × H picture.
  function moveBox(box, dx, dy, W, H) {
    return {
      x: Math.round(clamp(box.x + dx, 0, W - box.width)),
      y: Math.round(clamp(box.y + dy, 0, H - box.height)),
      width: box.width,
      height: box.height
    };
  }

  /*
   * Drags one handle of box by dx, dy. handle: "n", "s", "e", "w", "ne", "nw", "se" or "sw";
   * the opposite side or corner stays put. ratio: width ÷ height to keep (0 = free). The box
   * stays inside the W × H picture and at least 1 pixel each way.
   */
  function resizeBox(box, handle, dx, dy, ratio, W, H) {
    var right = box.x + box.width;
    var bottom = box.y + box.height;
    var ax = handle.indexOf("w") >= 0 ? right : box.x; // anchor
    var ay = handle.indexOf("n") >= 0 ? bottom : box.y;
    var roomW = handle.indexOf("w") >= 0 ? ax : W - ax;
    var roomH = handle.indexOf("n") >= 0 ? ay : H - ay;
    var w = box.width;
    var h = box.height;
    if (handle.indexOf("e") >= 0) w = right + dx - ax;
    if (handle.indexOf("w") >= 0) w = ax - (box.x + dx);
    if (handle.indexOf("s") >= 0) h = bottom + dy - ay;
    if (handle.indexOf("n") >= 0) h = ay - (box.y + dy);
    w = clamp(w, 1, roomW);
    h = clamp(h, 1, roomH);
    if (ratio > 0) {
      // Follow whichever side moved more, compared with its size.
      var sideways = handle === "e" || handle === "w";
      var upDown = handle === "n" || handle === "s";
      var useW = sideways || (!upDown && Math.abs(w - box.width) / box.width >= Math.abs(h - box.height) / box.height);
      if (!useW) w = h * ratio;
      w = clamp(w, 1, Math.min(roomW, roomH * ratio));
      h = w / ratio;
    }
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    var x = handle.indexOf("w") >= 0 ? ax - w : ax;
    var y = handle.indexOf("n") >= 0 ? ay - h : ay;
    // Side handles with a fixed shape grow the other way evenly, kept inside the picture.
    if (ratio > 0 && (handle === "e" || handle === "w")) y = Math.round(clamp(box.y + (box.height - h) / 2, 0, H - h));
    if (ratio > 0 && (handle === "n" || handle === "s")) x = Math.round(clamp(box.x + (box.width - w) / 2, 0, W - w));
    return { x: x, y: y, width: w, height: h };
  }

  // A box typed in by hand, made to fit inside the picture.
  function fitBox(box, W, H) {
    var w = Math.round(clamp(box.width || 1, 1, W));
    var h = Math.round(clamp(box.height || 1, 1, H));
    return { x: Math.round(clamp(box.x || 0, 0, W - w)), y: Math.round(clamp(box.y || 0, 0, H - h)), width: w, height: h };
  }

  // "16:9" → 1.7778; "free" → 0; "original" → W ÷ H
  function ratioOf(value, W, H) {
    if (value === "original") return W / H;
    var m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(String(value));
    return m ? Number(m[1]) / Number(m[2]) : 0;
  }

  // Size of a w × h picture after `turns` quarter turns.
  function turnedSize(w, h, turns) {
    return turns % 2 ? { width: h, height: w } : { width: w, height: h };
  }

  window.ToolNestCalc = {
    moveBox: moveBox, resizeBox: resizeBox, fitBox: fitBox, ratioOf: ratioOf,
    turnedSize: turnedSize, centerBox: I.centerBox, outName: I.outName
  };
  if (!document.getElementById("pdf-tool")) return;

  // ---------------------------------------------------------------- Page wiring

  var el = function (id) { return document.getElementById(id); };
  var stage = el("cr-stage");
  var view = el("cr-view");
  var boxEl = el("cr-box");
  var runBtn = el("pdf-run");
  var format = el("cr-format");
  var quality = el("cr-quality");
  var fields = { x: el("cr-x"), y: el("cr-y"), width: el("cr-w"), height: el("cr-h") };

  var state = null; // { file, name, type, base (decoded), turns, flip, source (canvas), W, H, box, shrunk }

  if (!I.canSave("image/webp")) {
    var webp = format.querySelector("option[value=webp]");
    webp.disabled = true;
    webp.textContent = "WebP (your browser can't save WebP)";
  }

  var ui = P.initTool({
    onFiles: function (files) {
      var file = files.filter(I.isImage)[0];
      if (!file) {
        ui.setStatus("Please choose a JPG, PNG, WebP or other picture file.", "error");
        return;
      }
      ui.clearResult();
      ui.setStatus("Opening your picture…", "busy");
      I.decode(file).then(function (base) {
        if (state) I.release(state.base);
        state = { file: file, name: file.name, type: file.type, base: base, turns: 0, flip: false };
        P.fillFileCard(file.name, I.sizeText(I.widthOf(base), I.heightOf(base)) + " · " + P.formatBytes(file.size));
        build();
        ui.setStatus(files.length > 1 ? "This tool crops one picture at a time, so we opened the first one." : "");
        ui.showWork();
      }).catch(function (err) {
        ui.setStatus(P.messageOf(err), "error");
      });
    },
    onReset: function () {
      if (state) I.release(state.base);
      if (state && state.source) state.source.width = state.source.height = 0;
      state = null;
    }
  });

  function ratio() {
    var v = document.querySelector("input[name=cr-ratio]:checked").value;
    return state ? ratioOf(v, state.W, state.H) : 0;
  }

  // Draws the picture turned and flipped as chosen, at full size (or the largest a browser can handle).
  function build() {
    var bw = I.widthOf(state.base);
    var bh = I.heightOf(state.base);
    var turned = turnedSize(bw, bh, state.turns);
    var scale = Math.min(1, Math.sqrt(I.MAX_PIXELS / (turned.width * turned.height)));
    var W = Math.max(1, Math.round(turned.width * scale));
    var H = Math.max(1, Math.round(turned.height * scale));
    if (state.source) state.source.width = state.source.height = 0;
    var c = I.newCanvas(W, H);
    var ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.translate(W / 2, H / 2);
    if (state.flip) ctx.scale(-1, 1); // mirror left to right as seen on screen, after turning
    ctx.rotate(state.turns * Math.PI / 2);
    var dw = (state.turns % 2 ? H : W);
    var dh = (state.turns % 2 ? W : H);
    ctx.drawImage(state.base, -dw / 2, -dh / 2, dw, dh);
    state.source = c;
    state.W = W;
    state.H = H;
    state.shrunk = scale < 1;
    el("cr-shrunk").hidden = !state.shrunk;
    if (state.shrunk) el("cr-shrunk").textContent = "This picture is very large, so we're working on a copy of " + I.sizeText(W, H) + ", the biggest a browser can safely handle.";

    // The on-screen copy: up to 1,600 pixels across is plenty for a preview.
    var preview = I.thumbnail(c, 1600, 1600);
    view.width = preview.width;
    view.height = preview.height;
    view.getContext("2d").drawImage(preview, 0, 0);
    stage.style.aspectRatio = W + " / " + H;
    stage.style.setProperty("--ratio", String(W / H));
    ["x", "width"].forEach(function (k) { fields[k].max = W; });
    ["y", "height"].forEach(function (k) { fields[k].max = H; });
    setBox(I.centerBox(W, H, ratio()));
  }

  function setBox(box) {
    state.box = box;
    var b = box;
    boxEl.style.left = (b.x / state.W * 100) + "%";
    boxEl.style.top = (b.y / state.H * 100) + "%";
    boxEl.style.width = (b.width / state.W * 100) + "%";
    boxEl.style.height = (b.height / state.H * 100) + "%";
    Object.keys(fields).forEach(function (k) {
      if (document.activeElement !== fields[k]) fields[k].value = b[k];
    });
    boxEl.setAttribute("aria-label", "Crop box, " + I.sizeText(b.width, b.height) + ", starting " + b.x + " px from the left and " + b.y + " px from the top. Use the arrow keys to move it, or the boxes below to type exact numbers.");
    el("cr-size").textContent = I.sizeText(b.width, b.height);
    stage.classList.toggle("is-locked", ratio() > 0);
  }

  // ---- Dragging the box or its handles (mouse, pen and touch)
  var drag = null;
  stage.addEventListener("pointerdown", function (e) {
    if (!state) return;
    var handle = e.target.getAttribute("data-handle");
    if (!handle && !boxEl.contains(e.target)) return;
    e.preventDefault();
    var rect = stage.getBoundingClientRect();
    drag = { handle: handle || "move", startX: e.clientX, startY: e.clientY, box: state.box, scale: state.W / rect.width, id: e.pointerId };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add("is-dragging");
  });
  stage.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = (e.clientX - drag.startX) * drag.scale;
    var dy = (e.clientY - drag.startY) * drag.scale;
    setBox(drag.handle === "move"
      ? moveBox(drag.box, dx, dy, state.W, state.H)
      : resizeBox(drag.box, drag.handle, dx, dy, ratio(), state.W, state.H));
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    stage.classList.remove("is-dragging");
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  // ---- Keyboard: arrows move the box (Shift for bigger steps), Alt + arrows change its size
  boxEl.addEventListener("keydown", function (e) {
    if (!state) return;
    var keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    var k = keys[e.key];
    if (!k) return;
    e.preventDefault();
    var step = Math.max(1, Math.round((e.shiftKey ? 0.05 : 0.01) * Math.max(state.W, state.H)));
    if (e.altKey) setBox(resizeBox(state.box, "se", k[0] * step, k[1] * step, ratio(), state.W, state.H));
    else setBox(moveBox(state.box, k[0] * step, k[1] * step, state.W, state.H));
  });

  // ---- Typed numbers
  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", function () {
      if (!state) return;
      var n = Number(String(fields[key].value).replace(/[,\s]/g, ""));
      if (!isFinite(n) || n < 0) return;
      var b = { x: state.box.x, y: state.box.y, width: state.box.width, height: state.box.height };
      b[key] = Math.round(n);
      var r = ratio();
      if (r > 0 && key === "width") b.height = Math.round(b.width / r);
      if (r > 0 && key === "height") b.width = Math.round(b.height * r);
      setBox(fitBox(b, state.W, state.H));
    });
    fields[key].addEventListener("change", function () { if (state) setBox(state.box); });
  });

  Array.prototype.forEach.call(document.querySelectorAll("input[name=cr-ratio]"), function (r) {
    r.addEventListener("change", function () {
      if (state) setBox(I.centerBox(state.W, state.H, ratio()));
    });
  });

  el("cr-left").addEventListener("click", function () { if (state) { state.turns = (state.turns + 3) % 4; build(); } });
  el("cr-right").addEventListener("click", function () { if (state) { state.turns = (state.turns + 1) % 4; build(); } });
  el("cr-flip").addEventListener("click", function () { if (state) { state.flip = !state.flip; build(); } });
  el("cr-all").addEventListener("click", function () { if (state) setBox(I.centerBox(state.W, state.H, ratio())); });

  function showQuality() {
    var type = I.outputType(state ? state.type : "", format.value);
    el("cr-quality-field").hidden = type === "image/png";
    el("cr-quality-out").textContent = quality.value + "%";
  }
  format.addEventListener("change", showQuality);
  quality.addEventListener("input", showQuality);

  runBtn.addEventListener("click", function () {
    if (!state) return;
    var type = I.outputType(state.type, format.value);
    var b = state.box;
    ui.run(runBtn, "Cropping your picture…", function () {
      var canvas = I.render(state.source, b.width, b.height, type === "image/jpeg" ? "#ffffff" : "", b);
      return I.encode(canvas, type, Number(quality.value) / 100).then(function (out) {
        canvas.width = canvas.height = 0;
        var f = {
          name: I.outName(state.name, out.type, "-cropped"),
          bytes: out.bytes,
          type: out.type,
          detail: I.sizeText(b.width, b.height)
        };
        ui.showResult({
          title: "Your picture is cropped",
          summary: I.sizeText(b.width, b.height) + ", cut from " + I.sizeText(state.W, state.H) + ".",
          files: [f],
          noun: I.TYPES[out.type] ? I.TYPES[out.type].name : "picture"
        });
        I.previewInResult(f.bytes, f.type);
      });
    });
  });

  showQuality();
})();
