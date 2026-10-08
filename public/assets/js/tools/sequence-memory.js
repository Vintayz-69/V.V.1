/* Sequence Memory Test: watch squares light up, then tap them in the same order. Each round adds one.
 * Our own code; nothing is stored. */
(function () {
  "use strict";

  var G = window.ToolNestGames;
  var PADS = 9; // a 3 × 3 grid

  // Adds one random square to the sequence (it may repeat one already in it).
  function extend(seq, rng) {
    var random = rng || Math.random;
    return seq.concat([Math.floor(random() * PADS)]);
  }

  // Checks the taps so far against the sequence: "wrong", "more" (right so far) or "done" (all right).
  function check(seq, taps) {
    for (var i = 0; i < taps.length; i++) if (taps[i] !== seq[i]) return "wrong";
    return taps.length === seq.length ? "done" : "more";
  }

  // Each square lights for 0.5 seconds with a 0.25-second pause, so a sequence of n takes n × 0.75 seconds.
  var LIT_MS = 500, GAP_MS = 250;
  function playTime(length) {
    return length * (LIT_MS + GAP_MS);
  }

  window.ToolNestCalc = { extend: extend, check: check, playTime: playTime, PADS: PADS, LIT_MS: LIT_MS, GAP_MS: GAP_MS };

  // ---------------------------------------------------------------- Page

  var gridEl = document.getElementById("sq-grid");
  if (!gridEl) return;

  var startBtn = document.getElementById("sq-start");
  var statusEl = document.getElementById("sq-status");
  var levelEl = document.getElementById("sq-level");
  var scoreEl = document.getElementById("sq-score");
  var bestEl = document.getElementById("sq-best");

  var pads = [];
  var seq = [];
  var taps = [];
  var accepting = false;
  var timers = [];
  var best = 0; // this visit only

  for (var i = 0; i < PADS; i++) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "sq-pad";
    b.setAttribute("data-i", i);
    b.setAttribute("aria-label", "Square " + (i + 1));
    b.disabled = true;
    gridEl.appendChild(b);
    pads.push(b);
  }

  function say(t) {
    statusEl.textContent = t;
  }

  function light(i, ms) {
    pads[i].classList.add("is-lit");
    timers.push(setTimeout(function () { pads[i].classList.remove("is-lit"); }, ms));
  }

  function setPads(on) {
    accepting = on;
    pads.forEach(function (p) { p.disabled = !on; });
  }

  function showSequence() {
    setPads(false);
    taps = [];
    levelEl.textContent = String(seq.length);
    say("Watch: " + seq.length + " square" + (seq.length > 1 ? "s" : "") + ".");
    seq.forEach(function (p, k) {
      timers.push(setTimeout(function () { light(p, LIT_MS); }, 600 + k * (LIT_MS + GAP_MS)));
    });
    timers.push(setTimeout(function () {
      setPads(true);
      say("Your turn: tap the " + seq.length + " square" + (seq.length > 1 ? "s" : "") + " in the same order.");
      pads[0].focus();
    }, 600 + playTime(seq.length)));
  }

  function stopTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    pads.forEach(function (p) { p.classList.remove("is-lit"); });
  }

  gridEl.addEventListener("click", function (e) {
    var pad = e.target.closest(".sq-pad");
    if (!pad || !accepting) return;
    var i = Number(pad.getAttribute("data-i"));
    light(i, 200);
    taps.push(i);
    var result = check(seq, taps);
    if (result === "wrong") {
      setPads(false);
      var reached = seq.length - 1;
      scoreEl.textContent = String(reached);
      say("Not quite. You remembered " + reached + " in a row. Press Start to try again.");
      if (G.flash) G.flash(gridEl, "fx-lose");
      pads[seq[taps.length - 1]].classList.add("is-answer");
      timers.push(setTimeout(function () { pads.forEach(function (p) { p.classList.remove("is-answer"); }); }, 1500));
      startBtn.hidden = false;
      startBtn.textContent = "Try again";
      startBtn.focus();
    } else if (result === "done") {
      setPads(false);
      scoreEl.textContent = String(seq.length);
      if (seq.length > best) {
        best = seq.length;
        bestEl.textContent = String(best);
      }
      say("Right! Next round: " + (seq.length + 1) + ".");
      if (G.flash) G.flash(gridEl, "fx-right", 700);
      seq = extend(seq);
      timers.push(setTimeout(showSequence, 700));
    }
  });

  startBtn.addEventListener("click", function () {
    stopTimers();
    seq = extend([]);
    scoreEl.textContent = "0";
    startBtn.hidden = true;
    showSequence();
  });
})();
