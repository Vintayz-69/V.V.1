/* JSON Formatter, Validator and Minifier — 100% in-browser, no data leaves your device (LEGAL.md §2). */
(function () {
  "use strict";

  var T = window.ToolNest;

  function countKeys(obj) {
    var count = 0;
    if (obj && typeof obj === "object") {
      if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) count += countKeys(obj[i]);
      } else {
        var keys = Object.keys(obj);
        count += keys.length;
        for (var j = 0; j < keys.length; j++) count += countKeys(obj[keys[j]]);
      }
    }
    return count;
  }

  function calculate(v) {
    var raw = String(v.text || "").trim();
    if (!raw) {
      return { valid: false, error: "Empty input", keys: 0, size: 0, minifiedSize: 0 };
    }
    try {
      var parsed = JSON.parse(raw);
      var pretty = JSON.stringify(parsed, null, 2);
      var minified = JSON.stringify(parsed);
      var keys = countKeys(parsed);
      return {
        valid: true,
        pretty: pretty,
        minified: minified,
        keys: keys,
        size: raw.length,
        minifiedSize: minified.length
      };
    } catch (err) {
      return {
        valid: false,
        error: err.message,
        keys: 0,
        size: raw.length,
        minifiedSize: 0
      };
    }
  }

  window.ToolNestCalc = calculate;

  var input = document.getElementById("json-input");
  if (!input) return;

  var outStatus = document.getElementById("out-json-status");
  var outKeys = document.getElementById("out-json-keys");
  var outSize = document.getElementById("out-json-size");
  var outSaved = document.getElementById("out-json-saved");
  var errorBox = document.getElementById("json-error-box");

  function render() {
    var raw = input.value;
    var r = calculate({ text: raw });

    if (!raw.trim()) {
      outStatus.textContent = "Waiting for input";
      outStatus.className = "badge muted";
      outKeys.textContent = "0";
      outSize.textContent = "0 bytes";
      outSaved.textContent = "0%";
      errorBox.hidden = true;
      return;
    }

    if (r.valid) {
      outStatus.textContent = "Valid JSON";
      outStatus.className = "badge";
      outKeys.textContent = T.formatNumber(r.keys);
      outSize.textContent = T.formatNumber(r.size) + " chars";
      var savedPct = r.size > 0 ? Math.round(((r.size - r.minifiedSize) / r.size) * 100) : 0;
      outSaved.textContent = savedPct + "% saved minified";
      errorBox.hidden = true;
    } else {
      outStatus.textContent = "Invalid JSON";
      outStatus.className = "badge badge-alert";
      outKeys.textContent = "0";
      outSize.textContent = T.formatNumber(r.size) + " chars";
      outSaved.textContent = "—";
      errorBox.textContent = r.error;
      errorBox.hidden = false;
    }
  }

  input.addEventListener("input", render);

  var btnBeautify = document.getElementById("btn-beautify");
  if (btnBeautify) {
    btnBeautify.addEventListener("click", function () {
      var r = calculate({ text: input.value });
      if (r.valid) {
        input.value = r.pretty;
        render();
      }
    });
  }

  var btnMinify = document.getElementById("btn-minify");
  if (btnMinify) {
    btnMinify.addEventListener("click", function () {
      var r = calculate({ text: input.value });
      if (r.valid) {
        input.value = r.minified;
        render();
      }
    });
  }

  var btnCopy = document.getElementById("btn-copy-json");
  if (btnCopy) {
    btnCopy.addEventListener("click", function () {
      if (!input.value) return;
      navigator.clipboard.writeText(input.value).then(function () {
        var orig = btnCopy.textContent;
        btnCopy.textContent = "Copied!";
        setTimeout(function () { btnCopy.textContent = orig; }, 1500);
      });
    });
  }

  var btnClear = document.getElementById("btn-clear-json");
  if (btnClear) {
    btnClear.addEventListener("click", function () {
      input.value = "";
      render();
    });
  }

  var btnSample = document.getElementById("btn-sample-json");
  if (btnSample) {
    btnSample.addEventListener("click", function () {
      input.value = JSON.stringify({
        project: "ToolNest",
        url: "https://vintayz.com",
        features: ["Private", "No-Signup", "Fast"],
        stats: { tools: 45, countries: 4, privacyFirst: true }
      }, null, 2);
      render();
    });
  }

  render();
})();
