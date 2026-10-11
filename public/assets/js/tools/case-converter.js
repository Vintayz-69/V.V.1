/* Case Converter: changes text to UPPERCASE, lowercase, Sentence case, Title Case, Capitalized
   Case, camelCase, PascalCase, snake_case, kebab-case or CONSTANT_CASE. Runs in the browser. */

(function () {
  "use strict";

  // Short words that stay lowercase in Title Case, unless they come first or last.
  var SMALL = ["a", "an", "and", "as", "at", "but", "by", "for", "from", "if", "in", "into", "nor", "of",
    "off", "on", "onto", "or", "per", "so", "than", "the", "to", "up", "upon", "via", "vs", "with", "yet"];

  var LETTER = /\p{L}/u;
  var WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

  function upperFirst(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  // Words with capitals after the first letter (NASA, iPhone, McDonald) are left alone; others
  // get a capital first letter and lowercase after.
  function capital(word) {
    if (/\p{Lu}/u.test(word.slice(1))) return word;
    return upperFirst(word.toLowerCase());
  }

  // Text written all in capitals is lowered first, so Title Case of "HELLO WORLD" is "Hello World".
  function unshout(text) {
    return /\p{Ll}/u.test(text) ? text : text.toLowerCase();
  }

  function sentence(text) {
    var lower = text.toLowerCase();
    // A capital at the start, after . ! ? (and any closing quotes or brackets) and a space, and after a blank line.
    var out = lower.replace(/(^\s*|[.!?]['"’”)\]]*\s+|\n\s*\n\s*)(['"‘“(\[]*)(\p{L})/gu, function (m, before, open, letter) {
      return before + open + letter.toUpperCase();
    });
    // "i" on its own is always "I" (also in i'm, i've, i'll, i'd).
    return out.replace(/(^|[^\p{L}\p{N}'’])i(?=$|[^\p{L}\p{N}]|['’](?:m|ve|ll|d|re)\b)/gu, "$1I");
  }

  function capitalized(text) {
    return unshout(text).replace(WORD, function (w) {
      return w.split("-").map(capital).join("-");
    });
  }

  function title(text) {
    return unshout(text).split("\n").map(function (line) {
      var words = [];
      line.replace(WORD, function (w, at) { words.push({ w: w, at: at }); return w; });
      var out = "";
      var last = 0;
      words.forEach(function (item, i) {
        var before = line.slice(last, item.at);
        var lower = item.w.toLowerCase();
        var afterColon = /[:—–]\s*$/.test(line.slice(0, item.at)) || /^\s*$/.test(line.slice(0, item.at));
        var small = SMALL.indexOf(lower) >= 0 && i !== 0 && i !== words.length - 1 && !afterColon && !/\p{Lu}/u.test(item.w.slice(1));
        out += before + (small ? lower : item.w.split("-").map(capital).join("-"));
        last = item.at + item.w.length;
      });
      return out + line.slice(last);
    }).join("\n");
  }

  // "Hello world, it's 2026" → ["hello", "world", "it's"→"its", "2026"]; also splits camelCase.
  function words(line) {
    return (line
      .replace(/['’]/g, "")
      .replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1 $2")
      .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
      .match(/[\p{L}\p{N}]+/gu) || []).map(function (w) { return w.toLowerCase(); });
  }

  function joined(text, join) {
    return text.split("\n").map(function (line) { return join(words(line)); }).join("\n");
  }

  var CASES = {
    upper: function (t) { return t.toUpperCase(); },
    lower: function (t) { return t.toLowerCase(); },
    sentence: sentence,
    title: title,
    capitalized: capitalized,
    camel: function (t) { return joined(t, function (w) { return w.map(function (x, i) { return i ? upperFirst(x) : x; }).join(""); }); },
    pascal: function (t) { return joined(t, function (w) { return w.map(upperFirst).join(""); }); },
    snake: function (t) { return joined(t, function (w) { return w.join("_"); }); },
    kebab: function (t) { return joined(t, function (w) { return w.join("-"); }); },
    constant: function (t) { return joined(t, function (w) { return w.join("_").toUpperCase(); }); }
  };

  function convert(text, kind) {
    return CASES[kind] ? CASES[kind](String(text)) : String(text);
  }

  function stats(text) {
    var t = String(text);
    return {
      characters: Array.from(t).length,
      words: (t.match(WORD) || []).length,
      lines: t === "" ? 0 : t.split("\n").length
    };
  }

  window.ToolNestCalc = { convert: convert, stats: stats, hasLetters: function (t) { return LETTER.test(t); } };

  var box = document.getElementById("cc-text");
  if (!box) return;

  var el = function (id) { return document.getElementById(id); };
  var undoText = null;

  function showStats() {
    var s = stats(box.value);
    el("cc-stats").textContent = s.characters.toLocaleString("en-US") + " characters · " +
      s.words.toLocaleString("en-US") + (s.words === 1 ? " word · " : " words · ") +
      s.lines.toLocaleString("en-US") + (s.lines === 1 ? " line" : " lines");
  }

  function say(text) {
    el("cc-status").textContent = text;
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-case]"), function (btn) {
    btn.addEventListener("click", function () {
      if (!box.value) {
        say("Type or paste some text first.");
        box.focus();
        return;
      }
      var before = box.value;
      var after = convert(before, btn.getAttribute("data-case"));
      if (after !== before) {
        undoText = before;
        el("cc-undo").disabled = false;
      }
      box.value = after;
      showStats();
      say("Changed to " + btn.textContent.trim() + ".");
    });
  });

  el("cc-undo").addEventListener("click", function () {
    if (undoText === null) return;
    box.value = undoText;
    undoText = null;
    this.disabled = true;
    showStats();
    say("Undone.");
  });

  el("cc-copy").addEventListener("click", function () {
    var btn = this;
    if (!navigator.clipboard || !box.value) return;
    navigator.clipboard.writeText(box.value).then(function () {
      btn.lastChild.textContent = " Copied";
      say("Copied to your clipboard.");
      setTimeout(function () { btn.lastChild.textContent = " Copy"; }, 1500);
    });
  });

  el("cc-clear").addEventListener("click", function () {
    if (box.value) {
      undoText = box.value;
      el("cc-undo").disabled = false;
    }
    box.value = "";
    showStats();
    say("Cleared.");
    box.focus();
  });

  box.addEventListener("input", showStats);
  showStats();
})();
