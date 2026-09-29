/* Rearrange PDF pages: puts pages in a new order. The pages themselves aren't copied, so
   bookmarks, links and form fields keep working. Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  // source: PDF bytes. order: every page index (0-based) in its new position. → bytes
  function rearrangePdf(source, order) {
    return P.openPdf(source).then(function (doc) {
      var count = doc.getPageCount();
      var seen = {};
      var valid = order.length === count && order.every(function (i) {
        var ok = i >= 0 && i < count && !seen[i];
        seen[i] = true;
        return ok;
      });
      if (!valid) throw P.userError("The new order must list every page once.");
      P.setPageOrder(doc, order);
      P.touch(doc);
      return P.saveDoc(doc);
    });
  }

  window.ToolNestCalc = rearrangePdf;
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var list = document.getElementById("page-grid");
  var note = document.getElementById("order-note");
  var order = [];
  var tiles = [];
  var grid = null;

  var ui = P.singlePdfTool({
    onOpen: function (state) {
      order = [];
      for (var i = 0; i < state.pages; i++) order.push(i);
      grid = P.pageGrid(list, state.bytes, state.pages, function (tile, i, thumb) {
        tile.draggable = true;
        tile.appendChild(thumb);
        var row = P.el("div", "tile-row");
        var back = P.iconButton("left", "Move page " + (i + 1) + " earlier", function () { step(i, -1, "back"); });
        var fwd = P.iconButton("right", "Move page " + (i + 1) + " later", function () { step(i, 1, "fwd"); });
        back.dataset.act = "back";
        fwd.dataset.act = "fwd";
        row.appendChild(back);
        row.appendChild(P.el("span", "page-label", "Page " + (i + 1)));
        row.appendChild(fwd);
        tile.appendChild(row);
      });
      tiles = grid.tiles.slice();
      refresh();
    },
    onReset: function () {
      if (grid) grid.stop();
      grid = null;
      order = [];
      tiles = [];
    }
  });

  P.sortable(list, function (from, to) {
    P.moveItem(order, from, to);
    refresh();
  });

  // Moves the page that started as page `page` one place earlier or later.
  function step(page, by, act) {
    var at = order.indexOf(page);
    var to = at + by;
    if (to < 0 || to >= order.length) return;
    P.moveItem(order, at, to);
    refresh();
    var button = tiles[page].querySelector("[data-act='" + act + "']");
    if (button.disabled) button = tiles[page].querySelector("[data-act='" + (act === "back" ? "fwd" : "back") + "']");
    button.focus();
  }

  function refresh() {
    var moved = 0;
    order.forEach(function (page, pos) {
      var tile = tiles[page];
      tile.dataset.index = pos;
      tile.querySelector("[data-act='back']").disabled = pos === 0;
      tile.querySelector("[data-act='fwd']").disabled = pos === order.length - 1;
      tile.classList.toggle("is-changed", page !== pos);
      if (page !== pos) moved++;
      list.appendChild(tile); // appending an existing element moves it
    });
    runBtn.disabled = moved === 0;
    note.textContent = moved === 0
      ? "Drag pages into a new order, or use the arrows under each page."
      : "New order: " + summarise() + ".";
  }

  function summarise() {
    var shown = order.slice(0, 12).map(function (i) { return i + 1; }).join(", ");
    return order.length > 12 ? shown + " …" : shown;
  }

  document.getElementById("order-reverse").addEventListener("click", function () {
    order.reverse();
    refresh();
  });
  document.getElementById("order-clear").addEventListener("click", function () {
    order.sort(function (a, b) { return a - b; });
    refresh();
  });

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state) return;
    var newOrder = order.slice();
    ui.run(runBtn, "Saving the new page order…", function () {
      return rearrangePdf(state.bytes, newOrder).then(function (bytes) {
        ui.showResult({
          title: "Your rearranged PDF is ready",
          summary: "Pages are now in this order: " + summarise() + ".",
          files: [{ name: state.base + "-rearranged.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(state.pages) }]
        });
      });
    });
  });
})();
