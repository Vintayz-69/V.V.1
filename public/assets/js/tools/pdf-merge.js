/* Merge PDF: joins several PDFs into one, in the order the visitor chooses. Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  // sources: PDF files as bytes, in order → bytes of one PDF with every page
  function mergePdfs(sources) {
    return Promise.all(sources.map(P.openPdf)).then(function (docs) {
      return P.createDoc().then(function (out) {
        docs.forEach(function (doc) { P.copyPagesInto(doc, out, doc.getPageIndices()); });
        return P.saveDoc(out);
      });
    });
  }

  window.ToolNestCalc = mergePdfs;
  if (!document.getElementById("pdf-tool")) return;

  var items = []; // { id, name, bytes, pages, thumb }
  var nextId = 1;
  var list = document.getElementById("file-list");
  var runBtn = document.getElementById("pdf-run");
  var summary = document.getElementById("merge-summary");

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

  function addFiles(files) {
    var pdfs = P.onlyPdfs(files);
    var problems = [];
    if (pdfs.length < files.length) problems.push((files.length - pdfs.length) + " file(s) skipped because they aren't PDFs.");
    if (!pdfs.length) {
      ui.setStatus("Please choose PDF files.", "error");
      return;
    }
    ui.clearResult();
    ui.setStatus(pdfs.length === 1 ? "Opening your file…" : "Opening " + pdfs.length + " files…", "busy");

    // One at a time, so the files keep the order they were picked in.
    pdfs.reduce(function (chain, file) {
      return chain.then(function () {
        return P.readFile(file).then(function (bytes) {
          return P.openPdf(bytes).then(function (doc) {
            var item = { id: nextId++, name: file.name, bytes: bytes, pages: doc.getPageCount(), thumb: makeThumb() };
            items.push(item);
            drawFirstPage(item);
          });
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

  function makeThumb() {
    var box = P.el("div", "file-thumb");
    box.appendChild(P.el("canvas"));
    return box;
  }

  function drawFirstPage(item) {
    P.openForView(item.bytes).then(function (pdf) {
      return P.drawPage(pdf, 1, item.thumb.firstChild, 52).then(function () {
        item.thumb.classList.add("is-drawn");
        P.closeView(pdf);
      });
    }).catch(function () { /* the list still works without a preview */ });
  }

  function move(index, by, focusName) {
    P.moveItem(items, index, index + by);
    render();
    var li = list.children[index + by];
    var target = li && li.querySelector("[data-act='" + focusName + "']");
    if (target && target.disabled) target = li.querySelector("[data-act='" + (focusName === "up" ? "down" : "up") + "']");
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
    var pages = 0;
    items.forEach(function (item, i) {
      pages += item.pages;
      var li = P.el("li", "file-item");
      li.dataset.index = i;
      li.draggable = true;
      li.appendChild(item.thumb);
      var info = P.el("div", "file-info");
      info.appendChild(P.el("span", "file-name", item.name));
      info.appendChild(P.el("span", "file-meta", P.pagesWord(item.pages) + " · " + P.formatBytes(item.bytes.length)));
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
    runBtn.disabled = items.length < 2;
    summary.textContent = items.length < 2
      ? "Add at least one more PDF to merge."
      : items.length + " files · " + P.pagesWord(pages) + " in total";
  }

  runBtn.addEventListener("click", function () {
    var pages = items.reduce(function (n, x) { return n + x.pages; }, 0);
    var count = items.length;
    ui.run(runBtn, "Merging " + count + " files…", function () {
      return mergePdfs(items.map(function (x) { return x.bytes; })).then(function (bytes) {
        ui.showResult({
          title: "Your merged PDF is ready",
          summary: count + " files joined into one PDF with " + P.pagesWord(pages) + ".",
          files: [{ name: "merged.pdf", bytes: bytes, type: "application/pdf", detail: P.pagesWord(pages) }]
        });
      });
    });
  });
})();
