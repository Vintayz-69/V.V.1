/* Regex tester's matching, run in a Web Worker so a pattern that takes forever (catastrophic
   backtracking) can be stopped without freezing the page. Also loaded by the tests. */
(function () {
  "use strict";

  var MAX_MATCHES = 1000;

  /*
   * → { matches: [{ index, text, groups: [..], named: {..} }], total, replaced, capped } or { error }
   * replacement: null for no replace preview.
   */
  function run(pattern, flags, text, replacement) {
    var re;
    try { re = new RegExp(pattern, flags); } catch (e) { return { error: String(e.message || e) }; }
    var matches = [];
    var total = 0;
    if (re.global || re.sticky) {
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(text)) !== null) {
        total++;
        if (matches.length < MAX_MATCHES) matches.push(pack(m));
        if (m[0] === "") re.lastIndex += (re.unicode && text.codePointAt(re.lastIndex) > 0xffff) ? 2 : 1; // don't loop on empty matches
        if (total > 100000) break;
      }
    } else {
      var one = re.exec(text);
      if (one) { matches.push(pack(one)); total = 1; }
    }
    var out = { matches: matches, total: total, capped: total > matches.length };
    if (replacement !== null && replacement !== undefined) {
      try { out.replaced = text.replace(new RegExp(pattern, flags), replacement); } catch (e) { out.replaced = ""; }
    }
    return out;
  }

  function pack(m) {
    var named = {};
    if (m.groups) Object.keys(m.groups).forEach(function (k) { named[k] = m.groups[k] === undefined ? null : m.groups[k]; });
    return { index: m.index, text: m[0], groups: m.slice(1).map(function (g) { return g === undefined ? null : g; }), named: named };
  }

  if (typeof window !== "undefined") {
    window.ToolNestCalc = { run: run };
  } else if (typeof self !== "undefined") {
    self.onmessage = function (e) {
      var d = e.data;
      self.postMessage(run(d.pattern, d.flags, d.text, d.replacement));
    };
  }
})();
