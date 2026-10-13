/* Unit Price Calculator: compares the price per gram, ounce, litre or item of up to four packs, to
   find the best value. Runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // Every unit in its group's base unit (grams, millilitres or items). Exact definitions.
  var UNITS = {
    g: { group: "weight", base: 1, name: "g" },
    kg: { group: "weight", base: 1000, name: "kg" },
    oz: { group: "weight", base: 28.349523125, name: "oz" },
    lb: { group: "weight", base: 453.59237, name: "lb" },
    ml: { group: "volume", base: 1, name: "ml" },
    l: { group: "volume", base: 1000, name: "litre" },
    usfloz: { group: "volume", base: 29.5735295625, name: "US fl oz" },
    ukfloz: { group: "volume", base: 28.4130625, name: "UK fl oz" },
    item: { group: "count", base: 1, name: "item" }
  };

  // The unit prices shown for each group.
  var SHOW = { weight: ["kg", "lb", "oz"], volume: ["l", "usfloz"], count: ["item"] };

  /*
   * items: [{ price, size, unit }] (blank rows left out by the caller).
   * Returns { rows: [{ perBase, per: { unit: price }, best, extraPct }], group } or { error }.
   * extraPct: how much more this one costs per unit than the cheapest (0 for the cheapest).
   */
  function compare(items) {
    if (items.length < 1) return { error: "Fill in at least one product." };
    var group = UNITS[items[0].unit].group;
    if (items.some(function (it) { return UNITS[it.unit].group !== group; })) {
      return { error: "Compare like with like: weights with weights, volumes with volumes, or items with items." };
    }
    var rows = items.map(function (it) {
      var perBase = it.price / (it.size * UNITS[it.unit].base);
      var per = {};
      SHOW[group].forEach(function (u) { per[u] = perBase * UNITS[u].base; });
      return { perBase: perBase, per: per };
    });
    var min = Math.min.apply(null, rows.map(function (r) { return r.perBase; }));
    rows.forEach(function (r) {
      r.best = Math.abs(r.perBase - min) < 1e-12;
      r.extraPct = min > 0 ? Math.round((r.perBase / min - 1) * 1000) / 10 : 0;
    });
    return { rows: rows, group: group };
  }

  window.ToolNestCalc = { compare: compare, UNITS: UNITS };

  var form = document.getElementById("up-form");
  if (!form) return;

  var el = function (id) { return document.getElementById(id); };
  var currency = el("currency");
  currency.value = T.initialCurrency();

  function readRows() {
    var out = [];
    var bad = false;
    for (var i = 1; i <= 4; i++) {
      var p = el("up-price-" + i), s = el("up-size-" + i), u = el("up-unit-" + i);
      var price = T.readNumber(p), size = T.readNumber(s);
      var blank = String(p.value).trim() === "" && String(s.value).trim() === "";
      var ok = blank || (price >= 0 && size > 0);
      p.closest(".up-row").classList.toggle("invalid", !ok);
      if (!ok) bad = true;
      if (!blank && ok) out.push({ index: i, price: price, size: size, unit: u.value });
    }
    return bad ? null : out;
  }

  function update() {
    document.querySelectorAll("[data-currency-symbol]").forEach(function (s) { s.textContent = T.CURRENCIES[currency.value].symbol; });
    for (var i = 1; i <= 4; i++) {
      el("up-out-" + i).textContent = "";
      el("up-row-" + i).classList.remove("is-best");
    }
    var rows = readRows();
    var msg = el("up-msg");
    if (!rows) { msg.textContent = "Check the highlighted rows: type a price and a size above 0."; el("up-best").textContent = "—"; return; }
    var r = compare(rows);
    if (r.error) { msg.textContent = r.error; el("up-best").textContent = "—"; return; }
    var money = function (n) { return T.formatMoney(n, currency.value, n < 0.1 ? 4 : n < 10 ? 3 : 2); };
    rows.forEach(function (row, k) {
      var res = r.rows[k];
      var text = Object.keys(res.per).map(function (u) { return money(res.per[u]) + " per " + UNITS[u].name; }).join(" · ");
      el("up-out-" + row.index).textContent = text + (res.best ? " · best value" : " · " + res.extraPct + "% more per " + (r.group === "count" ? "item" : "unit"));
      if (res.best && rows.length > 1) el("up-row-" + row.index).classList.add("is-best");
    });
    var bestIdx = rows.filter(function (row, k) { return r.rows[k].best; }).map(function (row) { return el("up-name-" + row.index).value.trim() || "Product " + row.index; });
    el("up-best").textContent = rows.length < 2 ? "Add another product to compare" : bestIdx.join(" and ");
    var sorted = r.rows.map(function (x) { return x.extraPct; }).sort(function (a, b) { return b - a; });
    msg.textContent = rows.length > 1 && sorted[0] > 0 ? "The most expensive costs " + sorted[0] + "% more per unit than the best value." : "";
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("up-clear").addEventListener("click", function () {
    for (var i = 1; i <= 4; i++) { el("up-price-" + i).value = ""; el("up-size-" + i).value = ""; el("up-name-" + i).value = ""; }
    update();
  });
  update();
})();
