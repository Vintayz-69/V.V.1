/* ToolNest image helpers, shared by the /image/ tools (resize, compress, convert, crop).
 *
 * Pictures are opened, changed and saved by the visitor's own browser, using a <canvas>.
 * Nothing is uploaded and nothing is stored on the device (LEGAL.md §2 and §9). The drop zone,
 * status line, results panel and ZIP file come from pdf-common.js, which must load first.
 *
 * The site's Content-Security-Policy allows pictures only from our own domain and data: URLs,
 * so previews are drawn on canvases rather than shown from blob: URLs.
 */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  // Phones can't draw pictures much bigger than about 16.7 million pixels, so we stay under that.
  var MAX_PIXELS = 16000000;

  var TYPES = {
    "image/jpeg": { ext: "jpg", name: "JPG" },
    "image/png": { ext: "png", name: "PNG" },
    "image/webp": { ext: "webp", name: "WebP" }
  };

  // ---------------------------------------------------------------- Pure helpers (tested)

  /*
   * The new size of a w × h picture.
   *   { mode: "percent", percent }                    → both sides × percent ÷ 100
   *   { mode: "pixels", width, height, keepRatio }    → width and/or height (either may be empty)
   * With keepRatio and both sides given, the picture fits inside width × height without
   * stretching. Without keepRatio, an empty side stays as it was. Sides are rounded to whole
   * pixels and never go below 1. Returns { width, height } or null if nothing was asked for.
   */
  function fitSize(w, h, o) {
    var nw;
    var nh;
    if (o.mode === "percent") {
      if (!(o.percent > 0)) return null;
      nw = w * o.percent / 100;
      nh = h * o.percent / 100;
    } else {
      var tw = o.width > 0 ? o.width : 0;
      var th = o.height > 0 ? o.height : 0;
      if (!tw && !th) return null;
      if (o.keepRatio) {
        var scale = tw && th ? Math.min(tw / w, th / h) : tw ? tw / w : th / h;
        nw = w * scale;
        nh = h * scale;
      } else {
        nw = tw || w;
        nh = th || h;
      }
    }
    return { width: Math.max(1, Math.round(nw)), height: Math.max(1, Math.round(nh)) };
  }

  /*
   * Sizes to draw through when shrinking a lot. Halving at each step, then one last step to the
   * exact size, gives a smoother result than one big jump. Returns [{ width, height }, ...],
   * always ending with the target.
   */
  function downscaleSteps(sw, sh, tw, th) {
    var steps = [];
    var w = sw;
    var h = sh;
    while (w / 2 >= tw && h / 2 >= th && w / 2 >= 1 && h / 2 >= 1 && (w > tw * 2 || h > th * 2)) {
      w = Math.round(w / 2);
      h = Math.round(h / 2);
      steps.push({ width: w, height: h });
    }
    if (!steps.length || steps[steps.length - 1].width !== tw || steps[steps.length - 1].height !== th) {
      steps.push({ width: tw, height: th });
    }
    return steps;
  }

  /*
   * The file type to save as. choice: "same" | "jpg" | "png" | "webp". "same" keeps JPG, PNG and
   * WebP; GIF and BMP (sharp-edged graphics) become PNG; anything else (such as HEIC or AVIF
   * photos) becomes JPG, because browsers can't save in those formats.
   */
  function outputType(inputType, choice) {
    if (choice === "jpg") return "image/jpeg";
    if (choice === "png") return "image/png";
    if (choice === "webp") return "image/webp";
    var t = String(inputType || "").toLowerCase();
    if (t === "image/jpg" || t === "image/pjpeg") t = "image/jpeg";
    if (TYPES[t]) return t;
    if (/gif|bmp/.test(t)) return "image/png";
    return "image/jpeg";
  }

  // "Holiday photo.JPEG", "image/png", "-800x600" → "Holiday photo-800x600.png"
  function outName(name, type, suffix) {
    var ext = (TYPES[type] || TYPES["image/png"]).ext;
    return P.baseName(name).replace(/^document$/, "image") + (suffix || "") + "." + ext;
  }

  // Percentage smaller (positive) or bigger (negative), to one decimal place.
  function percentSaved(before, after) {
    if (!(before > 0)) return 0;
    return Math.round((1 - after / before) * 1000) / 10;
  }

  // 4032, 3024 → "4,032 × 3,024 px"
  function sizeText(w, h) {
    return w.toLocaleString("en-US") + " × " + h.toLocaleString("en-US") + " px";
  }

  /*
   * Finds the highest quality that makes a file no bigger than `target` bytes.
   *   measure(quality, scale) → Promise of the file size in bytes at that quality (0–1) and
   *   size (1 = full size).
   * Quality is searched between 0.1 and 0.95. If even the lowest quality is too big, the
   * picture is made smaller (scale) and the search runs again, up to 6 times.
   * Resolves { quality, scale, size, met } — met is false if the target couldn't be reached.
   */
  function searchQuality(measure, target) {
    var LOW = 0.1;
    var HIGH = 0.95;
    var best = null;

    function search(scale) {
      return measure(HIGH, scale).then(function (topSize) {
        if (topSize <= target) return { quality: HIGH, scale: scale, size: topSize, met: true };
        return measure(LOW, scale).then(function (lowSize) {
          if (lowSize > target) return { quality: LOW, scale: scale, size: lowSize, met: false };
          var lo = LOW;
          var hi = HIGH;
          var found = { quality: LOW, scale: scale, size: lowSize, met: true };
          var i = 0;
          function step() {
            if (i++ >= 7) return Promise.resolve(found);
            var mid = Math.round((lo + hi) / 2 * 1000) / 1000;
            return measure(mid, scale).then(function (size) {
              if (size <= target) {
                lo = mid;
                found = { quality: mid, scale: scale, size: size, met: true };
              } else {
                hi = mid;
              }
              return step();
            });
          }
          return step();
        });
      });
    }

    var tries = 0;
    function attempt(scale) {
      return search(scale).then(function (r) {
        best = r;
        if (r.met || ++tries >= 6 || scale < 0.05) return best;
        // Shrink by a bit more than the size difference suggests (file size follows area).
        var next = scale * Math.min(0.9, Math.sqrt(target / r.size) * 0.95);
        return attempt(Math.round(next * 10000) / 10000);
      });
    }
    return attempt(1);
  }

  // The crop box of the given aspect ratio (width ÷ height), as large as fits, centred.
  function centerBox(w, h, ratio) {
    if (!(ratio > 0)) return { x: 0, y: 0, width: w, height: h };
    var bw = w;
    var bh = Math.round(w / ratio);
    if (bh > h) {
      bh = h;
      bw = Math.round(h * ratio);
    }
    return { x: Math.round((w - bw) / 2), y: Math.round((h - bh) / 2), width: bw, height: bh };
  }

  // ---------------------------------------------------------------- Browser helpers

  function isImage(file) {
    return /^image\//.test(file.type) || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|ico|tiff?)$/i.test(file.name);
  }

  // Which formats this browser can save. Safari, for example, can't make WebP files.
  var canSaveCache = {};
  function canSave(type) {
    if (!(type in canSaveCache)) {
      var c = document.createElement("canvas");
      c.width = c.height = 1;
      var url = "";
      try { url = c.toDataURL(type); } catch (e) { url = ""; }
      canSaveCache[type] = url.indexOf("data:" + type) === 0;
    }
    return canSaveCache[type];
  }

  var CANT_OPEN = "Your browser can't open this type of picture. JPG, PNG, WebP, GIF and BMP work everywhere. iPhone HEIC photos open in Safari; or on the iPhone choose Settings → Camera → Formats → Most Compatible to take JPG photos.";

  // A decoded picture the right way up (browsers apply the photo's rotation setting).
  function decode(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file).catch(function () {
        return decodeWithImg(file);
      });
    }
    return decodeWithImg(file);
  }

  // Fallback for older browsers: a data: URL (blob: URLs are blocked by our security policy).
  function decodeWithImg(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(P.userError(CANT_OPEN)); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(P.userError("We couldn't read that file.")); };
      reader.readAsDataURL(file);
    });
  }

  function widthOf(source) { return source.naturalWidth || source.width; }
  function heightOf(source) { return source.naturalHeight || source.height; }

  function release(source) {
    if (source && source.close) source.close();
  }

  function newCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function checkSize(w, h) {
    if (w * h > MAX_PIXELS) {
      throw P.userError("That's too big for a browser to draw (" + sizeText(w, h) + "). Choose a size under 16 million pixels, for example 4,000 × 4,000.");
    }
  }

  /*
   * Draws source (or the part sx, sy, sw, sh of it) at w × h, shrinking in halving steps for a
   * smooth result. background: a colour painted first (needed for JPG, which can't be
   * transparent), or "" to keep transparency.
   */
  function render(source, w, h, background, crop) {
    checkSize(w, h);
    var sx = crop ? crop.x : 0;
    var sy = crop ? crop.y : 0;
    var sw = crop ? crop.width : widthOf(source);
    var sh = crop ? crop.height : heightOf(source);
    var steps = downscaleSteps(sw, sh, w, h);
    var current = source;
    var box = { x: sx, y: sy, width: sw, height: sh };
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      var last = i === steps.length - 1;
      var c = newCanvas(s.width, s.height);
      var ctx = c.getContext("2d");
      if (last && background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, s.width, s.height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(current, box.x, box.y, box.width, box.height, 0, 0, s.width, s.height);
      if (current !== source) current.width = current.height = 0;
      current = c;
      box = { x: 0, y: 0, width: s.width, height: s.height };
    }
    return current;
  }

  // canvas → Promise of { bytes, type } (type is what the browser actually made).
  function encode(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(P.userError("Your browser ran out of memory saving this picture. Try a smaller size."));
        blob.arrayBuffer().then(function (buf) {
          resolve({ bytes: new Uint8Array(buf), type: blob.type || type });
        }, reject);
      }, type, quality);
    });
  }

  // Does the picture have see-through parts? Checked on a small copy, so it's quick.
  function hasTransparency(source) {
    var w = widthOf(source);
    var h = heightOf(source);
    var scale = Math.min(1, 256 / Math.max(w, h));
    var c = newCanvas(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
    var ctx = c.getContext("2d");
    ctx.drawImage(source, 0, 0, c.width, c.height);
    var data;
    try { data = ctx.getImageData(0, 0, c.width, c.height).data; } catch (e) { return false; }
    for (var i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
    return false;
  }

  // A small preview canvas of a source, fitting inside maxW × maxH.
  function thumbnail(source, maxW, maxH) {
    var w = widthOf(source);
    var h = heightOf(source);
    var scale = Math.min(maxW / w, maxH / h, 1);
    var c = newCanvas(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
    var ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, c.width, c.height);
    return c;
  }

  // Shows a finished picture under the download button, so it can be checked before saving.
  function previewInResult(bytes, type, label) {
    var result = document.getElementById("pdf-result");
    if (!result || !window.createImageBitmap) return;
    createImageBitmap(new Blob([bytes], { type: type })).then(function (bmp) {
      var fig = P.el("figure", "img-result-preview");
      var canvas = thumbnail(bmp, 1200, 900);
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", label || "Preview of the new picture");
      fig.appendChild(canvas);
      fig.appendChild(P.el("figcaption", "", "Preview of the new picture"));
      release(bmp);
      var again = result.querySelector(".btn-ghost-dark");
      result.insertBefore(fig, again || null);
    }, function () {});
  }

  /*
   * Wiring for tools that work on a list of pictures (resize, compress, convert).
   *   opts.process(item, index, count) → Promise of { name, bytes, type, detail }
   *     item = { file, name, type, size, width, height }
   *   opts.result(files, items) → { title, summary, note } for the results panel
   *   opts.onChange(items): called when pictures are added or removed
   * Element ids follow the PDF tool template, plus #file-list, #images-summary and #pdf-run.
   */
  function listTool(opts) {
    var items = [];
    var list = document.getElementById("file-list");
    var runBtn = document.getElementById("pdf-run");
    var summary = document.getElementById("images-summary");

    var ui = P.initTool({
      onFiles: addFiles,
      onReset: function () {
        items = [];
        draw();
      }
    });

    function addFiles(files) {
      var pictures = files.filter(isImage);
      var problems = [];
      if (pictures.length < files.length) problems.push((files.length - pictures.length) + " file(s) skipped because they aren't pictures.");
      if (!pictures.length) {
        ui.setStatus("Please choose JPG, PNG, WebP or other picture files.", "error");
        return;
      }
      ui.clearResult();
      ui.setStatus(pictures.length === 1 ? "Opening your picture…" : "Opening " + pictures.length + " pictures…", "busy");
      pictures.reduce(function (chain, file) {
        return chain.then(function () {
          return decode(file).then(function (source) {
            var thumb = P.el("div", "file-thumb is-drawn");
            thumb.appendChild(thumbnail(source, 104, 128));
            items.push({
              file: file, name: file.name, type: file.type, size: file.size,
              width: widthOf(source), height: heightOf(source), thumb: thumb,
              transparent: file.type === "image/jpeg" ? false : hasTransparency(source)
            });
            release(source);
          }).catch(function (err) {
            problems.push(file.name + ": " + P.messageOf(err));
          });
        });
      }, Promise.resolve()).then(function () {
        draw();
        if (items.length) ui.showWork();
        ui.setStatus(problems.join(" "), problems.length ? "error" : "");
      });
    }

    function remove(index) {
      items.splice(index, 1);
      draw();
      if (!items.length) {
        ui.startOver();
        return;
      }
      var li = list.children[Math.min(index, items.length - 1)];
      if (li) li.querySelector("[data-act='remove']").focus();
    }

    function draw() {
      list.textContent = "";
      items.forEach(function (item, i) {
        var li = P.el("li", "file-item");
        li.appendChild(item.thumb);
        var info = P.el("div", "file-info");
        info.appendChild(P.el("span", "file-name", item.name));
        info.appendChild(P.el("span", "file-meta", sizeText(item.width, item.height) + " · " + P.formatBytes(item.size)));
        li.appendChild(info);
        var actions = P.el("div", "file-actions");
        var del = P.iconButton("remove", "Remove " + item.name, function () { remove(i); }, "danger");
        del.dataset.act = "remove";
        actions.appendChild(del);
        li.appendChild(actions);
        list.appendChild(li);
      });
      runBtn.disabled = items.length === 0;
      if (summary) summary.textContent = items.length === 1 ? "1 picture" : items.length + " pictures";
      if (opts.onChange) opts.onChange(items);
    }

    runBtn.addEventListener("click", function () {
      if (!items.length) return;
      var count = items.length;
      ui.run(runBtn, count === 1 ? "Working on your picture…" : "Working on " + count + " pictures…", function () {
        var files = [];
        var used = {};
        return items.reduce(function (chain, item, i) {
          return chain.then(function () {
            if (count > 1) ui.setStatus("Picture " + (i + 1) + " of " + count + "…", "busy");
            return opts.process(item, i, count).then(function (f) {
              // Two pictures with the same name would overwrite each other in the ZIP file.
              var name = f.name;
              var n = 2;
              while (used[name.toLowerCase()]) name = f.name.replace(/(\.[a-z0-9]+)$/i, " (" + n++ + ")$1");
              used[name.toLowerCase()] = true;
              f.name = name;
              files.push(f);
              return P.yieldToBrowser();
            });
          });
        }, Promise.resolve()).then(function () {
          var r = opts.result(files, items);
          var types = files.map(function (f) { return f.type; });
          var one = types.every(function (t) { return t === types[0]; });
          ui.showResult({
            title: r.title,
            summary: r.summary,
            note: r.note,
            files: files,
            noun: one ? (TYPES[types[0]] || { name: "picture" }).name : "picture",
            zipName: r.zipName || "pictures.zip"
          });
          if (files.length === 1) previewInResult(files[0].bytes, files[0].type);
        });
      });
    });

    return { ui: ui, items: function () { return items; } };
  }

  window.ToolNestImage = {
    MAX_PIXELS: MAX_PIXELS,
    TYPES: TYPES,
    fitSize: fitSize,
    downscaleSteps: downscaleSteps,
    outputType: outputType,
    outName: outName,
    percentSaved: percentSaved,
    sizeText: sizeText,
    searchQuality: searchQuality,
    centerBox: centerBox,
    isImage: isImage,
    canSave: canSave,
    decode: decode,
    widthOf: widthOf,
    heightOf: heightOf,
    release: release,
    newCanvas: newCanvas,
    checkSize: checkSize,
    render: render,
    encode: encode,
    hasTransparency: hasTransparency,
    thumbnail: thumbnail,
    previewInResult: previewInResult,
    listTool: listTool
  };
})();
