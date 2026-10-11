/* Random Number Generator and List Picker: fair random numbers in a range, and random picks from a
   list (names, prizes, tasks), using the browser's secure random numbers. Nothing is saved. */
(function () {
  "use strict";

  function cryptoObj() {
    return (typeof window !== "undefined" && window.crypto) || (typeof crypto !== "undefined" ? crypto : null);
  }

  // A random whole number from 0 to n − 1 (n up to 2^32), every value equally likely.
  function randomBelow(n, rng) {
    var c = rng || cryptoObj();
    var limit = Math.floor(4294967296 / n) * n;
    var buf = new Uint32Array(1);
    do { c.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % n;
  }

  /*
   * count whole numbers from min to max (both included). unique: no number twice.
   * Returns { numbers } or { error }.
   */
  function numbers(o, rng) {
    var min = Math.ceil(o.min);
    var max = Math.floor(o.max);
    var count = Math.floor(o.count);
    if (!isFinite(min) || !isFinite(max) || min > max) return { error: "The smallest number must be no bigger than the largest." };
    var span = max - min + 1;
    if (span > 4294967296) return { error: "The range is too big. Keep it within about 4 billion numbers." };
    if (!(count >= 1) || count > 10000) return { error: "Choose from 1 to 10,000 numbers." };
    if (o.unique && count > span) return { error: "There are only " + span.toLocaleString("en-US") + " numbers in that range, so you can't pick " + count.toLocaleString("en-US") + " without repeats." };
    var out = [];
    if (o.unique && count > span / 2) {
      // Many of the range: shuffle the whole range and take the first `count`.
      var all = [];
      for (var i = 0; i < span; i++) all.push(min + i);
      for (var j = all.length - 1; j > 0; j--) {
        var k = randomBelow(j + 1, rng);
        var t = all[j]; all[j] = all[k]; all[k] = t;
      }
      out = all.slice(0, count);
    } else {
      var seen = {};
      while (out.length < count) {
        var n = min + randomBelow(span, rng);
        if (o.unique) {
          if (seen[n]) continue;
          seen[n] = true;
        }
        out.push(n);
      }
    }
    if (o.sort) out.sort(function (a, b) { return a - b; });
    return { numbers: out };
  }

  // Random picks from a list (one item per line, blank lines ignored), each item at most once.
  function pick(text, count, rng) {
    var items = String(text).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!items.length) return { error: "Type at least one item, one per line." };
    if (!(count >= 1)) return { error: "Choose at least 1." };
    if (count > items.length) return { error: "There are only " + items.length + " items in your list." };
    var pool = items.slice();
    var out = [];
    for (var i = 0; i < count; i++) out.push(pool.splice(randomBelow(pool.length, rng), 1)[0]);
    return { picks: out, total: items.length };
  }

  window.ToolNestCalc = { numbers: numbers, pick: pick, randomBelow: randomBelow };

  var root = document.getElementById("rn-tool");
  if (!root) return;

  var el = function (id) { return document.getElementById(id); };
  var T = window.ToolNest;

  function mode() {
    return el("rn-mode-num").checked ? "num" : "list";
  }

  function showMode() {
    var num = mode() === "num";
    el("rn-num-fields").hidden = !num;
    el("rn-list-fields").hidden = num;
    el("rn-out").textContent = "—";
    el("rn-out-list").textContent = "";
    el("rn-msg").textContent = "";
  }

  function go() {
    var main = el("rn-out");
    var list = el("rn-out-list");
    var msg = el("rn-msg");
    list.textContent = "";
    var r;
    if (mode() === "num") {
      r = numbers({
        min: T.readNumber(el("rn-min")), max: T.readNumber(el("rn-max")), count: T.readNumber(el("rn-count")),
        unique: el("rn-unique").checked, sort: el("rn-sort").checked
      });
      if (r.error) { main.textContent = "—"; msg.textContent = r.error; return; }
      msg.textContent = r.numbers.length > 1 ? r.numbers.length + " numbers" : "";
      main.textContent = r.numbers.length === 1 ? r.numbers[0].toLocaleString("en-US") : "";
      if (r.numbers.length > 1) {
        list.textContent = r.numbers.join(", ");
      }
    } else {
      r = pick(el("rn-list").value, T.readNumber(el("rn-picks")));
      if (r.error) { main.textContent = "—"; msg.textContent = r.error; return; }
      main.textContent = r.picks.length === 1 ? r.picks[0] : "";
      if (r.picks.length > 1) {
        var ol = document.createElement("ol");
        r.picks.forEach(function (p) {
          var li = document.createElement("li");
          li.textContent = p;
          ol.appendChild(li);
        });
        list.appendChild(ol);
      }
      msg.textContent = "Picked " + r.picks.length + " of " + r.total + " at " + new Date().toLocaleTimeString() + ".";
    }
    main.classList.remove("rn-pop");
    void main.offsetWidth;
    main.classList.add("rn-pop");
  }

  Array.prototype.forEach.call(root.querySelectorAll("input[name=rn-mode]"), function (r) { r.addEventListener("change", showMode); });
  el("rn-form").addEventListener("submit", function (e) { e.preventDefault(); go(); });
  el("rn-copy").addEventListener("click", function () {
    var btn = this;
    var text = (el("rn-out").textContent + " " + el("rn-out-list").innerText).trim();
    if (!navigator.clipboard || !text || text === "—") return;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = "Copy"; }, 1500);
    });
  });
  showMode();
})();
