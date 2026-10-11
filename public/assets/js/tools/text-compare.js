/* Text Compare: shows what changed between two versions of a text, line by line or word by word.
   Uses the Myers difference method (the one behind most "diff" tools). Runs in the browser. */

(function () {
  "use strict";

  var MAX_EDITS = 4000; // beyond this the texts are too different to show usefully

  /*
   * The shortest list of changes that turns `a` into `b` (arrays of tokens, compared by key).
   * Returns [{ type: "same" | "del" | "ins", items: [...] }] with neighbours of one type merged,
   * or null if the texts differ in more than MAX_EDITS places.
   */
  function diff(a, b, keyOf) {
    var key = keyOf || function (x) { return x; };
    var ka = a.map(key);
    var kb = b.map(key);
    // Lines that match at the start and end don't need the search.
    var start = 0;
    while (start < ka.length && start < kb.length && ka[start] === kb[start]) start++;
    var endA = ka.length;
    var endB = kb.length;
    while (endA > start && endB > start && ka[endA - 1] === kb[endB - 1]) { endA--; endB--; }

    var ops = [];
    var n = endA - start;
    var m = endB - start;
    var max = Math.min(n + m, MAX_EDITS);
    var offset = max + 1;
    var v = new Int32Array(2 * max + 3);
    var trace = [];
    var found = n === 0 && m === 0;
    var d;
    for (d = 0; d <= max && !found; d++) {
      // Only diagonals −d−1 … d+1 can be read later, so only those are kept (saves memory).
      trace.push(v.slice(offset - d - 1, offset + d + 2));
      for (var k = -d; k <= d; k += 2) {
        var x = (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) ? v[offset + k + 1] : v[offset + k - 1] + 1;
        var y = x - k;
        while (x < n && y < m && ka[start + x] === kb[start + y]) { x++; y++; }
        v[offset + k] = x;
        if (x >= n && y >= m) { found = true; break; }
      }
    }
    if (!found) return null;

    // Walk back through the saved steps to list the changes.
    var steps = [];
    var cx = n;
    var cy = m;
    for (var dd = trace.length - 1; dd >= 0 && (cx > 0 || cy > 0); dd--) {
      var vv = trace[dd];
      var base = dd + 1; // vv[base + k] holds diagonal k
      var kk = cx - cy;
      var prevK = (kk === -dd || (kk !== dd && vv[base + kk - 1] < vv[base + kk + 1])) ? kk + 1 : kk - 1;
      var px = dd === 0 ? 0 : vv[base + prevK];
      var py = px - prevK;
      while (cx > px && cy > py) { steps.push(["same", cx - 1, cy - 1]); cx--; cy--; }
      if (dd > 0) {
        if (cx === px) steps.push(["ins", cx, cy - 1]);
        else steps.push(["del", cx - 1, cy]);
      }
      cx = px;
      cy = py;
    }
    steps.reverse();

    function push(type, item) {
      var last = ops[ops.length - 1];
      if (last && last.type === type) last.items.push(item);
      else ops.push({ type: type, items: [item] });
    }
    for (var i = 0; i < start; i++) push("same", a[i]);
    steps.forEach(function (s) {
      if (s[0] === "ins") push("ins", b[start + s[2]]);
      else push(s[0], a[start + s[1]]);
    });
    for (var j = endA; j < a.length; j++) push("same", a[j]);
    return ops;
  }

  // Lines, without the line-break characters (Windows \r\n counts as one break).
  function lines(text) {
    return String(text).replace(/\r\n?/g, "\n").split("\n");
  }

  // Words and the spaces between them, so the text can be rebuilt exactly.
  function wordTokens(text) {
    return String(text).replace(/\r\n?/g, "\n").match(/\s+|[^\s]+/g) || [];
  }

  function keyFor(opts) {
    return function (token) {
      var t = token;
      if (opts.ignoreCase) t = t.toLowerCase();
      if (opts.ignoreSpace) t = t.replace(/\s+/g, " ").trim();
      return t;
    };
  }

  /*
   * Compares two texts. opts: { mode: "lines" | "words", ignoreCase, ignoreSpace }.
   * Returns { ops, added, removed, same, identical } (counts are lines or words), or null if the
   * texts are too different.
   */
  function compare(before, after, opts) {
    var o = opts || {};
    var words = o.mode === "words";
    var a = words ? wordTokens(before) : lines(before);
    var b = words ? wordTokens(after) : lines(after);
    var ops = diff(a, b, keyFor(o));
    if (!ops) return null;
    var count = { same: 0, del: 0, ins: 0 };
    ops.forEach(function (op) {
      op.items.forEach(function (t) { if (!words || /\S/.test(t)) count[op.type]++; });
    });
    return { ops: ops, added: count.ins, removed: count.del, same: count.same, identical: !count.ins && !count.del };
  }

  window.ToolNestCalc = { diff: diff, compare: compare, lines: lines, wordTokens: wordTokens };

  var form = document.getElementById("tc-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var out = el("tc-out");

  function opts() {
    return {
      mode: document.querySelector("input[name=tc-mode]:checked").value,
      ignoreCase: el("tc-case").checked,
      ignoreSpace: el("tc-space").checked
    };
  }

  function span(cls, text) {
    var s = document.createElement("span");
    if (cls) s.className = cls;
    s.textContent = text;
    return s;
  }

  function show() {
    var o = opts();
    var r = compare(el("tc-a").value, el("tc-b").value, o);
    out.textContent = "";
    out.className = "tc-out " + (o.mode === "words" ? "is-words" : "is-lines");
    var summary = el("tc-summary");
    if (!r) {
      summary.textContent = "These texts are too different to compare usefully. Check you've pasted two versions of the same text.";
      return;
    }
    var unit = o.mode === "words" ? "word" : "line";
    var plural = function (n) { return n.toLocaleString("en-US") + " " + unit + (n === 1 ? "" : "s"); };
    summary.textContent = r.identical
      ? (el("tc-a").value || el("tc-b").value ? "No differences found." : "Paste two texts to compare them.")
      : plural(r.added) + " added, " + plural(r.removed) + " removed, " + plural(r.same) + " the same.";
    el("tc-legend").hidden = r.identical;

    if (o.mode === "words") {
      r.ops.forEach(function (op) {
        var text = op.items.join("");
        if (op.type === "same") out.appendChild(document.createTextNode(text));
        else out.appendChild(span(op.type === "ins" ? "tc-ins" : "tc-del", text));
      });
      return;
    }
    var la = 0;
    var lb = 0;
    r.ops.forEach(function (op) {
      op.items.forEach(function (line) {
        var row = document.createElement("div");
        row.className = "tc-line tc-" + op.type;
        var mark = op.type === "ins" ? "+" : op.type === "del" ? "−" : "";
        if (op.type !== "ins") la++;
        if (op.type !== "del") lb++;
        row.appendChild(span("tc-num", op.type === "ins" ? "" : String(la)));
        row.appendChild(span("tc-num", op.type === "del" ? "" : String(lb)));
        row.appendChild(span("tc-mark", mark));
        row.appendChild(span("tc-text", line === "" ? " " : line));
        if (op.type !== "same") row.setAttribute("aria-label", (op.type === "ins" ? "Added: " : "Removed: ") + line);
        out.appendChild(row);
      });
    });
  }

  var timer = 0;
  form.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(show, 150);
  });
  form.addEventListener("change", show);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("tc-swap").addEventListener("click", function () {
    var x = el("tc-a").value;
    el("tc-a").value = el("tc-b").value;
    el("tc-b").value = x;
    show();
  });
  el("tc-clear").addEventListener("click", function () {
    el("tc-a").value = "";
    el("tc-b").value = "";
    show();
    el("tc-a").focus();
  });
  show();
})();
