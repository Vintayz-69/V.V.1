/* Mental Math Test: answer as many sums as you can in 60 seconds. Nothing is stored. */
(function () {
  "use strict";

  var ROUND_SECONDS = 60;

  function pick(lo, hi, random) {
    return lo + Math.floor(random() * (hi - lo + 1));
  }

  // One question for a level. Answers are always whole numbers of 0 or more.
  //   easy:   + and − with numbers up to 20
  //   medium: + and − up to 100, × tables up to 10 × 10
  //   hard:   + and − up to 1,000, × up to 12 × 12, ÷ with whole answers up to 12
  function makeProblem(level, rng) {
    var random = rng || Math.random;
    var ops = level === "easy" ? ["+", "−"] : level === "medium" ? ["+", "−", "×"] : ["+", "−", "×", "÷"];
    var op = ops[Math.floor(random() * ops.length)];
    var max = level === "easy" ? 20 : level === "medium" ? 100 : 1000;
    var table = level === "hard" ? 12 : 10;
    var a, b, answer;
    if (op === "+") {
      a = pick(1, max, random);
      b = pick(1, max, random);
      answer = a + b;
    } else if (op === "−") {
      a = pick(1, max, random);
      b = pick(1, max, random);
      if (b > a) { var t = a; a = b; b = t; }
      answer = a - b;
    } else if (op === "×") {
      a = pick(2, table, random);
      b = pick(2, table, random);
      answer = a * b;
    } else {
      b = pick(2, 12, random);
      answer = pick(2, 12, random);
      a = b * answer;
    }
    return { a: a, b: b, op: op, answer: answer, text: a + " " + op + " " + b };
  }

  // Answers per minute, to one decimal place.
  function rate(correct, seconds) {
    return seconds > 0 ? Math.round((correct / (seconds / 60)) * 10) / 10 : 0;
  }

  window.ToolNestCalc = { makeProblem: makeProblem, rate: rate, ROUND_SECONDS: ROUND_SECONDS };

  // ---------------------------------------------------------------- Page

  var qEl = document.getElementById("mm-question");
  if (!qEl) return;

  var input = document.getElementById("mm-answer");
  var levelSelect = document.getElementById("mm-level");
  var startBtn = document.getElementById("mm-start");
  var skipBtn = document.getElementById("mm-skip");
  var statusEl = document.getElementById("mm-status");
  var correctEl = document.getElementById("mm-correct");
  var timeEl = document.getElementById("mm-time");
  var skippedEl = document.getElementById("mm-skipped");
  var rateEl = document.getElementById("mm-rate");
  var bestEl = document.getElementById("mm-best");

  var problem = null;
  var correct = 0;
  var skipped = 0;
  var endsAt = 0;
  var timer = 0;
  var running = false;
  var best = {}; // best score per level, this visit only

  function say(t) {
    statusEl.textContent = t;
  }

  function left() {
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  }

  function showStats() {
    correctEl.textContent = String(correct);
    skippedEl.textContent = String(skipped);
    var s = running ? left() : ROUND_SECONDS;
    timeEl.textContent = Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
  }

  function next() {
    problem = makeProblem(levelSelect.value);
    qEl.textContent = problem.text + " = ?";
    input.value = "";
  }

  function finish() {
    running = false;
    clearInterval(timer);
    input.disabled = true;
    skipBtn.disabled = true;
    startBtn.textContent = "Play again";
    qEl.textContent = correct + " correct";
    var key = levelSelect.value;
    if (!best[key] || correct > best[key]) best[key] = correct;
    bestEl.textContent = String(best[key]);
    rateEl.textContent = rate(correct, ROUND_SECONDS) + " per minute";
    timeEl.textContent = "0:00";
    say("Time's up! You answered " + correct + " correctly" + (skipped ? " and skipped " + skipped : "") + ". The last question was " + problem.text + " = " + problem.answer + ".");
    startBtn.focus();
  }

  function start() {
    correct = 0;
    skipped = 0;
    running = true;
    endsAt = Date.now() + ROUND_SECONDS * 1000;
    input.disabled = false;
    skipBtn.disabled = false;
    rateEl.textContent = "—";
    next();
    showStats();
    say("Type each answer. It's checked as soon as it's right, so there's no need to press Enter.");
    input.focus();
    clearInterval(timer);
    timer = setInterval(function () {
      if (left() <= 0) finish();
      else showStats();
    }, 200);
  }

  input.addEventListener("input", function () {
    if (!running) return;
    var typed = input.value.replace(/[^0-9]/g, "");
    if (typed !== input.value) input.value = typed;
    if (typed !== "" && Number(typed) === problem.answer) {
      correct++;
      showStats();
      next();
    }
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && running && input.value !== "") {
      e.preventDefault();
      say("Not quite. Fix your answer or press Skip.");
    }
  });

  skipBtn.addEventListener("click", function () {
    if (!running) return;
    skipped++;
    say(problem.text + " = " + problem.answer + ".");
    showStats();
    next();
    input.focus();
  });

  startBtn.addEventListener("click", start);
  levelSelect.addEventListener("change", function () {
    if (running) {
      clearInterval(timer);
      running = false;
    }
    input.disabled = true;
    skipBtn.disabled = true;
    startBtn.textContent = "Start";
    qEl.textContent = "Press Start";
    bestEl.textContent = best[levelSelect.value] ? String(best[levelSelect.value]) : "—";
    correct = 0;
    skipped = 0;
    showStats();
    say("");
  });

  input.disabled = true;
  skipBtn.disabled = true;
  showStats();
})();
