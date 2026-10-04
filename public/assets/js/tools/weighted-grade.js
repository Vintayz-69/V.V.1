/* Weighted Grade Calculator: your course grade so far from weighted categories
   (homework, quizzes, exams…). Runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;

  // rows: [{ weight, score }] in percent. Rows missing either number are skipped.
  function calculate(v) {
    var totalWeight = 0;
    var earned = 0;
    (v.rows || []).forEach(function (r) {
      var w = Number(r.weight);
      var s = Number(r.score);
      if (!(w > 0) || !isFinite(s) || r.score === "" || r.score == null) return;
      totalWeight += w;
      earned += w * s / 100;
    });
    return {
      average: totalWeight > 0 ? Math.round(earned / totalWeight * 10000) / 100 : 0,
      totalWeight: Math.round(totalWeight * 100) / 100,
      earned: Math.round(earned * 100) / 100,
      remaining: Math.max(0, Math.round((100 - totalWeight) * 100) / 100)
    };
  }

  window.ToolNestCalc = calculate;

  var tbody = document.getElementById("wg-body");
  if (!tbody) return;

  var EXAMPLE = [
    { name: "Homework", weight: 20, score: 92 },
    { name: "Quizzes", weight: 15, score: 85 },
    { name: "Midterm exam", weight: 25, score: 78 },
    { name: "Project", weight: 15, score: 88 },
    { name: "Final exam", weight: 25, score: "" }
  ];
  var count = 0;

  function cellInput(cls, label, value, mode) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = cls;
    input.autocomplete = "off";
    input.setAttribute("aria-label", label);
    if (mode) input.inputMode = mode;
    input.value = value;
    var td = document.createElement("td");
    td.appendChild(input);
    return td;
  }

  function addRow(row) {
    count++;
    var tr = document.createElement("tr");
    tr.className = "wg-row";
    tr.appendChild(cellInput("wg-name", "Category " + count + " name", row.name || "", ""));
    tr.appendChild(cellInput("wg-weight num", "Category " + count + " weight (%)", row.weight === "" ? "" : String(row.weight), "decimal"));
    tr.appendChild(cellInput("wg-score num", "Category " + count + " score (%)", row.score === "" ? "" : String(row.score), "decimal"));
    var del = document.createElement("button");
    del.type = "button";
    del.className = "btn-del-course";
    del.setAttribute("aria-label", "Remove category " + count);
    del.title = "Remove";
    del.textContent = "×";
    del.addEventListener("click", function () {
      if (tbody.querySelectorAll(".wg-row").length > 1) {
        tr.remove();
        update();
      }
    });
    var td = document.createElement("td");
    td.appendChild(del);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function readRows() {
    var rows = [];
    var bad = false;
    tbody.querySelectorAll(".wg-row").forEach(function (tr) {
      var wIn = tr.querySelector(".wg-weight");
      var sIn = tr.querySelector(".wg-score");
      var w = T.readNumber(wIn);
      var s = T.readNumber(sIn);
      var wBad = String(wIn.value).trim() !== "" && !(isFinite(w) && w >= 0 && w <= 100);
      var sBad = String(sIn.value).trim() !== "" && !(isFinite(s) && s >= 0 && s <= 200);
      wIn.setAttribute("aria-invalid", wBad ? "true" : "false");
      sIn.setAttribute("aria-invalid", sBad ? "true" : "false");
      if (wBad || sBad) bad = true;
      rows.push({ weight: isFinite(w) ? w : 0, score: isFinite(s) ? s : "" });
    });
    return bad ? null : rows;
  }

  function update() {
    var rows = readRows();
    var msg = document.getElementById("wg-error");
    if (!rows) {
      msg.hidden = false;
      msg.textContent = "Weights must be between 0 and 100, and scores between 0 and 200.";
      ["out-average", "out-weight", "out-earned", "out-remaining"].forEach(function (id) { T.setText(id, "—"); });
      return;
    }
    var r = calculate({ rows: rows });
    msg.hidden = r.totalWeight <= 100;
    msg.textContent = r.totalWeight > 100 ? "Your weights add up to more than 100%. Check them against your syllabus." : "";
    T.setText("out-average", r.totalWeight > 0 ? T.formatNumber(r.average, 2) + "%" : "—");
    T.setText("out-weight", T.formatNumber(r.totalWeight) + "% of the course");
    T.setText("out-earned", T.formatNumber(r.earned, 2) + " of " + T.formatNumber(r.totalWeight) + " points");
    T.setText("out-remaining", T.formatNumber(r.remaining) + "%");
  }

  function reset() {
    tbody.textContent = "";
    count = 0;
    EXAMPLE.forEach(addRow);
    update();
  }

  tbody.addEventListener("input", update);
  document.getElementById("wg-add").addEventListener("click", function () {
    addRow({ name: "", weight: "", score: "" });
    tbody.querySelector(".wg-row:last-child .wg-name").focus();
  });
  document.getElementById("wg-reset").addEventListener("click", reset);
  reset();
})();
