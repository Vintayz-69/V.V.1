/* Citation Generator — APA 7th edition, MLA 9th edition and Harvard (a common UK university style).
 * Works on what the visitor types; nothing is looked up online or sent anywhere.
 * A citation is built as a list of parts: { t: text, i: true when italic }, so the page can show
 * italics safely (as text nodes) and copy both formatted and plain versions. */
(function () {
  "use strict";

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // MLA 9 abbreviates months longer than four letters.
  var MLA_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

  // ---------------------------------------------------------------- Names

  // One person per line, as "Last, First Middle" or "First Middle Last".
  function parsePeople(text) {
    return String(text || "").split(/\n+/).map(function (line) {
      line = line.trim().replace(/\s+/g, " ");
      if (!line) return null;
      var last;
      var given;
      if (line.indexOf(",") !== -1) {
        last = line.slice(0, line.indexOf(",")).trim();
        given = line.slice(line.indexOf(",") + 1).trim();
      } else {
        var words = line.split(" ");
        last = words.pop();
        given = words.join(" ");
      }
      return last ? { last: last, given: given } : null;
    }).filter(Boolean);
  }

  // "Mary Jane" → "M. J."; "Jean-Paul" → "J.-P."
  function initials(given) {
    return given.split(/\s+/).filter(Boolean).map(function (name) {
      return name.split("-").map(function (part) {
        var ch = part.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "").charAt(0);
        return ch ? ch.toUpperCase() + "." : "";
      }).filter(Boolean).join("-");
    }).filter(Boolean).join(" ");
  }

  function apaName(p) { return p.given ? p.last + ", " + initials(p.given) : p.last; }
  function harvardName(p) { return p.given ? p.last + ", " + initials(p.given).replace(/ /g, "") : p.last; }

  function apaAuthors(people) {
    var names = people.map(apaName);
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ", & " + names[1];
    if (names.length <= 20) return names.slice(0, -1).join(", ") + ", & " + names[names.length - 1];
    // 21 or more: the first 19, an ellipsis, then the last author.
    return names.slice(0, 19).join(", ") + ", . . . " + names[names.length - 1];
  }

  function mlaAuthors(people) {
    var first = people[0].given ? people[0].last + ", " + people[0].given : people[0].last;
    if (people.length === 1) return first;
    if (people.length === 2) {
      var p = people[1];
      return first + ", and " + (p.given ? p.given + " " : "") + p.last;
    }
    return first + ", et al";
  }

  function harvardAuthors(people) {
    var names = people.map(harvardName);
    if (names.length === 1) return names[0];
    if (names.length >= 4) return names[0] + " et al.";
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }

  // ---------------------------------------------------------------- Dates

  function parseDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
  }

  // ---------------------------------------------------------------- Helpers

  function endsWithStop(text) { return /[.?!]$/.test(text); }
  function stop(text) { return endsWithStop(text) ? text : text + "."; }

  // "10.1037/abc" or "doi:10.1037/abc" → "https://doi.org/10.1037/abc"
  function doiUrl(doi) {
    var d = String(doi || "").trim().replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
    return d ? "https://doi.org/" + d : "";
  }

  function link(src) {
    return src.doi ? doiUrl(src.doi) : String(src.url || "").trim();
  }

  // Page ranges: APA and Harvard use an en dash (45–67); MLA uses a hyphen (45-67).
  function pages(text, dash) {
    return String(text || "").trim().replace(/\s*[-–—]\s*/g, dash || "–");
  }

  // Build helper: parts list with automatic spacing.
  function builder() {
    var parts = [];
    return {
      add: function (t, italic) {
        if (!t) return this;
        parts.push({ t: t, i: !!italic });
        return this;
      },
      parts: parts
    };
  }

  function trimAll(src) {
    var out = {};
    Object.keys(src).forEach(function (k) { out[k] = typeof src[k] === "string" ? src[k].trim() : src[k]; });
    return out;
  }

  // ---------------------------------------------------------------- APA 7

  function apa(src) {
    var s = trimAll(src);
    var people = parsePeople(s.authors);
    var b = builder();
    var author = s.org || (people.length ? apaAuthors(people) : "");
    var date = parseDate(s.date);
    var year = s.year || (date ? String(date.y) : "");
    var when = year || "n.d.";
    if (s.type === "website" && date) when = date.y + ", " + MONTHS[date.m - 1] + " " + date.d;
    var titleItalic = s.type !== "journal";

    if (author) {
      b.add(stop(author) + " ");
      b.add("(" + when + "). ");
      b.add(s.title, titleItalic);
      b.add(s.title ? (endsWithStop(s.title) ? " " : ". ") : "");
    } else {
      // No author: the title moves to the front.
      b.add(s.title, titleItalic);
      b.add(s.title ? (endsWithStop(s.title) ? " " : ". ") : "");
      b.add("(" + when + "). ");
    }

    if (s.type === "book") {
      if (s.edition) {
        // "(2nd ed.)" goes straight after the title, before its full stop.
        var last = b.parts[b.parts.length - 1];
        if (last && last.t === ". ") last.t = " (" + ordinal(s.edition) + " ed.). ";
      }
      if (s.publisher && s.publisher !== author) b.add(stop(s.publisher) + " ");
    } else if (s.type === "journal") {
      if (s.container) {
        b.add(s.container, true);
        if (s.volume) { b.add(", "); b.add(s.volume, true); }
        if (s.issue) b.add("(" + s.issue + ")");
        if (s.pages) b.add(", " + pages(s.pages));
        b.add(". ");
      }
    } else if (s.container && s.container !== author) {
      b.add(stop(s.container) + " ");
    }
    var url = link(s);
    if (url) b.add(url);
    return finish(b.parts);
  }

  // ---------------------------------------------------------------- MLA 9

  function mla(src) {
    var s = trimAll(src);
    var people = parsePeople(s.authors);
    var b = builder();
    var author = s.org || (people.length ? mlaAuthors(people) : "");
    if (author) b.add(stop(author) + " ");
    if (s.type === "book") {
      b.add(s.title, true);
      b.add(s.title && !endsWithStop(s.title) ? ". " : " ");
      var bits = [];
      if (s.edition) bits.push(ordinal(s.edition) + " ed.");
      if (s.publisher && s.publisher !== s.org) bits.push(s.publisher);
      if (s.year) bits.push(s.year);
      if (bits.length) b.add(bits.join(", ") + ". ");
    } else {
      b.add("“" + (s.title ? stop(s.title) : "") + "” ");
      var rest = [];
      if (s.container) b.add(s.container, true);
      if (s.type === "journal") {
        if (s.volume) rest.push("vol. " + s.volume);
        if (s.issue) rest.push("no. " + s.issue);
        if (s.year) rest.push(s.year);
        if (s.pages) rest.push((/[–-]/.test(s.pages) ? "pp. " : "p. ") + pages(s.pages, "-"));
      } else {
        var d = parseDate(s.date);
        if (d) rest.push(d.d + " " + MLA_MONTHS[d.m - 1] + " " + d.y);
        else if (s.year) rest.push(s.year);
      }
      var url = link(s);
      if (url) rest.push(s.doi ? url : url.replace(/^https?:\/\//i, ""));
      if (s.container && rest.length) b.add(", ");
      b.add(rest.join(", "));
      if (s.container || rest.length) b.add(". ");
      if (s.type === "website") {
        var acc = parseDate(s.accessed);
        if (acc) b.add("Accessed " + acc.d + " " + MLA_MONTHS[acc.m - 1] + " " + acc.y + ".");
      }
    }
    return finish(b.parts);
  }

  // ---------------------------------------------------------------- Harvard

  function harvard(src) {
    var s = trimAll(src);
    var people = parsePeople(s.authors);
    var b = builder();
    var author = s.org || (people.length ? harvardAuthors(people) : "");
    var date = parseDate(s.date);
    var year = s.year || (date ? String(date.y) : "");
    var when = "(" + (year || "no date") + ")";

    if (author) b.add(author + " " + when + " ");
    if (s.type === "journal") {
      b.add("‘" + s.title + "’, ");
      if (s.container) b.add(s.container, true);
      var rest = [];
      if (s.volume) rest.push(s.volume + (s.issue ? "(" + s.issue + ")" : ""));
      if (s.pages) rest.push((/[–-]/.test(s.pages) ? "pp. " : "p. ") + pages(s.pages));
      if (rest.length) b.add(", " + rest.join(", "));
      b.add(". ");
    } else {
      b.add(s.title, true);
      if (!author) b.add(" " + when);
      b.add(". ");
      if (s.type === "book") {
        if (s.edition) b.add(ordinal(s.edition) + " edn. ");
        if (s.publisher) b.add(stop(s.publisher) + " ");
      }
    }
    if (!author && s.type === "journal") b.parts.unshift({ t: when + " ", i: false });
    var url = link(s);
    if (s.doi) b.add("Available at: " + url + ".");
    else if (url) {
      b.add("Available at: " + url);
      var acc = parseDate(s.accessed);
      b.add(acc ? " (Accessed: " + acc.d + " " + MONTHS[acc.m - 1] + " " + acc.y + ")." : ".");
    }
    return finish(b.parts);
  }

  // ---------------------------------------------------------------- Shared

  function ordinal(n) {
    var num = parseInt(n, 10);
    if (!num) return String(n);
    var suffix = (num % 100 >= 11 && num % 100 <= 13) ? "th" : ["th", "st", "nd", "rd"][num % 10] || "th";
    return num + suffix;
  }

  // Joins neighbouring parts with the same style, tidies spaces and the ending.
  function finish(parts) {
    var out = [];
    parts.forEach(function (p) {
      if (!p.t) return;
      var prev = out[out.length - 1];
      if (prev && prev.i === p.i) prev.t += p.t;
      else out.push({ t: p.t, i: p.i });
    });
    out.forEach(function (p) { p.t = p.t.replace(/ {2,}/g, " ").replace(/\.\./g, "."); });
    if (out.length) out[out.length - 1].t = out[out.length - 1].t.replace(/\s+$/, "");
    if (out.length) out[0].t = out[0].t.replace(/^\s+/, "");
    return out;
  }

  function plain(parts) {
    return parts.map(function (p) { return p.t; }).join("");
  }

  function html(parts) {
    return parts.map(function (p) {
      var t = p.t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return p.i ? "<i>" + t + "</i>" : t;
    }).join("");
  }

  var STYLES = { apa: apa, mla: mla, harvard: harvard };

  function cite(style, src) {
    return (STYLES[style] || apa)(src);
  }

  window.ToolNestCalc = { cite: cite, plain: plain, html: html, parsePeople: parsePeople, initials: initials };
  if (!document.getElementById("cite-form")) return;

  // ---------------------------------------------------------------- Page

  var el = function (id) { return document.getElementById(id); };
  var FIELDS = ["authors", "org", "title", "container", "year", "date", "edition", "publisher", "volume", "issue", "pages", "doi", "url", "accessed"];
  // Which boxes each kind of source uses.
  var SHOW = {
    website: ["authors", "org", "title", "container", "date", "url", "accessed"],
    book: ["authors", "org", "title", "year", "edition", "publisher", "doi", "url"],
    journal: ["authors", "org", "title", "container", "year", "volume", "issue", "pages", "doi", "url"]
  };
  var CONTAINER_LABEL = { website: "Website name", journal: "Journal name" };
  var EXAMPLES = {
    website: { authors: "", org: "National Careers Service", title: "How to write a cover letter", container: "GOV.UK", date: "", url: "https://nationalcareers.service.gov.uk/careers-advice/covering-letter", accessed: "2026-09-30" },
    book: { authors: "Priya Shah\nTom Walker", org: "", title: "Working for yourself: A practical guide", year: "2024", edition: "2", publisher: "Northbridge Press", doi: "", url: "" },
    journal: { authors: "Lee, Anna M.\nOkafor, Daniel", org: "", title: "Remote work and freelance income", container: "Journal of Work Studies", year: "2025", volume: "12", issue: "3", pages: "45-67", doi: "10.1234/jws.2025.045", url: "" }
  };

  var list = [];
  var current = [];

  function read() {
    var src = { type: el("type").value };
    // Boxes hidden for this kind of source are left out, even if they still hold text.
    FIELDS.forEach(function (f) { src[f] = SHOW[src.type].indexOf(f) === -1 ? "" : el("c-" + f).value; });
    return src;
  }

  function applyType() {
    var type = el("type").value;
    FIELDS.forEach(function (f) {
      el("c-" + f).closest(".field").hidden = SHOW[type].indexOf(f) === -1;
    });
    if (CONTAINER_LABEL[type]) el("c-container-label").textContent = CONTAINER_LABEL[type];
  }

  function fillExample(type) {
    FIELDS.forEach(function (f) { el("c-" + f).value = (EXAMPLES[type] && EXAMPLES[type][f]) || ""; });
  }

  function paint(target, parts) {
    target.textContent = "";
    parts.forEach(function (p) {
      if (p.i) {
        var i = document.createElement("i");
        i.textContent = p.t;
        target.appendChild(i);
      } else target.appendChild(document.createTextNode(p.t));
    });
  }

  function update() {
    var src = read();
    current = cite(el("style").value, src);
    var out = el("cite-out");
    if (!src.title.trim()) {
      out.textContent = "Type a title to see your citation.";
      out.classList.add("is-empty");
    } else {
      paint(out, current);
      out.classList.remove("is-empty");
    }
    el("apa-tip").hidden = el("style").value !== "apa";
  }

  function renderList() {
    var style = el("style").value;
    var ol = el("cite-list");
    ol.textContent = "";
    var sorted = list.map(function (src) { return cite(style, src); })
      .sort(function (a, b) { return plain(a).localeCompare(plain(b), "en", { sensitivity: "base" }); });
    sorted.forEach(function (parts) {
      var li = document.createElement("li");
      paint(li, parts);
      ol.appendChild(li);
    });
    el("list-wrap").hidden = !list.length;
    el("list-count").textContent = list.length === 1 ? "1 source" : list.length + " sources";
    el("list-heading").textContent = style === "mla" ? "Works Cited" : "Reference list";
    return sorted;
  }

  function copy(parts, button, label) {
    var text = parts.map(plain).join("\n\n");
    var rich = parts.map(html).join("<br><br>");
    var done = function (ok) {
      button.textContent = ok ? "Copied" : "Couldn't copy: select the text and copy it";
      setTimeout(function () { button.textContent = label; }, 2000);
    };
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([rich], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" })
      })]).then(function () { done(true); }, function () {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else done(false);
  }

  el("type").addEventListener("change", function () {
    applyType();
    fillExample(el("type").value);
    update();
  });
  el("style").addEventListener("change", function () { update(); renderList(); });
  el("cite-form").addEventListener("input", update);
  el("cite-form").addEventListener("submit", function (e) { e.preventDefault(); });

  el("cite-copy").addEventListener("click", function () {
    if (el("c-title").value.trim()) copy([current], el("cite-copy"), "Copy citation");
  });
  el("cite-add").addEventListener("click", function () {
    var src = read();
    if (!src.title.trim()) {
      el("c-title").focus();
      return;
    }
    list.push(src);
    renderList();
    el("cite-add").textContent = "Added";
    setTimeout(function () { el("cite-add").textContent = "Add to my list"; }, 1500);
  });
  el("list-copy").addEventListener("click", function () { copy(renderList(), el("list-copy"), "Copy the whole list"); });
  el("list-clear").addEventListener("click", function () {
    list = [];
    renderList();
  });
  el("cite-clear").addEventListener("click", function () {
    FIELDS.forEach(function (f) { el("c-" + f).value = ""; });
    update();
    el("c-authors").focus();
  });

  applyType();
  fillExample(el("type").value);
  update();
})();
