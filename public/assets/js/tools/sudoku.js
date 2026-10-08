/* Sudoku: every puzzle is made fresh in the browser and has exactly one solution. Nothing is stored. */
(function () {
  "use strict";

  var G = window.ToolNestGames;

  // How many numbers each level starts with. Fewer given numbers make a harder puzzle.
  var CLUES = { easy: 40, medium: 32, hard: 26 };

  var ROW = [], COL = [], BOX = [], PEERS = [];
  for (var c = 0; c < 81; c++) {
    ROW[c] = Math.floor(c / 9);
    COL[c] = c % 9;
    BOX[c] = Math.floor(ROW[c] / 3) * 3 + Math.floor(COL[c] / 3);
  }
  for (var a = 0; a < 81; a++) {
    PEERS[a] = [];
    for (var b = 0; b < 81; b++) {
      if (a !== b && (ROW[a] === ROW[b] || COL[a] === COL[b] || BOX[a] === BOX[b])) PEERS[a].push(b);
    }
  }

  // Can number n go in cell idx without repeating in its row, column or box?
  function canPlace(grid, idx, n) {
    var p = PEERS[idx];
    for (var i = 0; i < p.length; i++) if (grid[p[i]] === n) return false;
    return true;
  }

  // Cells that break the rules (the same number twice in a row, column or box).
  function conflicts(grid) {
    var bad = [];
    for (var i = 0; i < 81; i++) {
      if (grid[i] && !canPlace(grid, i, grid[i])) bad.push(i);
    }
    return bad;
  }

  // Counts solutions, stopping at `limit`. Tries the cell with the fewest options first.
  // If `rng` is given, numbers are tried in random order (used to make new full grids).
  function search(grid, limit, rng, found) {
    var best = -1;
    var bestOptions = null;
    for (var i = 0; i < 81; i++) {
      if (grid[i]) continue;
      var options = [];
      for (var n = 1; n <= 9; n++) if (canPlace(grid, i, n)) options.push(n);
      if (!options.length) return 0;
      if (!bestOptions || options.length < bestOptions.length) {
        best = i;
        bestOptions = options;
        if (options.length === 1) break;
      }
    }
    if (best === -1) {
      if (found) found.push(grid.slice());
      return 1;
    }
    if (rng) bestOptions = G.shuffle(bestOptions, rng);
    var count = 0;
    for (var k = 0; k < bestOptions.length && count < limit; k++) {
      grid[best] = bestOptions[k];
      count += search(grid, limit - count, rng, found);
      grid[best] = 0;
    }
    return count;
  }

  // A grid that already breaks a rule has no solution (checked first, so the search stays quick).
  function countSolutions(grid, limit) {
    if (conflicts(grid).length) return 0;
    return search(grid.slice(), limit || 2, null, null);
  }

  // Returns the solved grid, or null if the puzzle has no solution.
  function solve(grid) {
    if (conflicts(grid).length) return null;
    var found = [];
    search(grid.slice(), 1, null, found);
    return found.length ? found[0] : null;
  }

  // Makes a puzzle with exactly one solution. Removes numbers one at a time (in random order)
  // and puts a number back if taking it away would allow a second solution.
  function generate(level, rng) {
    var random = rng || Math.random;
    var target = CLUES[level] || CLUES.medium;
    var found = [];
    var empty = [];
    for (var i = 0; i < 81; i++) empty.push(0);
    search(empty, 1, random, found);
    var solution = found[0];
    var puzzle = solution.slice();
    var clues = 81;
    var order = G.shuffle(Array.apply(null, Array(81)).map(function (_, n) { return n; }), random);
    for (var k = 0; k < order.length && clues > target; k++) {
      var cell = order[k];
      var keep = puzzle[cell];
      puzzle[cell] = 0;
      if (countSolutions(puzzle, 2) !== 1) puzzle[cell] = keep;
      else clues--;
    }
    return { puzzle: puzzle, solution: solution, clues: clues };
  }

  // A grid is solved when every cell is filled and nothing breaks the rules.
  function isSolved(grid) {
    for (var i = 0; i < 81; i++) if (!grid[i]) return false;
    return conflicts(grid).length === 0;
  }

  window.ToolNestCalc = {
    canPlace: canPlace, conflicts: conflicts, countSolutions: countSolutions,
    solve: solve, generate: generate, isSolved: isSolved, CLUES: CLUES
  };

  // ---------------------------------------------------------------- Page

  var boardEl = document.getElementById("sudoku-board");
  if (!boardEl) return;

  var levelSelect = document.getElementById("sudoku-level");
  var statusEl = document.getElementById("sudoku-status");
  var notesBtn = document.getElementById("sudoku-notes");
  var timeEl = document.getElementById("sudoku-time");
  var hintsEl = document.getElementById("sudoku-hints");
  var filledEl = document.getElementById("sudoku-filled");
  var levelEl = document.getElementById("sudoku-level-out");

  var game = null;
  var values = [];
  var notes = [];
  var given = [];
  var selected = 0;
  var notesMode = false;
  var hints = 0;
  var finished = false;
  var clock = G.stopwatch(function (s) { timeEl.textContent = G.formatTime(s); });

  var cellEls = [];
  for (var i = 0; i < 81; i++) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sudoku-cell";
    btn.setAttribute("data-cell", i);
    if (COL[i] === 2 || COL[i] === 5) btn.classList.add("edge-right");
    if (ROW[i] === 2 || ROW[i] === 5) btn.classList.add("edge-bottom");
    btn.tabIndex = -1;
    boardEl.appendChild(btn);
    cellEls.push(btn);
  }

  function say(text) {
    statusEl.textContent = text;
  }

  function render() {
    var bad = conflicts(values);
    var selValue = values[selected];
    var filled = 0;
    cellEls.forEach(function (el, i) {
      var v = values[i];
      if (v) filled++;
      el.className = "sudoku-cell";
      if (COL[i] === 2 || COL[i] === 5) el.classList.add("edge-right");
      if (ROW[i] === 2 || ROW[i] === 5) el.classList.add("edge-bottom");
      if (given[i]) el.classList.add("given");
      if (i !== selected && (ROW[i] === ROW[selected] || COL[i] === COL[selected] || BOX[i] === BOX[selected])) {
        el.classList.add("peer");
      }
      if (selValue && v === selValue && i !== selected) el.classList.add("same");
      if (bad.indexOf(i) !== -1) el.classList.add("conflict");
      if (i === selected) el.classList.add("selected");
      el.tabIndex = i === selected ? 0 : -1;
      el.textContent = "";
      if (v) {
        el.textContent = String(v);
      } else if (notes[i].length) {
        var box = document.createElement("span");
        box.className = "sudoku-notes";
        for (var n = 1; n <= 9; n++) {
          var s = document.createElement("span");
          s.textContent = notes[i].indexOf(n) !== -1 ? String(n) : "";
          box.appendChild(s);
        }
        el.appendChild(box);
      }
      var label = "Row " + (ROW[i] + 1) + ", column " + (COL[i] + 1) + ", " +
        (v ? v + (given[i] ? ", given" : "") : "empty" + (notes[i].length ? ", notes " + notes[i].join(" ") : ""));
      el.setAttribute("aria-label", label);
    });
    filledEl.textContent = filled + " / 81";
    hintsEl.textContent = String(hints);
  }

  function newGame() {
    say("Making a new puzzle…");
    var level = levelSelect.value;
    // Let the message show before the (short) work of making the puzzle.
    setTimeout(function () {
      game = generate(level);
      values = game.puzzle.slice();
      given = values.map(function (v) { return v !== 0; });
      notes = values.map(function () { return []; });
      hints = 0;
      finished = false;
      selected = values.indexOf(0);
      levelEl.textContent = levelSelect.options[levelSelect.selectedIndex].text;
      clock.reset();
      say("New " + level + " puzzle with " + game.clues + " numbers given. Pick a square, then a number.");
      render();
    }, 20);
  }

  function checkWin() {
    if (!isSolved(values)) return;
    finished = true;
    clock.stop();
    var t = G.formatTime(clock.seconds());
    G.flash(boardEl, "fx-win");
    say("Solved in " + t + (hints ? " with " + hints + " hint" + (hints > 1 ? "s" : "") : " with no hints") + ". Well done!");
  }

  function enter(n) {
    if (finished || given[selected]) return;
    clock.start();
    if (notesMode && n) {
      if (values[selected]) return;
      var list = notes[selected];
      var at = list.indexOf(n);
      if (at === -1) list.push(n); else list.splice(at, 1);
      list.sort();
    } else {
      values[selected] = values[selected] === n ? 0 : n;
      if (n === 0) notes[selected] = [];
      if (values[selected]) {
        // Clear this number from the notes of cells it now rules out.
        PEERS[selected].forEach(function (p) {
          var k = notes[p].indexOf(n);
          if (k !== -1) notes[p].splice(k, 1);
        });
      }
    }
    render();
    checkWin();
  }

  function select(i, focus) {
    selected = i;
    render();
    if (focus) cellEls[i].focus();
  }

  boardEl.addEventListener("click", function (e) {
    var cell = e.target.closest(".sudoku-cell");
    if (cell) select(Number(cell.getAttribute("data-cell")), true);
  });

  boardEl.addEventListener("keydown", function (e) {
    var r = ROW[selected], c = COL[selected];
    var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      r = (r + moves[e.key][0] + 9) % 9;
      c = (c + moves[e.key][1] + 9) % 9;
      select(r * 9 + c, true);
    } else if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      enter(Number(e.key));
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      e.preventDefault();
      enter(0);
    } else if (e.key === "n" || e.key === "N") {
      toggleNotes();
    }
  });

  document.querySelectorAll("[data-sudoku-num]").forEach(function (b) {
    b.addEventListener("click", function () { enter(Number(b.getAttribute("data-sudoku-num"))); });
  });

  function toggleNotes() {
    notesMode = !notesMode;
    notesBtn.setAttribute("aria-pressed", notesMode ? "true" : "false");
    notesBtn.classList.toggle("is-on", notesMode);
  }
  notesBtn.addEventListener("click", toggleNotes);

  document.getElementById("sudoku-hint").addEventListener("click", function () {
    if (finished || !game) return;
    // Fill the selected square, or the first empty or wrong one if it's already right.
    var target = selected;
    if (given[target] || values[target] === game.solution[target]) {
      target = -1;
      for (var i = 0; i < 81; i++) {
        if (values[i] !== game.solution[i]) { target = i; break; }
      }
    }
    if (target === -1) return;
    clock.start();
    values[target] = game.solution[target];
    notes[target] = [];
    hints++;
    selected = target;
    say("Hint: row " + (ROW[target] + 1) + ", column " + (COL[target] + 1) + " is " + game.solution[target] + ".");
    render();
    checkWin();
  });

  document.getElementById("sudoku-check").addEventListener("click", function () {
    if (!game) return;
    var wrong = 0;
    var empty = 0;
    for (var i = 0; i < 81; i++) {
      if (!values[i]) empty++;
      else if (values[i] !== game.solution[i]) wrong++;
    }
    if (finished) return;
    if (wrong) say(wrong + " number" + (wrong > 1 ? "s don't" : " doesn't") + " match the solution. " + empty + " square" + (empty === 1 ? "" : "s") + " still empty.");
    else say("Everything so far is correct. " + empty + " square" + (empty === 1 ? "" : "s") + " to go.");
  });

  document.getElementById("sudoku-new").addEventListener("click", newGame);
  levelSelect.addEventListener("change", newGame);

  newGame();
})();
