/* Remove Duplicate Lines and Sort: tidies a list one line per item. Removes repeated lines, empty
   lines and extra spaces, and sorts A to Z, Z to A, by number or by length. Runs in the browser. */

(function () {
  "use strict";

  // Sorts "item 2" before "item 10", and ignores capitals and accents when ordering.
  var collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

  /*
   * text: the list, one item per line.
   * opts: { trim, removeEmpty, dedupe, ignoreCase, sort: "none" | "az" | "za" | "short" | "long" | "reverse" }
   * Duplicates keep their first appearance. Sorting keeps lines that compare equal in their
   * original order.
   * Returns { lines, before, after, duplicates, empty }.
   */
  function tidy(text, opts) {
    var o = opts || {};
    var lines = String(text).replace(/\r\n?/g, "\n").split("\n");
    if (text === "") lines = [];
    var before = lines.length;
    if (o.trim) lines = lines.map(function (l) { return l.replace(/^\s+|\s+$/g, ""); });
    var empty = 0;
    if (o.removeEmpty) {
      lines = lines.filter(function (l) {
        if (/\S/.test(l)) return true;
        empty++;
        return false;
      });
    }
    var duplicates = 0;
    if (o.dedupe) {
      var seen = Object.create(null);
      lines = lines.filter(function (l) {
        var key = "k" + (o.ignoreCase ? l.toLowerCase() : l);
        if (seen[key]) {
          duplicates++;
          return false;
        }
        seen[key] = true;
        return true;
      });
    }
    var indexed = lines.map(function (l, i) { return { l: l, i: i }; });
    var by = {
      az: function (a, b) { return collator.compare(a.l, b.l) || a.i - b.i; },
      za: function (a, b) { return collator.compare(b.l, a.l) || a.i - b.i; },
      short: function (a, b) { return Array.from(a.l).length - Array.from(b.l).length || a.i - b.i; },
      long: function (a, b) { return Array.from(b.l).length - Array.from(a.l).length || a.i - b.i; }
    };
    if (by[o.sort]) indexed.sort(by[o.sort]);
    lines = indexed.map(function (x) { return x.l; });
    if (o.sort === "reverse") lines.reverse();
    return { lines: lines, before: before, after: lines.length, duplicates: duplicates, empty: empty };
  }

  window.ToolNestCalc = tidy;

  var form = document.getElementById("lt-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var input = el("lt-in");
  var output = el("lt-out");

  function opts() {
    return {
      trim: el("lt-trim").checked,
      removeEmpty: el("lt-empty").checked,
      dedupe: el("lt-dedupe").checked,
      ignoreCase: el("lt-case").checked,
      sort: el("lt-sort").value
    };
  }

  function n(x, word) {
    return x.toLocaleString("en-US") + " " + word + (x === 1 ? "" : "s");
  }

  function update() {
    var o = opts();
    el("lt-case").disabled = !o.dedupe;
    var r = tidy(input.value, o);
    output.value = r.lines.join("\n");
    el("lt-summary").textContent = input.value === ""
      ? "Paste a list to start."
      : n(r.before, "line") + " in, " + n(r.after, "line") + " out · " + n(r.duplicates, "duplicate") + " removed · " + n(r.empty, "empty line") + " removed";
  }

  var timer = 0;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(update, 120);
  });
  form.addEventListener("change", update);
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  el("lt-copy").addEventListener("click", function () {
    var btn = this;
    if (!navigator.clipboard || !output.value) return;
    navigator.clipboard.writeText(output.value).then(function () {
      btn.lastChild.textContent = " Copied";
      setTimeout(function () { btn.lastChild.textContent = " Copy result"; }, 1500);
    });
  });

  el("lt-use").addEventListener("click", function () {
    input.value = output.value;
    update();
    input.focus();
  });

  el("lt-clear").addEventListener("click", function () {
    input.value = "";
    update();
    input.focus();
  });

  update();
})();
