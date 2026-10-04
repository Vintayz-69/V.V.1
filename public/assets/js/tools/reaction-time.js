/* Reaction Time Test. Times are measured in the browser and forgotten when the page closes. */
(function () {
  "use strict";

  var ROUNDS = 5;
  var MIN_WAIT = 1500; // ms before the pad turns green, chosen at random between these two
  var MAX_WAIT = 4500;

  // Random wait so the green can't be guessed.
  function randomWait(rng) {
    var random = rng || Math.random;
    return Math.round(MIN_WAIT + random() * (MAX_WAIT - MIN_WAIT));
  }

  // Average, best and slowest of a list of times in milliseconds (whole numbers).
  function summary(times) {
    if (!times.length) return { count: 0, average: 0, best: 0, slowest: 0 };
    var total = times.reduce(function (s, t) { return s + t; }, 0);
    return {
      count: times.length,
      average: Math.round(total / times.length),
      best: Math.min.apply(null, times),
      slowest: Math.max.apply(null, times)
    };
  }

  window.ToolNestCalc = { randomWait: randomWait, summary: summary, ROUNDS: ROUNDS, MIN_WAIT: MIN_WAIT, MAX_WAIT: MAX_WAIT };

  // ---------------------------------------------------------------- Page

  var pad = document.getElementById("reaction-pad");
  if (!pad) return;

  var titleEl = document.getElementById("reaction-title");
  var subEl = document.getElementById("reaction-sub");
  var avgEl = document.getElementById("reaction-average");
  var bestEl = document.getElementById("reaction-best");
  var slowEl = document.getElementById("reaction-slowest");
  var roundEl = document.getElementById("reaction-round");
  var listEl = document.getElementById("reaction-list");
  var sessionEl = document.getElementById("reaction-session-best");

  var state = "idle"; // idle, waiting, go, early, result, done
  var times = [];
  var waitTimer = 0;
  var goAt = 0;
  var sessionBest = 0; // best average this visit only

  function show(cls, title, sub) {
    pad.className = "reaction-pad is-" + cls;
    titleEl.textContent = title;
    subEl.textContent = sub;
  }

  function renderStats() {
    var s = summary(times);
    avgEl.textContent = s.count ? s.average + " ms" : "—";
    bestEl.textContent = s.count ? s.best + " ms" : "—";
    slowEl.textContent = s.count ? s.slowest + " ms" : "—";
    roundEl.textContent = Math.min(times.length, ROUNDS) + " / " + ROUNDS;
    listEl.textContent = "";
    times.forEach(function (t, i) {
      var li = document.createElement("li");
      var a = document.createElement("span");
      var b = document.createElement("span");
      a.textContent = "Try " + (i + 1);
      b.textContent = t + " ms";
      li.appendChild(a);
      li.appendChild(b);
      listEl.appendChild(li);
    });
  }

  function startWaiting() {
    state = "waiting";
    show("waiting", "Wait for green…", "Tap as soon as the colour changes.");
    waitTimer = setTimeout(function () {
      state = "go";
      show("go", "Tap now!", "");
      goAt = performance.now();
    }, randomWait());
  }

  function press() {
    if (state === "idle" || state === "result" || state === "early") {
      startWaiting();
    } else if (state === "waiting") {
      clearTimeout(waitTimer);
      state = "early";
      show("early", "Too soon!", "Wait for green. Tap to try this round again.");
    } else if (state === "go") {
      var t = Math.round(performance.now() - goAt);
      times.push(t);
      renderStats();
      if (times.length >= ROUNDS) {
        var s = summary(times);
        if (!sessionBest || s.average < sessionBest) sessionBest = s.average;
        sessionEl.textContent = sessionBest + " ms";
        state = "done";
        show("done", s.average + " ms average", "Best " + s.best + " ms. Tap to start a new set of " + ROUNDS + ".");
      } else {
        state = "result";
        show("result", t + " ms", "Tap for try " + (times.length + 1) + " of " + ROUNDS + ".");
      }
    } else if (state === "done") {
      times = [];
      renderStats();
      startWaiting();
    }
  }

  // pointerdown reacts faster than click. Keyboard users press Space or Enter on the pad.
  pad.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    press();
  });
  pad.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      press();
    }
  });
  pad.addEventListener("click", function (e) { e.preventDefault(); });

  document.getElementById("reaction-reset").addEventListener("click", function () {
    clearTimeout(waitTimer);
    times = [];
    state = "idle";
    show("idle", "Tap to start", "Click, tap, or press Space when the box turns green.");
    renderStats();
  });

  renderStats();
})();
