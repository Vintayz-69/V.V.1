/* Delete PDF pages: makes a new PDF without the pages the visitor picks. The removed pages are
   left out of the new file completely, not hidden. Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  // source: PDF bytes. remove: page numbers to drop (1-based). → bytes
  function deletePages(source, remove) {
    return P.openPdf(source).then(function (doc) {
      var drop = {};
      remove.forEach(function (p) { drop[p] = true; });
      var keep = doc.getPageIndices().filter(function (i) { return !drop[i + 1]; });
      if (!keep.length) throw P.userError("You can't delete every page. Leave at least one.");
      return P.pagesToNewPdf(doc, keep);
    });
  }

  window.ToolNestCalc = deletePages;
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
        verb: "delete",
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
    var state = ui.state();
    var n = pages.length;
    runBtn.disabled = n === 0 || n >= state.pages;
    if (n === 0) note.textContent = "Tap the pages you want to remove, or type their numbers.";
    else if (n >= state.pages) note.textContent = "You can't delete every page. Leave at least one.";
    else note.textContent = "Removing " + P.pagesWord(n) + ". The new PDF will have " + P.pagesWord(state.pages - n) + ".";
  }

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state || !picker || picker.hasError()) return;
    var remove = picker.selected();
    ui.run(runBtn, "Removing pages…", function () {
      return deletePages(state.bytes, remove).then(function (bytes) {
        var left = state.pages - remove.length;
        ui.showResult({
          title: "Your PDF is ready",
          summary: "Removed " + (remove.length === 1 ? "page " : "pages ") + P.describePages(remove) + ". " + P.pagesWord(left) + " left.",
          files: [{ name: state.base + "-edited.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(left) }]
        });
      });
    });
  });
})();
