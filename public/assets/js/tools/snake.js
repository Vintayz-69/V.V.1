/* Snake: steer the snake to the food; each piece makes it one square longer. Our own code; nothing is stored. */
(function () {
  "use strict";

  var G = window.ToolNestGames;
  var SIZE = 15;
  var SPEEDS = { slow: 200, normal: 140, fast: 90 }; // milliseconds per step
  var DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  var OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

  // Snake cells are [row, col], head first.
  function newGame(rng) {
    var mid = Math.floor(SIZE / 2);
    var state = { snake: [[mid, 3], [mid, 2], [mid, 1]], dir: "right", queued: [], food: null, score: 0, dead: false };
    state.food = placeFood(state.snake, rng);
    return state;
  }

  // A random empty square (never under the snake). Returns null if the board is full.
  function placeFood(snake, rng) {
    var random = rng || Math.random;
    var taken = {};
    snake.forEach(function (p) { taken[p[0] * SIZE + p[1]] = true; });
    var free = [];
    for (var i = 0; i < SIZE * SIZE; i++) if (!taken[i]) free.push(i);
    if (!free.length) return null;
    var pick = free[Math.floor(random() * free.length)];
    return [Math.floor(pick / SIZE), pick % SIZE];
  }

  // Queues a turn. Turning straight back into yourself is ignored. Up to 2 turns are remembered,
  // so a quick "up then left" between steps isn't lost.
  function turn(state, dir) {
    if (!DIRS[dir] || state.dead) return state;
    var last = state.queued.length ? state.queued[state.queued.length - 1] : state.dir;
    if (dir === last || dir === OPPOSITE[last] || state.queued.length >= 2) return state;
    return Object.assign({}, state, { queued: state.queued.concat([dir]) });
  }

  // Moves one square. Hitting a wall or the snake's own body ends the game.
  function step(state, rng) {
    if (state.dead) return state;
    var dir = state.queued.length ? state.queued[0] : state.dir;
    var head = state.snake[0];
    var next = [head[0] + DIRS[dir][0], head[1] + DIRS[dir][1]];
    var eats = state.food && next[0] === state.food[0] && next[1] === state.food[1];
    // The tail moves away this step unless the snake is growing, so moving into it is allowed.
    var body = eats ? state.snake : state.snake.slice(0, -1);
    var hitsWall = next[0] < 0 || next[0] >= SIZE || next[1] < 0 || next[1] >= SIZE;
    var hitsSelf = body.some(function (p) { return p[0] === next[0] && p[1] === next[1]; });
    var out = Object.assign({}, state, { dir: dir, queued: state.queued.slice(1) });
    if (hitsWall || hitsSelf) {
      out.dead = true;
      return out;
    }
    out.snake = [next].concat(body);
    if (eats) {
      out.score = state.score + 1;
      out.food = placeFood(out.snake, rng);
    }
    return out;
  }

  window.ToolNestCalc = { SIZE: SIZE, SPEEDS: SPEEDS, newGame: newGame, placeFood: placeFood, turn: turn, step: step };

  // ---------------------------------------------------------------- Page

  var boardEl = document.getElementById("sn-board");
  if (!boardEl) return;

  var speedSelect = document.getElementById("sn-speed");
  var startBtn = document.getElementById("sn-start");
  var statusEl = document.getElementById("sn-status");
  var scoreEl = document.getElementById("sn-score");
  var lengthEl = document.getElementById("sn-length");
  var bestEl = document.getElementById("sn-best");

  var cells = [];
  for (var i = 0; i < SIZE * SIZE; i++) {
    var c = document.createElement("span");
    c.className = "sn-cell";
    boardEl.appendChild(c);
    cells.push(c);
  }

  var state = newGame();
  var timer = 0;
  var running = false;
  var paused = false;
  var best = {}; // best score per speed, this visit only

  function say(t) {
    statusEl.textContent = t;
  }

  function render() {
    cells.forEach(function (el) { el.className = "sn-cell"; });
    if (state.food) cells[state.food[0] * SIZE + state.food[1]].className = "sn-cell is-food";
    state.snake.forEach(function (p, k) {
      cells[p[0] * SIZE + p[1]].className = "sn-cell " + (k === 0 ? "is-head" : "is-body");
    });
    scoreEl.textContent = String(state.score);
    lengthEl.textContent = String(state.snake.length);
  }

  function stop() {
    clearInterval(timer);
    timer = 0;
    running = false;
  }

  function tick() {
    state = step(state);
    render();
    if (state.dead) {
      stop();
      var key = speedSelect.value;
      if (!best[key] || state.score > best[key]) best[key] = state.score;
      bestEl.textContent = String(best[key]);
      say("Game over! You ate " + state.score + " piece" + (state.score === 1 ? "" : "s") + " of food. Press Start to play again.");
      if (G.flash) G.flash(boardEl, "fx-lose");
      startBtn.textContent = "Start";
    } else if (!state.food) {
      stop();
      say("You filled the whole board. Amazing!");
      if (G.flash) G.flash(boardEl, "fx-win");
    }
  }

  function start() {
    stop();
    state = newGame();
    render();
    running = true;
    paused = false;
    startBtn.textContent = "Pause";
    timer = setInterval(tick, SPEEDS[speedSelect.value] || SPEEDS.normal);
    say("Use the arrow keys, swipe on the board, or the buttons below to steer.");
    boardEl.focus({ preventScroll: true });
  }

  function togglePause() {
    if (!running && !paused) return start();
    if (paused) {
      paused = false;
      running = true;
      startBtn.textContent = "Pause";
      timer = setInterval(tick, SPEEDS[speedSelect.value] || SPEEDS.normal);
      say("");
    } else {
      clearInterval(timer);
      timer = 0;
      paused = true;
      running = false;
      startBtn.textContent = "Resume";
      say("Paused.");
    }
  }

  function steer(dir) {
    if (!running) return;
    state = turn(state, dir);
  }

  startBtn.addEventListener("click", function () {
    if (state.dead || (!running && !paused)) start();
    else togglePause();
  });
  speedSelect.addEventListener("change", function () {
    stop();
    paused = false;
    state = newGame();
    render();
    startBtn.textContent = "Start";
    bestEl.textContent = best[speedSelect.value] !== undefined ? String(best[speedSelect.value]) : "—";
    say("Press Start to play.");
  });

  var KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    var inGame = t === document.body || (t.closest && t.closest(".sn-game"));
    if (!inGame || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (KEYS[e.key] && (running || paused)) {
      e.preventDefault();
      steer(KEYS[e.key]);
    } else if ((e.key === " " || e.key === "p" || e.key === "P") && t === boardEl) {
      e.preventDefault();
      togglePause();
    }
  });

  document.querySelectorAll("[data-sn-dir]").forEach(function (b) {
    b.addEventListener("click", function () { steer(b.getAttribute("data-sn-dir")); });
  });

  var sx = 0, sy = 0, tracking = false;
  boardEl.addEventListener("pointerdown", function (e) {
    tracking = true;
    sx = e.clientX;
    sy = e.clientY;
  });
  boardEl.addEventListener("pointerup", function (e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  boardEl.addEventListener("pointercancel", function () { tracking = false; });

  // Pause if the visitor switches tab, so they don't lose the game while away.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && running) togglePause();
  });

  render();
  say("Press Start to play.");
})();
