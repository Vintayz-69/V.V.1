/* Memory Match: turn over two cards at a time and find the pairs. Nothing is stored. */
(function () {
  "use strict";

  var G = window.ToolNestGames;
  var SIZES = { 8: "4 × 4", 12: "4 × 6" };

  // A shuffled deck holding each picture number twice: deal(2) might give [1, 0, 1, 0].
  function deal(pairs, rng) {
    var deck = [];
    for (var i = 0; i < pairs; i++) deck.push(i, i);
    return G.shuffle(deck, rng);
  }

  // Score out of 100: a perfect game (one move per pair) scores 100, and every extra move costs points.
  function rating(pairs, moves) {
    if (moves <= pairs) return 100;
    return Math.max(0, Math.round((pairs / moves) * 100));
  }

  window.ToolNestCalc = { deal: deal, rating: rating, SIZES: SIZES };

  // ---------------------------------------------------------------- Page

  var boardEl = document.getElementById("memory-board");
  if (!boardEl) return;

  var pictures = Array.prototype.slice.call(document.querySelectorAll("#memory-pictures [data-name]"));
  var sizeSelect = document.getElementById("memory-size");
  var movesEl = document.getElementById("memory-moves");
  var pairsEl = document.getElementById("memory-pairs");
  var timeEl = document.getElementById("memory-time");
  var scoreEl = document.getElementById("memory-score");
  var bestEl = document.getElementById("memory-best");
  var statusEl = document.getElementById("memory-status");

  var deck = [];
  var cards = [];
  var open = []; // indexes of face-up, unmatched cards (at most 2)
  var matched = [];
  var moves = 0;
  var found = 0;
  var pairs = 8;
  var busy = false;
  var best = {}; // best score per size, this visit only
  var clock = G.stopwatch(function (s) { timeEl.textContent = G.formatTime(s); });

  function say(t) {
    statusEl.textContent = t;
  }

  function label(i) {
    var face = matched[i] || open.indexOf(i) !== -1;
    return "Card " + (i + 1) + ", " + (face ? pictures[deck[i]].getAttribute("data-name") + (matched[i] ? ", matched" : "") : "face down");
  }

  function renderCard(i) {
    var el = cards[i];
    var face = matched[i] || open.indexOf(i) !== -1;
    el.classList.toggle("is-up", face);
    el.classList.toggle("is-matched", !!matched[i]);
    el.setAttribute("aria-label", label(i));
  }

  function renderStats() {
    movesEl.textContent = String(moves);
    pairsEl.textContent = found + " / " + pairs;
  }

  function newGame() {
    pairs = Number(sizeSelect.value) === 12 ? 12 : 8;
    deck = deal(pairs);
    open = [];
    matched = deck.map(function () { return false; });
    moves = 0;
    found = 0;
    busy = false;
    clock.reset();
    scoreEl.textContent = "—";
    bestEl.textContent = best[pairs] ? best[pairs] + " / 100" : "—";
    boardEl.className = "memory-board memory-" + pairs;
    boardEl.textContent = "";
    cards = deck.map(function (pic, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "memory-card";
      var back = document.createElement("span");
      back.className = "memory-back";
      back.setAttribute("aria-hidden", "true");
      var front = document.createElement("span");
      front.className = "memory-front";
      front.setAttribute("aria-hidden", "true");
      front.appendChild(pictures[pic].firstElementChild.cloneNode(true));
      b.appendChild(back);
      b.appendChild(front);
      b.addEventListener("click", function () { flip(i); });
      boardEl.appendChild(b);
      return b;
    });
    cards.forEach(function (_, i) { renderCard(i); });
    renderStats();
    say("Turn over two cards. If they match, they stay face up.");
  }

  function flip(i) {
    if (busy || matched[i] || open.indexOf(i) !== -1) return;
    clock.start();
    open.push(i);
    renderCard(i);
    if (open.length < 2) {
      say(pictures[deck[i]].getAttribute("data-name") + ". Pick another card.");
      return;
    }
    moves++;
    var a = open[0];
    var b = open[1];
    var name = pictures[deck[a]].getAttribute("data-name");
    if (deck[a] === deck[b]) {
      matched[a] = matched[b] = true;
      open = [];
      found++;
      renderCard(a);
      renderCard(b);
      G.flash(cards[a], "fx-right", 700);
      G.flash(cards[b], "fx-right", 700);
      renderStats();
      if (found === pairs) {
        clock.stop();
        var s = rating(pairs, moves);
        scoreEl.textContent = s + " / 100";
        if (!best[pairs] || s > best[pairs]) best[pairs] = s;
        bestEl.textContent = best[pairs] + " / 100";
        G.flash(boardEl, "fx-win");
        say("All " + pairs + " pairs found in " + moves + " moves and " + G.formatTime(clock.seconds()) + ". Score " + s + " / 100.");
      } else {
        say("A pair of " + name + "! " + (pairs - found) + " to go.");
      }
      return;
    }
    renderStats();
    say(pictures[deck[b]].getAttribute("data-name") + ". Not a match.");
    G.flash(cards[a], "fx-wrong", 700);
    G.flash(cards[b], "fx-wrong", 700);
    busy = true;
    setTimeout(function () {
      open = [];
      busy = false;
      renderCard(a);
      renderCard(b);
    }, 900);
  }

  document.getElementById("memory-new").addEventListener("click", newGame);
  sizeSelect.addEventListener("change", newGame);

  newGame();
})();
