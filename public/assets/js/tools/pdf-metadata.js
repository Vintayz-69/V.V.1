/* Edit PDF Properties: change or remove a PDF's title, author, subject, keywords and the apps
   named as its creator. The pages themselves are not touched. Runs in the browser. */

(function () {
  "use strict";

  var P = window.ToolNestPDF;
  var FIELDS = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer"];

  function infoDict(doc) {
    return doc.getInfoDict();
  }

  function text(doc, key) {
    var L = window.PDFLib;
    var value = infoDict(doc).lookup(L.PDFName.of(key));
    if (value && typeof value.decodeText === "function") return value.decodeText();
    return "";
  }

  function dateOf(doc, key) {
    try {
      return key === "CreationDate" ? doc.getCreationDate() : doc.getModificationDate();
    } catch (e) {
      return undefined;
    }
  }

  // source: PDF bytes → { title, author, subject, keywords, creator, producer, created, modified, xmp }
  function readProperties(source) {
    return P.asDoc(source).then(function (doc) {
      var out = {};
      FIELDS.forEach(function (k) { out[k.toLowerCase()] = text(doc, k); });
      out.created = dateOf(doc, "CreationDate");
      out.modified = dateOf(doc, "ModDate");
      out.xmp = !!doc.catalog.get(window.PDFLib.PDFName.of("Metadata"));
      return out;
    });
  }

  // The XMP copy of the properties (a separate stream some apps show instead). It's removed in
  // both modes so the old values can't linger in the file.
  function dropXmp(doc) {
    var N = window.PDFLib.PDFName;
    var ref = doc.catalog.get(N.of("Metadata"));
    doc.catalog.delete(N.of("Metadata"));
    if (ref && ref.objectNumber !== undefined) doc.context.delete(ref);
  }

  /*
   * source: PDF bytes. props: { title, author, subject, keywords, creator, producer } (blank = remove),
   * or { removeAll: true } to strip every property and both dates. → bytes
   */
  function editProperties(source, props) {
    return P.openPdf(source).then(function (doc) {
      var L = window.PDFLib;
      var info = infoDict(doc);
      dropXmp(doc);
      if (props.removeAll) {
        info.keys().forEach(function (key) { info.delete(key); });
      } else {
        FIELDS.forEach(function (k) {
          var value = String(props[k.toLowerCase()] == null ? "" : props[k.toLowerCase()]).trim();
          if (value) info.set(L.PDFName.of(k), L.PDFHexString.fromText(value));
          else info.delete(L.PDFName.of(k));
        });
        P.touch(doc);
      }
      return P.saveDoc(doc);
    });
  }

  window.ToolNestCalc = { readProperties: readProperties, editProperties: editProperties };
  if (!document.getElementById("pdf-tool")) return;

  var runBtn = document.getElementById("pdf-run");
  var form = document.getElementById("meta-form");
  var modeInputs = document.querySelectorAll("input[name='meta-mode']");
  var datesNote = document.getElementById("meta-dates");

  function mode() {
    var picked = document.querySelector("input[name='meta-mode']:checked");
    return picked ? picked.value : "edit";
  }

  function showMode() {
    var removing = mode() === "remove";
    form.hidden = removing;
    runBtn.textContent = removing ? "Remove properties and save" : "Save PDF";
  }

  function formatDate(d) {
    return d ? new Intl.DateTimeFormat(navigator.language || "en-US", { dateStyle: "medium", timeStyle: "short" }).format(d) : "not set";
  }

  var ui = P.singlePdfTool({
    onOpen: function (state) {
      return readProperties(state.bytes).then(function (props) {
        FIELDS.forEach(function (k) {
          document.getElementById("meta-" + k.toLowerCase()).value = props[k.toLowerCase()];
        });
        datesNote.textContent = "Created: " + formatDate(props.created) + ". Last changed: " + formatDate(props.modified) + "." +
          (props.xmp ? " This PDF also has a second (XMP) copy of its properties, which will be removed when you save." : "");
        showMode();
      });
    },
    onReset: function () {
      form.reset();
      datesNote.textContent = "";
    }
  });

  Array.prototype.forEach.call(modeInputs, function (input) { input.addEventListener("change", showMode); });

  runBtn.addEventListener("click", function () {
    var state = ui.state();
    if (!state) return;
    var props = { removeAll: mode() === "remove" };
    FIELDS.forEach(function (k) { props[k.toLowerCase()] = document.getElementById("meta-" + k.toLowerCase()).value; });
    ui.run(runBtn, props.removeAll ? "Removing properties…" : "Saving properties…", function () {
      return editProperties(state.bytes, props).then(function (bytes) {
        ui.showResult({
          title: props.removeAll ? "Your cleaned PDF is ready" : "Your updated PDF is ready",
          summary: props.removeAll
            ? "Title, author, dates and the other document properties were removed from " + state.name + "."
            : "The document properties of " + state.name + " were updated.",
          files: [{ name: state.base + (props.removeAll ? "-clean.pdf" : "-edited.pdf"), bytes: bytes, type: "application/pdf", detail: P.pagesWord(state.pages) }]
        });
      });
    });
  });
})();
