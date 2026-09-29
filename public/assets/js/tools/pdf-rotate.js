/* Rotate PDF: turns some or all pages by 90° steps. Only the page's rotation setting changes,
   so nothing is re-saved at lower quality. Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  function normalise(angle) {
    return ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  }

  // source: PDF bytes. turns[i]: degrees to add to page i (0-based), clockwise. → bytes
  function rotatePdf(source, turns) {
    return P.openPdf(source).then(function (doc) {
      var L = window.PDFLib; // loaded on demand by openPdf
      doc.getPages().forEach(function (page, i) {
        var add = turns[i] || 0;
        if (add % 360) page.setRotation(L.degrees(normalise(page.getRotation().angle + add)));
      });
      P.touch(doc);
      return P.saveDoc(doc);
    });
  }

  window.ToolNestCalc = rotatePdf;
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var list = document.getElementById("page-grid");
  var note = document.getElementById("rotate-note");
  var turns = [];
  var grid = null;

  var ui = P.singlePdfTool({
    onOpen: function (state) {
      turns = [];
      grid = P.pageGrid(list, state.bytes, state.pages, function (tile, i, thumb) {
        tile.appendChild(thumb);
        var row = P.el("div", "tile-row");
        row.appendChild(P.iconButton("ccw", "Rotate page " + (i + 1) + " left", function () { turn(i, -90); }));
        row.appendChild(P.el("span", "page-label", "Page " + (i + 1)));
        row.appendChild(P.iconButton("cw", "Rotate page " + (i + 1) + " right", function () { turn(i, 90); }));
        tile.appendChild(row);
      });
      refresh();
    },
    onReset: function () {
      if (grid) grid.stop();
      grid = null;
      turns = [];
    }
  });

  function turn(i, by) {
    turns[i] = normalise((turns[i] || 0) + by);
    refresh();
  }

  function turnAll(by) {
    var state = ui.state();
    for (var i = 0; i < state.pages; i++) turns[i] = normalise((turns[i] || 0) + by);
    refresh();
  }

  function refresh() {
    var state = ui.state();
    if (!state || !grid) return;
    var changed = 0;
    grid.tiles.forEach(function (tile, i) {
      var canvas = tile.querySelector("canvas");
      var angle = turns[i] || 0;
      canvas.className = angle ? "rot-" + angle : "";
      tile.classList.toggle("is-changed", angle !== 0);
      if (angle) changed++;
    });
    runBtn.disabled = changed === 0;
    note.textContent = changed === 0
      ? "Use the arrows under a page to turn it, or turn every page at once."
      : P.pagesWord(changed) + " will be rotated.";
  }

  document.getElementById("rotate-all-left").addEventListener("click", function () { turnAll(-90); });
  document.getElementById("rotate-all-right").addEventListener("click", function () { turnAll(90); });
  document.getElementById("rotate-clear").addEventListener("click", function () {
    turns = [];
    refresh();
  });

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state) return;
    var changed = turns.filter(function (t) { return t; }).length;
    ui.run(runBtn, "Rotating pages…", function () {
      return rotatePdf(state.bytes, turns).then(function (bytes) {
        ui.showResult({
          title: "Your rotated PDF is ready",
          summary: P.pagesWord(changed) + " rotated in " + state.name + ".",
          files: [{ name: state.base + "-rotated.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(state.pages) }]
        });
      });
    });
  });
})();
