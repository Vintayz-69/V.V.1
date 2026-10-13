/* Hash Generator: MD5, SHA-1, SHA-256, SHA-384 and SHA-512 of text or a file, and a check against
   an expected checksum. SHA uses the browser's built-in crypto.subtle; MD5 (which browsers don't
   offer) follows RFC 1321. Files are read on the device, never uploaded. */
(function () {
  "use strict";

  // MD5 (RFC 1321) of bytes → hex string.
  function md5(bytes) {
    var K = new Int32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
    var len = bytes.length;
    var words = new Int32Array((((len + 8) >>> 6) + 1) * 16);
    for (i = 0; i < len; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    words[len >> 2] |= 0x80 << ((len % 4) * 8);
    words[words.length - 2] = (len * 8) >>> 0;
    words[words.length - 1] = Math.floor(len / 536870912); // high bits of the length in bits
    var a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (var j = 0; j < words.length; j += 16) {
      var a = a0, b = b0, c = c0, d = d0;
      for (i = 0; i < 64; i++) {
        var f, g;
        if (i < 16) { f = (b & c) | (~b & d); g = i; }
        else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        var tmp = d;
        d = c;
        c = b;
        var x = (a + f + K[i] + words[j + g]) | 0;
        var s = S[(i >> 4) * 4 + (i % 4)];
        b = (b + ((x << s) | (x >>> (32 - s)))) | 0;
        a = tmp;
      }
      a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
    }
    return [a0, b0, c0, d0].map(function (n) {
      var h = "";
      for (var k = 0; k < 4; k++) h += ((n >>> (k * 8)) & 255).toString(16).padStart(2, "0");
      return h;
    }).join("");
  }

  function toHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function subtle() {
    var c = (typeof window !== "undefined" && window.crypto) || (typeof crypto !== "undefined" ? crypto : null);
    return c && c.subtle;
  }

  var ALGOS = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];

  // bytes → Promise of { "MD5": hex, "SHA-1": hex, … }
  function hashAll(bytes) {
    var out = { "MD5": md5(bytes) };
    var s = subtle();
    if (!s) return Promise.resolve(out);
    return Promise.all(ALGOS.slice(1).map(function (a) {
      return s.digest(a, bytes).then(function (buf) { out[a] = toHex(buf); });
    })).then(function () { return out; });
  }

  // Which algorithm (if any) produced `expected`?
  function match(hashes, expected) {
    var e = String(expected || "").trim().toLowerCase().replace(/^[a-z0-9-]+[:=]\s*/, "");
    if (!e) return null;
    for (var k in hashes) if (hashes[k] === e) return k;
    return false;
  }

  window.ToolNestCalc = { md5: md5, hashAll: hashAll, match: match, ALGOS: ALGOS };

  var form = document.getElementById("hs-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var current = {};

  function show(hashes, label) {
    current = hashes;
    var list = el("hs-list");
    list.textContent = "";
    ALGOS.forEach(function (a) {
      if (!hashes[a]) return;
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.className = "hs-name";
      name.textContent = a;
      var code = document.createElement("code");
      code.className = "hs-value";
      code.textContent = el("hs-upper").checked ? hashes[a].toUpperCase() : hashes[a];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy " + a);
      btn.addEventListener("click", function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(code.textContent).then(function () {
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = "Copy"; }, 1500);
        });
      });
      li.appendChild(name); li.appendChild(code); li.appendChild(btn);
      list.appendChild(li);
    });
    el("hs-source").textContent = label;
    compare();
  }

  function compare() {
    var m = match(current, el("hs-expect").value);
    var out = el("hs-match");
    out.className = "hs-match" + (m ? " is-ok" : m === false ? " is-bad" : "");
    out.textContent = m === null ? "" : m ? "✓ Matches the " + m + " hash." : "✗ Doesn't match any of the hashes above.";
  }

  function hashText() {
    var bytes = new TextEncoder().encode(el("hs-text").value);
    hashAll(bytes).then(function (h) { show(h, "Text: " + bytes.length.toLocaleString("en-US") + " bytes (UTF-8)"); });
  }

  var timer = 0;
  el("hs-text").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(hashText, 120); });
  el("hs-expect").addEventListener("input", compare);
  el("hs-upper").addEventListener("change", function () { show(current, el("hs-source").textContent); });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("hs-file").addEventListener("change", function () {
    var file = this.files[0];
    this.value = "";
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { el("hs-source").textContent = "That file is over 500 MB, too big to hash in a browser tab."; return; }
    el("hs-source").textContent = "Reading " + file.name + "…";
    file.arrayBuffer().then(function (buf) {
      return hashAll(new Uint8Array(buf)).then(function (h) { show(h, "File: " + file.name + ", " + file.size.toLocaleString("en-US") + " bytes"); });
    });
  });
  hashText();
})();
