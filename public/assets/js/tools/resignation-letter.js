/* Resignation Letter Maker for the US, UK, Canada and Australia.
 * Everything happens in the visitor's browser (LEGAL.md §9): nothing typed is sent anywhere or
 * stored on the device. The PDF is made on the device with pdf-lib, through the shared resume
 * engine (js/resume.js), which also lays out the letter, cleans text for the PDF fonts and spots
 * private details. Notice periods are set by each person's contract and local law, so the letter
 * states the visitor's own last working day and the page never suggests a legal minimum.
 * The example person and company are made up.
 */
(function () {
  "use strict";

  var R = window.ToolNestResume;

  var COUNTRIES = {
    us: { paper: "letter", locale: "en-US", lang: "en-US", defaultSignOff: function () { return "Sincerely,"; }, noName: "Dear Manager," },
    ca: { paper: "letter", locale: "en-CA", lang: "en-CA", defaultSignOff: function () { return "Sincerely,"; }, noName: "Dear Manager," },
    uk: { paper: "a4", locale: "en-GB", lang: "en-GB", defaultSignOff: function (named) { return named ? "Yours sincerely," : "Yours faithfully,"; }, noName: "Dear Sir or Madam," },
    au: { paper: "a4", locale: "en-AU", lang: "en-AU", defaultSignOff: function () { return "Kind regards,"; }, noName: "Dear Manager," }
  };

  var EXAMPLE = {
    name: "Sam Taylor", email: "sam.taylor@example.com", phone: "", town: "",
    recipient: "Ms Priya Shah", company: "Harbourline Logistics", job: "Operations Coordinator",
    date: "2026-10-05", lastDay: "2026-11-02",
    reason: "I have accepted a role that will let me focus on supply chain planning, which is the direction I want my career to take.",
    thanks: true, handover: true, extra: ""
  };

  var TEXT = {
    thanks: "Thank you for the support and the opportunities I've had during my time here. I've enjoyed working with the team and I'm grateful for everything I've learned.",
    handover: "I'll do all I can to make the handover smooth before I leave, including finishing or passing on my current work and helping to train whoever takes over.",
    close: "Please let me know if there's anything else you need from me during my notice period."
  };

  function trim(v) { return String(v == null ? "" : v).trim(); }

  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, " ").trim(); }).filter(Boolean);
  }

  function parseDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  function formatDate(iso, country) {
    var t = parseDate(iso);
    if (t === null) return "";
    return new Intl.DateTimeFormat(COUNTRIES[country].locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(t));
  }

  // Calendar days from the letter date to the last working day (null if either is missing).
  function noticeDays(data) {
    var from = parseDate(data.date);
    var to = parseDate(data.lastDay);
    return from === null || to === null ? null : Math.round((to - from) / 86400000);
  }

  function country(data) { return COUNTRIES[data.country] ? data.country : "us"; }

  function greeting(data) {
    return trim(data.recipient) ? "Dear " + trim(data.recipient) + "," : COUNTRIES[country(data)].noName;
  }

  function signOff(data) {
    if (data.signOff && data.signOff !== "auto") return data.signOff;
    return COUNTRIES[country(data)].defaultSignOff(!!trim(data.recipient));
  }

  function opening(data) {
    var role = trim(data.job) ? "my position as " + trim(data.job) : "my position";
    var at = trim(data.company) ? " at " + trim(data.company) : "";
    var text = "Please accept this letter as formal notice of my resignation from " + role + at + ".";
    var last = formatDate(data.lastDay, country(data));
    if (last) text += " My last working day will be " + last + ".";
    return text;
  }

  // The letter as a list of blocks for R.letterLayout().
  function build(data) {
    var c = country(data);
    var out = [];
    var add = function (kind, text) { if (kind === "gap" || kind === "sign" || trim(text)) out.push({ kind: kind, text: trim(text) }); };
    add("name", data.name);
    add("contact", [data.town, data.phone, data.email].map(trim).filter(Boolean).join("  |  "));
    add("gap");
    add("line", formatDate(data.date, c));
    add("gap");
    var to = [data.recipient, data.company].map(trim).filter(Boolean);
    if (to.length) {
      to.forEach(function (l) { add("line", l); });
      add("gap");
    }
    add("subject", "Resignation" + (trim(data.job) ? ": " + trim(data.job) : ""));
    add("gap");
    add("line", greeting(data));
    add("gap");
    var body = [opening(data)].concat(paragraphs(data.reason));
    if (data.thanks) body.push(TEXT.thanks);
    if (data.handover) body.push(TEXT.handover);
    body = body.concat(paragraphs(data.extra));
    body.push(TEXT.close);
    body.forEach(function (p) {
      add("para", p);
      add("gap");
    });
    add("line", signOff(data));
    add("sign");
    add("line", data.name);
    return out.filter(function (b, i) { return !(b.kind === "gap" && (i === 0 || out[i - 1].kind === "gap")); });
  }

  function plainText(data) {
    return build(data).map(function (b) { return b.kind === "gap" || b.kind === "sign" ? "" : b.text; })
      .join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function layout(data, opts, measure) {
    return R.letterLayout(build(data), { paper: COUNTRIES[country(data)].paper, font: opts.font }, measure);
  }

  function warnings(data) {
    return R.privacyWarnings(data, { docWord: "resignation letter" });
  }

  function fileName(name) {
    var base = trim(name).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 -]+/g, "").trim().replace(/[\s-]+/g, "-");
    return (base ? base + "-" : "") + "Resignation-Letter";
  }

  window.ToolNestCalc = {
    COUNTRIES: COUNTRIES, EXAMPLE: EXAMPLE, build: build, text: plainText, layout: layout, opening: opening,
    greeting: greeting, signOff: signOff, warnings: warnings, fileName: fileName, formatDate: formatDate, noticeDays: noticeDays
  };
  if (!document.getElementById("rl-app")) return;

  // ---------------------------------------------------------------- Page

  var el = function (id) { return document.getElementById(id); };
  var FIELDS = ["name", "email", "phone", "town", "date", "lastDay", "recipient", "company", "job", "reason", "extra"];
  var CHECKS = ["thanks", "handover"];
  var status = el("rl-status");

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function read() {
    var data = { country: el("rl-country").value, signOff: el("rl-signoff").value, font: el("rl-font").value };
    FIELDS.forEach(function (f) { data[f] = el("rl-" + f).value; });
    CHECKS.forEach(function (f) { data[f] = el("rl-" + f).checked; });
    return data;
  }

  function fill(data) {
    FIELDS.forEach(function (f) { el("rl-" + f).value = data[f] || ""; });
    CHECKS.forEach(function (f) { el("rl-" + f).checked = !!data[f]; });
  }

  function loadExample() {
    var copy = {};
    Object.keys(EXAMPLE).forEach(function (k) { copy[k] = EXAMPLE[k]; });
    // Keep the example's four-week gap, counted from today.
    var start = new Date();
    var end = new Date(start.getTime() + 28 * 86400000);
    var iso = function (d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
    copy.date = iso(start);
    copy.lastDay = iso(end);
    fill(copy);
  }

  function paint() {
    var data = read();
    var paper = el("rl-paper");
    paper.textContent = "";
    paper.classList.toggle("cl-serif", data.font === "serif");
    build(data).forEach(function (b) {
      var node = document.createElement(b.kind === "para" ? "p" : "div");
      node.className = "cl-" + b.kind;
      node.textContent = b.text;
      paper.appendChild(node);
    });

    var days = noticeDays(data);
    el("rl-notice").textContent = days === null
      ? "Add the letter date and your last working day to see your notice period."
      : days < 0
        ? "Your last working day is before the date on the letter. Check both dates."
        : "Notice given: " + days + (days === 1 ? " day" : " days") + " (about " + (Math.round(days / 7 * 10) / 10) + " weeks). Check this matches the notice in your contract.";
    var list = el("rl-warnings");
    list.textContent = "";
    warnings(data).forEach(function (w) {
      var li = document.createElement("li");
      li.textContent = w;
      list.appendChild(li);
    });
    list.hidden = !list.children.length;
    el("rl-signoff-auto").textContent = "Automatic (" + COUNTRIES[data.country].defaultSignOff(!!trim(data.recipient)).replace(/,$/, "") + ")";
  }

  function say(text, isError) {
    status.textContent = text || "";
    status.classList.toggle("is-error", !!isError);
  }

  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = document.querySelector("script[src*='js/resume.js']").src.replace(/js\/resume\.js.*$/, "vendor/pdf-lib/pdf-lib.min.js");
      script.onload = function () { resolve(window.PDFLib); };
      script.onerror = function () { reject(new Error("The PDF maker didn't load. Check your connection and try again.")); };
      document.head.appendChild(script);
    });
  }

  function download() {
    var data = read();
    if (!trim(data.name)) {
      say("Add your name first.", true);
      el("rl-name").focus();
      return;
    }
    var btn = el("rl-pdf");
    btn.disabled = true;
    say("Making your PDF…");
    loadPdfLib().then(function (L) {
      var lay = layout(data, { font: data.font }, R.pdfMeasure(L, data.font === "serif" ? "serif" : "sans"));
      return R.makePdf(L, lay, { title: "Resignation letter", author: trim(data.name), lang: COUNTRIES[data.country].lang }).then(function (bytes) {
        var url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        var a = document.createElement("a");
        a.href = url;
        a.download = fileName(data.name) + ".pdf";
        a.className = "rf-offscreen";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
        var msg = "Your PDF is ready: " + lay.pages.length + (lay.pages.length === 1 ? " page." : " pages.");
        if (lay.dropped.length) msg += " These characters can't be shown in the PDF font and were left out: " + lay.dropped.join(" ");
        say(msg);
      });
    }).catch(function (err) {
      say(err.message || "Something went wrong. Please try again.", true);
    }).then(function () {
      btn.disabled = false;
    });
  }

  el("rl-form").addEventListener("input", paint);
  el("rl-form").addEventListener("change", paint);
  el("rl-form").addEventListener("submit", function (e) { e.preventDefault(); });
  el("rl-pdf").addEventListener("click", download);
  el("rl-copy").addEventListener("click", function () {
    var text = plainText(read());
    var done = function (ok) {
      say(ok ? "Copied. Paste it into an email or a document." : "Couldn't copy. Select the letter and copy it instead.", !ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });
  el("rl-example").addEventListener("click", function () { loadExample(); paint(); say(""); });
  el("rl-clear").addEventListener("click", function () {
    fill({ date: today(), thanks: true, handover: true });
    paint();
    say("");
    el("rl-name").focus();
  });

  var lang = (navigator.language || "").toUpperCase();
  el("rl-country").value = lang.indexOf("-GB") !== -1 ? "uk" : lang.indexOf("-CA") !== -1 ? "ca" : lang.indexOf("-AU") !== -1 ? "au" : lang.indexOf("-US") !== -1 ? "us" : "uk";
  loadExample();
  paint();
})();
