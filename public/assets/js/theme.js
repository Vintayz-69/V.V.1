/* Chooses light or dark before the page is drawn, so it never flashes the wrong colours.
 * Loaded in <head> on every page. Follows the device's own light/dark setting; nothing is
 * stored (LEGAL.md §2). The header switch (common.js) changes it for the page being viewed.
 */
(function () {
  "use strict";
  var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();
