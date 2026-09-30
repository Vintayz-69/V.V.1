/* PDF to Text: copies the text out of a PDF's pages with pdf.js, in the visitor's browser.
   Scanned pages are pictures of text, so they have no text to copy (we don't do OCR). */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  /*
   * Turns one page's pdf.js text items into plain text. Items: { str, hasEOL, transform, width, height }
   * where transform[4] and transform[5] are the item's x and y on the page. A new line starts when
   * the text moves up or down by more than half a line; a blank line when it jumps more than about
   * two lines (a new paragraph). A space is added where there's a visible gap between two pieces.
   */
  function itemsToText(items) {
    var out = "";
    var lastY = null;
    var lastEnd = null;
    var lastSize = 0;
    items.forEach(function (it) {
      var str = it.str || "";
      var t = it.transform || [1, 0, 0, 1, 0, 0];
      var x = t[4];
      var y = t[5];
      var size = Math.abs(it.height || t[3] || lastSize || 10) || 10;
      if (str) {
        if (lastY !== null && Math.abs(y - lastY) > Math.max(size, lastSize) * 0.5) {
          if (!/\n$/.test(out)) out += "\n";
          if (Math.abs(y - lastY) > Math.max(size, lastSize) * 2.2 && !/\n\n$/.test(out)) out += "\n";
        } else if (lastEnd !== null && x - lastEnd > size * 0.15 && out && !/[\s]$/.test(out) && !/^\s/.test(str)) {
          out += " ";
        }
        out += str;
        lastY = y;
        lastEnd = x + (it.width || 0);
        lastSize = size;
      }
      if (it.hasEOL) {
        if (!/\n$/.test(out)) out += "\n";
        lastEnd = null;
      }
    });
    return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // pages: [{ number, text }] → one text file. withHeadings adds "--- Page 3 ---" lines.
  function joinPages(pages, withHeadings) {
    return pages.map(function (p) {
      return (withHeadings ? "--- Page " + p.number + " ---\n" : "") + p.text;
    }).join("\n\n").trim() + "\n";
  }

  // Reads the text from the chosen pages (1-based numbers, or null for all). → [{ number, text }]
  function extract(bytes, pages, onProgress) {
    return P.openForView(bytes).then(function (pdf) {
      var list = pages || Array.from({ length: pdf.numPages }, function (_, i) { return i + 1; });
      var out = [];
      var chain = Promise.resolve();
      list.forEach(function (n, i) {
        chain = chain.then(function () {
          if (onProgress) onProgress(i + 1, list.length);
          return pdf.getPage(n).then(function (page) {
            return page.getTextContent().then(function (content) {
              out.push({ number: n, text: itemsToText(content.items) });
              page.cleanup();
            });
          });
        });
      });
      return chain.then(function () {
        P.closeView(pdf);
        return out;
      }, function (err) {
        P.closeView(pdf);
        throw err;
      });
    });
  }

  window.ToolNestCalc = { itemsToText: itemsToText, joinPages: joinPages };
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var pagesInput = document.getElementById("pick-pages");
  var headings = document.getElementById("page-headings");
  var box = document.getElementById("text-box");
  var area = document.getElementById("text-out");
  var copyBtn = document.getElementById("text-copy");
  var ui = P.singlePdfTool({ viewOnly: true, onOpen: check, onReset: function () { box.hidden = true; area.value = ""; } });

  function setError(text) {
    var field = pagesInput.closest(".field");
    field.classList.toggle("invalid", !!text);
    pagesInput.setAttribute("aria-invalid", text ? "true" : "false");
    field.querySelector(".error-msg").textContent = text;
  }

  function wanted() {
    var state = ui.state();
    var text = pagesInput.value.trim();
    if (!state || !text) return { pages: null };
    var parsed = P.parseRanges(text, state.pages);
    return parsed.error ? parsed : { pages: P.rangesToPages(parsed.ranges) };
  }

  function check() {
    var w = wanted();
    setError(w.error || "");
    runBtn.disabled = !ui.state() || !!w.error;
  }

  pagesInput.addEventListener("input", check);

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    var w = wanted();
    if (!state || w.error) return;
    box.hidden = true;
    ui.run(runBtn, "Reading the text…", function () {
      return extract(state.bytes, w.pages, function (i, n) {
        if (n > 3) ui.setStatus("Reading page " + i + " of " + n + "…", "busy");
      }).then(function (pages) {
        var text = joinPages(pages, headings.checked);
        var found = pages.filter(function (p) { return p.text; }).length;
        if (!found) {
          throw P.userError("We couldn't find any text on " + (pages.length === 1 ? "this page" : "these pages") + ". If it's a scan or a photo of a document, the words are part of a picture, so there's no text to copy.");
        }
        var bytes = new TextEncoder().encode(text);
        var empty = pages.length - found;
        ui.showResult({
          title: "Your text is ready",
          summary: "Text from " + P.pagesWord(found) + (empty ? ". " + P.pagesWord(empty) + " had no text (probably scanned)." : "."),
          noun: "text file",
          files: [{ name: state.base + ".txt", bytes: bytes, type: "text/plain;charset=utf-8", detail: text.trim().split(/\s+/).length.toLocaleString("en-US") + " words" }]
        });
        area.value = text;
        box.hidden = false;
      });
    });
  });

  copyBtn.addEventListener("click", function () {
    var done = function (ok) {
      copyBtn.textContent = ok ? "Copied" : "Couldn't copy: select the text and copy it";
      setTimeout(function () { copyBtn.textContent = "Copy all the text"; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(area.value).then(function () { done(true); }, function () { done(false); });
    else {
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      done(ok);
    }
  });
})();
