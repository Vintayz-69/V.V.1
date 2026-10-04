/* Percentage Calculator: four everyday percentage questions, each with its own small form.
   Runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  function round(n) { return Math.round(n * 10000) / 10000; }

  // mode: "of" (a% of b), "what" (a is what % of b), "change" (from a to b), "adjust" (b changed by a%)
  function calculate(v) {
    var a = Number(v.a);
    var b = Number(v.b);
    switch (v.mode) {
      case "of": return { result: round(a / 100 * b) };
      case "what": return { result: b === 0 ? null : round(a / b * 100) };
      case "change": return { result: a === 0 ? null : round((b - a) / Math.abs(a) * 100), difference: round(b - a) };
      case "adjust": return { up: round(b * (1 + a / 100)), down: round(b * (1 - a / 100)), amount: round(b * a / 100) };
    }
    return {};
  }

  window.ToolNestCalc = calculate;

  var root = document.getElementById("pct-tool");
  if (!root) return;

  function num(n) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
  }

  var SAYINGS = {
    of: function (a, b, r) { return num(a) + "% of " + num(b) + " is " + num(r.result); },
    what: function (a, b, r) { return r.result === null ? "Enter a number other than 0 for the second box." : num(a) + " is " + num(r.result) + "% of " + num(b); },
    change: function (a, b, r) {
      if (r.result === null) return "A change from 0 can't be shown as a percentage.";
      var word = r.result > 0 ? "an increase" : r.result < 0 ? "a decrease" : "no change";
      return "From " + num(a) + " to " + num(b) + " is " + word + (r.result ? " of " + num(Math.abs(r.result)) + "%" : "");
    },
    adjust: function (a, b, r) { return num(b) + " plus " + num(a) + "% is " + num(r.up) + ", and minus " + num(a) + "% is " + num(r.down); }
  };

  function headline(mode, r) {
    if (mode === "change") return r.result === null ? "—" : (r.result > 0 ? "+" : "") + num(r.result) + "%";
    if (mode === "what") return r.result === null ? "—" : num(r.result) + "%";
    if (mode === "adjust") return num(r.up) + " / " + num(r.down);
    return num(r.result);
  }

  root.querySelectorAll("[data-pct]").forEach(function (form) {
    var mode = form.getAttribute("data-pct");
    var aIn = form.querySelector("[data-a]");
    var bIn = form.querySelector("[data-b]");
    var out = form.querySelector("[data-out]");
    var say = form.querySelector("[data-say]");

    function update() {
      var a = T.readNumber(aIn);
      var b = T.readNumber(bIn);
      var aOk = isFinite(a);
      var bOk = isFinite(b);
      aIn.setAttribute("aria-invalid", aOk || aIn.value.trim() === "" ? "false" : "true");
      bIn.setAttribute("aria-invalid", bOk || bIn.value.trim() === "" ? "false" : "true");
      if (!aOk || !bOk) {
        out.textContent = "—";
        say.textContent = "Enter a number in both boxes.";
        return;
      }
      var r = calculate({ mode: mode, a: a, b: b });
      out.textContent = headline(mode, r);
      say.textContent = SAYINGS[mode](a, b, r);
    }

    form.addEventListener("input", update);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    update();
  });
})();
