/* Word Search. A new grid every game, made in the browser from our own word lists. Nothing is stored. */
(function () {
  "use strict";

  var G = window.ToolNestGames;

  var THEMES = {
    office: { name: "At the office", words: ["DESK", "EMAIL", "MEETING", "LAPTOP", "DEADLINE", "INVOICE", "CLIENT", "PROJECT", "PRINTER", "STAPLER", "CALENDAR", "NOTEBOOK", "COFFEE", "KEYBOARD", "MONITOR", "FOLDER"] },
    money: { name: "Money", words: ["SAVINGS", "BUDGET", "INCOME", "PROFIT", "PENNY", "WALLET", "RECEIPT", "BANK", "PAYMENT", "CASH", "COINS", "PRICE", "DISCOUNT", "REFUND", "INTEREST", "PURSE"] },
    nature: { name: "Nature", words: ["RIVER", "FOREST", "MEADOW", "CANYON", "ISLAND", "VALLEY", "GLACIER", "DESERT", "OCEAN", "MAPLE", "WILLOW", "PEBBLE", "THUNDER", "BREEZE", "CLOVER", "SUNSET"] },
    kitchen: { name: "In the kitchen", words: ["KETTLE", "PEPPER", "GARLIC", "TOAST", "LADLE", "OVEN", "SPOON", "WHISK", "BUTTER", "ONION", "LEMON", "PASTA", "BLENDER", "NOODLE", "SALAD", "TEAPOT"] },
    travel: { name: "Travel", words: ["PASSPORT", "TICKET", "LUGGAGE", "HOTEL", "BEACH", "TRAIN", "AIRPORT", "JOURNEY", "CAMERA", "SUITCASE", "CRUISE", "BORDER", "COMPASS", "POSTCARD", "VILLAGE", "MAP"] }
  };

  // Directions as [row step, column step].
  var FORWARD = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  var ALL = FORWARD.concat([[0, -1], [-1, 0], [-1, -1], [1, -1]]);
  var LEVELS = {
    easy: { size: 10, count: 8, dirs: FORWARD },
    hard: { size: 12, count: 12, dirs: ALL }
  };
  var LETTERS = "ABCDEFGHIJKLMNOPRSTUVWY"; // filler letters (Q, X and Z left out so they don't look like clues)

  // The cells from a to b if they are in a straight line (across, down or diagonal), else null.
  function cellsBetween(a, b, size) {
    var r1 = Math.floor(a / size), c1 = a % size, r2 = Math.floor(b / size), c2 = b % size;
    var dr = r2 - r1, dc = c2 - c1;
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    var sr = Math.sign(dr), sc = Math.sign(dc);
    var out = [];
    for (var k = 0; k <= steps; k++) out.push((r1 + sr * k) * size + (c1 + sc * k));
    return out;
  }

  // Places the words, longest first. Words may cross where they share a letter.
  // Returns { grid: [letters], placed: [{ word, cells }] }, or null if it couldn't fit them all.
  function place(words, size, dirs, rng) {
    var random = rng || Math.random;
    var grid = [];
    for (var i = 0; i < size * size; i++) grid.push("");
    var placed = [];
    var order = words.slice().sort(function (a, b) { return b.length - a.length; });
    for (var w = 0; w < order.length; w++) {
      var word = order[w];
      var done = false;
      for (var attempt = 0; attempt < 300 && !done; attempt++) {
        var d = dirs[Math.floor(random() * dirs.length)];
        var r = Math.floor(random() * size), c = Math.floor(random() * size);
        var er = r + d[0] * (word.length - 1), ec = c + d[1] * (word.length - 1);
        if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
        var cells = [];
        var fits = true;
        for (var k = 0; k < word.length; k++) {
          var idx = (r + d[0] * k) * size + (c + d[1] * k);
          if (grid[idx] && grid[idx] !== word[k]) { fits = false; break; }
          cells.push(idx);
        }
        if (!fits) continue;
        cells.forEach(function (idx, k) { grid[idx] = word[k]; });
        placed.push({ word: word, cells: cells });
        done = true;
      }
      if (!done) return null;
    }
    return { grid: grid, placed: placed };
  }

  // Makes a puzzle: picks words from the theme, places them and fills the gaps with random letters.
  function generate(themeKey, levelKey, rng) {
    var random = rng || Math.random;
    var theme = THEMES[themeKey] || THEMES.office;
    var lv = LEVELS[levelKey] || LEVELS.easy;
    var pool = theme.words.filter(function (w) { return w.length <= lv.size; });
    for (var tries = 0; tries < 50; tries++) {
      var words = G.shuffle(pool, random).slice(0, lv.count);
      var result = place(words, lv.size, lv.dirs, random);
      if (!result) continue;
      result.grid = result.grid.map(function (ch) { return ch || LETTERS[Math.floor(random() * LETTERS.length)]; });
      result.size = lv.size;
      return result;
    }
    return null;
  }

  // Which placed word (if any) matches the selected cells, read either way.
  function match(placed, cells) {
    var key = cells.join(",");
    var back = cells.slice().reverse().join(",");
    for (var i = 0; i < placed.length; i++) {
      var p = placed[i].cells.join(",");
      if (p === key || p === back) return placed[i].word;
    }
    return null;
  }

  window.ToolNestCalc = { THEMES: THEMES, LEVELS: LEVELS, cellsBetween: cellsBetween, place: place, generate: generate, match: match };

  // ---------------------------------------------------------------- Page

  var gridEl = document.getElementById("ws-grid");
  if (!gridEl) return;

  var themeSelect = document.getElementById("ws-theme");
  var levelSelect = document.getElementById("ws-level");
  var listEl = document.getElementById("ws-words");
  var statusEl = document.getElementById("ws-status");
  var foundEl = document.getElementById("ws-found");
  var timeEl = document.getElementById("ws-time");
  var themeOut = document.getElementById("ws-theme-out");

  var puzzle;
  var found = {};
  var foundCells = {};
  var start = -1; // first cell of a tap-tap selection
  var dragFrom = -1;
  var preview = [];
  var cells = [];
  var clock = G.stopwatch(function (s) { timeEl.textContent = G.formatTime(s); });

  function say(t) {
    statusEl.textContent = t;
  }

  function renderList() {
    listEl.textContent = "";
    puzzle.placed.map(function (p) { return p.word; }).sort().forEach(function (w) {
      var li = document.createElement("li");
      li.textContent = w;
      if (found[w]) {
        li.className = "is-found";
        li.setAttribute("aria-label", w + ", found");
      }
      listEl.appendChild(li);
    });
    var n = Object.keys(found).length;
    foundEl.textContent = n + " / " + puzzle.placed.length;
  }

  function paint() {
    cells.forEach(function (el, i) {
      el.classList.toggle("is-found", !!foundCells[i]);
      el.classList.toggle("is-start", i === start);
      el.classList.toggle("is-preview", preview.indexOf(i) !== -1);
    });
  }

  function label(i) {
    var r = Math.floor(i / puzzle.size) + 1, c = i % puzzle.size + 1;
    return puzzle.grid[i] + ", row " + r + ", column " + c + (foundCells[i] ? ", in a found word" : "");
  }

  function newGame() {
    puzzle = generate(themeSelect.value, levelSelect.value);
    found = {};
    foundCells = {};
    start = -1;
    preview = [];
    clock.reset();
    themeOut.textContent = THEMES[themeSelect.value].name;
    gridEl.textContent = "";
    gridEl.className = "ws-grid ws-" + puzzle.size;
    cells = puzzle.grid.map(function (ch, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ws-cell";
      b.textContent = ch;
      b.setAttribute("data-i", i);
      b.setAttribute("aria-label", label(i));
      b.tabIndex = i === 0 ? 0 : -1;
      gridEl.appendChild(b);
      return b;
    });
    renderList();
    paint();
    say(levelSelect.value === "hard"
      ? "Words run in all 8 directions, including backwards. Tap the first and last letter of a word."
      : "Words run across, down or diagonally. Tap the first and last letter of a word, or drag across it.");
  }

  function trySelect(a, b) {
    var line = cellsBetween(a, b, puzzle.size);
    preview = [];
    start = -1;
    if (!line || line.length < 2) {
      paint();
      if (!line) say("Pick letters in a straight line.");
      return;
    }
    clock.start();
    var word = match(puzzle.placed, line);
    if (word && !found[word]) {
      found[word] = true;
      line.forEach(function (i) {
        foundCells[i] = true;
        cells[i].setAttribute("aria-label", label(i));
      });
      renderList();
      if (Object.keys(found).length === puzzle.placed.length) {
        clock.stop();
        say("You found all " + puzzle.placed.length + " words in " + G.formatTime(clock.seconds()) + "!");
      } else {
        say("Found " + word + "!");
      }
    } else if (word) {
      say(word + " is already found.");
    } else {
      say("That's not one of the words. Try again.");
    }
    paint();
  }

  function cellFrom(target) {
    var el = target && target.closest ? target.closest(".ws-cell") : null;
    return el ? Number(el.getAttribute("data-i")) : -1;
  }

  // Tap the first letter, then the last. Dragging across a word works too.
  gridEl.addEventListener("pointerdown", function (e) {
    var i = cellFrom(e.target);
    if (i === -1) return;
    dragFrom = i;
  });
  gridEl.addEventListener("pointermove", function (e) {
    if (dragFrom === -1) return;
    var i = cellFrom(document.elementFromPoint(e.clientX, e.clientY));
    if (i === -1 || i === dragFrom) return;
    preview = cellsBetween(dragFrom, i, puzzle.size) || [];
    paint();
  });
  gridEl.addEventListener("pointerup", function (e) {
    if (dragFrom === -1) return;
    var from = dragFrom;
    dragFrom = -1;
    var i = cellFrom(document.elementFromPoint(e.clientX, e.clientY));
    if (i !== -1 && i !== from) {
      trySelect(from, i);
      // The browser may follow a drag with a click; ignore that one click only.
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
    } else if (preview.length) {
      preview = [];
      paint();
    }
  });
  gridEl.addEventListener("pointercancel", function () {
    dragFrom = -1;
    preview = [];
    paint();
  });
  var suppressClick = false;
  gridEl.addEventListener("click", function (e) {
    if (suppressClick) { suppressClick = false; return; }
    var i = cellFrom(e.target);
    if (i === -1) return;
    if (start === -1) {
      start = i;
      preview = [];
      paint();
      say("First letter: " + puzzle.grid[i] + ". Now tap the last letter of the word.");
    } else if (start === i) {
      start = -1;
      paint();
      say("");
    } else {
      trySelect(start, i);
    }
  });
  gridEl.addEventListener("keydown", function (e) {
    var i = cellFrom(e.target);
    if (i === -1) return;
    var size = puzzle.size;
    var r = Math.floor(i / size), c = i % size;
    var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (!moves[e.key]) return;
    e.preventDefault();
    r = Math.min(size - 1, Math.max(0, r + moves[e.key][0]));
    c = Math.min(size - 1, Math.max(0, c + moves[e.key][1]));
    cells[i].tabIndex = -1;
    cells[r * size + c].tabIndex = 0;
    cells[r * size + c].focus();
  });

  document.getElementById("ws-new").addEventListener("click", newGame);
  themeSelect.addEventListener("change", newGame);
  levelSelect.addEventListener("change", newGame);

  newGame();
})();
