/* Search box on hub pages: hides the tool cards that don't match what's typed.
 * Runs in the browser only. What you type isn't sent anywhere, put in the address bar or saved
 * (LEGAL.md §2). Each card's words come from build.py (TOOLS: name, card, short, keywords).
 */

(function () {
  "use strict";

  // Words that don't help find a tool ("how to merge my pdf files" → "merge").
  var FILLER = {
    a: 1, an: 1, the: 1, to: 1, my: 1, i: 1, me: 1, how: 1, do: 1, can: 1, want: 1, need: 1, for: 1, of: 1,
    and: 1, into: 1, in: 1, on: 1, with: 1, online: 1, free: 1, tool: 1, tools: 1
  };

  function words(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, " ").split(" ").filter(Boolean);
  }

  // The words to look for: filler dropped, simple plurals made singular ("pdfs" → "pdf").
  function queryWords(query) {
    return words(query).filter(function (w) { return !FILLER[w]; }).map(function (w) {
      return w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w;
    });
  }

  // True when every query word starts a word in the text ("comp" matches "compress").
  function matches(text, query) {
    var wanted = queryWords(query);
    var have = " " + words(text).join(" ");
    return wanted.every(function (w) { return have.indexOf(" " + w) !== -1; });
  }

  /*
   * Where a bar sits in the 3D deck. k = how many places it is from the middle (negative =
   * above). The bars next to the middle stay readable, 72px away and tilted 25°; further bars
   * fan in 18px apart, tilting back 12° more a place (up to 60°), shrinking 5% a place, and
   * fade out after 4 places.
   * Returns { y (px from the middle), tilt (degrees, CSS rotateX), scale, opacity, z }.
   */
  var NEAR = 72;
  var PACK = 18;

  function deckPlace(k) {
    var a = Math.abs(k);
    var side = k < 0 ? -1 : 1;
    var lean = a <= 1 ? a * 25 : Math.min(60, 25 + (a - 1) * 12);
    return {
      y: a <= 1 ? k * NEAR : side * (NEAR + (a - 1) * PACK),
      tilt: -side * lean + 0, // above the middle: top edge leans away; below: bottom edge
      scale: 1 - Math.min(a, 5) * 0.05,
      opacity: a <= 4 ? 1 : Math.max(0, 1 - (a - 4) / 1.5),
      z: 100 - Math.round(a * 10)
    };
  }

  window.ToolNestSearch = { matches: matches, queryWords: queryWords, deckPlace: deckPlace };

  var input = document.getElementById("tool-search");
  if (!input) return;
  var status = document.getElementById("tool-search-status");
  var noun = input.getAttribute("data-noun") || "tools";
  var list = document.getElementById("tool-bars"); // the list of tool bars (optional)
  var deck = document.getElementById("tool-deck"); // its scrolling box
  var toggle = document.getElementById("deck-switch"); // Animation on/off (not remembered: no storage, LEGAL.md §2)
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function withWords(selector) {
    return Array.prototype.filter.call(document.querySelectorAll(selector), function (li) {
      return li.querySelector("[data-search]");
    });
  }
  var cards = withWords(".card-grid > li");
  var bars = withWords("#tool-bars > li");

  function shown(items) {
    return items.filter(function (li) { return !li.hidden; });
  }

  function update() {
    var query = input.value.trim();
    // Show results at once, without the fade-in cards normally get as they scroll into view.
    Array.prototype.forEach.call(document.querySelectorAll("main .reveal"), function (el) { el.classList.remove("reveal"); });
    cards.concat(bars).forEach(function (li) {
      li.hidden = !matches(li.querySelector("[data-search]").getAttribute("data-search"), query);
    });
    // Hide a whole group when none of its tools match.
    Array.prototype.forEach.call(document.querySelectorAll("main .section"), function (section) {
      var grid = section.querySelector(".card-grid");
      if (!grid) return;
      section.hidden = !Array.prototype.some.call(grid.children, function (li) { return !li.hidden; });
    });
    if (list) {
      list.parentNode.hidden = !shown(bars).length;
      sizeTrack();
      deck.scrollTop = 0; // puts the top result in the middle
      list.scrollTop = 0;
      animate();
    }
    var n = shown(bars.length ? bars : cards).length;
    if (!query) status.textContent = "";
    else if (!n) status.textContent = "No " + noun + " match “" + query + "”. Try a word like merge, split, compress or JPG.";
    else if (n === 1) status.textContent = "1 tool found. Press Enter to open it.";
    else status.textContent = n + " tools found.";
  }

  // ---------------- 3D deck: the box scrolls over an empty "track" as tall as the list of
  // tools, while the bars themselves stay pinned in view (position: sticky) and are placed
  // with deckPlace() from how far the box has scrolled. So scrolling, flicking and touch all
  // work as normal, and the bar in the middle changes every PITCH pixels.

  var PITCH = 72; // pixels of scrolling per bar
  var track = null;
  var on = false; // is the deck animation switched on?
  var frame = 0;
  var settle = 0;

  function animate() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function sizeTrack() {
    if (track) track.style.height = Math.max(0, shown(bars).length - 1) * PITCH + "px";
  }

  function place() {
    return deck.scrollTop / PITCH; // 2.5 = halfway between the 3rd and 4th bar
  }

  function draw() {
    frame = 0;
    if (!on) return;
    var mid = deck.clientHeight / 2;
    var pos = place();
    bars.forEach(function (li) { if (li.hidden) li.classList.remove("is-centre"); });
    shown(bars).forEach(function (li, i) {
      var p = deckPlace(i - pos);
      var top = mid - li.offsetHeight / 2 + p.y;
      li.style.transform = "translate3d(0," + top.toFixed(1) + "px,0)" +
        (reduceMotion ? "" : " rotateX(" + p.tilt.toFixed(1) + "deg)") + " scale(" + p.scale.toFixed(3) + ")";
      li.style.zIndex = p.z;
      li.style.opacity = p.opacity.toFixed(2);
      li.classList.toggle("is-centre", Math.abs(i - pos) < 0.5);
    });
  }

  function roll(i, smooth) {
    if (!on) return;
    deck.scrollTo({ top: i * PITCH, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
  }

  // When scrolling stops, ease the nearest bar into the middle.
  function settleSoon() {
    clearTimeout(settle);
    settle = setTimeout(function () {
      var nearest = Math.round(place());
      if (Math.abs(nearest - place()) > 0.02) roll(nearest, true);
    }, 140);
  }

  // Switches between the 3D deck and a plain scrolling list.
  function setDeck(want) {
    on = want;
    toggle.setAttribute("aria-checked", on ? "true" : "false");
    deck.classList.toggle("is-deck", on);
    track.hidden = !on;
    if (on) {
      sizeTrack();
      roll(Math.min(2, shown(bars).length - 1), false); // start with both stacks showing
      animate();
    } else {
      bars.forEach(function (li) {
        li.style.transform = "";
        li.style.zIndex = "";
        li.style.opacity = "";
        li.classList.remove("is-centre");
      });
      deck.scrollTop = 0;
      list.scrollTop = 0;
    }
  }

  if (list && deck && toggle) {
    track = document.createElement("div");
    track.className = "tool-deck-track";
    track.setAttribute("aria-hidden", "true");
    deck.appendChild(track);
    toggle.hidden = false;
    toggle.addEventListener("click", function () { setDeck(!on); });
    // On by default; people who ask their device for less motion start with it off.
    setDeck(!reduceMotion);
    deck.addEventListener("scroll", function () {
      animate();
      settleSoon();
    }, { passive: true });
    window.addEventListener("resize", animate);

    // A bar deep in a stack is rolled to the middle when tapped; the middle one and its
    // neighbours open straight away.
    list.addEventListener("click", function (e) {
      var li = e.target.closest && e.target.closest("li");
      var i = shown(bars).indexOf(li);
      if (on && i >= 0 && Math.abs(i - place()) >= 1.5) {
        e.preventDefault();
        roll(i, true);
      }
    });
    // Tabbing to a bar rolls it to the middle.
    list.addEventListener("focusin", function (e) {
      var i = shown(bars).indexOf(e.target.closest("li"));
      if (on && i >= 0 && Math.abs(i - place()) > 0.5) roll(i, true);
    });
    animate();
  }

  // ---------------- Keyboard: Enter opens the top tool; the arrow keys move between the box and the bars.

  function barLinks() {
    return shown(bars).map(function (li) { return li.querySelector("a"); });
  }

  function focusBar(link) {
    if (on) {
      link.focus({ preventScroll: true });
      roll(shown(bars).indexOf(link.parentNode), true);
    } else {
      link.focus();
    }
  }

  input.addEventListener("input", update);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && input.value) {
      input.value = "";
      update();
    } else if (e.key === "Enter" && input.value.trim()) {
      var first = shown(bars.length ? bars : cards)[0];
      if (first) window.location.href = first.querySelector("a").href;
    } else if (e.key === "ArrowDown" && list && barLinks().length) {
      e.preventDefault();
      focusBar(barLinks()[0]);
    }
  });

  if (list) {
    list.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      var links = barLinks();
      var at = links.indexOf(document.activeElement);
      if (at < 0) return;
      e.preventDefault();
      if (e.key === "ArrowUp" && at === 0) input.focus();
      else focusBar(links[Math.max(0, Math.min(links.length - 1, at + (e.key === "ArrowDown" ? 1 : -1)))]);
    });
  }
})();
