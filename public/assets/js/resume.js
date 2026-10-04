/* ToolNest resume engine, shared by the country resume and CV makers (js/tools/resume-*.js).
 *
 * Everything happens in the visitor's browser (LEGAL.md §9). Nothing they type is sent anywhere
 * or stored on their device. The PDF is made on the device by pdf-lib (MIT licence), served from
 * our own domain in assets/vendor/pdf-lib/ and loaded only on these pages.
 *
 * Each country file passes its settings (paper, sections, headings, wording, example) to
 * ToolNestResume.start(). The pure functions below are also checked by tests/run-tests.js.
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------- Text the PDF can show

  // The PDF uses the standard Helvetica and Times fonts. They cover the Windows-1252 set:
  // English and Western European letters (é, ñ, ü, ø…), curly quotes, dashes, bullets and €.
  var CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ" +
               "‘’“”•–—˜™š›œžŸ";

  // Look-alikes for common characters the fonts don't have.
  var SWAPS = {
    " ": " ", "­": "", " ": " ", " ": " ", " ": " ", " ": " ",
    "‐": "-", "‑": "-", "‒": "-", "―": "—", "−": "-",
    "′": "'", "″": "\"", "←": "<-", "→": "->",
    "‣": "•", "⁃": "-", "▪": "•", "●": "•", "◦": "•",
    "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "ı": "i", "Ħ": "H", "ħ": "h"
  };
  var INVISIBLE = /[​-‍⁠︎️]/;

  function canShow(ch) {
    var c = ch.charCodeAt(0);
    return ch.length === 1 && ((c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0xff) || CP1252.indexOf(ch) !== -1);
  }

  // Returns text the PDF fonts can draw. Accented letters outside the set lose their accent
  // (ő → o); anything else is left out and added to `dropped`, so the page can say so.
  function clean(text, dropped) {
    var out = "";
    Array.from(String(text)).forEach(function (ch) {
      if (Object.prototype.hasOwnProperty.call(SWAPS, ch)) { out += SWAPS[ch]; return; }
      if (canShow(ch)) { out += ch; return; }
      if (INVISIBLE.test(ch)) return;
      if (/\s/.test(ch)) { out += " "; return; }
      var base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (base && Array.from(base).every(canShow)) { out += base; return; }
      if (dropped && dropped.indexOf(ch) === -1) dropped.push(ch);
    });
    return out.replace(/ {2,}/g, " ").trim();
  }

  function cleanDeep(value, dropped) {
    if (typeof value === "string") return clean(value, dropped);
    if (Array.isArray(value)) return value.map(function (v) { return cleanDeep(v, dropped); });
    if (value && typeof value === "object") {
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = cleanDeep(value[k], dropped); });
      return out;
    }
    return value;
  }

  // ---------------------------------------------------------------- Reading what people typed

  function one(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  // Bullets people paste in ("• ", "- ", "* ") are removed; the PDF adds its own.
  var BULLET_MARK = /^\s*(?:[•▪●◦‣·]\s*|[-*–—]\s+)/;

  function lines(value) {
    return String(value == null ? "" : value).split(/\r?\n/)
      .map(function (l) { return one(l.replace(BULLET_MARK, "")); })
      .filter(Boolean);
  }

  function paragraphs(value) {
    return String(value == null ? "" : value).split(/\n\s*\n/).map(one).filter(Boolean);
  }

  // Splits "Figma, Photoshop (web, print); SQL" on commas, semicolons and new lines, but not
  // inside brackets.
  function tags(value) {
    var out = [];
    var cur = "";
    var depth = 0;
    Array.from(String(value == null ? "" : value)).forEach(function (ch) {
      if (ch === "(" || ch === "[") depth++;
      if ((ch === ")" || ch === "]") && depth > 0) depth--;
      if (depth === 0 && (ch === "," || ch === ";" || ch === "\n")) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    });
    out.push(cur);
    return out.map(function (t) { return one(t.replace(BULLET_MARK, "")); }).filter(Boolean);
  }

  function dateRange(start, end) {
    start = one(start);
    end = one(end);
    return start && end ? start + " – " + end : start || end;
  }

  function joined(parts, sep) {
    return parts.map(one).filter(Boolean).join(sep);
  }

  function entries(value) {
    return Array.isArray(value) ? value.filter(function (x) { return x && typeof x === "object"; }) : [];
  }

  // ---------------------------------------------------------------- The document

  /*
   * Turns form data into the document: name, headline, contact items and the sections the
   * country uses, in its order, with its headings. Empty sections are left out.
   */
  function buildDoc(data, cfg) {
    data = data || {};
    var doc = {
      name: one(data.name),
      headline: one(data.headline),
      contact: [data.location, data.phone, data.email, data.linkedin, data.website].map(one).filter(Boolean),
      sections: []
    };
    cfg.sections.forEach(function (s) {
      var items = sectionItems(s, data[s.key]);
      if (items.length) doc.sections.push({ key: s.key, heading: s.heading, items: items });
    });
    return doc;
  }

  function sectionItems(s, value) {
    if (s.type === "text") {
      if (Array.isArray(value)) value = value.join("\n");
      return paragraphs(value).map(function (p) { return { type: "para", text: p }; });
    }
    if (s.type === "tags") {
      var t = tags(Array.isArray(value) ? value.join("\n") : value);
      return t.length ? [{ type: "tags", items: t }] : [];
    }
    if (s.type === "list") {
      var l = lines(Array.isArray(value) ? value.join("\n") : value);
      return l.length ? [{ type: "bullets", items: l }] : [];
    }
    if (s.type === "references") {
      value = value || {};
      if (value.mode === "request") return [{ type: "para", text: s.onRequest }];
      if (value.mode !== "list") return [];
      return entries(value.people).map(function (p) {
        return {
          type: "referee",
          name: one(p.name),
          lines: [joined([p.title, p.org], ", "), one(p.relationship), joined([p.phone, p.email], " | ")].filter(Boolean)
        };
      }).filter(function (r) { return r.name || r.lines.length; });
    }
    var job = s.type === "jobs";
    return entries(value).map(function (e) {
      return {
        type: "entry",
        title: one(job ? e.title : e.qualification),
        date: dateRange(e.start, e.end),
        sub: joined(job ? [e.org, e.location] : [e.school, e.location], " | "),
        summary: job ? one(e.summary) : "",
        bullets: lines(job ? e.bullets : e.details)
      };
    }).filter(function (e) { return e.title || e.sub || e.summary || e.bullets.length; });
  }

  // Plain text for pasting into online application forms, Word or Google Docs.
  function plainText(doc) {
    var out = [];
    if (doc.name) out.push(doc.name.toUpperCase());
    if (doc.headline) out.push(doc.headline);
    if (doc.contact.length) out.push(doc.contact.join(" | "));
    doc.sections.forEach(function (s) {
      out.push("", s.heading.toUpperCase());
      s.items.forEach(function (it, i) {
        if (i > 0 && it.type !== "bullets" && it.type !== "tags") out.push("");
        if (it.type === "para") out.push(it.text);
        else if (it.type === "tags") out.push(it.items.join(", "));
        else if (it.type === "bullets") it.items.forEach(function (b) { out.push("- " + b); });
        else if (it.type === "entry") {
          out.push(joined([it.title, it.date], " | "));
          if (it.sub) out.push(it.sub);
          if (it.summary) out.push(it.summary);
          it.bullets.forEach(function (b) { out.push("- " + b); });
        } else if (it.type === "referee") {
          if (it.name) out.push(it.name);
          it.lines.forEach(function (l) { out.push(l); });
        }
      });
    });
    while (out.length && out[0] === "") out.shift();
    return out.join("\n") + "\n";
  }

  // ---------------------------------------------------------------- Page layout

  var PAPER = { letter: [612, 792], a4: [595.28, 841.89] }; // points (1/72 inch)

  var FONTS = {
    sans: { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" },
    serif: { regular: "Times-Roman", bold: "Times-Bold", italic: "Times-Italic" }
  };

  var COLORS = { ink: [0.07, 0.09, 0.15], soft: [0.29, 0.33, 0.39], rule: [0.62, 0.65, 0.7] };

  function sizes(cfg, opts) {
    var compact = opts.spacing === "compact";
    var body = cfg.bodySize[compact ? "compact" : "normal"];
    return {
      margin: compact ? 44 : 54,
      footer: 18, // kept free at the bottom of every page for "Page 1 of 2"
      body: body,
      lead: body * (compact ? 1.24 : 1.34),
      name: body * 2,
      headline: body + 1.5,
      contact: body - 0.5,
      heading: body + 0.5,
      gapBefore: compact ? 9 : 14,
      gapAfter: compact ? 4 : 6,
      itemGap: compact ? 4 : 7,
      indent: body * 1.3
    };
  }

  // Greedy word wrap. A word longer than a whole line (a long link) is split by letter.
  function wrap(text, width, fit) {
    var out = [];
    var cur = "";
    text.split(" ").forEach(function (word) {
      if (!word) return;
      var next = cur ? cur + " " + word : word;
      if (fit(next) <= width) {
        cur = next;
        return;
      }
      if (cur) out.push(cur);
      cur = word;
      while (cur.length > 1 && fit(cur) > width) {
        var n = cur.length - 1;
        while (n > 1 && fit(cur.slice(0, n)) > width) n--;
        out.push(cur.slice(0, n));
        cur = cur.slice(n);
      }
    });
    if (cur) out.push(cur);
    return out;
  }

  /*
   * Lays the document out on pages. `measure(text, font, size)` gives a text width in points
   * for font "regular", "bold" or "italic". Returns
   *   { size: [w, h], family, pages: [{ runs: [{ t, f, s, c, x, y }], rules: [{ x1, x2, y }] }] }
   * where y is the text baseline measured down from the top of the page.
   *
   * Rows marked `keep` stay on the same page as the row after them, so a heading is never
   * left alone at the bottom of a page and a job title always has its first point with it.
   */
  function layout(doc, cfg, opts, measure) {
    opts = opts || {};
    var z = sizes(cfg, opts);
    var paper = PAPER[cfg.paper];
    var W = paper[0];
    var H = paper[1];
    var left = z.margin;
    var width = W - 2 * z.margin;
    var rows = [];

    function fitter(f, s) {
      return function (str) { return measure(str, f, s); };
    }

    function text(str, f, s, c, x, w, lead, keepAll) {
      var ls = wrap(str, w, fitter(f, s));
      ls.forEach(function (l, i) {
        rows.push({ h: lead, s: s, keep: keepAll && i < ls.length - 1, runs: [{ t: l, f: f, s: s, c: c, x: x }] });
      });
      return ls.length;
    }

    function gap(h) {
      rows.push({ h: h, gap: true, runs: [] });
    }

    function keepLast() {
      rows[rows.length - 1].keep = true;
    }

    function bullet(str) {
      var start = rows.length;
      text(str, "regular", z.body, "ink", left + z.indent, width - z.indent, z.lead, true);
      rows[start].runs.unshift({ t: "•", f: "regular", s: z.body, c: "ink", x: left + z.body * 0.3 });
    }

    // Name, headline and contact details.
    if (doc.name) text(doc.name, "bold", z.name, "ink", left, width, z.name * 1.2, true);
    if (doc.headline) {
      if (rows.length) keepLast();
      text(doc.headline, "regular", z.headline, "soft", left, width, z.headline * 1.4, true);
    }
    if (doc.contact.length) {
      if (rows.length) keepLast();
      var sep = "  |  ";
      var contactLines = [];
      var cur = "";
      doc.contact.forEach(function (item) {
        var next = cur ? cur + sep + item : item;
        if (!cur || measure(next, "regular", z.contact) <= width) cur = next;
        else {
          contactLines.push(cur);
          cur = item;
        }
      });
      contactLines.push(cur);
      contactLines.forEach(function (l, i) {
        if (i > 0) keepLast();
        text(l, "regular", z.contact, "soft", left, width, z.contact * 1.45, true);
      });
    }

    doc.sections.forEach(function (sec) {
      if (rows.length) gap(z.gapBefore);
      var hs = z.heading;
      rows.push({
        h: hs * 1.2 + 4 + z.gapAfter, s: hs, base: hs, rule: hs + 4, keep: true,
        runs: [{ t: sec.heading.toUpperCase(), f: "bold", s: hs, c: "ink", x: left }]
      });
      sec.items.forEach(function (it, i) {
        if (i > 0 && it.type !== "bullets") gap(z.itemGap);
        if (it.type === "para") {
          text(it.text, "regular", z.body, "ink", left, width, z.lead, false);
        } else if (it.type === "tags") {
          text(it.items.join("  ·  "), "regular", z.body, "ink", left, width, z.lead, false);
        } else if (it.type === "bullets") {
          it.items.forEach(bullet);
        } else if (it.type === "entry") {
          var start = rows.length;
          var dateW = it.date ? measure(it.date, "regular", z.body) : 0;
          if (it.title) text(it.title, "bold", z.body, "ink", left, width - (dateW ? dateW + 12 : 0), z.lead, true);
          if (it.date) {
            var dateRun = { t: it.date, f: "regular", s: z.body, c: "soft", x: left + width - dateW };
            if (rows.length > start) rows[start].runs.push(dateRun);
            else rows.push({ h: z.lead, s: z.body, keep: true, runs: [dateRun] });
          }
          if (it.sub) {
            if (rows.length > start) keepLast();
            text(it.sub, "italic", z.body, "soft", left, width, z.lead, true);
          }
          if ((it.summary || it.bullets.length) && rows.length > start) keepLast();
          if (it.summary) text(it.summary, "regular", z.body, "ink", left, width, z.lead, false);
          it.bullets.forEach(bullet);
        } else if (it.type === "referee") {
          var first = rows.length;
          if (it.name) text(it.name, "bold", z.body, "ink", left, width, z.lead, true);
          it.lines.forEach(function (l) {
            if (rows.length > first) keepLast();
            text(l, "regular", z.body, "ink", left, width, z.lead, true);
          });
        }
      });
    });

    // Pagination.
    var top = z.margin;
    var bottom = H - z.margin - z.footer;
    var pages = [];
    var page = null;
    var y = 0;

    function newPage() {
      page = { runs: [], rules: [] };
      pages.push(page);
      y = top;
    }

    function place(r) {
      var base = r.base != null ? r.base : (r.h + r.s * 0.7) / 2;
      r.runs.forEach(function (run) {
        page.runs.push({ t: run.t, f: run.f, s: run.s, c: run.c, x: run.x, y: y + base });
      });
      if (r.rule != null) page.rules.push({ x1: left, x2: left + width, y: y + r.rule });
      y += r.h;
    }

    newPage();
    var i = 0;
    while (i < rows.length) {
      var j = i;
      var chain = rows[i].h;
      while (rows[j].keep && j + 1 < rows.length) {
        j++;
        chain += rows[j].h;
      }
      if (y > top && y + chain > bottom && chain <= bottom - top) newPage();
      for (var k = i; k <= j; k++) {
        var r = rows[k];
        if (r.gap && y === top) continue;
        if (y > top && y + r.h > bottom) {
          newPage();
          if (r.gap) continue;
        }
        place(r);
      }
      i = j + 1;
    }

    // "Name | Page 1 of 2" at the foot of each page, when there is more than one.
    if (pages.length > 1) {
      pages.forEach(function (p, n) {
        var label = (doc.name ? doc.name + "  |  " : "") + "Page " + (n + 1) + " of " + pages.length;
        var s = Math.max(7.5, z.body - 2.5);
        p.runs.push({ t: label, f: "regular", s: s, c: "soft", x: (W - measure(label, "regular", s)) / 2, y: H - z.margin + 4 });
      });
    }

    return { size: [W, H], family: opts.font === "serif" ? "serif" : "sans", pages: pages };
  }

  // ---------------------------------------------------------------- PDF (pdf-lib)

  // Text widths from pdf-lib's copies of the standard font metrics, so the preview and the PDF
  // break lines and pages in exactly the same places.
  function pdfMeasure(PDFLib, family) {
    var names = FONTS[family];
    var fonts = {};
    Object.keys(names).forEach(function (k) {
      fonts[k] = PDFLib.StandardFontEmbedder.for(names[k]);
    });
    return function (t, f, s) { return fonts[f].widthOfTextAtSize(t, s); };
  }

  function makePdf(PDFLib, lay, meta) {
    return PDFLib.PDFDocument.create({ updateMetadata: false }).then(function (pdf) {
      var now = new Date();
      if (meta.title) pdf.setTitle(meta.title);
      if (meta.author) pdf.setAuthor(meta.author);
      if (meta.lang) pdf.setLanguage(meta.lang);
      pdf.setCreationDate(now);
      pdf.setModificationDate(now);

      var names = FONTS[lay.family];
      var fonts = {};
      Object.keys(names).forEach(function (k) { fonts[k] = pdf.embedStandardFont(names[k]); });
      var colors = {};
      Object.keys(COLORS).forEach(function (k) { colors[k] = PDFLib.rgb(COLORS[k][0], COLORS[k][1], COLORS[k][2]); });

      var H = lay.size[1];
      lay.pages.forEach(function (p) {
        var page = pdf.addPage(lay.size);
        p.rules.forEach(function (r) {
          page.drawLine({ start: { x: r.x1, y: H - r.y }, end: { x: r.x2, y: H - r.y }, thickness: 0.75, color: colors.rule });
        });
        p.runs.forEach(function (r) {
          page.drawText(r.t, { x: r.x, y: H - r.y, size: r.s, font: fonts[r.f], color: colors[r.c] });
        });
      });
      return pdf.save();
    });
  }

  // "Jordan Rivera" → "Jordan-Rivera-Resume"
  function fileBase(name, word) {
    var base = one(name).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9 -]+/g, "").trim().replace(/[\s-]+/g, "-");
    return (base ? base + "-" : "") + word;
  }

  // ---------------------------------------------------------------- Privacy check

  // Details that don't belong on a resume. ID numbers are only looked for outside the phone
  // fields, so phone numbers aren't mistaken for them.
  var CHECKS = [
    { id: "dob", words: /\b(date of birth|birth ?date|d\.o\.b\b|dob\b|born on\b)/i,
      say: "Leave out your date of birth. Employers don't need it to decide whether to interview you." },
    { id: "age", words: /\b(age:?\s*\d{2}\b|\d{2}\s*(years|yrs)\s*old\b)/i,
      say: "Leave out your age. Employers don't need it to decide whether to interview you." },
    { id: "marital", words: /\b(marital status|married|divorced|widowed)\b/i,
      say: "Leave out your marital status. It isn't relevant to whether you can do the job." },
    { id: "nationality", words: /\bnationality\b/i,
      say: "Leave out your nationality. It isn't needed to judge your application." },
    { id: "id",
      words: /\b(social security (number|no)|social insurance (number|no)|national insurance (number|no)|tax file number)\b/i,
      codes: /\b(SSN|SIN|TFN|NINO)\b|\b\d{3}-\d{2}-\d{4}\b|\b\d{3}[ -]\d{3}[ -]\d{3}\b|\b[A-CEGHJ-PR-TW-Z]{2} ?\d{2} ?\d{2} ?\d{2} ?[A-D]\b/,
      say: "This looks like a government ID or tax number. Never put it on your {doc}: it isn't needed to apply, and it could be used to steal your identity." },
    { id: "bank", words: /\b(sort code|account number|routing number|iban|bsb)\b/i,
      say: "Never put bank details on your {doc}. They aren't needed to apply, and they could be misused." }
  ];

  function collect(data) {
    var main = [];
    (function walk(v, key) {
      if (v == null || key === "mode") return;
      if (typeof v === "string") {
        if (key !== "phone") main.push(v);
      } else if (Array.isArray(v)) {
        v.forEach(function (x) { walk(x, key); });
      } else if (typeof v === "object") {
        Object.keys(v).forEach(function (k) { walk(v[k], k); });
      }
    })(data, "");
    return main.join("\n");
  }

  function privacyWarnings(data, cfg) {
    var text = collect(data);
    var out = [];
    CHECKS.forEach(function (c) {
      if (!(c.words && c.words.test(text)) && !(c.codes && c.codes.test(text))) return;
      var msg = ((cfg.advice && cfg.advice[c.id]) || c.say).replace(/\{doc\}/g, cfg.docWord);
      if (out.indexOf(msg) === -1) out.push(msg);
    });
    return out;
  }

  function isBlank(data) {
    var any = false;
    (function walk(v, key) {
      if (any || v == null || key === "mode") return;
      if (typeof v === "string") any = v.trim() !== "";
      else if (Array.isArray(v)) v.forEach(function (x) { walk(x, key); });
      else if (typeof v === "object") Object.keys(v).forEach(function (k) { walk(v[k], k); });
    })(data, "");
    return !any;
  }

  // Only plain text survives from an opened draft file: at most 40 entries per list and
  // 5,000 characters per field.
  function sanitize(value, depth) {
    depth = depth || 0;
    if (typeof value === "string") return value.slice(0, 5000);
    if (depth > 4 || value == null || typeof value !== "object") return undefined;
    if (Array.isArray(value)) {
      return value.slice(0, 40).map(function (v) { return sanitize(v, depth + 1); }).filter(function (v) { return v !== undefined; });
    }
    var out = {};
    Object.keys(value).slice(0, 60).forEach(function (k) {
      var v = sanitize(value[k], depth + 1);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }

  // ---------------------------------------------------------------- The builder on the page

  var DRAFT_APP = "vintayz-resume-maker";

  // Fields for each kind of repeatable entry. Country files can change labels and examples.
  var ENTRY_FIELDS = {
    jobs: [
      { key: "title", label: "Job title" },
      { key: "org", label: "Employer" },
      { key: "location", label: "Location", hint: "Optional" },
      { key: "start", label: "Start", placeholder: "Mar 2021", half: true },
      { key: "end", label: "End", placeholder: "Present", half: true },
      { key: "summary", label: "About the role", hint: "Optional. One or two lines.", rows: 2, only: "roleSummary" },
      { key: "bullets", label: "What you did and achieved", hint: "One point per line. Start with a verb and add numbers where you can.", rows: 5 }
    ],
    education: [
      { key: "qualification", label: "Qualification" },
      { key: "school", label: "School, college or university" },
      { key: "location", label: "Location", hint: "Optional" },
      { key: "start", label: "Start", placeholder: "2016", half: true },
      { key: "end", label: "Finish", placeholder: "2020", half: true },
      { key: "details", label: "Details", hint: "Optional. Grades, honours or relevant subjects, one per line.", rows: 3 }
    ],
    references: [
      { key: "name", label: "Name" },
      { key: "title", label: "Job title", half: true },
      { key: "org", label: "Organisation", half: true },
      { key: "relationship", label: "How they know you", placeholder: "My manager, 2022 to now" },
      { key: "phone", label: "Phone", type: "tel", half: true },
      { key: "email", label: "Email", type: "email", half: true }
    ]
  };

  // Section keys a draft from another country's maker might bring, for the "left out" note.
  var SECTION_NAMES = {
    summary: "summary", skills: "skills", experience: "work experience", volunteer: "volunteer experience",
    education: "education", certifications: "certifications", languages: "languages",
    interests: "interests", additional: "additional information", achievements: "achievements",
    references: "references"
  };

  var BASE = (function () {
    var script = typeof document !== "undefined" && document.currentScript;
    return script && script.src ? script.src.replace(/js\/resume\.js(?:\?.*)?$/, "") : "";
  })();

  var pdfLibPromise = null;

  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!pdfLibPromise) {
      pdfLibPromise = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = BASE + "vendor/pdf-lib/pdf-lib.min.js";
        script.onload = function () { resolve(window.PDFLib); };
        script.onerror = function () {
          pdfLibPromise = null;
          reject(new Error("The preview didn't load. Check your connection and refresh the page."));
        };
        document.head.appendChild(script);
      });
    }
    return pdfLibPromise;
  }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") el.textContent = v;
      else if (k === "class") el.className = v;
      else el.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) {
      if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }

  var LOCK = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  function saveFile(content, name, type) {
    var url = URL.createObjectURL(new Blob([content], { type: type }));
    var a = h("a", { href: url, download: name, class: "rf-offscreen" });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = h("textarea", { class: "rf-offscreen", readonly: true });
      area.value = text;
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      area.remove();
      if (ok) resolve();
      else reject(new Error("copy"));
    });
  }

  function builder(app, cfg) {
    var uid = 0;
    var dirty = false;
    var lib = null;
    var measures = null;
    var lastLayout = null;
    var groups = {};
    var ex = cfg.example;

    function byId(id) { return document.getElementById(id); }

    function field(id, def, value) {
      var label = h("label", { for: id }, [def.label, def.hint ? h("span", { class: "hint", text: def.hint }) : null]);
      var control;
      var input;
      if (def.rows) {
        input = control = h("textarea", { id: id, rows: def.rows, class: "rf-textarea", placeholder: def.placeholder, spellcheck: "true" });
      } else {
        input = h("input", {
          id: id, type: def.type || "text", placeholder: def.placeholder, inputmode: def.inputmode,
          autocomplete: def.ac || "off", spellcheck: def.type || def.inputmode ? "false" : null
        });
        control = h("div", { class: "input-wrap is-text" }, [input]);
      }
      input.dataset.key = def.key;
      if (value != null) input.value = value;
      return h("div", { class: "field" + (def.half ? "" : " span-2") }, [label, control]);
    }

    function button(text, id, cls) {
      return h("button", { type: "button", id: id, class: cls || "btn btn-sm" }, [text]);
    }

    // ---- Your details
    var contactDefs = [
      { key: "name", label: "Full name", ac: "name", placeholder: ex.name },
      { key: "headline", label: "Job title or the role you want", hint: "Optional", placeholder: ex.headline },
      Object.assign({ key: "location", half: true, placeholder: ex.location }, cfg.location),
      { key: "phone", label: "Phone", type: "tel", ac: "tel", half: true, placeholder: ex.phone },
      { key: "email", label: "Email", type: "email", ac: "email", half: true, placeholder: ex.email },
      { key: "linkedin", label: "LinkedIn", hint: "Optional", inputmode: "url", half: true, placeholder: "linkedin.com/in/your-name" },
      { key: "website", label: "Website or portfolio", hint: "Optional", inputmode: "url", placeholder: ex.website || "yourname.com" }
    ];

    var fileInput = h("input", { type: "file", id: "rf-open", class: "rf-file", accept: ".json,application/json" });
    var privacy = h("p", { class: "rf-privacy" });
    privacy.innerHTML = LOCK; // constant markup, no visitor text
    privacy.appendChild(document.createTextNode(" What you type stays on your device. We don't keep a copy, so save a draft file if you want to come back to it."));

    var form = h("form", { class: "resume-form", id: "resume-form", novalidate: true }, [
      h("div", { class: "rf-bar" }, [
        h("div", { class: "rf-bar-actions" }, [
          button("Load example", "rf-example"),
          button("Save draft", "rf-save"),
          fileInput,
          h("label", { for: "rf-open", class: "btn btn-sm" }, ["Open draft"]),
          button("Clear", "rf-clear")
        ]),
        privacy
      ])
    ]);

    var contactGrid = h("div", { class: "rf-grid" });
    contactDefs.forEach(function (d) { contactGrid.appendChild(field("rf-" + d.key, d)); });
    form.appendChild(h("fieldset", { class: "rf-group" }, [h("legend", { text: "Your details" }), contactGrid]));

    // ---- Sections
    cfg.sections.forEach(function (s) {
      var g = groups[s.key] = { def: s };
      var helpId = "rf-" + s.key + "-help";
      var body = h("div", { class: "rf-grid" });
      var fs = h("fieldset", { class: "rf-group", id: "rf-" + s.key + "-group" }, [
        h("legend", { text: s.legend || s.heading }),
        s.help ? h("p", { class: "rf-help", id: helpId, text: s.help }) : null,
        body
      ]);

      if (s.type === "text" || s.type === "tags" || s.type === "list") {
        var hint = s.hint || (s.type === "tags" ? "Separate with commas" : s.type === "list" ? "One per line" : "");
        var f = field("rf-" + s.key, { key: s.key, label: s.label || s.heading, hint: hint, rows: s.rows || 4, placeholder: s.placeholder });
        g.input = f.querySelector("textarea");
        if (s.help) g.input.setAttribute("aria-describedby", helpId);
        body.appendChild(f);
      } else {
        g.list = h("div", { class: "rf-entries" });
        g.add = h("button", { type: "button", class: "btn btn-sm rf-add" }, ["+ " + s.add]);
        g.add.addEventListener("click", function () {
          addEntry(s, null, true);
          changed();
        });
        g.list.addEventListener("click", function (e) { entryAction(s, e); });
        var listArea = h("div", { class: "rf-entries-area span-2" }, [g.list, g.add]);

        if (s.type === "references") {
          g.radios = [
            ["request", "Write “" + s.onRequest + "”"],
            ["list", "List my " + (s.people || "references")],
            ["none", "Leave this section out"]
          ].map(function (c) {
            var input = h("input", { type: "radio", name: "rf-" + s.key + "-mode", value: c[0] });
            return h("label", { class: "rf-radio" }, [input, " " + c[1]]);
          });
          body.appendChild(h("div", { class: "rf-choices span-2" }, g.radios));
          g.listArea = listArea;
          setMode(g, s.mode);
        }
        body.appendChild(listArea);
      }
      form.appendChild(fs);
    });

    // ---- Preview panel
    function select(id, label, options) {
      var sel = h("select", { id: id }, options.map(function (o) { return h("option", { value: o[0] }, [o[1]]); }));
      return h("div", { class: "field" }, [h("label", { for: id, text: label }), h("div", { class: "select-wrap" }, [sel])]);
    }

    var fontField = select("rp-font", "Font", [["sans", "Sans-serif (like Arial)"], ["serif", "Serif (like Times)"]]);
    var spacingField = select("rp-spacing", "Spacing", [["normal", "Standard"], ["compact", "Compact"]]);
    var download = button("Download PDF", "rp-download", "btn btn-light");
    var copy = button("Copy as text", "rp-copy", "btn btn-ghost-dark");
    var status = h("p", { class: "rp-status", role: "status", "aria-live": "polite" });
    var warnings = h("ul", { class: "rp-warnings", "aria-live": "polite" });
    var meta = h("p", { class: "rp-meta" });
    var pagesBox = h("div", { class: "rp-pages", "aria-hidden": "true" });

    var panel = h("section", { class: "rp-panel rp-" + cfg.paper, id: "resume-preview", "aria-label": "Preview and download" }, [
      h("div", { class: "rp-head" }, [h("h2", { class: "rp-title", text: "Preview" }), meta]),
      h("div", { class: "rp-options" }, [fontField, spacingField]),
      h("div", { class: "rp-actions" }, [download, copy]),
      status,
      warnings,
      pagesBox
    ]);

    app.textContent = "";
    app.appendChild(form);
    app.appendChild(panel);

    var fontSel = byId("rp-font");
    var spacingSel = byId("rp-spacing");

    // ---- Entries
    function entryDefs(s) {
      return ENTRY_FIELDS[s.type].filter(function (d) { return !d.only || cfg[d.only]; }).map(function (d) {
        var o = Object.assign({}, d);
        ["labels", "hints", "placeholders"].forEach(function (what, n) {
          var prop = ["label", "hint", "placeholder"][n];
          if (s[what] && s[what][d.key] != null) o[prop] = s[what][d.key];
        });
        return o;
      });
    }

    function addEntry(s, values, focus) {
      var g = groups[s.key];
      var n = ++uid;
      var grid = h("div", { class: "rf-grid" });
      entryDefs(s).forEach(function (d) {
        grid.appendChild(field("rf-" + s.key + "-" + n + "-" + d.key, d, values ? values[d.key] : null));
      });
      var box = h("div", { class: "rf-entry" }, [
        h("div", { class: "rf-entry-head" }, [
          h("h3", { class: "rf-entry-title" }),
          h("div", { class: "rf-entry-tools" }, [
            h("button", { type: "button", class: "rf-icon-btn", "data-act": "up" }, ["↑"]),
            h("button", { type: "button", class: "rf-icon-btn", "data-act": "down" }, ["↓"]),
            h("button", { type: "button", class: "btn btn-sm rf-remove", "data-act": "remove" }, ["Remove"])
          ])
        ]),
        grid
      ]);
      g.list.appendChild(box);
      renumber(s);
      if (focus) box.querySelector("input, textarea").focus();
    }

    function renumber(s) {
      var boxes = Array.from(groups[s.key].list.children);
      boxes.forEach(function (box, i) {
        var first = box.querySelector("[data-key]");
        var what = one(first && first.value);
        var label = s.noun + " " + (i + 1);
        box.querySelector(".rf-entry-title").textContent = label + (what ? ": " + what : "");
        var up = box.querySelector('[data-act="up"]');
        var down = box.querySelector('[data-act="down"]');
        up.disabled = i === 0;
        down.disabled = i === boxes.length - 1;
        up.setAttribute("aria-label", "Move " + label + " up");
        down.setAttribute("aria-label", "Move " + label + " down");
        box.querySelector('[data-act="remove"]').setAttribute("aria-label", "Remove " + label);
      });
    }

    function entryAction(s, e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var g = groups[s.key];
      var box = btn.closest(".rf-entry");
      var act = btn.getAttribute("data-act");
      if (act === "remove") {
        var filled = Array.from(box.querySelectorAll("[data-key]")).some(function (i) { return i.value.trim(); });
        if (filled && !window.confirm("Remove " + box.querySelector(".rf-entry-title").textContent + "?")) return;
        var next = box.nextElementSibling || box.previousElementSibling;
        box.remove();
        renumber(s);
        (next ? next.querySelector("[data-key]") : g.add).focus();
      } else {
        if (act === "up" && box.previousElementSibling) g.list.insertBefore(box, box.previousElementSibling);
        if (act === "down" && box.nextElementSibling) g.list.insertBefore(box.nextElementSibling, box);
        renumber(s);
        var again = box.querySelector('[data-act="' + act + '"]');
        (again.disabled ? box.querySelector('[data-act="' + (act === "up" ? "down" : "up") + '"]') : again).focus();
      }
      changed();
    }

    function mode(g) {
      var on = g.radios.map(function (l) { return l.querySelector("input"); }).filter(function (i) { return i.checked; })[0];
      return on ? on.value : "none";
    }

    function setMode(g, value) {
      g.radios.forEach(function (l) {
        var input = l.querySelector("input");
        input.checked = input.value === value;
      });
      g.listArea.hidden = value !== "list";
    }

    // ---- Reading and filling the form
    function read() {
      var data = {};
      contactDefs.forEach(function (d) { data[d.key] = byId("rf-" + d.key).value; });
      cfg.sections.forEach(function (s) {
        var g = groups[s.key];
        if (g.input) {
          data[s.key] = g.input.value;
          return;
        }
        var list = Array.from(g.list.children).map(function (box) {
          var o = {};
          Array.from(box.querySelectorAll("[data-key]")).forEach(function (i) { o[i.dataset.key] = i.value; });
          return o;
        });
        data[s.key] = s.type === "references" ? { mode: mode(g), people: list } : list;
      });
      return data;
    }

    function write(data) {
      data = data || {};
      contactDefs.forEach(function (d) {
        byId("rf-" + d.key).value = typeof data[d.key] === "string" ? data[d.key] : "";
      });
      cfg.sections.forEach(function (s) {
        var g = groups[s.key];
        var v = data[s.key];
        if (g.input) {
          g.input.value = Array.isArray(v) ? v.join("\n") : typeof v === "string" ? v : "";
          return;
        }
        g.list.textContent = "";
        var refs = s.type === "references";
        entries(refs ? v && v.people : v).forEach(function (e) { addEntry(s, e); });
        if (refs) setMode(g, v && typeof v.mode === "string" ? v.mode : s.mode);
      });
    }

    function options() {
      return { font: fontSel.value, spacing: spacingSel.value };
    }

    function say(text, isError) {
      status.textContent = text;
      status.classList.toggle("is-error", !!isError);
    }

    // ---- Preview
    function draw(lay) {
      pagesBox.textContent = "";
      lay.pages.forEach(function (p) {
        var inner = h("div", { class: "rp-page rp-" + lay.family });
        inner.style.width = lay.size[0] + "px";
        inner.style.height = lay.size[1] + "px";
        p.rules.forEach(function (r) {
          var line = h("div", { class: "rp-rule" });
          line.style.left = r.x1 + "px";
          line.style.top = r.y + "px";
          line.style.width = r.x2 - r.x1 + "px";
          inner.appendChild(line);
        });
        p.runs.forEach(function (r) {
          var span = h("span", { class: "rp-" + r.f + " rp-" + r.c, text: r.t });
          span.style.left = r.x + "px";
          span.style.top = r.y - r.s * 0.85 + "px";
          span.style.fontSize = r.s + "px";
          inner.appendChild(span);
        });
        pagesBox.appendChild(h("div", { class: "rp-sheet" }, [inner]));
      });
      scale();
    }

    function scale() {
      if (!lastLayout) return;
      Array.from(pagesBox.children).forEach(function (sheet) {
        var k = sheet.clientWidth / lastLayout.size[0];
        sheet.firstChild.style.transform = "scale(" + k + ")";
      });
    }

    function render() {
      if (!measures) return;
      var data = read();
      var example = isBlank(data);
      var dropped = [];
      var doc = cleanDeep(buildDoc(example ? ex : data, cfg), dropped);
      var opts = options();
      lastLayout = layout(doc, cfg, opts, measures[opts.font === "serif" ? "serif" : "sans"]);
      draw(lastLayout);
      var n = lastLayout.pages.length;
      panel.classList.toggle("is-example", example);
      meta.textContent = (example ? "Example " : "Your ") + cfg.docWord + " · " + n + (n === 1 ? " page" : " pages") + " · " + cfg.paperName;

      var list = [];
      if (!example) {
        if (dropped.length) {
          list.push("These characters can't go in the PDF, so they were left out: " + dropped.join(" ") +
            ". The PDF fonts cover English and Western European letters.");
        }
        if (n > cfg.maxPages) {
          list.push("Your " + cfg.docWord + " runs to " + n + " pages. " + cfg.pageAdvice + " Try Compact spacing, or shorten older jobs.");
        }
        list = list.concat(privacyWarnings(data, cfg));
      }
      warnings.textContent = "";
      list.forEach(function (w) { warnings.appendChild(h("li", { text: w })); });
    }

    var timer = 0;
    function changed() {
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(render, 120);
    }

    form.addEventListener("input", function (e) {
      var s = cfg.sections.filter(function (x) { return groups[x.key].list && groups[x.key].list.contains(e.target); })[0];
      if (s) renumber(s);
      changed();
    });
    form.addEventListener("change", function (e) {
      if (e.target.type === "radio") {
        var g = groups[e.target.name.replace(/^rf-|-mode$/g, "")];
        setMode(g, e.target.value);
      }
      if (e.target !== fileInput) changed();
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    fontSel.addEventListener("change", render);
    spacingSel.addEventListener("change", render);

    function hasContent() { return !isBlank(read()); }

    byId("rf-example").addEventListener("click", function () {
      if (hasContent() && !window.confirm("Replace what you've typed with the example?")) return;
      write(ex);
      changed();
      dirty = false;
      say("Example loaded. Change anything you like.");
    });

    byId("rf-clear").addEventListener("click", function () {
      if (hasContent() && !window.confirm("Clear everything you've typed? This can't be undone.")) return;
      write({});
      render();
      dirty = false;
      say("Cleared.");
      byId("rf-name").focus();
    });

    byId("rf-save").addEventListener("click", function () {
      var data = read();
      if (isBlank(data)) {
        say("There's nothing to save yet.", true);
        return;
      }
      var draft = { app: DRAFT_APP, version: 1, country: cfg.country, saved: new Date().toISOString(), options: options(), data: data };
      var name = fileBase(data.name, cfg.fileWord) + "-draft.json";
      saveFile(JSON.stringify(draft, null, 2), name, "application/json");
      dirty = false;
      say("Saved " + name + " to your device. Open it here later to carry on editing.");
    });

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      if (file.size > 1000000) {
        say("That file is too big to be a draft from this tool.", true);
        return;
      }
      file.text().then(function (text) {
        var draft;
        try { draft = JSON.parse(text); } catch (err) { draft = null; }
        if (!draft || draft.app !== DRAFT_APP || !draft.data || typeof draft.data !== "object") {
          say("That isn't a draft saved from our resume makers. Choose a file ending in -draft.json.", true);
          return;
        }
        if (hasContent() && !window.confirm("Replace what you've typed with this draft?")) return;
        var data = sanitize(draft.data);
        write(data);
        var opts = sanitize(draft.options) || {};
        if (opts.font === "serif" || opts.font === "sans") fontSel.value = opts.font;
        if (opts.spacing === "normal" || opts.spacing === "compact") spacingSel.value = opts.spacing;
        render();
        dirty = false;
        var here = cfg.sections.map(function (s) { return s.key; });
        var missing = Object.keys(SECTION_NAMES).filter(function (k) {
          return here.indexOf(k) === -1 && data[k] !== undefined && !isBlank(k === "references" ? data[k].people : data[k]);
        }).map(function (k) { return SECTION_NAMES[k]; });
        say("Draft opened." + (missing.length ? " This " + cfg.docWord + " format doesn't use: " + missing.join(", ") + ", so they were left out." : ""));
      }, function () {
        say("We couldn't read that file.", true);
      });
    });

    download.addEventListener("click", function () {
      var data = read();
      if (!one(data.name)) {
        say("Add your name first. It goes at the top of your " + cfg.docWord + ".", true);
        byId("rf-name").focus();
        return;
      }
      if (!lib) {
        say("The PDF maker is still loading. Try again in a moment.", true);
        return;
      }
      say("Making your PDF…");
      var doc = cleanDeep(buildDoc(data, cfg), []);
      var opts = options();
      var lay = layout(doc, cfg, opts, measures[opts.font === "serif" ? "serif" : "sans"]);
      makePdf(lib, lay, { title: doc.name + " – " + cfg.fileWord, author: doc.name, lang: cfg.lang }).then(function (bytes) {
        var name = fileBase(data.name, cfg.fileWord) + ".pdf";
        saveFile(bytes, name, "application/pdf");
        dirty = false;
        say("Downloaded " + name + " (" + lay.pages.length + (lay.pages.length === 1 ? " page" : " pages") + "). Open it and check it before you send it.");
      }, function () {
        say("Something went wrong while making the PDF. Please try again.", true);
      });
    });

    copy.addEventListener("click", function () {
      var data = read();
      if (isBlank(data)) {
        say("There's nothing to copy yet.", true);
        return;
      }
      copyText(plainText(buildDoc(data, cfg))).then(function () {
        say("Copied as plain text. Paste it into an application form, Word or Google Docs.");
      }, function () {
        say("Your browser didn't allow copying. Try the PDF instead.", true);
      });
    });

    window.addEventListener("beforeunload", function (e) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    });

    if ("ResizeObserver" in window) new ResizeObserver(scale).observe(pagesBox);
    else window.addEventListener("resize", scale);

    // Phones: a bar pinned to the bottom while the form is on screen and the preview isn't.
    if ("IntersectionObserver" in window) {
      var jump = h("a", { class: "btn btn-sm btn-ghost-dark", href: "#resume-preview" }, ["See preview"]);
      var quick = button("Download PDF", null, "btn btn-sm btn-light");
      quick.addEventListener("click", function () { download.click(); });
      var bar = h("div", { class: "resume-bar" }, [jump, quick]);
      document.body.appendChild(bar);
      var formOn = false;
      var panelOn = false;
      var watch = new IntersectionObserver(function (list) {
        list.forEach(function (e) {
          if (e.target === form) formOn = e.isIntersecting;
          else panelOn = e.isIntersecting;
        });
        bar.classList.toggle("show", formOn && !panelOn);
      });
      watch.observe(form);
      watch.observe(panel);
    }

    write({});
    say("Loading the preview…");
    loadPdfLib().then(function (L) {
      lib = L;
      measures = { sans: pdfMeasure(L, "sans"), serif: pdfMeasure(L, "serif") };
      say("");
      render();
    }, function (err) {
      say(err.message, true);
    });
  }

  function start(cfg) {
    if (typeof document === "undefined" || !document.getElementById) return;
    function go() {
      var app = document.getElementById("resume-app");
      if (app) builder(app, cfg);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else go();
  }

  // What each country file shares with the tests.
  function forCountry(cfg) {
    return {
      config: cfg,
      doc: function (data) { return buildDoc(data, cfg); },
      text: function (data) { return plainText(buildDoc(data, cfg)); },
      layout: function (data, opts, measure) { return layout(cleanDeep(buildDoc(data, cfg), []), cfg, opts, measure); },
      warnings: function (data) { return privacyWarnings(data, cfg); },
      fileName: function (name) { return fileBase(name, cfg.fileWord); }
    };
  }

  /*
   * Lays out a plain letter (cover letter, resignation letter) on pages for makePdf().
   * blocks: [{ kind: "name" | "contact" | "line" | "subject" | "para" | "gap" | "sign", text }]
   * opts: { paper: "letter" | "a4", font: "sans" | "serif" }. measure(text, font, size) → width.
   * Returns { size: [w, h], family, pages: [{ runs: [{ t, f, s, c, x, y }], rules: [] }], dropped },
   * where y is the baseline measured down from the top of the page.
   */
  function letterLayout(blocks, opts, measure) {
    var size = PAPER[opts.paper];
    var margin = 72;
    var body = 11;
    var lead = 15;
    var width = size[0] - margin * 2;
    var pages = [{ runs: [], rules: [] }];
    var page = pages[0];
    var y = margin;
    var dropped = [];

    function put(text, font, s, colour, step) {
      if (y + step > size[1] - margin) {
        page = { runs: [], rules: [] };
        pages.push(page);
        y = margin;
      }
      y += step;
      page.runs.push({ t: text, f: font, s: s, c: colour, x: margin, y: y });
    }

    blocks.forEach(function (b) {
      var text = b.text ? clean(b.text, dropped) : "";
      if (b.kind === "gap") { y += lead * 0.6; return; }
      if (b.kind === "sign") { y += lead * 2.2; return; }
      if (b.kind === "name") { put(text, "bold", 16, "ink", 16); y += 4; return; }
      if (b.kind === "contact") {
        wrap(text, width, function (t) { return measure(t, "regular", body - 1); }).forEach(function (l) { put(l, "regular", body - 1, "soft", lead - 1); });
        return;
      }
      var font = b.kind === "subject" ? "bold" : "regular";
      wrap(text, width, function (t) { return measure(t, font, body); }).forEach(function (l) { put(l, font, body, "ink", lead); });
    });
    return { size: size, family: opts.font === "serif" ? "serif" : "sans", pages: pages, dropped: dropped };
  }

  window.ToolNestResume = {
    PAPER: PAPER,
    letterLayout: letterLayout,
    clean: clean,
    tags: tags,
    lines: lines,
    wrap: wrap,
    dateRange: dateRange,
    buildDoc: buildDoc,
    plainText: plainText,
    layout: layout,
    pdfMeasure: pdfMeasure,
    makePdf: makePdf,
    privacyWarnings: privacyWarnings,
    sanitize: sanitize,
    forCountry: forCountry,
    start: start
  };
})();
