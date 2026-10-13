/* Regex Tester: highlights what a JavaScript regular expression matches, lists groups, and
   previews a replace. Matching runs in regex-worker.js and is stopped after a second, so a slow
   pattern can't freeze the page. Runs in the browser; nothing is sent. */
(function () {
  "use strict";

  var form = document.getElementById("rx-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var script = document.currentScript;
  var workerUrl = script ? script.src.replace(/regex-tester\.js/, "regex-worker.js") : "regex-worker.js";
  var worker = null;
  var timer = 0;
  var guard = 0;
  var LIMIT_MS = 1000;

  function flags() {
    return ["g", "i", "m", "s", "u"].filter(function (f) { return el("rx-f" + f).checked; }).join("");
  }

  function start() {
    if (!worker) worker = new Worker(workerUrl);
    return worker;
  }

  function run() {
    var pattern = el("rx-pattern").value;
    var text = el("rx-text").value;
    var status = el("rx-status");
    el("rx-flags-show").textContent = "/" + flags();
    if (!pattern) {
      status.textContent = "Type a pattern to start.";
      status.className = "tc-summary";
      draw(text, []);
      el("rx-groups").textContent = "";
      el("rx-replaced").value = "";
      return;
    }
    var w = start();
    clearTimeout(guard);
    guard = setTimeout(function () {
      // Too slow: stop the worker (and the runaway match with it) and start a fresh one next time.
      w.terminate();
      worker = null;
      status.textContent = "Stopped after 1 second: this pattern takes too long on this text (often nested repeats like (a+)+). Try a simpler pattern.";
      status.className = "tc-summary is-error";
    }, LIMIT_MS);
    w.onmessage = function (e) {
      clearTimeout(guard);
      show(e.data, text);
    };
    var rep = el("rx-replace").value;
    w.postMessage({ pattern: pattern, flags: flags(), text: text, replacement: el("rx-do-replace").checked ? rep : null });
  }

  function show(r, text) {
    var status = el("rx-status");
    if (r.error) {
      status.textContent = "Not a valid pattern: " + r.error;
      status.className = "tc-summary is-error";
      draw(text, []);
      el("rx-groups").textContent = "";
      return;
    }
    status.className = "tc-summary";
    status.textContent = r.total === 0 ? "No matches." : r.total.toLocaleString("en-US") + (r.total === 1 ? " match" : " matches") + (r.capped ? " (showing the first 1,000)" : "") + ".";
    draw(text, r.matches);
    listGroups(r.matches);
    el("rx-replaced").value = r.replaced !== undefined ? r.replaced : "";
  }

  // The text with each match marked, built with text nodes so nothing typed can run as code.
  function draw(text, matches) {
    var box = el("rx-view");
    box.textContent = "";
    var at = 0;
    matches.forEach(function (m, i) {
      if (m.index < at) return;
      box.appendChild(document.createTextNode(text.slice(at, m.index)));
      var mark = document.createElement("mark");
      mark.className = i % 2 ? "rx-alt" : "";
      mark.textContent = m.text || "​";
      mark.title = "Match " + (i + 1) + " at " + m.index;
      box.appendChild(mark);
      at = m.index + m.text.length;
    });
    box.appendChild(document.createTextNode(text.slice(at)));
  }

  function listGroups(matches) {
    var box = el("rx-groups");
    box.textContent = "";
    if (!matches.length) return;
    var hasGroups = matches.some(function (m) { return m.groups.length; });
    var table = document.createElement("table");
    var head = document.createElement("tr");
    var cols = ["#", "Match", "At"];
    var names = Object.keys(matches[0].named);
    if (hasGroups) {
      for (var g = 1; g <= matches[0].groups.length; g++) cols.push("Group " + g);
    }
    cols.forEach(function (c) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = c;
      head.appendChild(th);
    });
    var thead = document.createElement("thead");
    thead.appendChild(head);
    table.appendChild(thead);
    var tb = document.createElement("tbody");
    matches.slice(0, 200).forEach(function (m, i) {
      var tr = document.createElement("tr");
      var cells = [String(i + 1), m.text, String(m.index)].concat(hasGroups ? m.groups.map(function (x) { return x === null ? "(none)" : x; }) : []);
      cells.forEach(function (c) {
        var td = document.createElement("td");
        td.textContent = c;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    var wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.appendChild(table);
    box.appendChild(wrap);
    if (names.length) {
      var p = document.createElement("p");
      p.className = "tc-summary";
      p.textContent = "Named groups in the first match: " + names.map(function (n) { return n + " = " + (matches[0].named[n] === null ? "(none)" : matches[0].named[n]); }).join(", ");
      box.appendChild(p);
    }
  }

  function later() {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  }

  form.addEventListener("input", later);
  form.addEventListener("change", later);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("rx-do-replace").addEventListener("change", function () {
    el("rx-replace-box").hidden = !this.checked;
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-rx]"), function (b) {
    b.addEventListener("click", function () {
      el("rx-pattern").value = b.getAttribute("data-rx");
      run();
    });
  });
  run();
})();
