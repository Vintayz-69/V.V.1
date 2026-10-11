/* All tools page: filters the A to Z list as you type. Uses the matching rules in tool-search.js.
   What you type isn't sent anywhere or saved (LEGAL.md §2). */
(function () {
  "use strict";

  var input = document.getElementById("az-search");
  if (!input || !window.ToolNestSearch) return;
  var S = window.ToolNestSearch;
  var groups = Array.prototype.slice.call(document.querySelectorAll(".az-group"));
  var status = document.getElementById("az-status");
  var none = document.getElementById("az-none");
  var total = document.querySelectorAll(".az-list li").length;

  function filter() {
    var q = input.value;
    var shown = 0;
    groups.forEach(function (g) {
      var any = false;
      Array.prototype.forEach.call(g.querySelectorAll("li"), function (li) {
        var ok = !q.trim() || S.matches(li.getAttribute("data-search"), q);
        li.hidden = !ok;
        if (ok) { any = true; shown++; }
      });
      g.hidden = !any;
    });
    none.hidden = shown > 0;
    status.textContent = q.trim() ? shown + (shown === 1 ? " tool matches." : " tools match.") : total + " free tools.";
  }

  input.addEventListener("input", filter);
  input.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var first = document.querySelector(".az-list li:not([hidden]) a");
    if (first && input.value.trim()) first.click();
  });
  filter();
})();
