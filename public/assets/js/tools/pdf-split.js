/* Split PDF: turns one PDF into several, by page ranges, by a fixed number of pages, or one file
   per page. Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;

  /*
   * Which pages go in each new file.
   *   mode "ranges": value is text like "1-3, 4-6, 7-"
   *   mode "every":  value is how many pages go in each file
   *   mode "each":   one file per page
   * Returns { ranges: [[first, last], ...] } or { error }.
   */
  function planSplit(mode, value, count) {
    var ranges = [];
    if (mode === "each") {
      for (var p = 1; p <= count; p++) ranges.push([p, p]);
      return { ranges: ranges };
    }
    if (mode === "every") {
      var n = Number(String(value).trim());
      if (!/^\d+$/.test(String(value).trim()) || n < 1) return { error: "Enter a whole number of pages, like 2." };
      if (n >= count) return { error: "This PDF has only " + P.pagesWord(count) + ", so use a number smaller than " + count + "." };
      for (var start = 1; start <= count; start += n) ranges.push([start, Math.min(start + n - 1, count)]);
      return { ranges: ranges };
    }
    return P.parseRanges(value, count);
  }

  // source: PDF bytes → [{ range, bytes }], one entry per range
  function splitPdf(source, ranges) {
    return P.openPdf(source).then(function (doc) {
      return ranges.reduce(function (chain, range) {
        return chain.then(function (out) {
          var indices = [];
          for (var p = range[0]; p <= range[1]; p++) indices.push(p - 1);
          return P.createDoc().then(function (part) {
            P.copyPagesInto(doc, part, indices);
            return P.saveDoc(part);
          }).then(function (bytes) {
            out.push({ range: range, bytes: bytes });
            return P.yieldToBrowser().then(function () { return out; });
          });
        });
      }, Promise.resolve([]));
    });
  }

  function partName(base, range) {
    return base + (range[0] === range[1] ? "-page-" + range[0] : "-pages-" + range[0] + "-" + range[1]) + ".pdf";
  }

  window.ToolNestCalc = { planSplit: planSplit, splitPdf: splitPdf, partName: partName };
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var rangesInput = document.getElementById("split-ranges");
  var everyInput = document.getElementById("split-every");
  var preview = document.getElementById("split-preview");
  var modes = document.querySelectorAll("input[name=split-mode]");

  var ui = P.singlePdfTool({
    onOpen: function (state) {
      rangesInput.value = state.pages > 1 ? "1-" + Math.ceil(state.pages / 2) + ", " + (Math.ceil(state.pages / 2) + 1) + "-" + state.pages : "1";
      update();
    }
  });

  function mode() {
    var m = "ranges";
    Array.prototype.forEach.call(modes, function (r) { if (r.checked) m = r.value; });
    return m;
  }

  function currentPlan() {
    var state = ui.state();
    if (!state) return null;
    var m = mode();
    return planSplit(m, m === "every" ? everyInput.value : rangesInput.value, state.pages);
  }

  function update() {
    var m = mode();
    document.getElementById("field-ranges").hidden = m !== "ranges";
    document.getElementById("field-every").hidden = m !== "every";
    var plan = currentPlan();
    if (!plan) return;
    var input = m === "every" ? everyInput : m === "ranges" ? rangesInput : null;
    [rangesInput, everyInput].forEach(function (i) { showError(i, i === input && plan.error ? plan.error : ""); });
    if (plan.error) {
      preview.textContent = "";
      runBtn.disabled = true;
      return;
    }
    runBtn.disabled = false;
    var n = plan.ranges.length;
    preview.textContent = n === 1
      ? "You'll get 1 PDF with pages " + describe(plan.ranges[0]) + "."
      : "You'll get " + n + " PDFs: " + plan.ranges.slice(0, 6).map(describe).join(", ") + (n > 6 ? " and " + (n - 6) + " more" : "") + ".";
  }

  function describe(r) {
    return r[0] === r[1] ? String(r[0]) : r[0] + "-" + r[1];
  }

  function showError(input, text) {
    var field = input.closest(".field");
    field.classList.toggle("invalid", !!text);
    input.setAttribute("aria-invalid", text ? "true" : "false");
    field.querySelector(".error-msg").textContent = text;
  }

  Array.prototype.forEach.call(modes, function (r) { r.addEventListener("change", update); });
  rangesInput.addEventListener("input", update);
  everyInput.addEventListener("input", update);

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    var plan = currentPlan();
    if (!state || !plan || plan.error) return;
    var n = plan.ranges.length;
    ui.run(runBtn, n === 1 ? "Making your PDF…" : "Making " + n + " PDFs…", function () {
      return splitPdf(state.bytes, plan.ranges).then(function (parts) {
        var files = parts.map(function (part) {
          var count = part.range[1] - part.range[0] + 1;
          return { name: partName(state.base, part.range), bytes: part.bytes, type: "application/pdf", detail: P.pagesWord(count) };
        });
        ui.showResult({
          title: n === 1 ? "Your PDF is ready" : "Your " + n + " PDFs are ready",
          summary: n === 1 ? "Pages " + describe(plan.ranges[0]) + " of " + state.name + "." : state.name + " split into " + n + " files.",
          files: files,
          zipName: state.base + "-split.zip",
          note: n > 1 ? "Download them one by one, or all together as a ZIP file." : ""
        });
      });
    });
  });
})();
