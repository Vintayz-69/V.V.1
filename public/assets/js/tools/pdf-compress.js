/* Compress PDF: makes a PDF smaller in the browser. Text and drawings stay as they are (sharp and
   selectable). The savings come from:
     1. photos: re-saved as JPEG at a lower quality, and shrunk if they're very large;
     2. data saved without compression: compressed losslessly;
     3. leftover objects nothing uses: removed. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  var LEVELS = {
    light: { maxSide: 3000, quality: 0.82, rawToJpeg: false },
    recommended: { maxSide: 2000, quality: 0.7, rawToJpeg: true },
    strong: { maxSide: 1400, quality: 0.5, rawToJpeg: true }
  };

  // Images smaller than this aren't worth re-saving.
  var MIN_IMAGE_BYTES = 12000;

  // Size an image should be shrunk to so its longest side is at most maxSide.
  function targetSize(width, height, maxSide) {
    var scale = Math.min(1, maxSide / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
  }

  /*
   * bytes: the PDF. level: "light" | "recommended" | "strong".
   * encode(job) re-saves one image and resolves to { bytes, width, height } of a JPEG (or null
   * to leave it alone). The browser version draws on a canvas; tests pass in their own.
   * onProgress(done, total) is told how many images have been looked at.
   * Resolves to { bytes, images } where images is how many were made smaller.
   */
  function compressPdf(bytes, level, encode, onProgress) {
    var L; // pdf-lib is loaded on demand, so it's only read once the PDF has been opened
    var N;
    var opts = LEVELS[level] || LEVELS.recommended;

    return P.openPdf(bytes).then(function (doc) {
      L = window.PDFLib;
      N = L.PDFName;
      var ctx = doc.context;
      var masks = new Set();
      var jobs = [];

      ctx.enumerateIndirectObjects().forEach(function (pair) {
        var obj = pair[1];
        if (!(obj instanceof L.PDFRawStream)) return;
        ["SMask", "Mask"].forEach(function (key) {
          var m = obj.dict.get(N.of(key));
          if (m instanceof L.PDFRef) masks.add(m);
        });
      });

      ctx.enumerateIndirectObjects().forEach(function (pair) {
        var ref = pair[0];
        var obj = pair[1];
        if (!(obj instanceof L.PDFRawStream) || masks.has(ref)) return;
        var job = imageJob(obj);
        if (job) {
          job.ref = ref;
          jobs.push(job);
        }
      });

      var changed = 0;
      var done = 0;
      return jobs.reduce(function (chain, job) {
        return chain.then(function () {
          return new Promise(function (resolve) { resolve(encode(job)); }).then(function (out) {
            var limit = job.kind === "jpeg" ? job.original.length * 0.9 : job.original.length * 0.5;
            if (out && out.bytes && out.bytes.length < limit) {
              ctx.assign(job.ref, L.PDFRawStream.of(newImageDict(job, out), out.bytes));
              changed++;
            }
          }, function () { /* leave this image as it was */ }).then(function () {
            done++;
            if (onProgress) onProgress(done, jobs.length);
            return P.yieldToBrowser();
          });
        });
      }, Promise.resolve()).then(function () {
        return deflateLoose(ctx);
      }).then(function () {
        removeUnused(ctx);
        P.touch(doc);
        return P.saveDoc(doc);
      }).then(function (out) {
        return { bytes: out, images: changed };
      });

      // What to do with one stream, or null if it isn't an image we can safely re-save.
      function imageJob(stream) {
        var d = stream.dict;
        if (d.lookup(N.of("Subtype")) !== N.of("Image")) return null;
        if (d.lookup(N.of("ImageMask")) === L.PDFBool.True || d.get(N.of("Decode"))) return null;
        var width = num(d.lookup(N.of("Width")));
        var height = num(d.lookup(N.of("Height")));
        if (!width || !height || stream.contents.length < MIN_IMAGE_BYTES) return null;
        var comps = channels(d.lookup(N.of("ColorSpace")));
        if (!comps) return null;
        var filter = d.lookup(N.of("Filter"));
        if (filter instanceof L.PDFArray && filter.size() === 1) filter = filter.lookup(0);
        // Images with a transparency mask keep their size: the mask is matched to it.
        var hasMask = !!(d.get(N.of("SMask")) || d.get(N.of("Mask")));
        var size = hasMask ? { width: width, height: height } : targetSize(width, height, opts.maxSide);
        var job = {
          width: width, height: height, components: comps, original: stream.contents,
          targetWidth: size.width, targetHeight: size.height, quality: opts.quality, dict: d
        };
        if (filter === N.of("DCTDecode")) {
          var info = P.jpegInfo(stream.contents);
          if (!info || info.components !== comps) return null;
          job.kind = "jpeg";
          return job;
        }
        if (filter === N.of("FlateDecode") && opts.rawToJpeg && num(d.lookup(N.of("BitsPerComponent"))) === 8) {
          job.kind = "raw";
          job.pixels = function () { return rawPixels(stream, width, height, comps); };
          return job;
        }
        return null;
      }

      function channels(cs) {
        if (cs === N.of("DeviceRGB")) return 3;
        if (cs === N.of("DeviceGray")) return 1;
        if (cs instanceof L.PDFArray && cs.lookup(0) === N.of("ICCBased")) {
          var profile = cs.lookup(1);
          var n = profile && profile.dict ? num(profile.dict.lookup(N.of("N"))) : 0;
          return n === 3 || n === 1 ? n : 0;
        }
        return 0;
      }

      function newImageDict(job, out) {
        var d = job.dict.clone(ctx);
        ["Filter", "DecodeParms", "Length", "ColorSpace", "BitsPerComponent", "Width", "Height"].forEach(function (k) { d.delete(N.of(k)); });
        d.set(N.of("Filter"), N.of("DCTDecode"));
        d.set(N.of("ColorSpace"), N.of(out.components === 1 ? "DeviceGray" : "DeviceRGB"));
        d.set(N.of("BitsPerComponent"), ctx.obj(8));
        d.set(N.of("Width"), ctx.obj(out.width));
        d.set(N.of("Height"), ctx.obj(out.height));
        d.set(N.of("Length"), ctx.obj(out.bytes.length));
        return d;
      }
    });

    function num(v) {
      return v instanceof L.PDFNumber ? v.asNumber() : 0;
    }

    // Decoded pixels of a Flate image (undoing PNG row filters if it uses them), or null.
    function rawPixels(stream, width, height, comps) {
      var data = L.decodePDFRawStream(stream).decode();
      var parms = stream.dict.lookup(N.of("DecodeParms"));
      if (parms instanceof L.PDFArray) parms = parms.lookup(0);
      var predictor = parms instanceof L.PDFDict ? num(parms.lookup(N.of("Predictor"))) : 1;
      if (predictor >= 10) data = unfilterPng(data, width * comps, comps, height);
      else if (predictor > 1) return null;
      return data && data.length >= width * height * comps ? data.subarray(0, width * height * comps) : null;
    }

    // Deflates streams that were saved with no compression at all (lossless).
    function deflateLoose(ctx) {
      if (typeof CompressionStream === "undefined") return Promise.resolve();
      var loose = ctx.enumerateIndirectObjects().filter(function (pair) {
        var obj = pair[1];
        return obj instanceof L.PDFRawStream && !obj.dict.get(N.of("Filter")) &&
          obj.dict.lookup(N.of("Type")) !== N.of("Metadata") && obj.contents.length > 512;
      });
      return loose.reduce(function (chain, pair) {
        return chain.then(function () {
          return deflate(pair[1].contents).then(function (packed) {
            if (packed.length >= pair[1].contents.length) return;
            var d = pair[1].dict.clone(ctx);
            d.set(N.of("Filter"), N.of("FlateDecode"));
            d.set(N.of("Length"), ctx.obj(packed.length));
            ctx.assign(pair[0], L.PDFRawStream.of(d, packed));
          });
        });
      }, Promise.resolve());
    }

    // Deletes objects that nothing in the document points to any more.
    function removeUnused(ctx) {
      var seen = new Set();
      var stack = [];
      var t = ctx.trailerInfo;
      [t.Root, t.Info, t.Encrypt, t.ID].forEach(visit);
      while (stack.length) {
        var obj = stack.pop();
        if (obj instanceof L.PDFDict) obj.entries().forEach(function (e) { visit(e[1]); });
        else if (obj instanceof L.PDFArray) obj.asArray().forEach(visit);
        else if (obj instanceof L.PDFStream) obj.dict.entries().forEach(function (e) { visit(e[1]); });
      }
      ctx.enumerateIndirectObjects().forEach(function (pair) {
        if (!seen.has(pair[0])) ctx.delete(pair[0]);
      });

      function visit(v) {
        if (!v) return;
        if (v instanceof L.PDFRef) {
          if (seen.has(v)) return;
          seen.add(v);
          var target = ctx.lookup(v);
          if (target) stack.push(target);
        } else {
          stack.push(v);
        }
      }
    }
  }

  // Reverses PNG row filters (PDF predictors 10–15). rowBytes = width × channels.
  function unfilterPng(data, rowBytes, bpp, rows) {
    var out = new Uint8Array(rowBytes * rows);
    var pos = 0;
    for (var y = 0; y < rows; y++) {
      if (pos + 1 + rowBytes > data.length) return null;
      var type = data[pos++];
      var row = y * rowBytes;
      var prev = row - rowBytes;
      for (var x = 0; x < rowBytes; x++) {
        var raw = data[pos++];
        var a = x >= bpp ? out[row + x - bpp] : 0;
        var b = y > 0 ? out[prev + x] : 0;
        var c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0;
        var v;
        if (type === 0) v = raw;
        else if (type === 1) v = raw + a;
        else if (type === 2) v = raw + b;
        else if (type === 3) v = raw + ((a + b) >> 1);
        else if (type === 4) {
          var pa = Math.abs(b - c);
          var pb = Math.abs(a - c);
          var pc = Math.abs(a + b - 2 * c);
          v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
        } else return null;
        out[row + x] = v & 0xff;
      }
    }
    return out;
  }

  function deflate(bytes) {
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
    return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }

  // ---------------------------------------------------------------- Browser image re-saving

  function canvasToJpeg(canvas, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error("encode"));
        blob.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); }, reject);
      }, "image/jpeg", quality);
    });
  }

  function browserEncode(job) {
    var canvas = document.createElement("canvas");
    canvas.width = job.targetWidth;
    canvas.height = job.targetHeight;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    var source;
    if (job.kind === "jpeg") {
      source = createImageBitmap(new Blob([P.stripExif(job.original)], { type: "image/jpeg" }));
    } else {
      var px = job.pixels();
      if (!px) return Promise.resolve(null);
      var rgba = new ImageData(job.width, job.height);
      for (var i = 0, j = 0; i < job.width * job.height; i++, j += 4) {
        var o = i * job.components;
        rgba.data[j] = px[o];
        rgba.data[j + 1] = job.components === 3 ? px[o + 1] : px[o];
        rgba.data[j + 2] = job.components === 3 ? px[o + 2] : px[o];
        rgba.data[j + 3] = 255;
      }
      source = createImageBitmap(rgba);
    }
    return source.then(function (bitmap) {
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (bitmap.close) bitmap.close();
      return canvasToJpeg(canvas, job.quality);
    }).then(function (bytes) {
      return { bytes: bytes, width: canvas.width, height: canvas.height, components: 3 };
    });
  }

  window.ToolNestCalc = { compressPdf: compressPdf, targetSize: targetSize, unfilterPng: unfilterPng, LEVELS: LEVELS };
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var ui = P.singlePdfTool({});

  function level() {
    var checked = document.querySelector("input[name=level]:checked");
    return checked ? checked.value : "recommended";
  }

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state) return;
    ui.run(runBtn, "Compressing your PDF…", function () {
      return compressPdf(state.bytes, level(), browserEncode, function (done, total) {
        ui.setStatus("Compressing images: " + done + " of " + total + "…", "busy");
      }).then(function (res) {
        var before = state.bytes.length;
        var after = res.bytes.length;
        var saved = Math.round((1 - after / before) * 100);
        if (after >= before * 0.98) {
          ui.setStatus("This PDF is already well compressed, so we couldn't make it meaningfully smaller. Keep your original file." +
            (level() !== "strong" ? " You can also try Strong compression." : ""), "error");
          return;
        }
        ui.showResult({
          title: "Your PDF is " + saved + "% smaller",
          summary: P.formatBytes(before) + " → " + P.formatBytes(after) + (res.images ? " · " + res.images + (res.images === 1 ? " image" : " images") + " re-saved" : ""),
          files: [{ name: state.base + "-compressed.pdf", bytes: res.bytes, type: "application/pdf", detail: P.pagesWord(state.pages) }],
          note: "Open the new file and check the pictures look good enough before you delete the original."
        });
      });
    });
  });
})();
