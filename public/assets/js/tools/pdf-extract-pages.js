/* Extract PDF pages: makes a new PDF from only the pages the visitor picks, in page order.
   Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  // source: PDF bytes. pages: page numbers to keep (1-based). → bytes
  function extractPages(source, pages) {
    if (!pages.length) return Promise.reject(P.userError("Pick at least one page."));
    var indices = pages.slice().sort(function (a, b) { return a - b; }).map(function (p) { return p - 1; });
    return P.pagesToNewPdf(source, indices);
  }

  window.ToolNestCalc = extractPages;
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var note = document.getElementById("pick-note");
  var picker = null;

  var ui = P.singlePdfTool({
    onOpen: function (state) {
      picker = P.pagePicker({
        list: document.getElementById("page-grid"),
        input: document.getElementById("pick-pages"),
        error: document.getElementById("pick-error"),
        bytes: state.bytes,
        count: state.pages,
        verb: "keep",
        onChange: refresh
      });
      refresh([]);
    },
    onReset: function () {
      if (picker) picker.stop();
      picker = null;
    }
  });

  function refresh(pages) {
    runBtn.disabled = pages.length === 0;
    note.textContent = pages.length === 0
      ? "Tap the pages you want to keep, or type their numbers."
      : "The new PDF will have " + P.pagesWord(pages.length) + ": " + P.describePages(pages) + ".";
  }

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state || !picker || picker.hasError()) return;
    var pages = picker.selected();
    ui.run(runBtn, "Extracting pages…", function () {
      return extractPages(state.bytes, pages).then(function (bytes) {
        ui.showResult({
          title: "Your new PDF is ready",
          summary: (pages.length === 1 ? "Page " : "Pages ") + P.describePages(pages) + " from " + state.name + ".",
          files: [{ name: state.base + "-extract.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(pages.length) }]
        });
      });
    });
  });
})();
