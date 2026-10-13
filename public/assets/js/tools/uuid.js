/* UUID Generator: random version 4 UUIDs and time-ordered version 7 UUIDs (RFC 9562), made with the
   browser's secure random numbers, and a checker that reads any UUID. Nothing is sent or saved. */
(function () {
  "use strict";

  function cryptoObj() {
    return (typeof window !== "undefined" && window.crypto) || (typeof crypto !== "undefined" ? crypto : null);
  }

  function hex(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
    return s.slice(0, 8) + "-" + s.slice(8, 12) + "-" + s.slice(12, 16) + "-" + s.slice(16, 20) + "-" + s.slice(20);
  }

  function v4(rng) {
    var b = new Uint8Array(16);
    (rng || cryptoObj()).getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx (RFC 9562)
    return hex(b);
  }

  // Version 7: the first 48 bits are the time in milliseconds since 1970, so v7 UUIDs sort by time.
  function v7(ms, rng) {
    var b = new Uint8Array(16);
    (rng || cryptoObj()).getRandomValues(b);
    var t = Math.floor(ms === undefined ? Date.now() : ms);
    for (var i = 5; i >= 0; i--) { b[i] = t % 256; t = Math.floor(t / 256); }
    b[6] = (b[6] & 0x0f) | 0x70;
    b[8] = (b[8] & 0x3f) | 0x80;
    return hex(b);
  }

  function format(id, o) {
    var s = o.hyphens === false ? id.replace(/-/g, "") : id;
    if (o.upper) s = s.toUpperCase();
    if (o.braces) s = "{" + s + "}";
    return s;
  }

  // Reads a UUID: { valid, version, variant, time (ms, for v1, v6 and v7), nil, max } or { valid: false }
  function inspect(text) {
    var t = String(text || "").trim().replace(/^\{|\}$/g, "").replace(/^urn:uuid:/i, "").toLowerCase();
    if (/^[0-9a-f]{32}$/.test(t)) t = t.slice(0, 8) + "-" + t.slice(8, 12) + "-" + t.slice(12, 16) + "-" + t.slice(16, 20) + "-" + t.slice(20);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(t)) return { valid: false };
    var h = t.replace(/-/g, "");
    if (/^0+$/.test(h)) return { valid: true, nil: true, uuid: t };
    if (/^f+$/.test(h)) return { valid: true, max: true, uuid: t };
    var version = parseInt(h[12], 16);
    var v = parseInt(h[16], 16);
    var variant = v < 8 ? "NCS (old)" : v < 12 ? "RFC 9562 / RFC 4122" : v < 14 ? "Microsoft (old)" : "Reserved";
    var out = { valid: true, uuid: t, version: version, variant: variant };
    if (version === 7) out.time = parseInt(h.slice(0, 12), 16);
    if (version === 1 || version === 6) {
      // 60-bit count of 100-nanosecond steps since 15 October 1582.
      var hi = version === 1 ? h.slice(13, 16) + h.slice(8, 12) + h.slice(0, 8) : h.slice(0, 12) + h.slice(13, 16);
      var ticks = parseInt(hi, 16);
      out.time = Math.round(ticks / 10000 - 12219292800000);
    }
    return out;
  }

  window.ToolNestCalc = { v4: v4, v7: v7, format: format, inspect: inspect };

  var form = document.getElementById("uu-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };

  function make() {
    var n = Number(el("uu-count").value);
    var ver = el("uu-v7").checked ? 7 : 4;
    var o = { upper: el("uu-upper").checked, hyphens: !el("uu-nohyphen").checked, braces: el("uu-braces").checked };
    var list = [];
    for (var i = 0; i < n; i++) list.push(format(ver === 7 ? v7() : v4(), o));
    el("uu-out").value = list.join("\n");
  }

  function check() {
    var text = el("uu-check").value;
    var out = el("uu-check-out");
    if (!text.trim()) { out.textContent = ""; return; }
    var r = inspect(text);
    if (!r.valid) { out.textContent = "That isn't a valid UUID: it should be 32 hexadecimal digits (0–9, a–f), usually written 8-4-4-4-12."; return; }
    if (r.nil) { out.textContent = "Valid: this is the nil UUID (all zeros)."; return; }
    if (r.max) { out.textContent = "Valid: this is the max UUID (all f's)."; return; }
    out.textContent = "Valid UUID, version " + r.version + ", variant " + r.variant + "." +
      (r.time !== undefined ? " Made at " + new Date(r.time).toISOString().replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC") + "." : "");
  }

  form.addEventListener("change", make);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("uu-again").addEventListener("click", make);
  el("uu-copy").addEventListener("click", function () {
    var btn = this;
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(el("uu-out").value).then(function () {
      btn.lastChild.textContent = " Copied";
      setTimeout(function () { btn.lastChild.textContent = " Copy all"; }, 1500);
    });
  });
  el("uu-check").addEventListener("input", check);
  make();
})();
