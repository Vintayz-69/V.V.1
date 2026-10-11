/* Password Generator: random passwords made with the browser's secure random numbers
   (crypto.getRandomValues). Nothing is sent or saved. */
(function () {
  "use strict";

  var SETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!#$%&*+-=?@^_~.,:;()[]{}<>/|"
  };
  var LOOKALIKE = /[Il1O0o|]/g; // characters easy to mix up when reading a password aloud or copying it by hand

  function cryptoObj() {
    return (typeof window !== "undefined" && window.crypto) || (typeof crypto !== "undefined" ? crypto : null);
  }

  // A random whole number from 0 to n − 1, with every value equally likely.
  function randomBelow(n, rng) {
    var c = rng || cryptoObj();
    var limit = Math.floor(4294967296 / n) * n; // throw away the top few values so none is favoured
    var buf = new Uint32Array(1);
    do { c.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % n;
  }

  // opts: { lower, upper, digits, symbols, noLookalike } → array of character groups in use
  function groups(opts) {
    return ["lower", "upper", "digits", "symbols"].filter(function (k) { return opts[k]; }).map(function (k) {
      var chars = SETS[k];
      if (opts.noLookalike) chars = chars.replace(LOOKALIKE, "");
      return chars;
    });
  }

  /*
   * One password of opts.length characters, with at least one character from every group chosen
   * (when the length allows), in a random order.
   */
  function generate(opts, rng) {
    var g = groups(opts);
    if (!g.length) return "";
    var pool = g.join("");
    var chars = [];
    if (opts.length >= g.length) g.forEach(function (set) { chars.push(set[randomBelow(set.length, rng)]); });
    while (chars.length < opts.length) chars.push(pool[randomBelow(pool.length, rng)]);
    for (var i = chars.length - 1; i > 0; i--) { // Fisher–Yates shuffle
      var j = randomBelow(i + 1, rng);
      var t = chars[i]; chars[i] = chars[j]; chars[j] = t;
    }
    return chars.join("");
  }

  // Strength in bits: length × log2(number of possible characters). A rough guide.
  function entropyBits(opts) {
    var size = groups(opts).join("").length;
    return size ? Math.round(opts.length * Math.log2(size) * 10) / 10 : 0;
  }

  function strengthLabel(bits) {
    if (bits < 40) return "Weak";
    if (bits < 60) return "Fair";
    if (bits < 80) return "Strong";
    return "Very strong";
  }

  window.ToolNestCalc = { generate: generate, entropyBits: entropyBits, strengthLabel: strengthLabel, groups: groups, randomBelow: randomBelow, SETS: SETS };

  var form = document.getElementById("pw-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var lengthIn = el("pw-length");
  var lengthNum = el("pw-length-num");
  var list = el("pw-list");

  function opts() {
    return {
      length: Number(lengthIn.value),
      lower: el("pw-lower").checked,
      upper: el("pw-upper").checked,
      digits: el("pw-digits").checked,
      symbols: el("pw-symbols").checked,
      noLookalike: el("pw-lookalike").checked
    };
  }

  function copy(text, btn) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = "Copied";
      el("pw-status").textContent = "Copied to your clipboard.";
      setTimeout(function () { btn.textContent = "Copy"; }, 1500);
    });
  }

  function make() {
    var o = opts();
    lengthNum.value = o.length;
    list.textContent = "";
    var ok = o.lower || o.upper || o.digits || o.symbols;
    el("pw-none").hidden = ok;
    el("pw-again").disabled = !ok;
    if (!ok) {
      el("pw-bits").textContent = "—";
      el("pw-strength").textContent = "—";
      return;
    }
    var count = Number(el("pw-count").value);
    for (var i = 0; i < count; i++) {
      var pw = generate(o);
      var li = document.createElement("li");
      var code = document.createElement("code");
      code.className = "pw-text";
      code.textContent = pw;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm ts-copy";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy password " + (i + 1));
      btn.addEventListener("click", copy.bind(null, pw, btn));
      li.appendChild(code);
      li.appendChild(btn);
      list.appendChild(li);
    }
    var bits = entropyBits(o);
    el("pw-bits").textContent = bits + " bits";
    el("pw-strength").textContent = strengthLabel(bits);
    el("pw-meter").value = Math.min(bits, 128);
  }

  lengthIn.addEventListener("input", make);
  lengthNum.addEventListener("change", function () {
    var n = Math.round(Number(lengthNum.value));
    lengthIn.value = isFinite(n) ? Math.min(128, Math.max(4, n)) : 20;
    make();
  });
  form.addEventListener("change", function (e) { if (e.target !== lengthNum) make(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("pw-again").addEventListener("click", make);
  make();
})();
