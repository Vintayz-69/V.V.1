/* Number Merge Puzzle (a 2048-style sliding tile game). Our own code. Nothing is stored. */
(function () {
  "use strict";

  var SIZE = 4;
  var GOAL = 2048;

  function emptyGrid() {
    var g = [];
    for (var i = 0; i < SIZE * SIZE; i++) g.push(0);
    return g;
  }

  // Slides one line towards its start and merges equal neighbours once each.
  // [2, 2, 2, 2] -> { line: [4, 4, 0, 0], score: 8 }
  function slideLine(line) {
    var tiles = line.filter(function (v) { return v !== 0; });
    var out = [];
    var score = 0;
    for (var i = 0; i < tiles.length; i++) {
      if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
        out.push(tiles[i] * 2);
        score += tiles[i] * 2;
        i++;
      } else {
        out.push(tiles[i]);
      }
    }
    while (out.length < line.length) out.push(0);
    return { line: out, score: score };
  }

  // The cell indexes of each line, listed in the direction the tiles travel towards.
  function lines(dir) {
    var result = [];
    for (var a = 0; a < SIZE; a++) {
      var idx = [];
      for (var b = 0; b < SIZE; b++) {
        if (dir === "left") idx.push(a * SIZE + b);
        else if (dir === "right") idx.push(a * SIZE + (SIZE - 1 - b));
        else if (dir === "up") idx.push(b * SIZE + a);
        else idx.push((SIZE - 1 - b) * SIZE + a); // down
      }
      result.push(idx);
    }
    return result;
  }

  // Moves the whole grid. Returns the new grid, the points scored and whether anything moved.
  function move(grid, dir) {
    var next = grid.slice();
    var score = 0;
    var merged = [];
    lines(dir).forEach(function (idx) {
      var before = idx.map(function (i) { return grid[i]; });
      var r = slideLine(before);
      score += r.score;
      idx.forEach(function (cell, k) { next[cell] = r.line[k]; });
      // Remember where merges landed, for the little "pop" on screen.
      var tiles = before.filter(function (v) { return v !== 0; });
      var k = 0;
      for (var t = 0; t < tiles.length; t++, k++) {
        if (t + 1 < tiles.length && tiles[t] === tiles[t + 1]) {
          merged.push(idx[k]);
          t++;
        }
      }
    });
    var moved = next.some(function (v, i) { return v !== grid[i]; });
    return { grid: next, score: score, moved: moved, merged: merged };
  }

  // Puts a 2 (90% of the time) or a 4 in a random empty cell. Returns the cell used, or -1.
  function addTile(grid, rng) {
    var random = rng || Math.random;
    var empty = [];
    grid.forEach(function (v, i) { if (v === 0) empty.push(i); });
    if (!empty.length) return -1;
    var cell = empty[Math.floor(random() * empty.length)];
    grid[cell] = random() < 0.9 ? 2 : 4;
    return cell;
  }

  function canMove(grid) {
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] === 0) return true;
      var col = i % SIZE;
      if (col < SIZE - 1 && grid[i] === grid[i + 1]) return true;
      if (i + SIZE < grid.length && grid[i] === grid[i + SIZE]) return true;
    }
    return false;
  }

  window.ToolNestCalc = { slideLine: slideLine, move: move, addTile: addTile, canMove: canMove, emptyGrid: emptyGrid };

  // ---------------------------------------------------------------- Page

  var board = document.getElementById("merge-board");
  if (!board) return;

  var cells = [];
  for (var i = 0; i < SIZE * SIZE; i++) {
    var cell = document.createElement("div");
    cell.className = "merge-cell";
    board.appendChild(cell);
    cells.push(cell);
  }

  var scoreEl = document.getElementById("merge-score");
  var bestEl = document.getElementById("merge-best");
  var tileEl = document.getElementById("merge-top-tile");
  var movesEl = document.getElementById("merge-moves");
  var statusEl = document.getElementById("merge-status");
  var undoBtn = document.getElementById("merge-undo");

  var grid;
  var score;
  var best = 0; // this visit only
  var moves;
  var won;
  var history = null; // one step of undo

  function render(fresh, merged) {
    cells.forEach(function (c, i) {
      var v = grid[i];
      c.textContent = v ? String(v) : "";
      c.className = "merge-cell" + (v ? " tile tile-" + (v > GOAL ? "big" : v) : "");
      if (v >= 1024) c.classList.add("tile-long");
      if (i === fresh) c.classList.add("tile-new");
      if (merged && merged.indexOf(i) !== -1) c.classList.add("tile-merged");
    });
    var top = Math.max.apply(null, grid);
    scoreEl.textContent = score.toLocaleString("en-US");
    bestEl.textContent = best.toLocaleString("en-US");
    tileEl.textContent = top.toLocaleString("en-US");
    movesEl.textContent = moves.toLocaleString("en-US");
    undoBtn.disabled = !history;
    var words = [];
    grid.forEach(function (v, n) {
      if (v) words.push(v + " at row " + (Math.floor(n / SIZE) + 1) + " column " + (n % SIZE + 1));
    });
    board.setAttribute("aria-label", "Game board. " + words.join(", ") + ".");
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function newGame() {
    grid = emptyGrid();
    score = 0;
    moves = 0;
    won = false;
    history = null;
    addTile(grid);
    addTile(grid);
    say("Swipe or use the arrow keys to slide the tiles.");
    render();
  }

  function play(dir) {
    if (!canMove(grid)) return;
    var r = move(grid, dir);
    if (!r.moved) return;
    history = { grid: grid, score: score, moves: moves, won: won };
    grid = r.grid;
    score += r.score;
    moves++;
    if (score > best) best = score;
    var fresh = addTile(grid);
    if (!won && grid.indexOf(GOAL) !== -1) {
      won = true;
      say("You made the " + GOAL + " tile! Keep going to beat your score.");
    } else if (!canMove(grid)) {
      say("No moves left. Final score: " + score.toLocaleString("en-US") + ". Press New game to play again.");
    } else if (r.score) {
      say("+" + r.score);
    } else {
      say("");
    }
    render(fresh, r.merged);
  }

  undoBtn.addEventListener("click", function () {
    if (!history) return;
    grid = history.grid;
    score = history.score;
    moves = history.moves;
    won = history.won;
    history = null;
    say("Last move undone.");
    render();
  });

  document.getElementById("merge-new").addEventListener("click", newGame);

  document.querySelectorAll("[data-merge-dir]").forEach(function (btn) {
    btn.addEventListener("click", function () { play(btn.getAttribute("data-merge-dir")); });
  });

  var KEYS = {
    ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
    a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down"
  };
  // Keys work once the board has focus (or the page body), so arrow keys don't hijack form fields.
  document.addEventListener("keydown", function (e) {
    var dir = KEYS[e.key];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    var onBoard = t === board || t === document.body || (t.closest && t.closest(".merge-game"));
    if (!onBoard || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();
    play(dir);
  });

  // Swipes on phones and drags with a mouse.
  var startX = 0;
  var startY = 0;
  var tracking = false;
  board.addEventListener("pointerdown", function (e) {
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
    board.focus({ preventScroll: true });
  });
  board.addEventListener("pointerup", function (e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? "right" : "left");
    else play(dy > 0 ? "down" : "up");
  });
  board.addEventListener("pointercancel", function () { tracking = false; });

  newGame();
})();
