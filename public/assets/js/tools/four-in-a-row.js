/* Four in a Row: play the computer or a friend on the same device. Our own code; nothing is stored.
 * Board: 7 columns × 6 rows, stored row by row from the top (index = row × 7 + column). 0 empty, 1 you, 2 computer or player 2. */
(function () {
  "use strict";

  var G = window.ToolNestGames;
  var COLS = 7, ROWS = 6;
  var DEPTH = { easy: 1, medium: 3, hard: 6 };
  var ORDER = [3, 2, 4, 1, 5, 0, 6]; // try the middle first: it usually gives the best moves

  function emptyBoard() {
    var b = [];
    for (var i = 0; i < COLS * ROWS; i++) b.push(0);
    return b;
  }

  // The row a counter dropped in `col` lands in, or -1 if the column is full.
  function landingRow(board, col) {
    for (var r = ROWS - 1; r >= 0; r--) if (!board[r * COLS + col]) return r;
    return -1;
  }

  function drop(board, col, player) {
    var r = landingRow(board, col);
    if (r === -1) return null;
    var next = board.slice();
    next[r * COLS + col] = player;
    return next;
  }

  function validMoves(board) {
    return ORDER.filter(function (c) { return !board[c]; });
  }

  // Every line of four cells on the board (across, down and both diagonals): 69 in all.
  var LINES = [];
  (function () {
    var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      dirs.forEach(function (d) {
        var er = r + d[0] * 3, ec = c + d[1] * 3;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) return;
        LINES.push([0, 1, 2, 3].map(function (k) { return (r + d[0] * k) * COLS + (c + d[1] * k); }));
      });
    }
  })();

  // { player, cells } for the first line of four found, or null.
  function winner(board) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i], p = board[l[0]];
      if (p && board[l[1]] === p && board[l[2]] === p && board[l[3]] === p) return { player: p, cells: l };
    }
    return null;
  }

  function isFull(board) {
    for (var c = 0; c < COLS; c++) if (!board[c]) return false;
    return true;
  }

  // How good the board looks for `me`: counts lines with 2 or 3 of my counters and no opponent counters,
  // minus the same for the opponent, plus a little for the middle column.
  function score(board, me) {
    var them = me === 1 ? 2 : 1;
    var s = 0;
    for (var i = 0; i < LINES.length; i++) {
      var mine = 0, theirs = 0;
      for (var k = 0; k < 4; k++) {
        var v = board[LINES[i][k]];
        if (v === me) mine++; else if (v === them) theirs++;
      }
      if (theirs === 0) s += mine === 3 ? 5 : mine === 2 ? 2 : 0;
      if (mine === 0) s -= theirs === 3 ? 6 : theirs === 2 ? 2 : 0;
    }
    for (var r = 0; r < ROWS; r++) if (board[r * COLS + 3] === me) s += 1;
    return s;
  }

  // Minimax with alpha-beta pruning. Wins found sooner score higher.
  function search(board, depth, alpha, beta, maximising, me) {
    var w = winner(board);
    if (w) return w.player === me ? 100000 + depth : -100000 - depth;
    if (isFull(board)) return 0;
    if (depth === 0) return score(board, me);
    var moves = validMoves(board);
    var player = maximising ? me : (me === 1 ? 2 : 1);
    var best = maximising ? -Infinity : Infinity;
    for (var i = 0; i < moves.length; i++) {
      var v = search(drop(board, moves[i], player), depth - 1, alpha, beta, !maximising, me);
      if (maximising) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
      else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (alpha >= beta) break;
    }
    return best;
  }

  // The column the computer plays. Easy also makes a random move about a third of the time.
  function bestMove(board, me, level, rng) {
    var random = rng || Math.random;
    var moves = validMoves(board);
    if (!moves.length) return -1;
    if (level === "easy" && random() < 0.35) return moves[Math.floor(random() * moves.length)];
    var depth = DEPTH[level] || DEPTH.medium;
    var bestScore = -Infinity, choice = moves[0];
    for (var i = 0; i < moves.length; i++) {
      var v = search(drop(board, moves[i], me), depth - 1, -Infinity, Infinity, false, me);
      if (v > bestScore) { bestScore = v; choice = moves[i]; }
    }
    return choice;
  }

  window.ToolNestCalc = {
    COLS: COLS, ROWS: ROWS, LINES: LINES, emptyBoard: emptyBoard, landingRow: landingRow, drop: drop,
    validMoves: validMoves, winner: winner, isFull: isFull, bestMove: bestMove
  };

  // ---------------------------------------------------------------- Page

  var boardEl = document.getElementById("fr-board");
  if (!boardEl) return;

  var modeSelect = document.getElementById("fr-mode");
  var statusEl = document.getElementById("fr-status");
  var winsEl = document.getElementById("fr-wins");
  var lossesEl = document.getElementById("fr-losses");
  var drawsEl = document.getElementById("fr-draws");
  var turnEl = document.getElementById("fr-turn");
  var label1 = document.getElementById("fr-label-1");
  var label2 = document.getElementById("fr-label-2");

  var board;
  var turn = 1;
  var over = false;
  var thinking = false;
  var tally = { 1: 0, 2: 0, draw: 0 }; // this visit only
  var cells = [];
  var colBtns = [];

  // Column buttons sit above the board; the board itself is a grid of cells.
  var head = document.getElementById("fr-columns");
  for (var c = 0; c < COLS; c++) {
    (function (col) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fr-drop";
      b.setAttribute("aria-label", "Drop in column " + (col + 1));
      b.innerHTML = "<span aria-hidden=\"true\">↓</span>";
      b.addEventListener("click", function () { play(col); });
      head.appendChild(b);
      colBtns.push(b);
    })(c);
  }
  for (var i = 0; i < COLS * ROWS; i++) {
    var cell = document.createElement("span");
    cell.className = "fr-cell";
    cell.setAttribute("data-col", i % COLS);
    boardEl.appendChild(cell);
    cells.push(cell);
  }
  // Tapping anywhere in a column drops a counter there too.
  boardEl.addEventListener("click", function (e) {
    var t = e.target.closest(".fr-cell");
    if (t) play(Number(t.getAttribute("data-col")));
  });

  function vsComputer() {
    return modeSelect.value !== "friend";
  }

  function name(p) {
    if (vsComputer()) return p === 1 ? "You" : "The computer";
    return p === 1 ? "Player 1 (blue)" : "Player 2 (gold)";
  }

  function say(t) {
    statusEl.textContent = t;
  }

  function render(win, lastIdx) {
    cells.forEach(function (el, i) {
      el.className = "fr-cell" + (board[i] ? " p" + board[i] : "") + (win && win.cells.indexOf(i) !== -1 ? " is-win" : "") +
        (i === lastIdx ? " is-new" : "");
    });
    colBtns.forEach(function (b, col) { b.disabled = over || thinking || landingRow(board, col) === -1; });
    var rows = [];
    for (var r = 0; r < ROWS; r++) {
      rows.push(board.slice(r * COLS, r * COLS + COLS).map(function (v) { return v === 1 ? "B" : v === 2 ? "G" : "."; }).join(""));
    }
    boardEl.setAttribute("aria-label", "Board, top row first (B blue, G gold, dot empty): " + rows.join(", "));
    turnEl.textContent = over ? "Game over" : name(turn);
    winsEl.textContent = String(tally[1]);
    lossesEl.textContent = String(tally[2]);
    drawsEl.textContent = String(tally.draw);
  }

  function finishIfOver(lastIdx) {
    var w = winner(board);
    if (w) {
      over = true;
      tally[w.player]++;
      render(w, lastIdx);
      say(name(w.player) + (vsComputer() && w.player === 1 ? " win!" : " wins!") + " Press New game to play again.");
      if (G.flash) G.flash(boardEl, vsComputer() && w.player === 2 ? "fx-lose" : "fx-win");
      return true;
    }
    if (isFull(board)) {
      over = true;
      tally.draw++;
      render(null, lastIdx);
      say("It's a draw: the board is full.");
      return true;
    }
    return false;
  }

  function place(col) {
    var r = landingRow(board, col);
    board = drop(board, col, turn);
    return r * COLS + col;
  }

  function play(col) {
    if (over || thinking || landingRow(board, col) === -1) return;
    if (vsComputer() && turn !== 1) return;
    var idx = place(col);
    if (finishIfOver(idx)) return;
    turn = turn === 1 ? 2 : 1;
    if (!vsComputer()) {
      render(null, idx);
      say(name(turn) + " to play.");
      return;
    }
    thinking = true;
    render(null, idx);
    say("The computer is thinking…");
    setTimeout(function () {
      var reply = bestMove(board, 2, modeSelect.value);
      var cidx = place(reply);
      thinking = false;
      turn = 1;
      if (finishIfOver(cidx)) return;
      render(null, cidx);
      say("The computer played column " + (reply + 1) + ". Your turn.");
      colBtns[reply].focus();
    }, 350);
  }

  function newGame() {
    board = emptyBoard();
    turn = 1;
    over = false;
    thinking = false;
    label1.textContent = vsComputer() ? "Your wins" : "Player 1 wins";
    label2.textContent = vsComputer() ? "Computer wins" : "Player 2 wins";
    render();
    say(vsComputer() ? "You're blue and go first. Tap a column to drop a counter." : "Player 1 (blue) goes first. Tap a column to drop a counter.");
  }

  document.getElementById("fr-new").addEventListener("click", newGame);
  modeSelect.addEventListener("change", function () {
    tally = { 1: 0, 2: 0, draw: 0 };
    newGame();
  });
  newGame();
})();
