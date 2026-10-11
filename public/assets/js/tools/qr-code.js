/* QR Code Generator: makes a QR code for a link, text, Wi-Fi network, email or phone number, and
   saves it as PNG or SVG. Uses qrcode-generator (MIT, assets/vendor/qrcode-generator/), served
   from our own site. Nothing is sent or saved. */
(function () {
  "use strict";

  var Q = typeof qrcode !== "undefined" ? qrcode : window.qrcode; // eslint-disable-line no-undef

  // Wi-Fi codes escape \ ; , : and " with a backslash.
  function wifiEscape(s) {
    return String(s).replace(/([\\;,:"])/g, "\\$1");
  }

  /*
   * The text stored in the code.
   *   { kind: "text", text }
   *   { kind: "wifi", ssid, password, security: "WPA" | "WEP" | "nopass", hidden }
   *   { kind: "email", to, subject, body }
   *   { kind: "phone", number }
   */
  function payload(o) {
    if (o.kind === "wifi") {
      var sec = o.security === "nopass" || !o.password ? "nopass" : o.security;
      return "WIFI:T:" + sec + ";S:" + wifiEscape(o.ssid) + ";" +
        (sec === "nopass" ? "" : "P:" + wifiEscape(o.password) + ";") + (o.hidden ? "H:true;" : "") + ";";
    }
    if (o.kind === "email") {
      var q = [];
      if (o.subject) q.push("subject=" + encodeURIComponent(o.subject));
      if (o.body) q.push("body=" + encodeURIComponent(o.body));
      return "mailto:" + String(o.to).trim() + (q.length ? "?" + q.join("&") : "");
    }
    if (o.kind === "phone") return "tel:" + String(o.number).replace(/[^\d+]/g, "");
    return String(o.text);
  }

  /*
   * The QR code as a grid: { size, dark(row, col) }, or { error } if the text is too long.
   * level: "L" | "M" | "Q" | "H" (how much damage the code can survive: about 7%, 15%, 25%, 30%).
   */
  function matrix(text, level) {
    Q.stringToBytes = Q.stringToBytesFuncs["UTF-8"]; // so accents, other alphabets and emoji work
    try {
      var qr = Q(0, level || "M");
      qr.addData(text, "Byte");
      qr.make();
      var n = qr.getModuleCount();
      return { size: n, version: (n - 17) / 4, dark: function (r, c) { return qr.isDark(r, c); } };
    } catch (e) {
      return { error: "That's too much for one QR code. Shorten it, or choose a lower error correction level." };
    }
  }

  // An SVG file of the code: one path, `margin` empty squares around it (4 is the standard quiet zone).
  function svg(m, scale, margin, darkColour, lightColour) {
    var full = (m.size + margin * 2) * scale;
    var d = "";
    for (var r = 0; r < m.size; r++) {
      for (var c = 0; c < m.size; c++) {
        if (m.dark(r, c)) d += "M" + (c + margin) * scale + " " + (r + margin) * scale + "h" + scale + "v" + scale + "h-" + scale + "z";
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + full + '" height="' + full + '" viewBox="0 0 ' + full + " " + full + '" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="' + lightColour + '"/><path fill="' + darkColour + '" d="' + d + '"/></svg>';
  }

  // WCAG relative luminance of "#rrggbb".
  function luminance(hex) {
    var v = [1, 3, 5].map(function (i) {
      var c = parseInt(hex.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  function contrast(a, b) {
    var x = luminance(a);
    var y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  window.ToolNestCalc = { payload: payload, matrix: matrix, svg: svg, contrast: contrast, wifiEscape: wifiEscape };

  var form = document.getElementById("qr-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var canvas = el("qr-canvas");
  var urls = [];

  function kind() {
    return document.querySelector("input[name=qr-kind]:checked").value;
  }

  function read() {
    var k = kind();
    if (k === "wifi") return { kind: k, ssid: el("qr-ssid").value, password: el("qr-pass").value, security: el("qr-sec").value, hidden: el("qr-hidden").checked };
    if (k === "email") return { kind: k, to: el("qr-to").value, subject: el("qr-subject").value, body: el("qr-body").value };
    if (k === "phone") return { kind: k, number: el("qr-phone").value };
    return { kind: k, text: el("qr-text").value };
  }

  function empty(o) {
    if (o.kind === "wifi") return !o.ssid;
    if (o.kind === "email") return !String(o.to).trim();
    if (o.kind === "phone") return !/\d/.test(o.number);
    return !o.text;
  }

  function setLink(id, data, type, name) {
    var a = el(id);
    var url = URL.createObjectURL(new Blob([data], { type: type }));
    urls.push(url);
    a.href = url;
    a.download = name;
  }

  var lastKey = "";

  function draw() {
    // Leaving a box also fires "change"; don't redraw (and replace the download links) if nothing changed.
    var key = JSON.stringify([read(), el("qr-level").value, el("qr-size").value, el("qr-dark").value, el("qr-light").value]);
    if (key === lastKey) return;
    lastKey = key;
    // Old links are released a little later, so a download that has just started can finish.
    var old = urls;
    urls = [];
    setTimeout(function () { old.forEach(function (u) { URL.revokeObjectURL(u); }); }, 60000);
    ["qr-kind-text", "qr-kind-wifi", "qr-kind-email", "qr-kind-phone"].forEach(function (id) {
      el(id + "-fields").hidden = !el(id).checked;
    });
    var o = read();
    var status = el("qr-status");
    var dark = el("qr-dark").value;
    var light = el("qr-light").value;
    var low = contrast(dark, light) < 4 || luminance(dark) > luminance(light);
    el("qr-colour-warning").hidden = !low;
    var downloads = el("qr-downloads");
    if (empty(o)) {
      status.textContent = "Type something to make a QR code.";
      downloads.hidden = true;
      canvas.hidden = true;
      return;
    }
    var text = payload(o);
    var m = matrix(text, el("qr-level").value);
    if (m.error) {
      status.textContent = m.error;
      downloads.hidden = true;
      canvas.hidden = true;
      return;
    }
    var margin = 4;
    var px = Number(el("qr-size").value);
    var scale = Math.max(1, Math.floor(px / (m.size + margin * 2)));
    var full = (m.size + margin * 2) * scale;
    canvas.width = canvas.height = full;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, full, full);
    ctx.fillStyle = dark;
    for (var r = 0; r < m.size; r++) {
      for (var c = 0; c < m.size; c++) if (m.dark(r, c)) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
    }
    canvas.hidden = false;
    canvas.setAttribute("aria-label", "QR code for " + text);
    status.textContent = m.size + " × " + m.size + " squares (version " + m.version + "), " + full + " × " + full + " pixels. Scan it with your phone to check it before you print it.";
    setLink("qr-svg", svg(m, 10, margin, dark, light), "image/svg+xml", "qr-code.svg");
    canvas.toBlob(function (blob) {
      if (!blob) return;
      setLink("qr-png", blob, "image/png", "qr-code.png");
      downloads.hidden = false;
    }, "image/png");
  }

  var timer = 0;
  form.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(draw, 120);
  });
  form.addEventListener("change", draw);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("qr-show-pass").addEventListener("change", function () {
    el("qr-pass").type = this.checked ? "text" : "password";
  });
  draw();
})();
