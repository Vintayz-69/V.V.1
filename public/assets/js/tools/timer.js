/* Online Timer and Stopwatch: a countdown with an alarm sound, and a stopwatch with laps. Time is
   measured from the clock (not by counting ticks), so it stays accurate. Nothing is saved. */
(function () {
  "use strict";

  function two(n) {
    return (n < 10 ? "0" : "") + n;
  }

  // Countdown display: whole seconds rounded up, so 4.2 s left shows 00:05. "H:MM:SS" from an hour.
  function formatTimer(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    return (h ? h + ":" + two(m) : two(m)) + ":" + two(s % 60);
  }

  // Stopwatch display with hundredths: "MM:SS.cc", or "H:MM:SS.cc" from an hour.
  function formatStopwatch(ms) {
    var cs = Math.floor(Math.max(0, ms) / 10);
    var s = Math.floor(cs / 100);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    return (h ? h + ":" + two(m) : two(m)) + ":" + two(s % 60) + "." + two(cs % 100);
  }

  function toMs(h, m, s) {
    return ((Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)) * 1000;
  }

  window.ToolNestCalc = { formatTimer: formatTimer, formatStopwatch: formatStopwatch, toMs: toMs };

  var root = document.getElementById("tm-tool");
  if (!root) return;

  var el = function (id) { return document.getElementById(id); };
  var now = function () { return performance.now(); };
  var baseTitle = document.title;
  var audio = null;

  function beep() {
    try {
      if (!audio) return;
      var t = audio.currentTime;
      for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
          var start = t + i * 1.2 + j * 0.22;
          var o = audio.createOscillator();
          var g = audio.createGain();
          o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
          o.connect(g).connect(audio.destination);
          o.start(start);
          o.stop(start + 0.18);
        }
      }
    } catch (e) { /* no sound available */ }
  }

  function unlockAudio() {
    var A = window.AudioContext || window.webkitAudioContext;
    if (!audio && A) audio = new A();
    if (audio && audio.state === "suspended") audio.resume();
  }

  // ---- Tabs
  Array.prototype.forEach.call(document.querySelectorAll("input[name=tm-mode]"), function (r) {
    r.addEventListener("change", function () {
      var timer = el("tm-mode-timer").checked;
      el("tm-timer").hidden = !timer;
      el("tm-watch").hidden = timer;
    });
  });

  // ---- Timer
  var tEnd = 0;       // when the countdown ends (performance.now), while running
  var tLeft = 0;      // ms left, while paused
  var tRunning = false;
  var tFrame = 0;
  var tDone = 0;

  function readInputs() {
    var h = Number(el("tm-h").value) || 0;
    var m = Number(el("tm-m").value) || 0;
    var s = Number(el("tm-s").value) || 0;
    return Math.min(toMs(h, m, s), toMs(99, 59, 59));
  }

  function showTimer(ms) {
    var text = formatTimer(ms);
    el("tm-display").textContent = text;
    document.title = tRunning ? "(" + text + ") " + baseTitle : baseTitle;
  }

  function tick() {
    var left = tEnd - now();
    if (left <= 0) {
      finish();
      return;
    }
    showTimer(left);
    tFrame = setTimeout(tick, Math.min(250, left % 1000 + 5));
  }

  function finish() {
    tRunning = false;
    tLeft = 0;
    showTimer(0);
    el("tm-display").classList.add("is-done");
    el("tm-msg").textContent = "Time's up!";
    document.title = "⏰ Time's up! " + baseTitle;
    el("tm-start").textContent = "Start";
    beep();
    tDone = setTimeout(function () { el("tm-display").classList.remove("is-done"); }, 6000);
  }

  el("tm-start").addEventListener("click", function () {
    unlockAudio();
    clearTimeout(tDone);
    el("tm-display").classList.remove("is-done");
    if (tRunning) { // pause
      tRunning = false;
      clearTimeout(tFrame);
      tLeft = tEnd - now();
      this.textContent = "Resume";
      el("tm-msg").textContent = "Paused.";
      showTimer(tLeft);
      return;
    }
    if (!tLeft) tLeft = readInputs();
    if (!tLeft) {
      el("tm-msg").textContent = "Set a time first.";
      return;
    }
    tRunning = true;
    tEnd = now() + tLeft;
    this.textContent = "Pause";
    el("tm-msg").textContent = "Running. Keep this tab open.";
    tick();
  });

  el("tm-reset").addEventListener("click", function () {
    tRunning = false;
    clearTimeout(tFrame);
    tLeft = 0;
    el("tm-start").textContent = "Start";
    el("tm-msg").textContent = "";
    el("tm-display").classList.remove("is-done");
    showTimer(readInputs());
  });

  el("tm-plus").addEventListener("click", function () {
    if (tRunning) tEnd += 60000;
    else if (tLeft) { tLeft += 60000; showTimer(tLeft); }
    else {
      el("tm-m").value = (Number(el("tm-m").value) || 0) + 1;
      showTimer(readInputs());
    }
    if (tRunning) showTimer(tEnd - now());
  });

  Array.prototype.forEach.call(root.querySelectorAll("[data-minutes]"), function (b) {
    b.addEventListener("click", function () {
      el("tm-h").value = 0;
      el("tm-m").value = b.getAttribute("data-minutes");
      el("tm-s").value = 0;
      el("tm-reset").click();
      el("tm-start").click();
    });
  });

  ["tm-h", "tm-m", "tm-s"].forEach(function (id) {
    el(id).addEventListener("input", function () {
      if (!tRunning) {
        tLeft = 0;
        el("tm-start").textContent = "Start";
        showTimer(readInputs());
      }
    });
  });

  // ---- Stopwatch
  var wStart = 0;   // performance.now() at start, minus time already counted
  var wRunning = false;
  var wElapsed = 0;
  var wFrame = 0;
  var laps = [];

  function wNow() {
    return wRunning ? now() - wStart : wElapsed;
  }

  function wDraw() {
    el("sw-display").textContent = formatStopwatch(wNow());
    if (wRunning) wFrame = requestAnimationFrame(wDraw);
  }

  el("sw-start").addEventListener("click", function () {
    if (wRunning) {
      wElapsed = now() - wStart;
      wRunning = false;
      cancelAnimationFrame(wFrame);
      this.textContent = "Resume";
      el("sw-lap").disabled = true;
      wDraw();
      return;
    }
    wStart = now() - wElapsed;
    wRunning = true;
    this.textContent = "Stop";
    el("sw-lap").disabled = false;
    wDraw();
  });

  el("sw-lap").addEventListener("click", function () {
    var total = wNow();
    var prev = laps.length ? laps[laps.length - 1] : 0;
    laps.push(total);
    var li = document.createElement("li");
    var a = document.createElement("span");
    a.textContent = "Lap " + laps.length;
    var b = document.createElement("span");
    b.textContent = formatStopwatch(total - prev);
    var c = document.createElement("span");
    c.textContent = formatStopwatch(total);
    li.appendChild(a); li.appendChild(b); li.appendChild(c);
    el("sw-laps").insertBefore(li, el("sw-laps").firstChild);
  });

  el("sw-reset").addEventListener("click", function () {
    wRunning = false;
    cancelAnimationFrame(wFrame);
    wElapsed = 0;
    laps = [];
    el("sw-laps").textContent = "";
    el("sw-start").textContent = "Start";
    el("sw-lap").disabled = true;
    wDraw();
  });

  // Space starts or pauses whichever is showing (when not typing in a box).
  document.addEventListener("keydown", function (e) {
    if (e.code !== "Space" || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)) return;
    e.preventDefault();
    (el("tm-mode-timer").checked ? el("tm-start") : el("sw-start")).click();
  });

  showTimer(readInputs());
  wDraw();
})();
