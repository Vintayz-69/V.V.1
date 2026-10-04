/* Cover Letter Maker for the US, UK, Canada and Australia.
 * Everything happens in the visitor's browser (LEGAL.md §9): nothing typed is sent anywhere or
 * stored on the device. The PDF is made on the device with pdf-lib, through the shared resume
 * engine (js/resume.js), which also cleans text for the PDF fonts and spots private details.
 * Guidance: National Careers Service "How to write a cover letter" (UK) and CareerOneStop
 * "Cover letters" (US Department of Labor), checked 30 September 2026.
 * The example people and companies are made up. 07700 900xxx numbers are reserved by Ofcom for
 * drama, 555-01xx numbers are fictional in North America, and example.com addresses can't belong to anyone.
 */
(function () {
  "use strict";

  var R = window.ToolNestResume;

  var COUNTRIES = {
    us: { paper: "letter", locale: "en-US", lang: "en-US", defaultSignOff: function () { return "Sincerely,"; }, noName: "Dear Hiring Manager," },
    ca: { paper: "letter", locale: "en-CA", lang: "en-CA", defaultSignOff: function () { return "Sincerely,"; }, noName: "Dear Hiring Manager," },
    // National Careers Service: "Yours sincerely" to a named person, "Yours faithfully" after "Dear Sir or Madam".
    uk: { paper: "a4", locale: "en-GB", lang: "en-GB", defaultSignOff: function (named) { return named ? "Yours sincerely," : "Yours faithfully,"; }, noName: "Dear Sir or Madam," },
    au: { paper: "a4", locale: "en-AU", lang: "en-AU", defaultSignOff: function () { return "Kind regards,"; }, noName: "Dear Hiring Manager," }
  };

  var EXAMPLES = {
    uk: {
      name: "Hannah Clarke", email: "hannah.clarke@example.com", phone: "07700 900123", town: "Leeds",
      recipient: "Ms Anna Patel", recipientTitle: "Head of Marketing", company: "Brightwell Foods Ltd", address: "12 Wharf Street\nLeeds LS2 7EQ",
      job: "Senior Marketing Executive", reference: "MK-204", source: "on your careers page",
      opening: "I'm writing to apply for the Senior Marketing Executive role (reference MK-204) that I saw on your careers page. I've followed Brightwell's move into plant-based ranges with real interest, and I'd love to help tell that story to more customers.",
      middle: "In my current role at Northgate Software I plan and run monthly email campaigns to 18,000 customers, and I raised open rates from 21% to 29% in a year by testing subject lines and cleaning our lists. Last spring I launched our first customer newsletter, which now brings in around 40 enquiries a month. I also organise two trade events a year on a £40,000 budget, working closely with sales to follow up every lead.\n\nYour advert asks for someone who can lead campaigns from brief to results. I enjoy exactly that mix of planning, writing and measuring, and I'm used to reporting results clearly to managers who aren't marketing specialists. I also work well with designers and outside agencies, and I keep projects on time and on budget.",
      closing: "Thank you for considering my application. My CV gives more detail about my experience, and I'd welcome the chance to talk about how I could help your team. I'm available for an interview at any time that suits you."
    },
    us: {
      name: "Jordan Rivera", email: "jordan.rivera@example.com", phone: "(512) 555-0142", town: "Austin, TX",
      recipient: "Ms. Dana Brooks", recipientTitle: "Creative Director", company: "Lakeside Health Partners", address: "400 Congress Avenue\nAustin, TX 78701",
      job: "Senior Graphic Designer", reference: "", source: "on LinkedIn",
      opening: "I'm excited to apply for the Senior Graphic Designer position I found on LinkedIn. Lakeside's patient guides are some of the clearest health materials I've seen, and I'd love to help your team make more of them.",
      middle: "At Harbor & Pine Creative, I lead design for six healthcare and nonprofit clients. Last year I redesigned a hospital's patient forms, which cut the time staff spent answering form questions by about a third. I work in Figma and Adobe Creative Cloud, and I'm comfortable presenting ideas to clients and doctors alike. I also mentor two junior designers and run our monthly accessibility checks, so every file meets contrast guidelines before it's delivered.\n\nI'm drawn to Lakeside because your work helps people make decisions about their own care. I'd bring the same focus on plain, accessible design, and a habit of testing layouts with real readers before they go to print. Outside work, I design leaflets for a local free clinic.",
      closing: "My resume is attached. I'd welcome the chance to talk about how I could support your team, and I'm happy to share more samples of my healthcare work. I can start with two weeks' notice. Thank you for your time and consideration."
    }
  };
  EXAMPLES.ca = EXAMPLES.us;
  EXAMPLES.au = EXAMPLES.uk;

  function trim(v) { return String(v == null ? "" : v).trim(); }

  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, " ").trim(); }).filter(Boolean);
  }

  function lines(text) {
    return String(text || "").split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function formatDate(iso, country) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return "";
    var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return new Intl.DateTimeFormat(COUNTRIES[country].locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }

  function greeting(data) {
    var c = COUNTRIES[data.country] || COUNTRIES.us;
    return trim(data.recipient) ? "Dear " + trim(data.recipient) + "," : c.noName;
  }

  function signOff(data) {
    var c = COUNTRIES[data.country] || COUNTRIES.us;
    if (data.signOff && data.signOff !== "auto") return data.signOff;
    return c.defaultSignOff(!!trim(data.recipient));
  }

  function subject(data) {
    if (!trim(data.job)) return "";
    return "Application for " + trim(data.job) + (trim(data.reference) ? " (reference " + trim(data.reference) + ")" : "");
  }

  /*
   * The letter as a list of blocks, top to bottom:
   *   { kind: "name" | "contact" | "line" | "subject" | "para" | "gap", text }
   */
  function build(data) {
    var country = COUNTRIES[data.country] ? data.country : "us";
    var out = [];
    // "gap" is a blank line; "sign" is the space left for a handwritten signature.
    var add = function (kind, text) { if (kind === "gap" || kind === "sign" || trim(text)) out.push({ kind: kind, text: trim(text) }); };
    add("name", data.name);
    add("contact", [data.town, data.phone, data.email].map(trim).filter(Boolean).join("  |  "));
    add("gap");
    add("line", formatDate(data.date, country));
    add("gap");
    var to = [data.recipient, data.recipientTitle, data.company].map(trim).filter(Boolean).concat(lines(data.address));
    if (to.length) {
      to.forEach(function (l) { add("line", l); });
      add("gap");
    }
    if (subject(data)) {
      add("subject", subject(data));
      add("gap");
    }
    add("line", greeting(data));
    add("gap");
    [].concat(paragraphs(data.opening), paragraphs(data.middle), paragraphs(data.closing)).forEach(function (p) {
      add("para", p);
      add("gap");
    });
    add("line", signOff(data));
    add("sign");
    add("line", data.name);
    // No double gaps, and none at the very start.
    return out.filter(function (b, i) { return !(b.kind === "gap" && (i === 0 || out[i - 1].kind === "gap")); });
  }

  function plainText(data) {
    return build(data).map(function (b) {
      if (b.kind === "gap") return "";
      if (b.kind === "sign") return "";
      return b.text;
    }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function wordCount(data) {
    var body = [data.opening, data.middle, data.closing].join(" ").trim();
    return body ? body.split(/\s+/).length : 0;
  }

  // Lays the letter out on pages for js/resume.js makePdf(). measure(text, font, size) → width.
  function layout(data, opts, measure) {
    var country = COUNTRIES[data.country] ? data.country : "us";
    return R.letterLayout(build(data), { paper: COUNTRIES[country].paper, font: opts.font }, measure);
  }

  function warnings(data) {
    return R.privacyWarnings(data, { docWord: "cover letter" });
  }

  function fileName(name) {
    var base = trim(name).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 -]+/g, "").trim().replace(/[\s-]+/g, "-");
    return (base ? base + "-" : "") + "Cover-Letter";
  }

  window.ToolNestCalc = {
    COUNTRIES: COUNTRIES, EXAMPLES: EXAMPLES, build: build, text: plainText, layout: layout,
    greeting: greeting, signOff: signOff, warnings: warnings, wordCount: wordCount, fileName: fileName, formatDate: formatDate
  };
  if (!document.getElementById("cl-app")) return;

  // ---------------------------------------------------------------- Page

  var el = function (id) { return document.getElementById(id); };
  var FIELDS = ["name", "email", "phone", "town", "date", "recipient", "recipientTitle", "company", "address", "job", "reference", "opening", "middle", "closing"];
  var status = el("cl-status");

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function read() {
    var data = { country: el("cl-country").value, signOff: el("cl-signoff").value, font: el("cl-font").value };
    FIELDS.forEach(function (f) { data[f] = el("cl-" + f).value; });
    return data;
  }

  function fill(data) {
    FIELDS.forEach(function (f) { el("cl-" + f).value = data[f] || ""; });
  }

  function loadExample() {
    var ex = EXAMPLES[el("cl-country").value];
    var copy = {};
    Object.keys(ex).forEach(function (k) { copy[k] = ex[k]; });
    copy.date = today();
    fill(copy);
  }

  function paint() {
    var data = read();
    var paper = el("cl-paper");
    paper.textContent = "";
    paper.classList.toggle("cl-serif", data.font === "serif");
    build(data).forEach(function (b) {
      var node = document.createElement(b.kind === "para" ? "p" : "div");
      node.className = "cl-" + b.kind;
      node.textContent = b.text;
      paper.appendChild(node);
    });

    var words = wordCount(data);
    el("cl-words").textContent = words + (words === 1 ? " word" : " words") + " in the letter body";
    var list = el("cl-warnings");
    list.textContent = "";
    warnings(data).forEach(function (w) {
      var li = document.createElement("li");
      li.textContent = w;
      list.appendChild(li);
    });
    list.hidden = !list.children.length;
    el("cl-signoff-auto").textContent = "Automatic (" + COUNTRIES[data.country].defaultSignOff(!!trim(data.recipient)).replace(/,$/, "") + ")";
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
    if (!trim(data.name) || !trim(data.opening + data.middle + data.closing)) {
      say("Add your name and at least one paragraph first.", true);
      return;
    }
    var btn = el("cl-pdf");
    btn.disabled = true;
    say("Making your PDF…");
    loadPdfLib().then(function (L) {
      var lay = layout(data, { font: data.font }, R.pdfMeasure(L, data.font === "serif" ? "serif" : "sans"));
      return R.makePdf(L, lay, { title: "Cover letter" + (trim(data.job) ? ": " + trim(data.job) : ""), author: trim(data.name), lang: COUNTRIES[data.country].lang }).then(function (bytes) {
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
        if (lay.pages.length > 1) msg += " A cover letter usually fits on one page, so you may want to shorten it.";
        if (lay.dropped.length) msg += " These characters can't be shown in the PDF font and were left out: " + lay.dropped.join(" ");
        say(msg);
      });
    }).catch(function (err) {
      say(err.message || "Something went wrong. Please try again.", true);
    }).then(function () {
      btn.disabled = false;
    });
  }

  el("cl-form").addEventListener("input", paint);
  el("cl-form").addEventListener("change", paint);
  el("cl-form").addEventListener("submit", function (e) { e.preventDefault(); });
  el("cl-pdf").addEventListener("click", download);
  el("cl-copy").addEventListener("click", function () {
    var text = plainText(read());
    var btn = el("cl-copy");
    var done = function (ok) {
      say(ok ? "Copied. Paste it into an email or an online application form." : "Couldn't copy. Select the letter and copy it instead.", !ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
    btn.blur();
  });
  el("cl-example").addEventListener("click", function () { loadExample(); paint(); say(""); });
  el("cl-clear").addEventListener("click", function () {
    fill({ date: today() });
    paint();
    say("");
    el("cl-name").focus();
  });

  // Start with the country the browser's language suggests.
  var lang = (navigator.language || "").toUpperCase();
  el("cl-country").value = lang.indexOf("-GB") !== -1 ? "uk" : lang.indexOf("-CA") !== -1 ? "ca" : lang.indexOf("-AU") !== -1 ? "au" : lang.indexOf("-US") !== -1 ? "us" : "uk";
  loadExample();
  paint();
})();
