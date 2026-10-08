/* Number Memory Test: remember a number, then type it. Each right answer adds a digit. Nothing is stored. */
(function () {
  "use strict";

  var START_DIGITS = 3;

  // How long the number stays on screen: 1 second plus 0.4 seconds per digit.
  function showTime(digits) {
    return 1000 + 400 * digits;
  }

  // A random number with this many digits. The first digit is never 0.
  function makeNumber(digits, rng) {
    var random = rng || Math.random;
    var s = String(1 + Math.floor(random() * 9));
    while (s.length < digits) s += String(Math.floor(random() * 10));
    return s;
  }

  // Spaces and other non-digits typed by the player are ignored.
  function isRight(target, typed) {
    return String(typed).replace(/\D/g, "") === target;
  }

  // Groups digits in threes to make long numbers easier to read back: "1234567" -> "1 234 567".
  function grouped(s) {
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  window.ToolNestCalc = { showTime: showTime, makeNumber: makeNumber, isRight: isRight, grouped: grouped, START_DIGITS: START_DIGITS };

  // ---------------------------------------------------------------- Page

  var stage = document.getElementById("nm-stage");
  if (!stage) return;

  var numberEl = document.getElementById("nm-number");
  var barEl = document.getElementById("nm-bar");
  var form = document.getElementById("nm-form");
  var input = document.getElementById("nm-answer");
  var startBtn = document.getElementById("nm-start");
  var statusEl = document.getElementById("nm-status");
  var levelEl = document.getElementById("nm-level");
  var scoreEl = document.getElementById("nm-score");
  var bestEl = document.getElementById("nm-best");

  var digits = START_DIGITS;
  var target = "";
  var hideTimer = 0;
  var best = 0; // this visit only

  function say(t) {
    statusEl.textContent = t;
  }

  // Colour animation from games-common.js (does nothing if it isn't loaded).
  function fx(el, cls, ms) {
    if (window.ToolNestGames && window.ToolNestGames.flash) window.ToolNestGames.flash(el, cls, ms);
  }

  function show() {
    target = makeNumber(digits);
    levelEl.textContent = digits + " digits";
    form.hidden = true;
    startBtn.hidden = true;
    numberEl.textContent = grouped(target);
    numberEl.hidden = false;
    var ms = showTime(digits);
    barEl.hidden = false;
    barEl.style.setProperty("--nm-time", ms + "ms");
    barEl.classList.remove("run");
    void barEl.offsetWidth; // restart the shrinking bar
    barEl.classList.add("run");
    say("Remember this " + digits + "-digit number.");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(ask, ms);
  }

  function ask() {
    numberEl.hidden = true;
    barEl.hidden = true;
    form.hidden = false;
    input.value = "";
    input.focus();
    say("What was the number? Type it and press Enter.");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (input.value.trim() === "") return;
    if (isRight(target, input.value)) {
      scoreEl.textContent = digits + " digits";
      if (digits > best) {
        best = digits;
        bestEl.textContent = best + " digits";
      }
      digits++;
      say("Right! Next: " + digits + " digits.");
      fx(stage, "fx-right", 700);
      setTimeout(show, 700);
      form.hidden = true;
    } else {
      form.hidden = true;
      numberEl.hidden = false;
      numberEl.textContent = grouped(target);
      var typed = input.value.replace(/\D/g, "");
      say("Not quite. The number was " + grouped(target) + " and you typed " + (typed ? grouped(typed) : "nothing") +
        ". You remembered " + (digits - 1 >= START_DIGITS ? (digits - 1) + " digits" : "fewer than " + START_DIGITS + " digits") + ".");
      fx(stage, "fx-lose");
      digits = START_DIGITS;
      startBtn.hidden = false;
      startBtn.textContent = "Try again";
      startBtn.focus();
    }
  });

  startBtn.addEventListener("click", function () {
    digits = START_DIGITS;
    scoreEl.textContent = "—";
    show();
  });
})();
