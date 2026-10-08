/* Shared helpers for the /games/ pages. Stores nothing on the visitor's device (LEGAL.md §2):
 * scores and best times live in memory only and are gone when the page is closed or reloaded. */
(function () {
  "use strict";

  // Small seeded random number generator (mulberry32), so the tests can repeat a game exactly.
  // Returns a function that gives numbers from 0 (included) to 1 (not included).
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fisher-Yates shuffle. Returns a new array; the original is left alone.
  function shuffle(list, rng) {
    var out = list.slice();
    var random = rng || Math.random;
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  // 75 seconds -> "1:15"; 3725 seconds -> "1:02:05".
  function formatTime(totalSeconds) {
    var s = Math.max(0, Math.floor(totalSeconds));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return h > 0 ? h + ":" + pad(m) + ":" + pad(sec) : m + ":" + pad(sec);
  }

  // A stopwatch that calls onTick(seconds) once a second while running.
  function stopwatch(onTick) {
    var started = 0;
    var timer = 0;
    var elapsed = 0;
    function tick() {
      elapsed = Math.floor((Date.now() - started) / 1000);
      onTick(elapsed);
    }
    return {
      start: function () {
        if (timer) return;
        started = Date.now() - elapsed * 1000;
        timer = setInterval(tick, 250);
      },
      stop: function () {
        if (timer) clearInterval(timer);
        timer = 0;
      },
      reset: function () {
        if (timer) clearInterval(timer);
        timer = 0;
        elapsed = 0;
        onTick(0);
      },
      seconds: function () { return elapsed; },
      running: function () { return timer !== 0; }
    };
  }

  // Plays a short colour animation (fx-win, fx-lose, fx-right, fx-wrong in style.css) by adding
  // a class, then takes it off again so the same animation can play next time.
  function flash(el, cls, ms) {
    if (!el || !el.classList) return;
    clearTimeout(el._fxTimer);
    el.classList.remove("fx-win", "fx-lose", "fx-right", "fx-wrong");
    void el.offsetWidth; // restart the animation if it is already playing
    el.classList.add(cls);
    el._fxTimer = setTimeout(function () { el.classList.remove(cls); }, ms || 1900);
  }

  window.ToolNestGames = {
    makeRng: makeRng,
    shuffle: shuffle,
    formatTime: formatTime,
    stopwatch: stopwatch,
    flash: flash
  };
})();
