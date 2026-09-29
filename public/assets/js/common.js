/* ToolNest shared helpers — used by every page. Stores nothing on the visitor's device (LEGAL.md §2). */

(function () {
  "use strict";

  // Each currency is shown the way people in that country expect to read it.
  var CURRENCIES = {
    USD: { locale: "en-US", symbol: "$" },
    GBP: { locale: "en-GB", symbol: "£" },
    CAD: { locale: "en-CA", symbol: "C$" },
    AUD: { locale: "en-AU", symbol: "A$" }
  };

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function formatMoney(amount, currency, decimals) {
    var info = CURRENCIES[currency] || CURRENCIES.USD;
    var digits = typeof decimals === "number" ? decimals : 2;
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(amount);
  }

  // Whole numbers show no decimals; anything else shows one.
  function formatNumber(value, decimals) {
    var digits = typeof decimals === "number" ? decimals : (value % 1 ? 1 : 0);
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  // Guess a sensible default from the browser language (en-GB → GBP, etc.).
  function initialCurrency() {
    var lang = (navigator.language || "").toUpperCase();
    if (lang.indexOf("-GB") !== -1) return "GBP";
    if (lang.indexOf("-CA") !== -1) return "CAD";
    if (lang.indexOf("-AU") !== -1) return "AUD";
    return "USD";
  }

  // Reads a number from an input; returns NaN for blank or non-numeric text.
  function readNumber(input) {
    var raw = String(input.value).replace(/[,\s]/g, "").trim();
    if (raw === "") return NaN;
    return Number(raw);
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Soft highlight when a result changes.
  function pulse(el) {
    if (!el || reduceMotion) return;
    el.classList.remove("pulse");
    void el.offsetWidth; // restart the animation
    el.classList.add("pulse");
  }

  /*
   * Wires up a calculator form.
   *   rules:    { inputId: { min, max } } — numeric inputs to validate
   *   defaults: { elementId: value } — restored by the #reset button
   *   outputs:  [ids] — cleared to "—" when inputs are invalid
   *   check:    optional (values) => { inputId: "message" } for cross-field problems
   *   render:   (values, currency) => void
   *   onInvalid: optional () => void
   * Inputs inside a hidden .field are skipped.
   */
  function setupCalculator(opts) {
    var form = document.getElementById(opts.form || "calc-form");
    var currencySelect = document.getElementById("currency");
    var mainResult = document.querySelector(".result-main");
    var lastMain = "";
    var flagged = []; // fields marked invalid by opts.check on the last run

    if (currencySelect && !opts.keepCurrency) currencySelect.value = initialCurrency();

    function markField(input, ok, message) {
      var field = input.closest(".field");
      field.classList.toggle("invalid", !ok);
      input.setAttribute("aria-invalid", ok ? "false" : "true");
      var msg = field.querySelector(".error-msg");
      if (msg) {
        if (!msg.dataset.base) msg.dataset.base = msg.textContent;
        msg.textContent = message || msg.dataset.base;
      }
    }

    function readAll() {
      var values = {};
      var valid = true;
      flagged.forEach(function (id) { markField(document.getElementById(id), true); });
      flagged = [];
      Object.keys(opts.rules).forEach(function (id) {
        var input = document.getElementById(id);
        var field = input.closest(".field");
        if (field.hidden) {
          markField(input, true);
          return;
        }
        var rule = opts.rules[id];
        if (rule.optional && String(input.value).trim() === "") {
          markField(input, true);
          values[id] = null;
          return;
        }
        var n = readNumber(input);
        var ok = isFinite(n) && n >= rule.min && n <= rule.max;
        markField(input, ok);
        if (!ok) valid = false;
        values[id] = n;
      });
      if (valid && opts.check) {
        var problems = opts.check(values) || {};
        Object.keys(problems).forEach(function (id) {
          markField(document.getElementById(id), false, problems[id]);
          flagged.push(id);
          valid = false;
        });
      }
      return valid ? values : null;
    }

    function update() {
      var currency = currencySelect ? currencySelect.value : "USD";
      document.querySelectorAll("[data-currency-symbol]").forEach(function (el) {
        el.textContent = CURRENCIES[currency].symbol;
      });

      var values = readAll();
      if (!values) {
        (opts.outputs || []).forEach(function (id) { setText(id, "—"); });
        if (opts.onInvalid) opts.onInvalid();
        lastMain = "";
        return;
      }
      opts.render(values, currency);

      if (mainResult && mainResult.textContent !== lastMain) {
        if (lastMain) pulse(mainResult);
        lastMain = mainResult.textContent;
      }
    }

    var bar = initResultBar(form, mainResult);
    var baseUpdate = update;
    update = function () {
      baseUpdate();
      if (bar) bar.value.textContent = mainResult.textContent.replace(/\s+/g, " ").trim();
    };

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    var reset = document.getElementById("reset");
    if (reset && opts.defaults) {
      reset.addEventListener("click", function () {
        Object.keys(opts.defaults).forEach(function (id) {
          var el = document.getElementById(id);
          if (el.type === "checkbox") el.checked = opts.defaults[id];
          else el.value = opts.defaults[id];
        });
        if (opts.onReset) opts.onReset();
        update();
      });
    }

    update();
    return { update: update };
  }

  // Phones: a small bar pinned to the bottom shows the main result while the form is on
  // screen and the full results panel isn't. Hidden on wider screens by CSS.
  function initResultBar(form, mainResult) {
    var panel = document.querySelector(".calc-results");
    if (!panel || !mainResult || !("IntersectionObserver" in window)) return null;
    if (!panel.id) panel.id = "results";

    var link = document.createElement("a");
    link.className = "result-bar";
    link.href = "#" + panel.id;
    var label = document.createElement("span");
    label.className = "result-bar-label";
    label.textContent = (panel.querySelector("h2") || {}).textContent || "Result";
    var value = document.createElement("strong");
    link.appendChild(label);
    link.appendChild(value);
    document.body.appendChild(link);

    var formVisible = false;
    var panelVisible = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.target === form) formVisible = e.isIntersecting;
        else panelVisible = e.isIntersecting;
      });
      link.classList.toggle("show", formVisible && !panelVisible);
    }, { threshold: 0 });
    observer.observe(form);
    observer.observe(panel);
    return { value: value };
  }

  // Builds table rows from arrays of cells; the row matching `highlight` is marked "yours".
  function tableRows(rows, highlightIndex) {
    return rows.map(function (cells, i) {
      var cls = i === highlightIndex ? ' class="is-yours"' : "";
      return "<tr" + cls + ">" + cells.map(function (c, j) {
        return j === 0 ? "<td>" + c + "</td>" : '<td class="num">' + c + "</td>";
      }).join("") + "</tr>";
    }).join("");
  }

  // Gentle fade-up for content below the fold. Content above the fold is never hidden.
  function initReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var targets = document.querySelectorAll(
      "main .section-head, main .card-grid > li, main .feature, main .country, main .content > h2, main .content > .table-wrap, main .content > .formula, main .content > .faq, main .content > .steps"
    );
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });

    var fold = window.innerHeight;
    targets.forEach(function (el) {
      if (el.getBoundingClientRect().top < fold) return;
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(siblings % 3, 2) * 70 + "ms";
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  // 3D tilt for [data-tilt] elements: the point under the cursor sinks back into the screen.
  // Mouse/trackpad only; skipped for touch screens and reduced-motion users.
  function initTilt() {
    if (reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var MAX = 10; // degrees

    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var rect = null;
      var frame = 0;
      var px = 0;
      var py = 0;

      function apply() {
        frame = 0;
        var nx = Math.max(-1, Math.min(1, ((px - rect.left) / rect.width) * 2 - 1));
        var ny = Math.max(-1, Math.min(1, ((py - rect.top) / rect.height) * 2 - 1));
        el.style.setProperty("--ry", (nx * MAX).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-ny * MAX).toFixed(2) + "deg");
        el.style.setProperty("--mx", ((nx + 1) * 50).toFixed(1) + "%");
        el.style.setProperty("--my", ((ny + 1) * 50).toFixed(1) + "%");
      }

      el.addEventListener("pointerenter", function () {
        rect = el.getBoundingClientRect(); // measured flat, so tilting doesn't feed back
        el.classList.add("is-tilting");
      });
      el.addEventListener("pointermove", function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        px = e.clientX;
        py = e.clientY;
        if (!frame) frame = requestAnimationFrame(apply);
      });
      el.addEventListener("pointerleave", function () {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        rect = null;
        el.classList.remove("is-tilting");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  window.ToolNest = {
    CURRENCIES: CURRENCIES,
    formatMoney: formatMoney,
    formatNumber: formatNumber,
    initialCurrency: initialCurrency,
    readNumber: readNumber,
    setText: setText,
    setupCalculator: setupCalculator,
    tableRows: tableRows
  };

  // The header's Calculators and Country menus are <details> elements and work on their own; this also
  // closes it on Escape, on a click outside, and when keyboard focus moves away.
  function initNavMenus() {
    var menus = document.querySelectorAll(".nav-menu");
    if (!menus.length) return;

    function closeOutside(target) {
      Array.prototype.forEach.call(menus, function (menu) {
        if (menu.open && !menu.contains(target)) menu.open = false;
      });
    }

    document.addEventListener("click", function (e) { closeOutside(e.target); });
    document.addEventListener("focusin", function (e) { closeOutside(e.target); });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      Array.prototype.forEach.call(menus, function (menu) {
        if (!menu.open) return;
        menu.open = false;
        menu.querySelector("summary").focus();
      });
    });
  }

  // Light/dark switch in the header. theme.js has already set data-theme on <html> from the
  // device's setting; the switch flips it for this page. Nothing is stored (LEGAL.md §2), so the
  // next page follows the device again.
  function initThemeSwitch() {
    var button = document.getElementById("theme-toggle");
    if (!button) return;
    var root = document.documentElement;
    var chosen = false; // pressed on this page?

    function isDark() {
      return root.getAttribute("data-theme") === "dark";
    }

    function show() {
      button.setAttribute("aria-checked", isDark() ? "true" : "false");
      button.title = isDark() ? "Switch to light mode" : "Switch to dark mode";
    }

    button.hidden = false;
    show();
    button.addEventListener("click", function () {
      chosen = true;
      root.setAttribute("data-theme", isDark() ? "light" : "dark");
      show();
    });

    // If the device changes between light and dark (e.g. at sunset), follow it, unless the
    // visitor has used the switch on this page.
    var media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    if (media && media.addEventListener) {
      media.addEventListener("change", function (e) {
        if (chosen) return;
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
        show();
      });
    }
  }

  function onReady() {
    initThemeSwitch();
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    initNavMenus();
    initReveal();
    initTilt();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
  else onReady();
})();
