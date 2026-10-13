/* URL Encode and Decode: percent-encodes text for a web address (one part, or a whole address),
   decodes it back, and breaks an address into its parts and query parameters. Runs in the browser. */
(function () {
  "use strict";

  // mode "component": every character with a meaning in addresses is encoded (for one value).
  // mode "full": a whole address; characters like : / ? & = # are kept.
  function encode(text, mode, plusSpaces) {
    var out = mode === "full" ? encodeURI(String(text)) : encodeURIComponent(String(text));
    return plusSpaces ? out.replace(/%20/g, "+") : out;
  }

  // → { text } or { error }
  function decode(text, plusSpaces) {
    var t = String(text);
    if (plusSpaces) t = t.replace(/\+/g, " ");
    try {
      return { text: decodeURIComponent(t) };
    } catch (e) {
      return { error: "This can't be decoded: there's a % that isn't followed by two hexadecimal digits, or the bytes aren't valid UTF-8." };
    }
  }

  // → { parts: [[name, value]], params: [[key, value]] } or { error }
  function parse(text) {
    var u;
    try { u = new URL(String(text).trim()); } catch (e) { return { error: "That isn't a full web address. It should start with https:// or http://." }; }
    var params = [];
    u.searchParams.forEach(function (v, k) { params.push([k, v]); });
    return {
      parts: [["Protocol", u.protocol], ["Host", u.hostname], ["Port", u.port || "(default)"], ["Path", decodeSafe(u.pathname)],
        ["Query", u.search || "(none)"], ["Fragment", u.hash ? decodeSafe(u.hash) : "(none)"]],
      params: params
    };
  }

  function decodeSafe(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  window.ToolNestCalc = { encode: encode, decode: decode, parse: parse };

  var form = document.getElementById("ue-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };

  function run() {
    var enc = el("ue-enc").checked;
    el("ue-scope-row").hidden = !enc;
    var input = el("ue-in").value;
    var plus = el("ue-plus").checked;
    var msg = el("ue-msg");
    msg.textContent = "";
    if (enc) {
      el("ue-out").value = encode(input, el("ue-full").checked ? "full" : "component", plus);
    } else {
      var r = decode(input, plus);
      el("ue-out").value = r.error ? "" : r.text;
      msg.textContent = r.error || "";
    }
    showParts(enc ? input : (el("ue-out").value || input));
  }

  function showParts(text) {
    var box = el("ue-parts");
    box.textContent = "";
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text.trim())) return;
    var r = parse(text);
    if (r.error) return;
    var rows = r.parts.concat(r.params.map(function (p) { return ["Parameter: " + p[0], p[1]]; }));
    var table = document.createElement("table");
    var tb = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = row[0];
      var td = document.createElement("td");
      td.textContent = row[1];
      tr.appendChild(th);
      tr.appendChild(td);
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    var h = document.createElement("h2");
    h.className = "tc-title";
    h.textContent = "Parts of this address";
    var wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.appendChild(table);
    box.appendChild(h);
    box.appendChild(wrap);
  }

  var timer = 0;
  el("ue-in").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, 100); });
  form.addEventListener("change", run);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("ue-swap").addEventListener("click", function () {
    var out = el("ue-out").value;
    (el("ue-enc").checked ? el("ue-dec") : el("ue-enc")).checked = true;
    el("ue-in").value = out;
    run();
  });
  el("ue-copy").addEventListener("click", function () {
    var btn = this;
    if (!navigator.clipboard || !el("ue-out").value) return;
    navigator.clipboard.writeText(el("ue-out").value).then(function () {
      btn.lastChild.textContent = " Copied";
      setTimeout(function () { btn.lastChild.textContent = " Copy result"; }, 1500);
    });
  });
  run();
})();
