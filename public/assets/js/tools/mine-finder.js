/* Mine Finder: a minesweeper-style logic puzzle. Our own code; nothing is stored.
 * Mines are placed after the first tap, away from it, so the first tap is always safe. */
(function () {
  "use strict";

  var G = window.ToolNestGames;
  var LEVELS = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 12, cols: 12, mines: 24 },
    hard: { rows: 16, cols: 16, mines: 40 }
  };

  function neighbours(idx, rows, cols) {
    var r = Math.floor(idx / cols), c = idx % cols, out = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
      }
    }
    return out;
  }

  // Places `count` mines, never on the safe cell or the cells touching it.
  function placeMines(rows, cols, count, safe, rng) {
    var banned = {};
    banned[safe] = true;
    neighbours(safe, rows, cols).forEach(function (n) { banned[n] = true; });
    var open = [];
    for (var i = 0; i < rows * cols; i++) if (!banned[i]) open.push(i);
    var chosen = G.shuffle(open, rng).slice(0, count);
    var mines = [];
    for (var k = 0; k < rows * cols; k++) mines.push(false);
    chosen.forEach(function (m) { mines[m] = true; });
    return mines;
  }

  // How many mines touch each cell.
  function counts(mines, rows, cols) {
    return mines.map(function (_, i) {
      return neighbours(i, rows, cols).filter(function (n) { return mines[n]; }).length;
    });
  }

  // Opens a cell. A cell with no mines around it also opens all its neighbours, and so on.
  // Returns the list of cells opened by this tap.
  function reveal(board, idx) {
    var opened = [];
    var stack = [idx];
    while (stack.length) {
      var i = stack.pop();
      if (board.open[i] || board.flags[i]) continue;
      board.open[i] = true;
      opened.push(i);
      if (!board.mines[i] && board.counts[i] === 0) {
        neighbours(i, board.rows, board.cols).forEach(function (n) { if (!board.open[n]) stack.push(n); });
      }
    }
    return opened;
  }

  function makeBoard(rows, cols, mines) {
    var size = rows * cols;
    var blank = [];
    for (var i = 0; i < size; i++) blank.push(false);
    return {
      rows: rows, cols: cols, mines: mines, counts: counts(mines, rows, cols),
      open: blank.slice(), flags: blank.slice()
    };
  }

  // Won when every cell without a mine is open.
  function isCleared(board) {
    for (var i = 0; i < board.mines.length; i++) if (!board.mines[i] && !board.open[i]) return false;
    return true;
  }

  window.ToolNestCalc = {
    LEVELS: LEVELS, neighbours: neighbours, placeMines: placeMines, counts: counts,
    reveal: reveal, makeBoard: makeBoard, isCleared: isCleared
  };

  // ---------------------------------------------------------------- Page

  var boardEl = document.getElementById("mine-board");
  if (!boardEl) return;

  var levelSelect = document.getElementById("mine-level");
  var flagBtn = document.getElementById("mine-flag-mode");
  var statusEl = document.getElementById("mine-status");
  var leftEl = document.getElementById("mine-left");
  var timeEl = document.getElementById("mine-time");
  var sizeEl = document.getElementById("mine-size");
  var bestEl = document.getElementById("mine-best");
  var flagSvg = document.querySelector("#mine-pictures [data-pic=flag]").firstElementChild;
  var mineSvg = document.querySelector("#mine-pictures [data-pic=mine]").firstElementChild;

  var level;
  var board = null; // made on the first tap
  var cells = [];
  var over = false;
  var flagMode = false;
  var best = {}; // fastest win per level, this visit only
  var clock = G.stopwatch(function (s) { timeEl.textContent = G.formatTime(s); });

  function say(t) {
    statusEl.textContent = t;
  }

  function flagCount() {
    return board ? board.flags.filter(Boolean).length : 0;
  }

  function renderCell(i) {
    var el = cells[i];
    var L = level;
    var r = Math.floor(i / L.cols) + 1, c = i % L.cols + 1;
    el.className = "mine-cell";
    el.textContent = "";
    var where = "Row " + r + ", column " + c + ", ";
    if (!board || (!board.open[i] && !board.flags[i])) {
      el.setAttribute("aria-label", where + "hidden");
      if (over && board && board.mines[i]) {
        el.classList.add("is-mine");
        el.appendChild(mineSvg.cloneNode(true));
        el.setAttribute("aria-label", where + "mine");
      }
      return;
    }
    if (board.flags[i]) {
      el.classList.add("is-flag");
      if (over && !board.mines[i]) el.classList.add("is-wrong");
      el.appendChild(flagSvg.cloneNode(true));
      el.setAttribute("aria-label", where + "flagged" + (over && !board.mines[i] ? ", no mine here" : ""));
      return;
    }
    el.classList.add("is-open");
    if (board.mines[i]) {
      el.classList.add("is-mine", "is-hit");
      el.appendChild(mineSvg.cloneNode(true));
      el.setAttribute("aria-label", where + "mine");
      return;
    }
    var n = board.counts[i];
    if (n) {
      el.textContent = String(n);
      el.classList.add("n" + n);
    }
    el.setAttribute("aria-label", where + (n ? n + " mine" + (n > 1 ? "s" : "") + " nearby" : "clear"));
  }

  function renderAll() {
    for (var i = 0; i < cells.length; i++) renderCell(i);
    leftEl.textContent = String(level.mines - flagCount());
  }

  function newGame() {
    level = LEVELS[levelSelect.value] || LEVELS.easy;
    board = null;
    over = false;
    clock.reset();
    boardEl.textContent = "";
    boardEl.className = "mine-board mine-" + levelSelect.value;
    cells = [];
    for (var i = 0; i < level.rows * level.cols; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-i", i);
      b.tabIndex = i === 0 ? 0 : -1;
      boardEl.appendChild(b);
      cells.push(b);
    }
    sizeEl.textContent = level.rows + " × " + level.cols + ", " + level.mines + " mines";
    bestEl.textContent = best[levelSelect.value] ? G.formatTime(best[levelSelect.value]) : "—";
    renderAll();
    say("Tap any square to start. Your first tap is always safe.");
  }

  function lose(i) {
    over = true;
    clock.stop();
    renderAll();
    cells[i].focus();
    say("Boom! That square had a mine. Press New game to try again.");
  }

  function checkWin() {
    if (!isCleared(board)) return;
    over = true;
    clock.stop();
    // Flag the remaining mines for the player.
    board.mines.forEach(function (m, i) { if (m) board.flags[i] = true; });
    renderAll();
    var t = clock.seconds();
    var key = levelSelect.value;
    if (!best[key] || t < best[key]) best[key] = t;
    bestEl.textContent = G.formatTime(best[key]);
    say("You cleared the board in " + G.formatTime(t) + "!");
  }

  function open(i) {
    if (over) return;
    if (!board) {
      board = makeBoard(level.rows, level.cols, placeMines(level.rows, level.cols, level.mines, i));
      clock.start();
    }
    if (board.flags[i]) return;
    if (board.open[i]) {
      chord(i);
      return;
    }
    if (board.mines[i]) {
      board.open[i] = true;
      lose(i);
      return;
    }
    reveal(board, i).forEach(renderCell);
    say("");
    checkWin();
  }

  // Tapping an open number when the right number of flags touch it opens the other neighbours.
  function chord(i) {
    var n = board.counts[i];
    if (!n) return;
    var around = neighbours(i, board.rows, board.cols);
    var flags = around.filter(function (x) { return board.flags[x]; }).length;
    if (flags !== n) return;
    var hit = -1;
    around.forEach(function (x) {
      if (board.flags[x] || board.open[x]) return;
      if (board.mines[x]) { board.open[x] = true; hit = x; } else reveal(board, x).forEach(renderCell);
    });
    if (hit !== -1) lose(hit);
    else checkWin();
  }

  function toggleFlag(i) {
    if (over || !board || board.open[i]) return;
    board.flags[i] = !board.flags[i];
    renderCell(i);
    leftEl.textContent = String(level.mines - flagCount());
  }

  boardEl.addEventListener("click", function (e) {
    var cell = e.target.closest(".mine-cell");
    if (!cell) return;
    var i = Number(cell.getAttribute("data-i"));
    if (flagMode && board) toggleFlag(i);
    else open(i);
  });
  boardEl.addEventListener("contextmenu", function (e) {
    var cell = e.target.closest(".mine-cell");
    if (!cell) return;
    e.preventDefault();
    toggleFlag(Number(cell.getAttribute("data-i")));
  });
  boardEl.addEventListener("keydown", function (e) {
    var cell = e.target.closest(".mine-cell");
    if (!cell) return;
    var i = Number(cell.getAttribute("data-i"));
    var r = Math.floor(i / level.cols), c = i % level.cols;
    var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      r = Math.min(level.rows - 1, Math.max(0, r + moves[e.key][0]));
      c = Math.min(level.cols - 1, Math.max(0, c + moves[e.key][1]));
      cells[i].tabIndex = -1;
      var next = cells[r * level.cols + c];
      next.tabIndex = 0;
      next.focus();
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      toggleFlag(i);
    }
  });

  flagBtn.addEventListener("click", function () {
    flagMode = !flagMode;
    flagBtn.setAttribute("aria-pressed", flagMode ? "true" : "false");
    flagBtn.classList.toggle("is-on", flagMode);
    say(flagMode ? "Flag mode on: taps place or remove flags." : "Flag mode off: taps open squares.");
  });

  document.getElementById("mine-new").addEventListener("click", newGame);
  levelSelect.addEventListener("change", newGame);

  newGame();
})();
