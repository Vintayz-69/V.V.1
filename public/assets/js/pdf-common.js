/* ToolNest PDF helpers, shared by every PDF tool.
 *
 * Files are opened and changed by the visitor's own browser. Nothing is uploaded, and nothing
 * is stored on the device (LEGAL.md §2 and §9). The two PDF libraries are served from our own
 * domain and loaded only when someone picks a file:
 *   pdf-lib (MIT)      assets/vendor/pdf-lib/  — reads, changes and writes PDFs
 *   pdf.js (Apache 2)  assets/vendor/pdfjs/    — draws page previews and page images
 */

(function () {
  "use strict";

  // assets/ folder, worked out from this script's own address so pages at any depth work.
  var BASE = (function () {
    var script = document.currentScript;
    return script && script.src ? script.src.replace(/js\/pdf-common\.js(?:\?.*)?$/, "") : "";
  })();

  // An error whose message is written for the visitor.
  function userError(message) {
    var err = new Error(message);
    err.forVisitor = true;
    return err;
  }

  function messageOf(err) {
    if (err && err.forVisitor) return err.message;
    return "Something went wrong while working on your file. Please try again, or try a different file.";
  }

  // ---------------------------------------------------------------- Libraries

  var pdfLibPromise = null;

  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!pdfLibPromise) {
      pdfLibPromise = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = BASE + "vendor/pdf-lib/pdf-lib.min.js";
        script.onload = function () { resolve(window.PDFLib); };
        script.onerror = function () {
          pdfLibPromise = null;
          reject(userError("The PDF tool didn't load. Check your connection and try again."));
        };
        document.head.appendChild(script);
      });
    }
    return pdfLibPromise;
  }

  var pdfJsPromise = null;

  function loadPdfJs() {
    if (!pdfJsPromise) {
      pdfJsPromise = import(BASE + "vendor/pdfjs/pdf.min.js").then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc = BASE + "vendor/pdfjs/pdf.worker.min.js";
        return lib;
      }, function () {
        pdfJsPromise = null;
        throw userError("The page preview didn't load. Check your connection and try again.");
      });
    }
    return pdfJsPromise;
  }

  // Opens a PDF with pdf.js for drawing pages. WebAssembly is switched off because the site's
  // Content-Security-Policy blocks it; pdf.js then uses its plain JavaScript decoders.
  function openForView(bytes) {
    return loadPdfJs().then(function (lib) {
      return lib.getDocument({
        data: bytes.slice(), // pdf.js takes ownership of the buffer it is given
        cMapUrl: BASE + "vendor/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: BASE + "vendor/pdfjs/standard_fonts/",
        wasmUrl: BASE + "vendor/pdfjs/wasm/",
        useWasm: false,
        enableXfa: false
      }).promise.catch(function (err) {
        if (err && err.name === "PasswordException") {
          throw userError("This PDF is protected with a password. Remove the password in the app that made it, then try again.");
        }
        throw userError("We couldn't read this PDF. It may be damaged. Try opening it and saving it again in another app first.");
      });
    });
  }

  // Frees the memory pdf.js used for a document (pdf.js closes documents through their loading task).
  function closeView(pdf) {
    var task = pdf && (pdf.loadingTask || pdf);
    if (task && task.destroy) task.destroy();
  }

  // ---------------------------------------------------------------- Reading and writing PDFs

  function readFile(file) {
    if (file.arrayBuffer) return file.arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(new Uint8Array(reader.result)); };
      reader.onerror = function () { reject(userError("We couldn't read that file.")); };
      reader.readAsArrayBuffer(file);
    });
  }

  // A PDF starts with "%PDF-", sometimes after a little junk.
  function looksLikePdf(bytes) {
    var end = Math.min(bytes.length - 5, 1024);
    for (var i = 0; i <= end; i++) {
      if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) return true;
    }
    return false;
  }

  function openPdf(bytes) {
    if (!looksLikePdf(bytes)) return Promise.reject(userError("This file isn't a PDF."));
    return loadPdfLib().then(function (L) {
      return L.PDFDocument.load(bytes, { updateMetadata: false }).then(function (doc) {
        var count = 0;
        try { count = doc.getPageCount(); } catch (e) { count = 0; }
        if (!count) throw userError("We couldn't find any pages in this PDF. It may be damaged.");
        return doc;
      }, function (err) {
        if (err instanceof L.EncryptedPDFError || /encrypt/i.test(err && err.message)) {
          throw userError("This PDF is protected with a password or security settings, so it can't be changed. Remove the protection in the app that made it, then try again.");
        }
        throw userError("We couldn't read this PDF. It may be damaged. Try opening it and saving it again in another app first.");
      });
    });
  }

  function createDoc() {
    return loadPdfLib().then(function (L) {
      return L.PDFDocument.create({ updateMetadata: false });
    }).then(function (doc) {
      var now = new Date();
      doc.setProducer("ToolNest PDF tools (vintayz.com)");
      doc.setCreationDate(now);
      doc.setModificationDate(now);
      return doc;
    });
  }

  function saveDoc(doc) {
    return doc.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
  }

  // Marks a changed PDF as modified today; everything else about it is kept.
  function touch(doc) {
    doc.setModificationDate(new Date());
  }

  function asDoc(source) {
    return source && source.context ? Promise.resolve(source) : openPdf(source);
  }

  /*
   * Copies pages from one PDF into another. Pages are copied by reference, so links between
   * pages that are both copied keep working. Anything on a copied page that points at a page
   * that is NOT copied (internal links, form field groups, article threads) is removed first;
   * otherwise the copier would pull the left-out page, and its content, into the new file.
   */
  function copyPagesInto(src, dest, indices) {
    var L = window.PDFLib;
    var N = L.PDFName;
    var srcPages = src.getPages();
    var keep = new Set(indices.map(function (i) { return srcPages[i].ref; }));

    indices.forEach(function (i) { detachPage(src.context, srcPages[i].node, keep); });

    var copier = L.PDFObjectCopier.for(src.context, dest.context);
    return indices.map(function (i) {
      var ref = copier.copy(srcPages[i].ref);
      var page = L.PDFPage.of(dest.context.lookup(ref), ref, dest);
      dest.addPage(page);
      return page;
    });

    function detachPage(ctx, node, keepRefs) {
      node.delete(N.of("B"));
      var annots = ctx.lookup(node.get(N.of("Annots")));
      if (!(annots instanceof L.PDFArray)) return;
      for (var k = 0; k < annots.size(); k++) {
        var annot = annots.lookup(k);
        if (!(annot instanceof L.PDFDict)) continue;
        annot.delete(N.of("Parent")); // form field groups can span pages
        annot.delete(N.of("IRT"));
        annot.delete(N.of("AA"));
        var owner = annot.get(N.of("P"));
        if (owner instanceof L.PDFRef && !keepRefs.has(owner)) annot.delete(N.of("P"));
        if (pointsAway(ctx.lookup(annot.get(N.of("Dest"))), keepRefs)) annot.delete(N.of("Dest"));
        var action = annot.lookup(N.of("A"));
        if (action instanceof L.PDFDict) {
          var kind = action.lookup(N.of("S"));
          if (kind === N.of("GoTo") ? pointsAway(ctx.lookup(action.get(N.of("D"))), keepRefs) : kind !== N.of("URI")) {
            annot.delete(N.of("A"));
          } else {
            action.delete(N.of("Next"));
          }
        }
      }
    }

    function pointsAway(dest, keepRefs) {
      if (!(dest instanceof L.PDFArray) || !dest.size()) return false;
      var target = dest.get(0);
      return target instanceof L.PDFRef && !keepRefs.has(target);
    }
  }

  // Makes a new PDF from some pages of `source` (0-based indices, in the order given).
  function pagesToNewPdf(source, indices) {
    return Promise.all([asDoc(source), createDoc()]).then(function (docs) {
      copyPagesInto(docs[0], docs[1], indices);
      return saveDoc(docs[1]);
    });
  }

  /*
   * Puts the pages of `doc` in a new order (0-based indices) without copying them, so bookmarks,
   * links and form fields keep working. Values a page inherits from its parent are copied onto
   * the page first, because every page moves under the root of the page tree.
   */
  function setPageOrder(doc, order) {
    var L = window.PDFLib;
    var N = L.PDFName;
    var pages = doc.getPages();
    ["Resources", "MediaBox", "CropBox", "Rotate"].forEach(function (name) {
      var key = N.of(name);
      pages.forEach(function (page) {
        if (page.node.get(key) !== undefined) return;
        var value = page.node.getInheritableAttribute(key);
        if (value !== undefined) page.node.set(key, value);
      });
    });
    var rootRef = doc.catalog.get(N.of("Pages"));
    var root = doc.catalog.Pages();
    root.set(N.of("Kids"), doc.context.obj(order.map(function (i) { return pages[i].ref; })));
    root.set(N.of("Count"), doc.context.obj(order.length));
    order.forEach(function (i) { pages[i].node.set(N.of("Parent"), rootRef); });
  }

  /*
   * A page as the reader sees it, after the page's own rotation. `toPdf` turns a point measured
   * from the bottom-left of that view into PDF coordinates, and `rotation` is the angle text
   * must be drawn at to look upright.
   */
  function pageView(page) {
    var box = page.getCropBox();
    var r = ((Math.round(page.getRotation().angle / 90) * 90) % 360 + 360) % 360;
    var w = box.width;
    var h = box.height;
    return {
      width: r % 180 ? h : w,
      height: r % 180 ? w : h,
      rotation: r,
      toPdf: function (vx, vy) {
        var px = vx;
        var py = vy;
        if (r === 90) { px = w - vy; py = vx; }
        else if (r === 180) { px = w - vx; py = h - vy; }
        else if (r === 270) { px = vy; py = h - vx; }
        return { x: box.x + px, y: box.y + py };
      }
    };
  }

  // ---------------------------------------------------------------- Page ranges

  function pagesWord(n) {
    return n === 1 ? "1 page" : n + " pages";
  }

  /*
   * Reads text like "1-3, 5, 8-" into ranges: [[1, 3], [5, 5], [8, count]].
   * "8-" runs to the last page and "-4" starts at page 1.
   * Returns { ranges } or { error } with a message for the visitor.
   */
  function parseRanges(text, count) {
    var parts = String(text || "").replace(/[–—]/g, "-").split(/[,;]+/);
    var ranges = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      var m = /^(\d*)\s*(-)?\s*(\d*)$/.exec(part);
      if (!m || (!m[1] && !m[3]) || (!m[2] && (!m[1] || m[3]))) {
        return { error: "\"" + part + "\" isn't a page number or range. Use numbers like 1-3, 5." };
      }
      var start = m[1] ? Number(m[1]) : 1;
      var end = m[2] ? (m[3] ? Number(m[3]) : count) : start;
      if (start < 1 || end < 1) return { error: "Page numbers start at 1." };
      if (start > count || end > count) return { error: "This PDF has only " + pagesWord(count) + "." };
      if (start > end) return { error: "Write ranges from low to high, like " + end + "-" + start + "." };
      ranges.push([start, end]);
    }
    if (!ranges.length) return { error: "Enter at least one page number." };
    return { ranges: ranges };
  }

  // Sorted list of the page numbers covered by some ranges, each once.
  function rangesToPages(ranges) {
    var seen = {};
    var pages = [];
    ranges.forEach(function (r) {
      for (var p = r[0]; p <= r[1]; p++) {
        if (!seen[p]) {
          seen[p] = true;
          pages.push(p);
        }
      }
    });
    return pages.sort(function (a, b) { return a - b; });
  }

  // [1, 2, 3, 5, 8, 9] → "1-3, 5, 8-9"
  function describePages(pages) {
    var sorted = pages.slice().sort(function (a, b) { return a - b; });
    var out = [];
    for (var i = 0; i < sorted.length; i++) {
      var start = sorted[i];
      while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
      out.push(start === sorted[i] ? String(start) : start + "-" + sorted[i]);
    }
    return out.join(", ");
  }

  // ---------------------------------------------------------------- ZIP (stored, no compression:
  // PDFs and JPGs are already compressed, so this keeps it simple and fast)

  var crcTable = null;

  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  // files: [{ name, bytes }] → Uint8Array of a .zip file
  function makeZip(files, date) {
    var when = date || new Date();
    var dosTime = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
    var dosDate = ((Math.max(when.getFullYear(), 1980) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
    var encoder = new TextEncoder();
    var entries = files.map(function (f) {
      return { name: encoder.encode(f.name), bytes: f.bytes, crc: crc32(f.bytes) };
    });
    var size = 22;
    entries.forEach(function (e) { size += 30 + 46 + 2 * e.name.length + e.bytes.length; });
    var out = new Uint8Array(size);
    var view = new DataView(out.buffer);
    var pos = 0;

    function header(sig, e, central) {
      view.setUint32(pos, sig, true); pos += 4;
      if (central) { view.setUint16(pos, 20, true); pos += 2; } // made by
      view.setUint16(pos, 20, true); pos += 2; // version needed
      view.setUint16(pos, 0x0800, true); pos += 2; // file names are UTF-8
      view.setUint16(pos, 0, true); pos += 2; // stored
      view.setUint16(pos, dosTime, true); pos += 2;
      view.setUint16(pos, dosDate, true); pos += 2;
      view.setUint32(pos, e.crc, true); pos += 4;
      view.setUint32(pos, e.bytes.length, true); pos += 4;
      view.setUint32(pos, e.bytes.length, true); pos += 4;
      view.setUint16(pos, e.name.length, true); pos += 2;
      view.setUint16(pos, 0, true); pos += 2; // extra field
    }

    entries.forEach(function (e) {
      e.offset = pos;
      header(0x04034b50, e, false);
      out.set(e.name, pos); pos += e.name.length;
      out.set(e.bytes, pos); pos += e.bytes.length;
    });
    var dirStart = pos;
    entries.forEach(function (e) {
      header(0x02014b50, e, true);
      view.setUint16(pos, 0, true); pos += 2; // comment
      view.setUint16(pos, 0, true); pos += 2; // disk
      view.setUint16(pos, 0, true); pos += 2; // internal attributes
      view.setUint32(pos, 0, true); pos += 4; // external attributes
      view.setUint32(pos, e.offset, true); pos += 4;
      out.set(e.name, pos); pos += e.name.length;
    });
    view.setUint32(pos, 0x06054b50, true); pos += 4;
    view.setUint16(pos, 0, true); pos += 2;
    view.setUint16(pos, 0, true); pos += 2;
    view.setUint16(pos, entries.length, true); pos += 2;
    view.setUint16(pos, entries.length, true); pos += 2;
    view.setUint32(pos, pos - 12 - dirStart, true); pos += 4; // directory size
    view.setUint32(pos, dirStart, true); pos += 4;
    view.setUint16(pos, 0, true);
    return out;
  }

  // ---------------------------------------------------------------- Small helpers

  function formatBytes(n) {
    if (n < 1024) return n + " bytes";
    if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB";
    return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + " MB";
  }

  // "Report (final).PDF" → "Report (final)"
  function baseName(name) {
    var base = String(name || "").replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").trim();
    return base || "document";
  }

  function yieldToBrowser() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  }

  // ---------------------------------------------------------------- Page previews

  function drawPage(pdf, pageNumber, canvas, cssWidth, maxPixels) {
    return pdf.getPage(pageNumber).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var scale = (cssWidth * ratio) / base.width;
      if (maxPixels && base.width * base.height * scale * scale > maxPixels) {
        scale = Math.sqrt(maxPixels / (base.width * base.height));
      }
      var viewport = page.getViewport({ scale: scale });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
        page.cleanup();
      });
    });
  }

  // Draws page thumbnails as they scroll into view, two at a time.
  function thumbnailer(pdf, cssWidth) {
    var queue = [];
    var running = 0;
    var stopped = false;
    var observer = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        queue.push(entry.target);
      });
      pump();
    }, { rootMargin: "300px 0px" }) : null;

    function pump() {
      while (!stopped && running < 2 && queue.length) start(queue.shift());
    }

    function start(box) {
      running++;
      drawPage(pdf, Number(box.dataset.page), box.querySelector("canvas"), cssWidth).then(function () {
        box.classList.add("is-drawn");
      }, function () {
        box.classList.add("is-failed");
      }).then(function () {
        running--;
        pump();
      });
    }

    return {
      // box: an element with data-page="n" that contains a <canvas>
      add: function (box) {
        if (observer) observer.observe(box);
        else {
          queue.push(box);
          pump();
        }
      },
      stop: function () {
        stopped = true;
        queue = [];
        if (observer) observer.disconnect();
      }
    };
  }

  // ---------------------------------------------------------------- Tool page wiring

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  var ICON_CHECK = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_DOWNLOAD = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>';

  /*
   * Wires the parts every PDF tool page shares: the drop zone, status line, "Start over" and
   * the results panel. Element ids are fixed by the page template in src/pages/pdf-*.html.
   *   onFiles(files): called with an array of File objects
   *   onReset(): clear the tool's own state
   */
  function initTool(opts) {
    var tool = document.getElementById("pdf-tool");
    var drop = document.getElementById("pdf-drop");
    var inputs = tool.querySelectorAll("input[type=file]");
    var work = document.getElementById("pdf-work");
    var status = document.getElementById("pdf-status");
    var result = document.getElementById("pdf-result");
    var reset = document.getElementById("pdf-reset");
    var urls = [];

    function take(fileList) {
      var files = Array.prototype.slice.call(fileList || []);
      if (files.length) opts.onFiles(files);
    }

    Array.prototype.forEach.call(inputs, function (input) {
      input.addEventListener("change", function () {
        take(input.files);
        input.value = "";
      });
    });

    // Dropping a file anywhere else on the page would open it in the browser and lose the page.
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) { e.preventDefault(); });
    [drop, work].forEach(function (zone) {
      if (!zone) return;
      zone.addEventListener("dragover", function (e) {
        e.preventDefault();
        zone.classList.add("is-over");
      });
      zone.addEventListener("dragleave", function (e) {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove("is-over");
      });
      zone.addEventListener("drop", function (e) {
        e.preventDefault();
        zone.classList.remove("is-over");
        if (e.dataTransfer) take(e.dataTransfer.files);
      });
    });

    function setStatus(text, kind) {
      status.textContent = text || "";
      status.className = "pdf-status" + (kind ? " is-" + kind : "");
    }

    function clearResult() {
      urls.forEach(function (u) { URL.revokeObjectURL(u); });
      urls = [];
      result.hidden = true;
      result.textContent = "";
    }

    function link(bytes, name, type, label, cls) {
      var url = URL.createObjectURL(new Blob([bytes], { type: type }));
      urls.push(url);
      var a = el("a", cls);
      a.href = url;
      a.download = name;
      a.innerHTML = ICON_DOWNLOAD;
      a.appendChild(document.createTextNode(label));
      return a;
    }

    /*
     * Shows the finished file(s).
     *   files: [{ name, bytes, type, detail }]
     *   title: heading, e.g. "Your PDF is ready"
     *   summary: one line under the heading
     *   zipName: offered as "Download all" when there is more than one file
     */
    function showResult(o) {
      clearResult();
      var head = el("div", "result-head");
      var badge = el("span", "result-badge");
      badge.innerHTML = ICON_CHECK;
      var text = el("div");
      var h2 = el("h2", "", o.title);
      h2.tabIndex = -1;
      text.appendChild(h2);
      if (o.summary) text.appendChild(el("p", "", o.summary));
      head.appendChild(badge);
      head.appendChild(text);
      result.appendChild(head);

      var files = o.files;
      if (files.length === 1) {
        var f = files[0];
        result.appendChild(link(f.bytes, f.name, f.type, "Download " + (o.noun || "PDF"), "btn btn-light btn-download"));
        result.appendChild(el("p", "result-file", f.name + " · " + (f.detail ? f.detail + " · " : "") + formatBytes(f.bytes.length)));
      } else {
        if (o.zipName) {
          var zip = makeZip(files.map(function (x) { return { name: x.name, bytes: x.bytes }; }));
          result.appendChild(link(zip, o.zipName, "application/zip", "Download all (ZIP, " + formatBytes(zip.length) + ")", "btn btn-light btn-download"));
        }
        var list = el("ul", "result-files");
        files.forEach(function (x) {
          var li = el("li");
          var info = el("span", "result-file-name", x.name);
          var meta = el("span", "result-file-meta", (x.detail ? x.detail + " · " : "") + formatBytes(x.bytes.length));
          var a = link(x.bytes, x.name, x.type, "Download", "result-file-link");
          a.setAttribute("aria-label", "Download " + x.name);
          li.appendChild(info);
          li.appendChild(meta);
          li.appendChild(a);
          list.appendChild(li);
        });
        result.appendChild(list);
      }
      if (o.note) result.appendChild(el("p", "result-note", o.note));
      var again = el("button", "btn btn-ghost-dark btn-sm", "Start over");
      again.type = "button";
      again.addEventListener("click", startOver);
      result.appendChild(again);
      result.hidden = false;
      setStatus("");
      h2.focus({ preventScroll: true });
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function startOver() {
      clearResult();
      setStatus("");
      if (opts.onReset) opts.onReset();
      work.hidden = true;
      drop.hidden = false;
      var input = drop.querySelector("input[type=file]");
      if (input) input.focus({ preventScroll: true });
      tool.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    if (reset) reset.addEventListener("click", startOver);

    // Runs a job with the button disabled and a busy message; shows any error in the status line.
    function run(button, busyText, job) {
      if (button.disabled) return Promise.resolve();
      button.disabled = true;
      clearResult();
      setStatus(busyText, "busy");
      return Promise.resolve().then(job).catch(function (err) {
        if (!err || !err.forVisitor) console.error(err);
        setStatus(messageOf(err), "error");
      }).then(function () {
        button.disabled = false;
      });
    }

    function showWork() {
      drop.hidden = true;
      work.hidden = false;
    }

    return {
      setStatus: setStatus,
      showResult: showResult,
      clearResult: clearResult,
      startOver: startOver,
      showWork: showWork,
      run: run
    };
  }

  function onlyPdfs(files) {
    return files.filter(function (f) {
      return /\.pdf$/i.test(f.name) || f.type === "application/pdf";
    });
  }

  var ICON_PATHS = {
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    remove: '<path d="M6 6l12 12M18 6L6 18"/>',
    cw: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    ccw: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v5h5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'
  };

  function svgIcon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON_PATHS[name] + "</svg>";
  }

  function iconButton(name, label, onClick, cls) {
    var b = el("button", "icon-btn" + (cls ? " " + cls : ""));
    b.type = "button";
    b.innerHTML = svgIcon(name);
    b.setAttribute("aria-label", label);
    b.title = label;
    b.addEventListener("click", onClick);
    return b;
  }

  /*
   * Drag-and-drop reordering for mouse users (touch and keyboard users have the arrow buttons).
   * The items must be direct children of `list` with data-index set. onMove(from, to) is called
   * with 0-based positions, where `to` is the item's position after the move.
   */
  function sortable(list, onMove) {
    var from = -1;
    list.addEventListener("dragstart", function (e) {
      var item = e.target.closest && e.target.closest("[data-index]");
      if (!item || item.parentNode !== list) return;
      from = Number(item.dataset.index);
      item.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(from));
    });
    list.addEventListener("dragend", function () {
      from = -1;
      Array.prototype.forEach.call(list.children, function (c) { c.classList.remove("is-dragging", "drop-before", "drop-after"); });
    });
    list.addEventListener("dragover", function (e) {
      if (from < 0) return;
      e.preventDefault();
      e.stopPropagation();
      var item = e.target.closest && e.target.closest("[data-index]");
      Array.prototype.forEach.call(list.children, function (c) { c.classList.remove("drop-before", "drop-after"); });
      if (item && item.parentNode === list) item.classList.add(isAfter(item, e) ? "drop-after" : "drop-before");
    });
    list.addEventListener("drop", function (e) {
      if (from < 0) return;
      e.preventDefault();
      e.stopPropagation();
      var item = e.target.closest && e.target.closest("[data-index]");
      if (!item || item.parentNode !== list) return;
      var target = Number(item.dataset.index) + (isAfter(item, e) ? 1 : 0);
      var to = target > from ? target - 1 : target;
      var start = from;
      from = -1;
      if (to !== start) onMove(start, to);
    });

    // In a grid, the drop point is "after" when it's on the right half; in a list, the bottom half.
    function isAfter(item, e) {
      var r = item.getBoundingClientRect();
      var grid = getComputedStyle(list).display === "grid" && list.classList.contains("page-grid");
      return grid ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
    }
  }

  function moveItem(arr, from, to) {
    var item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
    return arr;
  }

  function fillFileCard(name, detail) {
    var n = document.getElementById("file-name");
    var m = document.getElementById("file-meta");
    if (n) n.textContent = name;
    if (m) m.textContent = detail;
  }

  // Page count using pdf.js, for tools that only read pages. pdf.js can open PDFs that have
  // "no editing" restrictions, which pdf-lib refuses.
  function countPagesForView(bytes) {
    if (!looksLikePdf(bytes)) return Promise.reject(userError("This file isn't a PDF."));
    return openForView(bytes).then(function (pdf) {
      var n = pdf.numPages;
      closeView(pdf);
      return n;
    });
  }

  /*
   * Wiring for tools that work on one PDF. onOpen(state) runs once the file is read;
   * state = { name, base, bytes, pages }. Every change is made to a fresh copy opened from
   * `bytes`, so running a tool twice never stacks changes. opts.viewOnly: open with pdf.js.
   */
  function singlePdfTool(opts) {
    var state = null;
    var ui = initTool({
      onFiles: function (files) {
        var file = onlyPdfs(files)[0];
        if (!file) {
          ui.setStatus("Please choose a PDF file.", "error");
          return;
        }
        ui.clearResult();
        ui.setStatus("Opening your PDF…", "busy");
        readFile(file).then(function (bytes) {
          var counting = opts.viewOnly ? countPagesForView(bytes) : openPdf(bytes).then(function (doc) { return doc.getPageCount(); });
          return counting.then(function (pages) {
            if (opts.onReset) opts.onReset();
            state = { name: file.name, base: baseName(file.name), bytes: bytes, pages: pages };
            fillFileCard(file.name, pagesWord(pages) + " · " + formatBytes(bytes.length));
            ui.setStatus(files.length > 1 ? "This tool works on one PDF at a time, so we opened the first one." : "");
            ui.showWork();
            if (opts.onOpen) return opts.onOpen(state);
          });
        }).catch(function (err) {
          if (!err || !err.forVisitor) console.error(err);
          ui.setStatus(messageOf(err), "error");
        });
      },
      onReset: function () {
        state = null;
        if (opts.onReset) opts.onReset();
      }
    });
    ui.state = function () { return state; };
    return ui;
  }

  /*
   * One tile per page in `list`, each with a preview drawn when it scrolls into view.
   * build(tile, index, thumb) adds the tool's own controls. Returns { tiles, stop }.
   */
  function pageGrid(list, bytes, count, build) {
    list.textContent = "";
    var tiles = [];
    for (var i = 0; i < count; i++) {
      var tile = el("li", "page-tile");
      tile.dataset.index = i;
      var thumb = el("div", "thumb");
      thumb.dataset.page = i + 1;
      thumb.appendChild(el("canvas"));
      build(tile, i, thumb);
      tiles.push(tile);
      list.appendChild(tile);
    }
    var pdf = null;
    var thumbs = null;
    var stopped = false;
    openForView(bytes).then(function (doc) {
      if (stopped) return closeView(doc);
      pdf = doc;
      thumbs = thumbnailer(doc, 150);
      tiles.forEach(function (t) { thumbs.add(t.querySelector(".thumb")); });
    }).catch(function () {
      list.classList.add("no-previews");
    });
    return {
      tiles: tiles,
      stop: function () {
        stopped = true;
        if (thumbs) thumbs.stop();
        closeView(pdf);
      }
    };
  }

  /*
   * Page tiles that can be picked by tapping, kept in step with a page-range text box.
   *   list, input, error: the grid <ol>, the text <input> and its error message element
   *   verb: "delete" or "keep", used in each tile's label
   *   onChange(pages): called with the picked page numbers (1-based, sorted)
   */
  function pagePicker(o) {
    var picked = {};
    var grid = pageGrid(o.list, o.bytes, o.count, function (tile, i, thumb) {
      var b = el("button", "page-pick");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", "Page " + (i + 1) + ": " + o.verb);
      thumb.appendChild(el("span", "pick-mark"));
      thumb.lastChild.innerHTML = svgIcon(o.verb === "delete" ? "remove" : "check");
      b.appendChild(thumb);
      b.appendChild(el("span", "page-label", "Page " + (i + 1)));
      b.addEventListener("click", function () {
        set(i + 1, !picked[i + 1]);
        o.input.value = describePages(list());
        showError("");
        o.onChange(list());
      });
      tile.appendChild(b);
    });

    function set(page, on) {
      picked[page] = on;
      grid.tiles[page - 1].firstChild.setAttribute("aria-pressed", on ? "true" : "false");
    }

    function list() {
      var out = [];
      for (var p = 1; p <= o.count; p++) if (picked[p]) out.push(p);
      return out;
    }

    function showError(text) {
      var field = o.input.closest(".field");
      field.classList.toggle("invalid", !!text);
      o.input.setAttribute("aria-invalid", text ? "true" : "false");
      o.error.textContent = text;
    }

    function onType() {
      var text = o.input.value.trim();
      var parsed = text ? parseRanges(text, o.count) : { ranges: [] };
      if (parsed.error) {
        showError(parsed.error);
        return;
      }
      showError("");
      var chosen = {};
      rangesToPages(parsed.ranges).forEach(function (p) { chosen[p] = true; });
      for (var p = 1; p <= o.count; p++) set(p, !!chosen[p]);
      o.onChange(list());
    }

    o.input.addEventListener("input", onType);

    return {
      selected: list,
      hasError: function () { return o.input.getAttribute("aria-invalid") === "true"; },
      stop: function () {
        o.input.removeEventListener("input", onType);
        o.input.value = "";
        showError("");
        grid.stop();
      }
    };
  }

  // ---------------------------------------------------------------- JPEG headers

  /*
   * Reads a JPEG's size, colour channels and EXIF orientation (1–8) without decoding it.
   * Returns null if the bytes aren't a JPEG we understand.
   */
  function jpegInfo(bytes) {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    var info = { width: 0, height: 0, components: 0, orientation: 1 };
    var pos = 2;
    while (pos + 4 <= bytes.length) {
      if (bytes[pos] !== 0xff) return null;
      var marker = bytes[pos + 1];
      if (marker === 0xff) { pos++; continue; }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { pos += 2; continue; }
      var len = (bytes[pos + 2] << 8) | bytes[pos + 3];
      var seg = pos + 4;
      if (marker === 0xe1 && len >= 16) readExif(seg, len - 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        info.height = (bytes[seg + 1] << 8) | bytes[seg + 2];
        info.width = (bytes[seg + 3] << 8) | bytes[seg + 4];
        info.components = bytes[seg + 5];
        return info.width && info.height ? info : null;
      }
      if (marker === 0xd9 || marker === 0xda) break;
      pos += 2 + len;
    }
    return null;

    function readExif(start, length) {
      // "Exif\0\0" then a TIFF header
      if (bytes[start] !== 0x45 || bytes[start + 1] !== 0x78 || bytes[start + 2] !== 0x69 || bytes[start + 3] !== 0x66) return;
      var tiff = start + 6;
      var end = start + length;
      var little = bytes[tiff] === 0x49;
      function u16(p) { return little ? bytes[p] | (bytes[p + 1] << 8) : (bytes[p] << 8) | bytes[p + 1]; }
      function u32(p) { return little ? (u16(p) | (u16(p + 2) << 16)) >>> 0 : ((u16(p) << 16) | u16(p + 2)) >>> 0; }
      var ifd = tiff + u32(tiff + 4);
      if (ifd + 2 > end) return;
      var count = u16(ifd);
      for (var i = 0; i < count; i++) {
        var entry = ifd + 2 + i * 12;
        if (entry + 12 > end) return;
        if (u16(entry) === 0x0112) {
          var value = u16(entry + 8);
          if (value >= 1 && value <= 8) info.orientation = value;
          return;
        }
      }
    }
  }

  // A copy of a JPEG without its EXIF block, so browsers don't rotate it while decoding.
  function stripExif(bytes) {
    var parts = [bytes.subarray(0, 2)];
    var pos = 2;
    while (pos + 4 <= bytes.length && bytes[pos] === 0xff) {
      var marker = bytes[pos + 1];
      if (marker === 0xda) break;
      var len = (bytes[pos + 2] << 8) | bytes[pos + 3];
      if (marker !== 0xe1) parts.push(bytes.subarray(pos, pos + 2 + len));
      pos += 2 + len;
    }
    parts.push(bytes.subarray(pos));
    var size = parts.reduce(function (s, p) { return s + p.length; }, 0);
    var out = new Uint8Array(size);
    var at = 0;
    parts.forEach(function (p) { out.set(p, at); at += p.length; });
    return out;
  }

  window.ToolNestPDF = {
    BASE: BASE,
    userError: userError,
    messageOf: messageOf,
    loadPdfLib: loadPdfLib,
    loadPdfJs: loadPdfJs,
    openForView: openForView,
    closeView: closeView,
    readFile: readFile,
    looksLikePdf: looksLikePdf,
    openPdf: openPdf,
    asDoc: asDoc,
    createDoc: createDoc,
    saveDoc: saveDoc,
    touch: touch,
    copyPagesInto: copyPagesInto,
    pagesToNewPdf: pagesToNewPdf,
    setPageOrder: setPageOrder,
    pageView: pageView,
    pagesWord: pagesWord,
    parseRanges: parseRanges,
    rangesToPages: rangesToPages,
    describePages: describePages,
    crc32: crc32,
    makeZip: makeZip,
    formatBytes: formatBytes,
    baseName: baseName,
    yieldToBrowser: yieldToBrowser,
    drawPage: drawPage,
    thumbnailer: thumbnailer,
    el: el,
    initTool: initTool,
    onlyPdfs: onlyPdfs,
    svgIcon: svgIcon,
    iconButton: iconButton,
    sortable: sortable,
    moveItem: moveItem,
    fillFileCard: fillFileCard,
    singlePdfTool: singlePdfTool,
    pageGrid: pageGrid,
    pagePicker: pagePicker,
    jpegInfo: jpegInfo,
    stripExif: stripExif
  };
})();
