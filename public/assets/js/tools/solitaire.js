/* Klondike Solitaire. Our own code; nothing is stored. Tap a card to pick it up, tap where it
 * should go. Tap a picked-up card again to send it to the best place automatically. */
(function () {
  "use strict";

  var G = window.ToolNestGames;
  var SUITS = ["♠", "♥", "♦", "♣"];
  var SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];
  var RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var RANK_NAMES = ["", "Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"];

  function isRed(card) {
    return card.suit === 1 || card.suit === 2;
  }

  function cardName(card) {
    return RANK_NAMES[card.rank] + " of " + SUIT_NAMES[card.suit];
  }

  function newDeck() {
    var deck = [];
    for (var s = 0; s < 4; s++) for (var r = 1; r <= 13; r++) deck.push({ suit: s, rank: r, up: false });
    return deck;
  }

  // Deals a new game: 7 tableau piles of 1 to 7 cards with the top card face up; 24 cards stay in the stock.
  function deal(rng, drawCount) {
    var deck = G.shuffle(newDeck(), rng);
    var tableau = [];
    for (var i = 0; i < 7; i++) {
      var pile = deck.splice(0, i + 1);
      pile[pile.length - 1].up = true;
      tableau.push(pile);
    }
    return { stock: deck, waste: [], foundations: [[], [], [], []], tableau: tableau, drawCount: drawCount === 3 ? 3 : 1 };
  }

  function clone(state) {
    return JSON.parse(JSON.stringify(state));
  }

  // Tableau: one lower and the other colour; an empty pile only takes a King.
  function canStack(card, pile) {
    if (!pile.length) return card.rank === 13;
    var top = pile[pile.length - 1];
    return top.up && top.rank === card.rank + 1 && isRed(top) !== isRed(card);
  }

  // Foundation: same suit, from Ace up to King.
  function canFound(card, pile) {
    if (!pile.length) return card.rank === 1;
    var top = pile[pile.length - 1];
    return top.suit === card.suit && card.rank === top.rank + 1;
  }

  // The cards a source points at: { type: "waste" }, { type: "foundation", i } or
  // { type: "tableau", i, index } (index = the first card of the run being moved).
  function picked(state, from) {
    if (from.type === "waste") return state.waste.length ? [state.waste[state.waste.length - 1]] : [];
    if (from.type === "foundation") {
      var f = state.foundations[from.i];
      return f.length ? [f[f.length - 1]] : [];
    }
    var pile = state.tableau[from.i];
    var run = pile.slice(from.index);
    if (!run.length || !run.every(function (c) { return c.up; })) return [];
    for (var k = 1; k < run.length; k++) {
      if (run[k].rank !== run[k - 1].rank - 1 || isRed(run[k]) === isRed(run[k - 1])) return [];
    }
    return run;
  }

  // Tries a move. Returns the new state, or null if the move isn't allowed.
  // to = { type: "tableau", i } or { type: "foundation", i }
  function move(state, from, to) {
    var cards = picked(state, from);
    if (!cards.length) return null;
    if (from.type === to.type && from.i === to.i) return null;
    if (to.type === "foundation") {
      if (cards.length !== 1 || !canFound(cards[0], state.foundations[to.i])) return null;
    } else if (!canStack(cards[0], state.tableau[to.i])) {
      return null;
    }
    var next = clone(state);
    var moving;
    if (from.type === "waste") moving = [next.waste.pop()];
    else if (from.type === "foundation") moving = [next.foundations[from.i].pop()];
    else {
      moving = next.tableau[from.i].splice(from.index);
      var left = next.tableau[from.i];
      if (left.length) left[left.length - 1].up = true; // turn over the card underneath
    }
    var target = to.type === "foundation" ? next.foundations[to.i] : next.tableau[to.i];
    moving.forEach(function (c) { target.push(c); });
    return next;
  }

  // Turns over 1 or 3 cards from the stock, or turns the waste back into the stock when the stock is empty.
  function draw(state) {
    var next = clone(state);
    if (!next.stock.length) {
      if (!next.waste.length) return null;
      next.stock = next.waste.reverse().map(function (c) { c.up = false; return c; });
      next.waste = [];
      return next;
    }
    for (var n = 0; n < next.drawCount && next.stock.length; n++) {
      var c = next.stock.pop();
      c.up = true;
      next.waste.push(c);
    }
    return next;
  }

  // Best place for a picked-up card: a foundation first (single cards), then a tableau pile
  // (non-empty piles before empty ones). Returns the destination or null.
  function bestMove(state, from) {
    var cards = picked(state, from);
    if (!cards.length) return null;
    var i;
    if (cards.length === 1 && from.type !== "foundation") {
      for (i = 0; i < 4; i++) if (canFound(cards[0], state.foundations[i])) return { type: "foundation", i: i };
    }
    var empty = null;
    for (i = 0; i < 7; i++) {
      if (from.type === "tableau" && from.i === i) continue;
      if (!canStack(cards[0], state.tableau[i])) continue;
      if (state.tableau[i].length) return { type: "tableau", i: i };
      // Moving a King from the bottom of a pile to another empty pile achieves nothing.
      if (empty === null && !(from.type === "tableau" && from.index === 0)) empty = { type: "tableau", i: i };
    }
    return empty;
  }

  function isWon(state) {
    return state.foundations.every(function (f) { return f.length === 13; });
  }

  // When every card is face up and the stock and waste are empty, the game can finish itself.
  function canAutoFinish(state) {
    return !state.stock.length && !state.waste.length &&
      state.tableau.every(function (p) { return p.every(function (c) { return c.up; }); });
  }

  function autoFinishStep(state) {
    for (var i = 0; i < 7; i++) {
      var pile = state.tableau[i];
      if (!pile.length) continue;
      for (var f = 0; f < 4; f++) {
        var next = move(state, { type: "tableau", i: i, index: pile.length - 1 }, { type: "foundation", i: f });
        if (next) return next;
      }
    }
    return null;
  }

  window.ToolNestCalc = {
    newDeck: newDeck, deal: deal, canStack: canStack, canFound: canFound, move: move, draw: draw,
    bestMove: bestMove, isWon: isWon, canAutoFinish: canAutoFinish, autoFinishStep: autoFinishStep, cardName: cardName
  };

  // ---------------------------------------------------------------- Page

  var table = document.getElementById("sol-table");
  if (!table) return;

  var stockEl = document.getElementById("sol-stock");
  var wasteEl = document.getElementById("sol-waste");
  var foundEls = Array.prototype.slice.call(document.querySelectorAll("[data-sol-foundation]"));
  var tabEls = Array.prototype.slice.call(document.querySelectorAll("[data-sol-tableau]"));
  var drawSelect = document.getElementById("sol-draw");
  var undoBtn = document.getElementById("sol-undo");
  var finishBtn = document.getElementById("sol-finish");
  var statusEl = document.getElementById("sol-status");
  var movesEl = document.getElementById("sol-moves");
  var timeEl = document.getElementById("sol-time");
  var homeEl = document.getElementById("sol-home");
  var modeEl = document.getElementById("sol-mode");

  var state;
  var history = [];
  var selected = null; // a source, as used by move()
  var moves = 0;
  var won = false;
  var clock = G.stopwatch(function (s) { timeEl.textContent = G.formatTime(s); });

  function say(t) {
    statusEl.textContent = t;
  }

  function sameSource(a, b) {
    return a && b && a.type === b.type && a.i === b.i && a.index === b.index;
  }

  function cardEl(card, source, label) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "sol-card" + (card.up ? (isRed(card) ? " red" : " black") : " down");
    if (card.up) {
      var corner = document.createElement("span");
      corner.className = "sol-corner";
      corner.textContent = RANKS[card.rank] + SUITS[card.suit];
      var mid = document.createElement("span");
      mid.className = "sol-mid";
      mid.textContent = SUITS[card.suit];
      corner.setAttribute("aria-hidden", "true");
      mid.setAttribute("aria-hidden", "true");
      b.appendChild(corner);
      b.appendChild(mid);
    }
    b.setAttribute("aria-label", label || (card.up ? cardName(card) : "Face-down card"));
    if (source) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        tapCard(source);
      });
      if (selected && (sameSource(selected, source) ||
        (selected.type === "tableau" && source.type === "tableau" && selected.i === source.i && source.index > selected.index))) {
        b.classList.add("is-selected");
      }
    } else {
      b.tabIndex = -1;
    }
    return b;
  }

  // An empty place. With onTap it's a button, so keyboard users can move a card onto it.
  function slot(mark, label, onTap) {
    var s = document.createElement(onTap ? "button" : "span");
    s.className = "sol-slot";
    if (mark) {
      var m = document.createElement("span");
      m.setAttribute("aria-hidden", "true");
      m.textContent = mark;
      s.appendChild(m);
    }
    if (onTap) {
      s.type = "button";
      s.setAttribute("aria-label", label);
      s.addEventListener("click", function (e) {
        e.stopPropagation();
        onTap();
      });
    } else {
      s.setAttribute("aria-hidden", "true");
    }
    return s;
  }

  // Card spacing in tableau piles depends on the card width, which changes with the screen.
  function offsets() {
    var w = tabEls[0].clientWidth || 60;
    var h = w * 1.4;
    return { down: Math.max(5, h * 0.12), up: Math.max(14, h * 0.28), h: h };
  }

  function render() {
    var off = offsets();

    // Stock
    stockEl.textContent = "";
    if (state.stock.length) {
      var back = document.createElement("span"); // the stock itself is the button
      back.className = "sol-card down";
      back.setAttribute("aria-hidden", "true");
      stockEl.appendChild(back);
    } else {
      stockEl.appendChild(slot("↻"));
    }
    stockEl.setAttribute("aria-label", state.stock.length
      ? "Stock, " + state.stock.length + " cards. Turn over " + (state.drawCount === 3 ? "3 cards" : "a card")
      : (state.waste.length ? "Stock is empty. Turn the waste pile back over" : "Stock is empty"));

    // Waste: show up to 3 fanned cards; only the top one can be played.
    wasteEl.textContent = "";
    var showN = Math.min(state.drawCount === 3 ? 3 : 1, state.waste.length);
    if (!showN) wasteEl.appendChild(slot(""));
    for (var w = state.waste.length - showN; w < state.waste.length; w++) {
      var isTop = w === state.waste.length - 1;
      var el = cardEl(state.waste[w], isTop ? { type: "waste" } : null);
      el.classList.add("fan-" + (w - (state.waste.length - showN)));
      if (!isTop) el.setAttribute("aria-hidden", "true");
      wasteEl.appendChild(el);
    }

    // Foundations
    foundEls.forEach(function (fe, i) {
      fe.textContent = "";
      var pile = state.foundations[i];
      if (pile.length) fe.appendChild(cardEl(pile[pile.length - 1], { type: "foundation", i: i }));
      else fe.appendChild(slot("A", "Empty foundation " + (i + 1), function () { tapPile("foundation", i); }));
      fe.setAttribute("aria-label", "Foundation " + (i + 1) + (pile.length ? ", " + cardName(pile[pile.length - 1]) + " on top" : ", empty"));
    });

    // Tableau
    var tallest = 0;
    tabEls.forEach(function (te, i) {
      te.textContent = "";
      var pile = state.tableau[i];
      te.setAttribute("aria-label", "Pile " + (i + 1) + (pile.length ? ", " + pile.length + " cards" : ", empty"));
      if (!pile.length) {
        te.appendChild(slot("K", "Empty pile " + (i + 1), function () { tapPile("tableau", i); }));
        return;
      }
      var top = 0;
      pile.forEach(function (card, k) {
        var el = cardEl(card, card.up ? { type: "tableau", i: i, index: k } : null);
        el.style.top = top + "px";
        if (!card.up) el.setAttribute("aria-hidden", "true");
        te.appendChild(el);
        if (k < pile.length - 1) top += card.up ? off.up : off.down;
      });
      tallest = Math.max(tallest, top + off.h);
    });
    tabEls.forEach(function (te) { te.style.height = Math.max(tallest, off.h) + "px"; });

    var home = state.foundations.reduce(function (n, f) { return n + f.length; }, 0);
    movesEl.textContent = String(moves);
    homeEl.textContent = home + " / 52";
    undoBtn.disabled = !history.length;
    finishBtn.hidden = won || !canAutoFinish(state) || isWon(state);
  }

  function commit(next, message) {
    history.push({ state: state, moves: moves });
    if (history.length > 200) history.shift();
    state = next;
    moves++;
    selected = null;
    clock.start();
    render();
    if (isWon(state)) {
      won = true;
      clock.stop();
      say("You won in " + moves + " moves and " + G.formatTime(clock.seconds()) + "! Press New game to play again.");
    } else if (message !== undefined) {
      say(message);
    } else if (canAutoFinish(state)) {
      say("Every card is face up. Press Finish to move them home.");
    } else {
      say("");
    }
  }

  function tapCard(source) {
    if (won) return;
    if (selected) {
      if (sameSource(selected, source)) {
        // Second tap on the same card: send it to the best place.
        var dest = bestMove(state, selected);
        if (dest) {
          commit(move(state, selected, dest));
        } else {
          selected = null;
          render();
          say("That card can't move anywhere right now.");
        }
        return;
      }
      // Tapping a card in another pile: try to move the picked-up cards onto that pile.
      if (source.type === "tableau" || source.type === "foundation") {
        var next = move(state, selected, { type: source.type, i: source.i });
        if (next) { commit(next); return; }
      }
    }
    var cards = picked(state, source);
    if (!cards.length) {
      selected = null;
      render();
      say("Only a run of cards in order, alternating colours, can be moved together.");
      return;
    }
    selected = source;
    render();
    say("Picked up " + cardName(cards[0]) + (cards.length > 1 ? " and " + (cards.length - 1) + " more" : "") +
      ". Tap where it should go, or tap it again to move it automatically.");
  }

  function tapPile(type, i) {
    if (won || !selected) return;
    var next = move(state, selected, { type: type, i: i });
    if (next) commit(next);
    else {
      selected = null;
      render();
      say(type === "tableau" ? "Only a King can go on an empty pile." : "Foundations start with an Ace and build up in the same suit.");
    }
  }

  stockEl.addEventListener("click", function () {
    if (won) return;
    var next = draw(state);
    if (next) commit(next, "");
  });

  foundEls.forEach(function (fe, i) { fe.addEventListener("click", function () { tapPile("foundation", i); }); });
  tabEls.forEach(function (te, i) { te.addEventListener("click", function () { tapPile("tableau", i); }); });

  undoBtn.addEventListener("click", function () {
    var last = history.pop();
    if (!last) return;
    state = last.state;
    moves = last.moves;
    won = false;
    selected = null;
    say("Move undone.");
    render();
  });

  // Moves every card home, one card at a time, as a single step for Undo.
  finishBtn.addEventListener("click", function () {
    var next = autoFinishStep(state);
    if (!next) return;
    var before = { state: state, moves: moves };
    var count = 0;
    while (next) {
      state = next;
      count++;
      next = autoFinishStep(state);
    }
    commit(state);
    history[history.length - 1] = before;
    moves = before.moves + count;
    movesEl.textContent = String(moves);
    if (won) say("You won in " + moves + " moves and " + G.formatTime(clock.seconds()) + "! Press New game to play again.");
  });

  function newGame() {
    state = deal(null, Number(drawSelect.value));
    modeEl.textContent = state.drawCount === 3 ? "Draw 3" : "Draw 1";
    history = [];
    selected = null;
    moves = 0;
    won = false;
    clock.reset();
    say("New game. Tap the stock (top left) to turn over cards.");
    render();
  }

  document.getElementById("sol-new").addEventListener("click", newGame);
  drawSelect.addEventListener("change", newGame);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && selected) {
      selected = null;
      render();
      say("");
    }
  });
  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 100);
  });

  newGame();
})();
