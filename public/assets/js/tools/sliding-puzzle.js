/* Sliding Puzzle (the classic 15 puzzle). Our own code; nothing is stored.
 * The board is mixed by making random legal moves from the solved board, so every puzzle can be solved. */
(function () {
  "use strict";

  var G = window.ToolNestGames;

  // 1, 2, 3 … with the gap (0) in the bottom-right corner.
  function solvedBoard(n) {
    var b = [];
    for (var i = 1; i < n * n; i++) b.push(i);
    b.push(0);
    return b;
  }

  function isSolved(board) {
    for (var i = 0; i < board.length - 1; i++) if (board[i] !== i + 1) return false;
    return board[board.length - 1] === 0;
  }

  // The tiles that move if you tap `idx`: every tile between it and the gap, when they share a row or column.
  // Returns the new board, or null if the tile isn't in line with the gap.
  function slide(board, n, idx) {
    var gap = board.indexOf(0);
    if (idx === gap) return null;
    var gr = Math.floor(gap / n), gc = gap % n, r = Math.floor(idx / n), c = idx % n;
    if (gr !== r && gc !== c) return null;
    var step = gr === r ? (c > gc ? 1 : -1) : (r > gr ? n : -n);
    var next = board.slice();
    for (var at = gap; at !== idx; at += step) next[at] = next[at + step];
    next[idx] = 0;
    return next;
  }

  // Tiles next to the gap (up to 4).
  function movable(board, n) {
    var gap = board.indexOf(0);
    var r = Math.floor(gap / n), c = gap % n, out = [];
    if (r > 0) out.push(gap - n);
    if (r < n - 1) out.push(gap + n);
    if (c > 0) out.push(gap - 1);
    if (c < n - 1) out.push(gap + 1);
    return out;
  }

  // Standard solvability rule: count pairs of tiles in the wrong order ("inversions").
  // Odd width: solvable when the count is even. Even width: also add the gap's row counted from the bottom (1 = bottom);
  // solvable when that total is odd.
  function isSolvable(board, n) {
    var tiles = board.filter(function (v) { return v !== 0; });
    var inv = 0;
    for (var i = 0; i < tiles.length; i++) for (var j = i + 1; j < tiles.length; j++) if (tiles[i] > tiles[j]) inv++;
    if (n % 2 === 1) return inv % 2 === 0;
    var rowFromBottom = n - Math.floor(board.indexOf(0) / n);
    return (inv + rowFromBottom) % 2 === 1;
  }

  // Mixes the board with random moves (never straight back), then makes sure it isn't already solved.
  function scramble(n, rng) {
    var random = rng || Math.random;
    var board = solvedBoard(n);
    var last = -1;
    var moves = 60 * n * n;
    for (var k = 0; k < moves; k++) {
      var options = movable(board, n).filter(function (i) { return i !== last; });
      var pick = options[Math.floor(random() * options.length)];
      last = board.indexOf(0);
      board = slide(board, n, pick);
    }
    if (isSolved(board)) return scramble(n, random);
    return board;
  }

  window.ToolNestCalc = { solvedBoard: solvedBoard, isSolved: isSolved, slide: slide, movable: movable, isSolvable: isSolvable, scramble: scramble };

  // ---------------------------------------------------------------- Page

  var boardEl = document.getElementById("sp-board");
  if (!boardEl) return;

  var sizeSelect = document.getElementById("sp-size");
  var statusEl = document.getElementById("sp-status");
  var movesEl = document.getElementById("sp-moves");
  var timeEl = document.getElementById("sp-time");
  var placedEl = document.getElementById("sp-placed");
  var bestEl = document.getElementById("sp-best");

  var n = 4;
  var board = [];
  var moves = 0;
  var done = false;
  var best = {}; // fewest moves per size, this visit only
  var clock = G.stopwatch(function (s) { timeEl.textContent = G.formatTime(s); });

  function say(t) {
    statusEl.textContent = t;
  }

  function render(focusTile) {
    boardEl.textContent = "";
    boardEl.className = "sp-board sp-" + n;
    var near = movable(board, n);
    var placed = 0;
    board.forEach(function (v, i) {
      if (v === 0) {
        var gap = document.createElement("span");
        gap.className = "sp-gap";
        gap.setAttribute("aria-hidden", "true");
        boardEl.appendChild(gap);
        return;
      }
      if (v === i + 1) placed++;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sp-tile" + (v === i + 1 ? " is-home" : "");
      b.textContent = String(v);
      b.setAttribute("data-i", i);
      b.setAttribute("aria-label", "Tile " + v + (near.indexOf(i) !== -1 ? ", next to the gap" : ""));
      boardEl.appendChild(b);
      if (focusTile === v) setTimeout(function () { b.focus(); }, 0);
    });
    movesEl.textContent = String(moves);
    placedEl.textContent = placed + " / " + (n * n - 1);
  }

  function tap(i, viaKeyboard) {
    if (done) return;
    var next = slide(board, n, i);
    if (!next) {
      say("Tap a tile in the same row or column as the gap.");
      return;
    }
    var tile = board[i];
    board = next;
    moves++;
    clock.start();
    say("");
    render(viaKeyboard ? tile : undefined);
    if (isSolved(board)) {
      done = true;
      clock.stop();
      var key = String(n);
      if (!best[key] || moves < best[key]) best[key] = moves;
      bestEl.textContent = best[key] + " moves";
      say("Solved in " + moves + " moves and " + G.formatTime(clock.seconds()) + "!");
      if (G.flash) G.flash(boardEl, "fx-win");
    }
  }

  boardEl.addEventListener("click", function (e) {
    var t = e.target.closest(".sp-tile");
    if (t) tap(Number(t.getAttribute("data-i")), e.detail === 0);
  });

  // Arrow keys move the tile next to the gap into it (the tile below moves up for ArrowUp, and so on).
  document.addEventListener("keydown", function (e) {
    var dirs = { ArrowUp: n, ArrowDown: -n, ArrowLeft: 1, ArrowRight: -1 };
    if (!(e.key in dirs) || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!e.target.closest || !e.target.closest(".sp-game")) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    var gap = board.indexOf(0);
    var from = gap + dirs[e.key];
    var gr = Math.floor(gap / n), fr = Math.floor(from / n);
    if (from < 0 || from >= n * n || (Math.abs(dirs[e.key]) === 1 && gr !== fr)) return;
    e.preventDefault();
    tap(from, true);
  });

  function newGame() {
    n = Number(sizeSelect.value) || 4;
    board = scramble(n);
    moves = 0;
    done = false;
    clock.reset();
    bestEl.textContent = best[String(n)] ? best[String(n)] + " moves" : "—";
    render();
    say("Put the tiles in order, 1 to " + (n * n - 1) + ", with the gap at the bottom right.");
  }

  document.getElementById("sp-new").addEventListener("click", newGame);
  sizeSelect.addEventListener("change", newGame);
  newGame();
})();
