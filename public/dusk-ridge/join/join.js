// Dusk Ridge "join a friend" page. Reads the room code from the link and
// opens the game. Nothing is sent or stored.
(function () {
  // Hide the icon if the picture is missing, instead of showing a broken image.
  var icon = document.querySelector("img.icon");
  if (icon) {
    var hide = function () { icon.remove(); };
    if (icon.complete && icon.naturalWidth === 0) hide();
    else icon.addEventListener("error", hide);
  }

  // Code from ?c=AB12 (or #c=AB12, which never reaches the server).
  var m = /[?&#]c=([A-Za-z0-9]{4})/.exec(location.search + location.hash);
  var code = m ? m[1].toUpperCase() : "";
  var store = "https://play.google.com/store/apps/details?id=com.vintayz.duskridge";
  if (code) document.getElementById("code").textContent = code;
  var app = "intent://join/" + code + "#Intent;scheme=duskridge;package=com.vintayz.duskridge;S.browser_fallback_url=" + encodeURIComponent(store) + ";end";
  var link = document.getElementById("open");
  link.href = code ? app : store;
  if (code && /Android/i.test(navigator.userAgent)) setTimeout(function () { location.href = app; }, 400);
})();
