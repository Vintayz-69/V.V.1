/* Nonogram (picture logic puzzle). A new random picture every game. Our own code; nothing is stored.
 * You win when your filled squares match every row and column clue. Random pictures can sometimes be
 * solved in more than one way; any answer that fits all the clues counts. */
(function () {
  "use strict";

  var G = window.ToolNestGames;
  var SIZES = { 5: 0.6, 10: 0.58, 15: 0.58 }; // grid size → share of squares filled

  // Runs of filled squares in a line: [1,1,0,1] → [2, 1]. An empty line gives [].
  function lineClue(line) {
    var out = [], run = 0;
    for (var i = 0; i < line.length; i++) {
      if (line[i]) run++;
      else if (run) { out.push(run); run = 0; }
    }
    if (run) out.push(run);
    return out;
  }

  function rows(grid, n) {
    var out = [];
    for (var r = 0; r < n; r++) out.push(grid.slice(r * n, r * n + n));
    return out;
  }

  function cols(grid, n) {
    var out = [];
    for (var c = 0; c < n; c++) {
      var col = [];
      for (var r = 0; r < n; r++) col.push(grid[r * n + c]);
      out.push(col);
    }
    return out;
  }

  function clues(grid, n) {
    return { rows: rows(grid, n).map(lineClue), cols: cols(grid, n).map(lineClue) };
  }

  function sameClue(a, b) {
    return a.length === b.length && a.every(function (v, i) { return v === b[i]; });
  }

  // Does the player's grid fit every clue?
  function fits(grid, n, target) {
    var mine = clues(grid, n);
    return mine.rows.every(function (c, i) { return sameClue(c, target.rows[i]); }) &&
      mine.cols.every(function (c, i) { return sameClue(c, target.cols[i]); });
  }

  // A random picture. Rows and columns are never completely empty, so every line has a clue to work with.
  function generate(n, rng) {
    var random = rng || Math.random;
    var density = SIZES[n] || 0.58;
    for (var tries = 0; tries < 200; tries++) {
      var grid = [];
      for (var i = 0; i < n * n; i++) grid.push(random() < density ? 1 : 0);
      var c = clues(grid, n);
      if (c.rows.every(function (x) { return x.length; }) && c.cols.every(function (x) { return x.length; })) {
        return { grid: grid, clues: c };
      }
    }
    var full = [];
    for (var k = 0; k < n * n; k++) full.push(1);
    return { grid: full, clues: clues(full, n) };
  }

  window.ToolNestCalc = { lineClue: lineClue, clues: clues, fits: fits, generate: generate, SIZES: SIZES };

  // ---------------------------------------------------------------- Page

  var boardEl = document.getElementById("ng-board");
  if (!boardEl) return;

  var sizeSelect = document.getElementById("ng-size");
  var markBtn = document.getElementById("ng-mark");
  var statusEl = document.getElementById("ng-status");
  var timeEl = document.getElementById("ng-time");
  var filledEl = document.getElementById("ng-filled");
  var linesEl = document.getElementById("ng-lines");
  var bestEl = document.getElementById("ng-best");

  var n = 10;
  var puzzle;
  var state = []; // 0 empty, 1 filled, 2 marked "empty" with an X
  var cells = [];
  var rowClueEls = [];
  var colClueEls = [];
  var markMode = false;
  var done = false;
  var best = {}; // fastest per size, this visit only
  var clock = G.stopwatch(function (s) { timeEl.textContent = G.formatTime(s); });
  var dragValue = null; // while dragging, every square touched gets this value

  function say(t) {
    statusEl.textContent = t;
  }

  function filledGrid() {
    return state.map(function (v) { return v === 1 ? 1 : 0; });
  }

  function updateClues() {
    var g = filledGrid();
    var mine = clues(g, n);
    var ok = 0;
    mine.rows.forEach(function (c, i) {
      var good = sameClue(c, puzzle.clues.rows[i]);
      rowClueEls[i].classList.toggle("is-done", good);
      if (good) ok++;
    });
    mine.cols.forEach(function (c, i) {
      var good = sameClue(c, puzzle.clues.cols[i]);
      colClueEls[i].classList.toggle("is-done", good);
      if (good) ok++;
    });
    linesEl.textContent = ok + " / " + (2 * n);
    filledEl.textContent = String(g.filter(Boolean).length);
  }

  function paint(i) {
    var el = cells[i];
    el.classList.toggle("is-on", state[i] === 1);
    el.classList.toggle("is-x", state[i] === 2);
    el.setAttribute("aria-label", "Row " + (Math.floor(i / n) + 1) + ", column " + (i % n + 1) + ", " +
      (state[i] === 1 ? "filled" : state[i] === 2 ? "marked empty" : "blank"));
    el.setAttribute("aria-pressed", state[i] === 1 ? "true" : "false");
  }

  function set(i, v) {
    if (done || state[i] === v) return;
    state[i] = v;
    clock.start();
    paint(i);
    updateClues();
    if (fits(filledGrid(), n, puzzle.clues)) {
      done = true;
      clock.stop();
      var t = clock.seconds();
      if (!best[n] || t < best[n]) best[n] = t;
      bestEl.textContent = G.formatTime(best[n]);
      say("Solved in " + G.formatTime(t) + "! Every row and column matches its clue.");
      boardEl.classList.add("is-solved");
      if (G.flash) G.flash(boardEl, "fx-win");
    }
  }

  // What a tap does: in fill mode, blank ↔ filled; in mark mode, blank ↔ X.
  function nextValue(i) {
    if (markMode) return state[i] === 2 ? 0 : 2;
    return state[i] === 1 ? 0 : 1;
  }

  function build() {
    boardEl.textContent = "";
    boardEl.className = "ng-board ng-" + n;
    cells = [];
    rowClueEls = [];
    colClueEls = [];
    var corner = document.createElement("span");
    corner.className = "ng-corner";
    corner.setAttribute("aria-hidden", "true");
    boardEl.appendChild(corner);
    puzzle.clues.cols.forEach(function (c, i) {
      var el = document.createElement("span");
      el.className = "ng-clue ng-col-clue";
      el.textContent = c.join("\n");
      el.setAttribute("aria-label", "Column " + (i + 1) + " clue: " + c.join(", "));
      boardEl.appendChild(el);
      colClueEls.push(el);
    });
    for (var r = 0; r < n; r++) {
      var rc = document.createElement("span");
      rc.className = "ng-clue ng-row-clue";
      rc.textContent = puzzle.clues.rows[r].join(" ");
      rc.setAttribute("aria-label", "Row " + (r + 1) + " clue: " + puzzle.clues.rows[r].join(", "));
      boardEl.appendChild(rc);
      rowClueEls.push(rc);
      for (var c = 0; c < n; c++) {
        var i = r * n + c;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ng-cell" + (c % 5 === 4 && c < n - 1 ? " edge-r" : "") + (r % 5 === 4 && r < n - 1 ? " edge-b" : "");
        b.setAttribute("data-i", i);
        b.tabIndex = i === 0 ? 0 : -1;
        boardEl.appendChild(b);
        cells.push(b);
      }
    }
    cells.forEach(function (_, i) { paint(i); });
    updateClues();
  }

  function cellIndex(target) {
    var el = target && target.closest ? target.closest(".ng-cell") : null;
    return el ? Number(el.getAttribute("data-i")) : -1;
  }

  // Press and drag to fill (or mark) several squares in one go.
  boardEl.addEventListener("pointerdown", function (e) {
    var i = cellIndex(e.target);
    if (i === -1 || done) return;
    e.preventDefault();
    dragValue = nextValue(i);
    set(i, dragValue);
  });
  boardEl.addEventListener("pointermove", function (e) {
    if (dragValue === null) return;
    var i = cellIndex(document.elementFromPoint(e.clientX, e.clientY));
    if (i !== -1) set(i, dragValue);
  });
  document.addEventListener("pointerup", function () { dragValue = null; });
  document.addEventListener("pointercancel", function () { dragValue = null; });

  boardEl.addEventListener("keydown", function (e) {
    var i = cellIndex(e.target);
    if (i === -1) return;
    var r = Math.floor(i / n), c = i % n;
    var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      r = Math.min(n - 1, Math.max(0, r + moves[e.key][0]));
      c = Math.min(n - 1, Math.max(0, c + moves[e.key][1]));
      cells[i].tabIndex = -1;
      cells[r * n + c].tabIndex = 0;
      cells[r * n + c].focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      set(i, nextValue(i));
    } else if (e.key === "x" || e.key === "X") {
      e.preventDefault();
      set(i, state[i] === 2 ? 0 : 2);
    }
  });

  markBtn.addEventListener("click", function () {
    markMode = !markMode;
    markBtn.setAttribute("aria-pressed", markMode ? "true" : "false");
    markBtn.classList.toggle("is-on", markMode);
    say(markMode ? "X mode on: taps mark squares you know are empty." : "Fill mode: taps fill squares.");
  });

  document.getElementById("ng-clear").addEventListener("click", function () {
    if (done) return;
    state = state.map(function () { return 0; });
    cells.forEach(function (_, i) { paint(i); });
    updateClues();
    say("Grid cleared.");
  });

  function newGame() {
    n = Number(sizeSelect.value) || 10;
    puzzle = generate(n);
    state = puzzle.grid.map(function () { return 0; });
    done = false;
    clock.reset();
    bestEl.textContent = best[n] ? G.formatTime(best[n]) : "—";
    build();
    say("Fill squares to match the numbers. A clue turns green when its line is right.");
  }

  document.getElementById("ng-new").addEventListener("click", newGame);
  sizeSelect.addEventListener("change", newGame);
  newGame();
})();
