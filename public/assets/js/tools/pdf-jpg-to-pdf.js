/* JPG to PDF: puts photos and pictures into a PDF, one per page. JPEG and PNG files go in
   untouched (no quality loss); other picture types are converted by the browser first.
   Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  // Page sizes in points (1/72 inch).
  var PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
  var MARGINS = { none: 0, small: 18, large: 36 };
  var PX_TO_PT = 0.75; // "same as picture" pages treat pixels as 1/96 inch

  /*
   * Where a picture goes on its page. w, h: the picture's size in pixels as it should look.
   * opts: { size: "a4" | "letter" | "fit", orientation: "auto" | "portrait" | "landscape",
   *         margin: "none" | "small" | "large" }
   * Returns { pageWidth, pageHeight, x, y, width, height } in points; the picture is as big as
   * fits inside the margins, centred.
   */
  function layoutImage(w, h, opts) {
    var m = MARGINS[opts.margin] || 0;
    var pw;
    var ph;
    if (opts.size === "fit") {
      pw = w * PX_TO_PT + 2 * m;
      ph = h * PX_TO_PT + 2 * m;
    } else {
      var size = PAGE_SIZES[opts.size] || PAGE_SIZES.a4;
      var landscape = opts.orientation === "landscape" || (opts.orientation !== "portrait" && w > h);
      pw = landscape ? size[1] : size[0];
      ph = landscape ? size[0] : size[1];
    }
    var scale = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h);
    var iw = w * scale;
    var ih = h * scale;
    return { pageWidth: pw, pageHeight: ph, x: (pw - iw) / 2, y: (ph - ih) / 2, width: iw, height: ih };
  }

  /*
   * The drawing matrix that shows a stored picture the right way up in the box (x, y, w, h),
   * for each EXIF orientation (1 = as stored; 3, 6, 8 = turned; 2, 4, 5, 7 = mirrored).
   */
  function orientMatrix(o, x, y, w, h) {
    switch (o) {
      case 2: return [-w, 0, 0, h, x + w, y];
      case 3: return [-w, 0, 0, -h, x + w, y + h];
      case 4: return [w, 0, 0, -h, x, y + h];
      case 5: return [0, -h, -w, 0, x + w, y + h];
      case 6: return [0, -h, w, 0, x, y + h];
      case 7: return [0, h, w, 0, x, y];
      case 8: return [0, h, -w, 0, x + w, y];
      default: return [w, 0, 0, h, x, y];
    }
  }

  // ---------------------------------------------------------------- Colour profiles
  // Photos carry a colour profile that says what their colours mean (iPhones use wide "Display P3"
  // colours). PDF readers ignore a profile left inside the picture file and show the colours
  // duller, so the profile is copied into the PDF, where readers look for it.

  function ascii(bytes, at, n) {
    return String.fromCharCode.apply(null, Array.prototype.slice.call(bytes.subarray(at, at + n)));
  }

  // Colour channels an ICC profile describes (3 for RGB, 1 for grey), or 0 if it isn't a usable
  // profile. A real profile starts with its own size and has "acsp" at byte 36.
  function profileChannels(icc) {
    if (!icc || icc.length < 132 || ascii(icc, 36, 4) !== "acsp") return 0;
    if (((icc[0] << 24) | (icc[1] << 16) | (icc[2] << 8) | icc[3]) >>> 0 !== icc.length) return 0;
    var space = ascii(icc, 16, 4);
    return space === "RGB " ? 3 : space === "GRAY" ? 1 : 0;
  }

  // A JPEG's profile, which may be split over several APP2 "ICC_PROFILE" blocks, each saying
  // "block n of count". Some apps save a second profile too; only the first complete one is used.
  function jpegProfile(bytes) {
    var parts = [];
    var count = 0;
    var pos = 2;
    while (pos + 4 <= bytes.length && bytes[pos] === 0xff) {
      var marker = bytes[pos + 1];
      if (marker === 0xff) { pos++; continue; }
      if (marker === 0xda || marker === 0xd9) break;
      var len = (bytes[pos + 2] << 8) | bytes[pos + 3];
      if (marker === 0xe2 && len > 16 && ascii(bytes, pos + 4, 12) === "ICC_PROFILE\u0000") {
        var seq = bytes[pos + 16];
        if (!count) count = bytes[pos + 17];
        if (bytes[pos + 17] === count && seq >= 1 && seq <= count && !parts[seq - 1]) parts[seq - 1] = bytes.subarray(pos + 18, pos + 2 + len);
      }
      pos += 2 + len;
    }
    if (!count) return null;
    for (var i = 0; i < count; i++) if (!parts[i]) return null; // a block is missing
    var size = parts.reduce(function (s, p) { return s + p.length; }, 0);
    var icc = new Uint8Array(size);
    var at = 0;
    parts.forEach(function (p) { icc.set(p, at); at += p.length; });
    return profileChannels(icc) ? icc : null;
  }

  // A PNG's profile from its iCCP chunk (stored compressed). → Promise of bytes or null
  function pngProfile(bytes) {
    var pos = 8;
    while (pos + 12 <= bytes.length) {
      var len = ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
      var type = ascii(bytes, pos + 4, 4);
      if (type === "iCCP") {
        var data = bytes.subarray(pos + 8, pos + 8 + len);
        var nameEnd = data.indexOf(0);
        if (nameEnd < 1 || data[nameEnd + 1] !== 0) return Promise.resolve(null);
        return inflate(data.subarray(nameEnd + 2)).then(function (icc) { return profileChannels(icc) ? icc : null; });
      }
      if (type === "IDAT" || type === "IEND") break;
      pos += 12 + len;
    }
    return Promise.resolve(null);
  }

  function inflate(bytes) {
    if (typeof DecompressionStream === "undefined") return Promise.resolve(null);
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); }, function () { return null; });
  }

  // Tells the PDF to read the picture's colours through its profile, if the profile fits the picture.
  function attachProfile(doc, image, icc, shared) {
    var L = window.PDFLib;
    var N = L.PDFName;
    var ctx = doc.context;
    var dict = ctx.lookup(image.ref).dict;
    var space = dict.lookup(N.of("ColorSpace"));
    var channels = space === N.of("DeviceRGB") ? 3 : space === N.of("DeviceGray") ? 1 : 0;
    if (!icc || !channels || profileChannels(icc) !== channels) return false;
    var key = P.crc32(icc) + ":" + icc.length;
    if (!shared[key]) {
      shared[key] = ctx.register(ctx.flateStream(icc, { N: channels, Alternate: channels === 3 ? "DeviceRGB" : "DeviceGray" }));
    }
    dict.set(N.of("ColorSpace"), ctx.obj(["ICCBased", shared[key]]));
    return true;
  }

  // items: [{ kind: "jpg" | "png", bytes }] → bytes of a PDF with one picture per page
  function imagesToPdf(items, opts) {
    return P.createDoc().then(function (doc) {
      var L = window.PDFLib; // loaded on demand by createDoc
      var profiles = {}; // the same profile is stored once, however many pictures use it
      return items.reduce(function (chain, item) {
        return chain.then(function () {
          // pdf-lib reads from the start of the underlying buffer, so give it bytes that begin there.
          item = { kind: item.kind, name: item.name, bytes: item.bytes.byteOffset ? new Uint8Array(item.bytes) : item.bytes };
          var orientation = 1;
          var embed;
          if (item.kind === "jpg") {
            var info = P.jpegInfo(item.bytes);
            if (!info) throw P.userError("One of the pictures isn't a JPEG we can read.");
            orientation = info.orientation;
            embed = doc.embedJpg(item.bytes);
          } else {
            embed = doc.embedPng(item.bytes);
          }
          var profile = item.kind === "jpg" ? Promise.resolve(jpegProfile(item.bytes)) : pngProfile(item.bytes);
          return embed.then(function (image) {
            // Write the picture into the file now (not at save time) so its colour profile can be added.
            return Promise.all([image.embed(), profile]).then(function (done) {
              attachProfile(doc, image, done[1], profiles);
              return image;
            });
          }).catch(function (err) {
            console.error(err);
            throw P.userError((item.name || "One of the pictures") + " couldn't be added. Try saving it as a JPG first.");
          }).then(function (image) {
            var turned = orientation >= 5;
            var w = turned ? image.height : image.width;
            var h = turned ? image.width : image.height;
            var box = layoutImage(w, h, opts);
            var page = doc.addPage([box.pageWidth, box.pageHeight]);
            var name = page.node.newXObject("Image", image.ref);
            var m = orientMatrix(orientation, box.x, box.y, box.width, box.height);
            page.pushOperators(
              L.pushGraphicsState(),
              L.concatTransformationMatrix(m[0], m[1], m[2], m[3], m[4], m[5]),
              L.drawObject(name),
              L.popGraphicsState()
            );
            return P.yieldToBrowser();
          });
        });
      }, Promise.resolve()).then(function () {
        return P.saveDoc(doc);
      });
    });
  }

  window.ToolNestCalc = {
    layoutImage: layoutImage, orientMatrix: orientMatrix, imagesToPdf: imagesToPdf,
    jpegProfile: jpegProfile, pngProfile: pngProfile, profileChannels: profileChannels
  };
  if (!document.getElementById("pdf-tool")) return;

  // ---------------------------------------------------------------- Page wiring

  var items = []; // { name, bytes, kind, width, height, thumb }
  var list = document.getElementById("file-list");
  var runBtn = document.getElementById("pdf-run");
  var summary = document.getElementById("images-summary");
  var sizeSelect = document.getElementById("page-size");
  var orientSelect = document.getElementById("page-orientation");

  // US and Canadian visitors usually print on Letter paper; everyone else on A4.
  if (/-(US|CA)$/i.test(navigator.language || "")) sizeSelect.value = "letter";

  var ui = P.initTool({
    onFiles: addFiles,
    onReset: function () {
      items = [];
      render();
    }
  });

  P.sortable(list, function (from, to) {
    P.moveItem(items, from, to);
    render();
  });

  sizeSelect.addEventListener("change", function () {
    orientSelect.disabled = sizeSelect.value === "fit";
  });

  function isImage(file) {
    return /^image\//.test(file.type) || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name);
  }

  // Turns one chosen file into { kind, bytes, width, height, bitmap } ready for the PDF.
  function prepare(file) {
    return P.readFile(file).then(function (bytes) {
      var jpeg = P.jpegInfo(bytes);
      if (jpeg && (jpeg.components === 1 || jpeg.components === 3)) {
        return decode(new Blob([bytes], { type: "image/jpeg" })).then(function (bitmap) {
          return { kind: "jpg", bytes: bytes, bitmap: bitmap };
        });
      }
      var png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      return decode(new Blob([bytes], { type: file.type || "application/octet-stream" })).then(function (bitmap) {
        if (png) return { kind: "png", bytes: bytes, bitmap: bitmap };
        // Other types (and CMYK JPEGs): let the browser convert them. Photos become JPEG and
        // graphics (GIF, BMP) become PNG so sharp edges stay sharp.
        var toPng = /\.(gif|bmp)$/i.test(file.name) || /image\/(gif|bmp)/.test(file.type);
        return convert(bitmap, toPng).then(function (converted) {
          return { kind: toPng ? "png" : "jpg", bytes: converted, bitmap: bitmap };
        });
      });
    });
  }

  function decode(blob) {
    return createImageBitmap(blob).catch(function () {
      throw P.userError("your browser can't open this type of picture. Save it as JPG or PNG and try again.");
    });
  }

  function convert(bitmap, toPng) {
    var canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    var ctx = canvas.getContext("2d");
    if (!toPng) {
      ctx.fillStyle = "#fff"; // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(P.userError("we couldn't convert this picture."));
        blob.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); }, reject);
      }, toPng ? "image/png" : "image/jpeg", 0.95);
    });
  }

  function addFiles(files) {
    var pictures = files.filter(isImage);
    var problems = [];
    if (pictures.length < files.length) problems.push((files.length - pictures.length) + " file(s) skipped because they aren't pictures.");
    if (!pictures.length) {
      ui.setStatus("Please choose JPG, PNG or other picture files.", "error");
      return;
    }
    ui.clearResult();
    ui.setStatus(pictures.length === 1 ? "Opening your picture…" : "Opening " + pictures.length + " pictures…", "busy");
    pictures.reduce(function (chain, file) {
      return chain.then(function () {
        return prepare(file).then(function (ready) {
          var thumb = P.el("div", "file-thumb is-drawn");
          var canvas = P.el("canvas");
          var scale = Math.min(104 / ready.bitmap.width, 128 / ready.bitmap.height, 1);
          canvas.width = Math.max(1, Math.round(ready.bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(ready.bitmap.height * scale));
          canvas.getContext("2d").drawImage(ready.bitmap, 0, 0, canvas.width, canvas.height);
          thumb.appendChild(canvas);
          items.push({ name: file.name, bytes: ready.bytes, kind: ready.kind, width: ready.bitmap.width, height: ready.bitmap.height, size: file.size, thumb: thumb });
          if (ready.bitmap.close) ready.bitmap.close();
        }).catch(function (err) {
          problems.push(file.name + ": " + P.messageOf(err));
        });
      });
    }, Promise.resolve()).then(function () {
      render();
      if (items.length) ui.showWork();
      ui.setStatus(problems.join(" "), problems.length ? "error" : "");
    });
  }

  function move(index, by, act) {
    P.moveItem(items, index, index + by);
    render();
    var li = list.children[index + by];
    var target = li && li.querySelector("[data-act='" + act + "']");
    if (target && target.disabled) target = li.querySelector("[data-act='" + (act === "up" ? "down" : "up") + "']");
    if (target) target.focus();
  }

  function remove(index) {
    items.splice(index, 1);
    render();
    if (!items.length) {
      ui.startOver();
      return;
    }
    var li = list.children[Math.min(index, items.length - 1)];
    if (li) li.querySelector("[data-act='remove']").focus();
  }

  function render() {
    list.textContent = "";
    items.forEach(function (item, i) {
      var li = P.el("li", "file-item");
      li.dataset.index = i;
      li.draggable = true;
      li.appendChild(item.thumb);
      var info = P.el("div", "file-info");
      info.appendChild(P.el("span", "file-name", item.name));
      info.appendChild(P.el("span", "file-meta", item.width + " × " + item.height + " px · " + P.formatBytes(item.size)));
      li.appendChild(info);
      var actions = P.el("div", "file-actions");
      var up = P.iconButton("up", "Move " + item.name + " up", function () { move(i, -1, "up"); });
      var down = P.iconButton("down", "Move " + item.name + " down", function () { move(i, 1, "down"); });
      var del = P.iconButton("remove", "Remove " + item.name, function () { remove(i); }, "danger");
      up.dataset.act = "up";
      down.dataset.act = "down";
      del.dataset.act = "remove";
      up.disabled = i === 0;
      down.disabled = i === items.length - 1;
      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(del);
      li.appendChild(actions);
      list.appendChild(li);
    });
    runBtn.disabled = items.length === 0;
    summary.textContent = items.length === 1 ? "1 picture · 1 page" : items.length + " pictures · one per page";
  }

  runBtn.addEventListener("click", function () {
    var opts = {
      size: sizeSelect.value,
      orientation: orientSelect.value,
      margin: document.getElementById("page-margin").value
    };
    var count = items.length;
    var name = count === 1 ? P.baseName(items[0].name) + ".pdf" : "pictures.pdf";
    ui.run(runBtn, count === 1 ? "Making your PDF…" : "Putting " + count + " pictures into a PDF…", function () {
      return imagesToPdf(items, opts).then(function (bytes) {
        ui.showResult({
          title: "Your PDF is ready",
          summary: count === 1 ? "1 picture on 1 page." : count + " pictures, one on each page.",
          files: [{ name: name, bytes: bytes, type: "application/pdf", detail: P.pagesWord(count) }]
        });
      });
    });
  });
})();
