/* Unix Timestamp Converter: epoch seconds or milliseconds to a date, and a date back to a
   timestamp, in UTC and the visitor's own time zone. Runs in the browser. */
(function () {
  "use strict";

  // Timestamps with 12 or more digits are treated as milliseconds (seconds that big are
  // more than 30,000 years away).
  function detectUnit(value) {
    return Math.abs(value) >= 1e11 ? "ms" : "s";
  }

  // value: number; unit: "auto" | "s" | "ms" → { ms, unit, iso } or null when out of range
  function toDate(value, unit) {
    var u = unit === "s" || unit === "ms" ? unit : detectUnit(value);
    var ms = u === "s" ? value * 1000 : value;
    var d = new Date(ms);
    if (!isFinite(value) || isNaN(d.getTime())) return null;
    return { ms: ms, unit: u, iso: d.toISOString(), seconds: Math.floor(ms / 1000) };
  }

  // parts: { y, mo, d, h, mi, s } and zone "utc" or "local" → { seconds, ms }
  function fromDate(parts, zone) {
    var args = [parts.y, parts.mo - 1, parts.d, parts.h || 0, parts.mi || 0, parts.s || 0];
    var ms = zone === "utc" ? Date.UTC.apply(null, args) : new Date(args[0], args[1], args[2], args[3], args[4], args[5]).getTime();
    if (isNaN(ms)) return null;
    return { ms: ms, seconds: Math.floor(ms / 1000) };
  }

  // "3 days ago" / "in 2 hours", from a difference in milliseconds (then − now).
  function relative(diffMs) {
    var units = [["year", 31557600000], ["month", 2629800000], ["week", 604800000], ["day", 86400000], ["hour", 3600000], ["minute", 60000], ["second", 1000]];
    var abs = Math.abs(diffMs);
    if (abs < 1000) return "just now";
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i][1]) {
        var n = Math.floor(abs / units[i][1]);
        var text = n + " " + units[i][0] + (n === 1 ? "" : "s");
        return diffMs < 0 ? text + " ago" : "in " + text;
      }
    }
    return "just now";
  }

  window.ToolNestCalc = { toDate: toDate, fromDate: fromDate, relative: relative, detectUnit: detectUnit };

  var root = document.getElementById("ts-tool");
  if (!root) return;

  var T = window.ToolNest;
  var el = function (id) { return document.getElementById(id); };
  var zoneName = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "your time zone";

  function longDate(ms, timeZone) {
    var opts = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
    if (timeZone) opts.timeZone = timeZone;
    return new Intl.DateTimeFormat(navigator.language || "en-US", opts).format(new Date(ms));
  }

  function showTimestamp() {
    var input = el("ts-input");
    var raw = String(input.value).replace(/[,\s_]/g, "");
    var n = /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
    var r = isFinite(n) ? toDate(n, el("ts-unit").value) : null;
    input.closest(".field").classList.toggle("invalid", !r && raw !== "");
    input.setAttribute("aria-invalid", !r && raw !== "" ? "true" : "false");
    if (!r) {
      ["out-utc", "out-local", "out-iso", "out-relative", "out-unit"].forEach(function (id) { T.setText(id, "—"); });
      return;
    }
    T.setText("out-utc", longDate(r.ms, "UTC"));
    T.setText("out-local", longDate(r.ms));
    T.setText("out-iso", r.iso);
    T.setText("out-relative", relative(r.ms - Date.now()));
    T.setText("out-unit", r.unit === "s" ? "Seconds" : "Milliseconds");
  }

  function showDate() {
    var date = el("dt-date").value;
    var time = el("dt-time").value || "00:00:00";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    var t = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
    var r = m && t ? fromDate({ y: +m[1], mo: +m[2], d: +m[3], h: +t[1], mi: +t[2], s: +(t[3] || 0) }, el("dt-zone").value) : null;
    if (!r) {
      T.setText("out-seconds", "—");
      T.setText("out-ms", "—");
      return;
    }
    T.setText("out-seconds", String(r.seconds));
    T.setText("out-ms", String(r.ms));
  }

  function now() {
    el("ts-input").value = String(Math.floor(Date.now() / 1000));
    el("ts-unit").value = "auto";
    showTimestamp();
  }

  function copy(id, btn) {
    var text = el(id).textContent;
    if (!navigator.clipboard || text === "—") return;
    navigator.clipboard.writeText(text).then(function () {
      var old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = old; }, 1500);
    });
  }

  T.setText("ts-zone-name", zoneName);
  el("dt-zone-local").textContent = "My time zone (" + zoneName + ")";
  el("ts-form").addEventListener("input", showTimestamp);
  el("ts-form").addEventListener("change", showTimestamp);
  el("ts-form").addEventListener("submit", function (e) { e.preventDefault(); });
  el("dt-form").addEventListener("input", showDate);
  el("dt-form").addEventListener("change", showDate);
  el("dt-form").addEventListener("submit", function (e) { e.preventDefault(); });
  el("ts-now").addEventListener("click", now);
  el("copy-seconds").addEventListener("click", function () { copy("out-seconds", this); });
  el("copy-iso").addEventListener("click", function () { copy("out-iso", this); });

  // Start with the current time in both forms.
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, "0"); };
  el("dt-date").value = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  el("dt-time").value = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00";
  now();
  showDate();
})();
