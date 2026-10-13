/* Homepage "Find a tool" box: opens the All tools page with the words typed. They go after a #,
   which browsers never send to the server, so searches aren't logged anywhere (LEGAL.md §2). */
(function () {
  "use strict";

  var form = document.getElementById("home-search");
  if (!form) return;
  var input = document.getElementById("home-search-input");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value.trim();
    window.location.href = form.getAttribute("action") + (q ? "#q=" + encodeURIComponent(q) : "#search");
  });
})();
