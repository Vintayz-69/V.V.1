/* Base64 Encode and Decode: text (as UTF-8) to Base64 and back, standard or URL-safe, and any file
   to a Base64 data: URL. Runs in the browser; files are read on the device, never uploaded. */
(function () {
  "use strict";

  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  function bytesToBase64(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] +
        (i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : "=") +
        (i + 2 < bytes.length ? ALPHABET[n & 63] : "=");
    }
    return out;
  }

  // Base64 (standard or URL-safe, with or without = padding, spaces and line breaks ignored)
  // → Uint8Array, or null if it isn't valid Base64.
  function base64ToBytes(text) {
    var t = String(text).replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (/[^A-Za-z0-9+/=]/.test(t) || /=[^=]/.test(t)) return null;
    t = t.replace(/=+$/, "");
    if (t.length % 4 === 1) return null;
    var bytes = [];
    var buffer = 0, bits = 0;
    for (var i = 0; i < t.length; i++) {
      buffer = (buffer << 6) | ALPHABET.indexOf(t[i]);
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 255);
      }
    }
    return new Uint8Array(bytes);
  }

  function encode(text, urlSafe) {
    var b64 = bytesToBase64(new TextEncoder().encode(String(text)));
    return urlSafe ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
  }

  // → { text } or { error }
  function decode(b64) {
    var bytes = base64ToBytes(b64);
    if (!bytes) return { error: "That isn't valid Base64. It may have been cut short, or contain other characters." };
    try {
      return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
    } catch (e) {
      return { error: "That's valid Base64, but it isn't text (it may be a picture or other file).", bytes: bytes.length };
    }
  }

  window.ToolNestCalc = { encode: encode, decode: decode, bytesToBase64: bytesToBase64, base64ToBytes: base64ToBytes };

  var form = document.getElementById("b64-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var input = el("b64-in");
  var output = el("b64-out");

  function mode() {
    return el("b64-mode-enc").checked ? "enc" : "dec";
  }

  function run() {
    var enc = mode() === "enc";
    el("b64-in-label").firstChild.textContent = enc ? "Text to encode" : "Base64 to decode";
    el("b64-urlsafe-row").hidden = !enc;
    el("b64-msg").textContent = "";
    if (!input.value) { output.value = ""; return; }
    if (enc) {
      output.value = encode(input.value, el("b64-urlsafe").checked);
      el("b64-msg").textContent = new TextEncoder().encode(input.value).length.toLocaleString("en-US") + " bytes → " + output.value.length.toLocaleString("en-US") + " characters";
    } else {
      var r = decode(input.value);
      output.value = r.error ? "" : r.text;
      el("b64-msg").textContent = r.error || "";
    }
  }

  var timer = 0;
  input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, 100); });
  form.addEventListener("change", run);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("b64-swap").addEventListener("click", function () {
    var out = output.value;
    (mode() === "enc" ? el("b64-mode-dec") : el("b64-mode-enc")).checked = true;
    input.value = out;
    run();
  });
  el("b64-copy").addEventListener("click", function () {
    var btn = this;
    if (!navigator.clipboard || !output.value) return;
    navigator.clipboard.writeText(output.value).then(function () {
      btn.lastChild.textContent = " Copied";
      setTimeout(function () { btn.lastChild.textContent = " Copy result"; }, 1500);
    });
  });

  // A file → data: URL (read on the device).
  var MAX = 5 * 1024 * 1024;
  el("b64-file").addEventListener("change", function () {
    var file = this.files[0];
    this.value = "";
    if (!file) return;
    if (file.size > MAX) {
      el("b64-file-msg").textContent = "That file is over 5 MB. Base64 makes files a third bigger, so it isn't a good fit for files this size.";
      return;
    }
    file.arrayBuffer().then(function (buf) {
      var type = file.type || "application/octet-stream";
      var url = "data:" + type + ";base64," + bytesToBase64(new Uint8Array(buf));
      el("b64-file-out").value = url;
      el("b64-file-msg").textContent = file.name + ": " + file.size.toLocaleString("en-US") + " bytes → " + url.length.toLocaleString("en-US") + " characters.";
    });
  });
  el("b64-file-copy").addEventListener("click", function () {
    var btn = this;
    var v = el("b64-file-out").value;
    if (!navigator.clipboard || !v) return;
    navigator.clipboard.writeText(v).then(function () {
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = "Copy data URL"; }, 1500);
    });
  });
  run();
})();
