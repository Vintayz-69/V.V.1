/* Typing Speed Test. The practice passages are our own writing. What you type is never sent
 * anywhere or stored: it is compared with the passage in your browser and forgotten. */
(function () {
  "use strict";

  var G = window.ToolNestGames;

  var PASSAGES = [
    "A good invoice is short and clear. It shows who did the work, what was done, when it was done and how much is owed. It also says when payment is due and how the client can pay.",
    "Most projects take longer than planned. Small changes add up, feedback arrives late and files go missing. Adding a little extra time to every quote helps you keep your promises without working late every night.",
    "Before a call with a new client, write down three questions you want answered. Ask about the budget, the deadline and who makes the final decision. Clear answers now save long emails later.",
    "Typing well is less about speed and more about rhythm. Keep your eyes on the screen, let your fingers rest on the home row and type at a pace you can hold without making mistakes.",
    "Back up your work every day. Keep one copy on your computer, one on a separate drive and one somewhere else. A lost laptop is annoying, but lost files can cost you a client.",
    "When an email makes you angry, wait an hour before you reply. Read it again, pick out the real question and answer it calmly. Most problems look smaller after a short walk and a cup of tea.",
    "Set a regular time each week to look at your money. Check which invoices are paid, which are late and what bills are coming up. Ten quiet minutes can stop a stressful surprise at the end of the month.",
    "A tidy desk will not do the work for you, but it does make starting easier. Clear away the things you do not need today, open only the files you will use and close the tabs you keep meaning to read.",
    "Good feedback is specific. Instead of saying that a design feels wrong, say which part feels wrong and why. Point to the heading, the colour or the spacing, and suggest one thing to try next.",
    "Take short breaks during long days. Stand up, stretch your back, look out of the window and rest your eyes. Many people find they come back sharper and make fewer small mistakes afterwards.",
    "Write down how long each task really takes. After a few weeks you will see patterns, such as which jobs always run over and which clients need more meetings. Use what you learn when you price the next project.",
    "Saying no is part of running a business. If a job does not fit your skills, your schedule or your rates, a polite refusal is better than a rushed piece of work that nobody is happy with."
  ];

  // Compares what was typed with the passage, one character at a time.
  // WPM counts every 5 correct characters (spaces included) as one word, the usual rule.
  //   WPM      = (correct characters / 5) / minutes
  //   Raw WPM  = (all typed characters / 5) / minutes
  //   Accuracy = correct characters / typed characters x 100
  function score(target, typed, seconds) {
    var length = Math.min(typed.length, target.length);
    var correct = 0;
    for (var i = 0; i < length; i++) if (typed.charAt(i) === target.charAt(i)) correct++;
    var errors = length - correct;
    var minutes = seconds / 60;
    var wpm = minutes > 0 ? (correct / 5) / minutes : 0;
    var raw = minutes > 0 ? (length / 5) / minutes : 0;
    var accuracy = length ? (correct / length) * 100 : 100;
    return {
      typed: length,
      correct: correct,
      errors: errors,
      wpm: Math.round(wpm),
      rawWpm: Math.round(raw),
      accuracy: Math.round(accuracy * 10) / 10
    };
  }

  function buildText(rng) {
    return G.shuffle(PASSAGES, rng).join(" ");
  }

  window.ToolNestCalc = { score: score, buildText: buildText, PASSAGES: PASSAGES };

  // ---------------------------------------------------------------- Page

  var passageEl = document.getElementById("typing-passage");
  if (!passageEl) return;

  var input = document.getElementById("typing-input");
  var lengthSelect = document.getElementById("typing-length");
  var timeEl = document.getElementById("typing-time");
  var wpmEl = document.getElementById("typing-wpm");
  var accEl = document.getElementById("typing-accuracy");
  var rawEl = document.getElementById("typing-raw");
  var errEl = document.getElementById("typing-errors");
  var bestEl = document.getElementById("typing-best");
  var statusEl = document.getElementById("typing-status");

  var text = "";
  var spans = [];
  var shown = 0; // how many characters are coloured
  var started = 0;
  var timer = 0;
  var limit = 60;
  var done = false;
  var best = 0; // this visit only

  function elapsed() {
    return started ? Math.min(limit, (Date.now() - started) / 1000) : 0;
  }

  function update() {
    var r = score(text, input.value, elapsed());
    wpmEl.textContent = String(r.wpm);
    accEl.textContent = r.accuracy + "%";
    rawEl.textContent = String(r.rawWpm);
    errEl.textContent = String(r.errors);
    timeEl.textContent = G.formatTime(Math.ceil(limit - elapsed()));
    return r;
  }

  function paint() {
    var typed = input.value;
    var upto = Math.max(shown, typed.length) + 1;
    for (var i = 0; i < Math.min(upto, spans.length); i++) {
      var cls = "";
      if (i < typed.length) cls = typed.charAt(i) === text.charAt(i) ? "ok" : "bad";
      else if (i === typed.length) cls = "cur";
      spans[i].className = cls;
    }
    shown = typed.length;
    // Keep the current line in view inside the passage box.
    var cur = spans[Math.min(typed.length, spans.length - 1)];
    if (cur) {
      var top = cur.offsetTop - passageEl.clientHeight / 3;
      passageEl.scrollTop = Math.max(0, top);
    }
  }

  function finish(reason) {
    if (done) return;
    done = true;
    clearInterval(timer);
    timer = 0;
    input.readOnly = true;
    var r = update();
    if (r.wpm > best) best = r.wpm;
    bestEl.textContent = best + " WPM";
    G.flash(passageEl, "fx-win");
    say(reason + " You typed " + r.wpm + " words per minute with " + r.accuracy + "% accuracy. Press Restart to try again.");
  }

  function say(t) {
    statusEl.textContent = t;
  }

  function reset() {
    clearInterval(timer);
    timer = 0;
    started = 0;
    done = false;
    limit = Number(lengthSelect.value) || 60;
    text = buildText();
    passageEl.textContent = "";
    spans = [];
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement("span");
      s.textContent = text.charAt(i);
      passageEl.appendChild(s);
      spans.push(s);
    }
    spans[0].className = "cur";
    shown = 0;
    passageEl.scrollTop = 0;
    input.value = "";
    input.readOnly = false;
    input.maxLength = text.length;
    update();
    say("The timer starts when you type the first letter.");
  }

  input.addEventListener("input", function () {
    if (done) return;
    if (!started && input.value.length) {
      started = Date.now();
      timer = setInterval(function () {
        update();
        if (elapsed() >= limit) finish("Time's up!");
      }, 200);
      say("");
    }
    paint();
    update();
    if (input.value.length >= text.length) finish("You finished the whole passage!");
  });

  // Pasting would not measure typing.
  input.addEventListener("paste", function (e) { e.preventDefault(); });
  input.addEventListener("drop", function (e) { e.preventDefault(); });
  passageEl.addEventListener("click", function () { input.focus(); });

  document.getElementById("typing-restart").addEventListener("click", function () {
    reset();
    input.focus();
  });
  lengthSelect.addEventListener("change", reset);

  reset();
})();
