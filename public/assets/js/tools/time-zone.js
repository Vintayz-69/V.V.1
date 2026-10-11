/* Time Zone Converter: shows a date and time in several places at once, with each place's UTC
   offset and summer time, and the hours when everyone is within working hours. Time zone rules
   come from the browser's own time zone database. Runs in the browser. */

(function () {
  "use strict";

  // Places people look up most often: [label, IANA time zone name].
  var PLACES = [
    ["New York, Washington DC, Miami (US Eastern)", "America/New_York"],
    ["Chicago, Dallas, Houston (US Central)", "America/Chicago"],
    ["Denver, Salt Lake City (US Mountain)", "America/Denver"],
    ["Phoenix, Arizona", "America/Phoenix"],
    ["Los Angeles, San Francisco, Seattle (US Pacific)", "America/Los_Angeles"],
    ["Anchorage, Alaska", "America/Anchorage"],
    ["Honolulu, Hawaii", "Pacific/Honolulu"],
    ["Toronto, Ottawa, Montreal", "America/Toronto"],
    ["Vancouver", "America/Vancouver"],
    ["Calgary, Edmonton", "America/Edmonton"],
    ["Winnipeg", "America/Winnipeg"],
    ["Halifax", "America/Halifax"],
    ["St. John's, Newfoundland", "America/St_Johns"],
    ["Mexico City", "America/Mexico_City"],
    ["São Paulo", "America/Sao_Paulo"],
    ["Buenos Aires", "America/Argentina/Buenos_Aires"],
    ["London, Edinburgh, Cardiff, Belfast", "Europe/London"],
    ["Dublin", "Europe/Dublin"],
    ["Lisbon", "Europe/Lisbon"],
    ["Paris", "Europe/Paris"],
    ["Berlin", "Europe/Berlin"],
    ["Amsterdam", "Europe/Amsterdam"],
    ["Madrid", "Europe/Madrid"],
    ["Rome", "Europe/Rome"],
    ["Stockholm", "Europe/Stockholm"],
    ["Warsaw", "Europe/Warsaw"],
    ["Athens", "Europe/Athens"],
    ["Istanbul", "Europe/Istanbul"],
    ["Lagos", "Africa/Lagos"],
    ["Cairo", "Africa/Cairo"],
    ["Johannesburg", "Africa/Johannesburg"],
    ["Nairobi", "Africa/Nairobi"],
    ["Dubai", "Asia/Dubai"],
    ["Karachi", "Asia/Karachi"],
    ["India (Delhi, Mumbai, Bengaluru)", "Asia/Kolkata"],
    ["Dhaka", "Asia/Dhaka"],
    ["Bangkok", "Asia/Bangkok"],
    ["Jakarta", "Asia/Jakarta"],
    ["Singapore", "Asia/Singapore"],
    ["Manila", "Asia/Manila"],
    ["Hong Kong", "Asia/Hong_Kong"],
    ["China (Beijing, Shanghai)", "Asia/Shanghai"],
    ["Seoul", "Asia/Seoul"],
    ["Tokyo", "Asia/Tokyo"],
    ["Perth", "Australia/Perth"],
    ["Darwin", "Australia/Darwin"],
    ["Adelaide", "Australia/Adelaide"],
    ["Brisbane", "Australia/Brisbane"],
    ["Sydney, Canberra", "Australia/Sydney"],
    ["Melbourne", "Australia/Melbourne"],
    ["Hobart", "Australia/Hobart"],
    ["Auckland, Wellington", "Pacific/Auckland"],
    ["UTC (Coordinated Universal Time)", "UTC"]
  ];

  var formatters = {};
  function formatter(zone) {
    if (!formatters[zone]) {
      formatters[zone] = new Intl.DateTimeFormat("en-US", {
        timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric"
      });
    }
    return formatters[zone];
  }

  // The local date and time in `zone` at the moment `ms` (milliseconds since 1970, UTC).
  function localParts(zone, ms) {
    var out = {};
    formatter(zone).formatToParts(new Date(ms)).forEach(function (p) {
      if (p.type !== "literal") out[p.type] = Number(p.value);
    });
    return { y: out.year, m: out.month, d: out.day, h: out.hour % 24, mi: out.minute, s: out.second };
  }

  // Minutes ahead of UTC in `zone` at the moment `ms` (e.g. 60 in London in summer, −240 in New York).
  function offsetMinutes(zone, ms) {
    var p = localParts(zone, ms);
    var asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
    return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
  }

  /*
   * The moment a local date and time happens in `zone`. parts: { y, m, d, h, mi }.
   * Returns { ms, gap, ambiguous }: gap is true when the clocks jump forward past that time (so
   * it never happens; the result is the same moment written with the new offset), ambiguous when
   * the clocks go back and the time happens twice (the earlier one is used).
   */
  function zonedToUtc(parts, zone) {
    var guess = Date.UTC(parts.y, parts.m - 1, parts.d, parts.h, parts.mi);
    var before = offsetMinutes(zone, guess - 86400000);
    var after = offsetMinutes(zone, guess + 86400000);
    var candidates = [before, after].map(function (off) { return guess - off * 60000; }).filter(function (ms, i, all) {
      if (all.indexOf(ms) !== i) return false;
      var p = localParts(zone, ms);
      return p.y === parts.y && p.m === parts.m && p.d === parts.d && p.h === parts.h && p.mi === parts.mi;
    }).sort(function (a, b) { return a - b; });
    if (candidates.length) return { ms: candidates[0], gap: false, ambiguous: candidates.length > 1 };
    // A time skipped when the clocks go forward: read it with the offset from before the change.
    return { ms: guess - before * 60000, gap: true, ambiguous: false };
  }

  // 60 → "UTC+1", −240 → "UTC−4", 330 → "UTC+5:30", 0 → "UTC"
  function formatOffset(minutes) {
    if (!minutes) return "UTC";
    var sign = minutes > 0 ? "+" : "−";
    var abs = Math.abs(minutes);
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    return "UTC" + sign + h + (m ? ":" + (m < 10 ? "0" : "") + m : "");
  }

  // Is the zone on summer time (daylight saving time) at `ms`? Its offset is then bigger than
  // its smallest offset of that year.
  function isSummerTime(zone, ms) {
    var y = localParts(zone, ms).y;
    var jan = offsetMinutes(zone, Date.UTC(y, 0, 1));
    var jul = offsetMinutes(zone, Date.UTC(y, 6, 1));
    return jan !== jul && offsetMinutes(zone, ms) > Math.min(jan, jul);
  }

  // Calendar days between two dates { y, m, d } (b − a).
  function dayShift(a, b) {
    return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
  }

  // "13:05" or "1:05 PM"
  function clock(h, mi, twelve) {
    var mm = (mi < 10 ? "0" : "") + mi;
    if (!twelve) return (h < 10 ? "0" : "") + h + ":" + mm;
    return ((h + 11) % 12 + 1) + ":" + mm + (h < 12 ? " AM" : " PM");
  }

  /*
   * Converts a local date and time in `fromZone` to each of `zones`.
   * Returns { ms, gap, ambiguous, rows: [{ zone, y, m, d, h, mi, offset, summer, dayShift }] }.
   */
  function convert(parts, fromZone, zones) {
    var at = zonedToUtc(parts, fromZone);
    var from = localParts(fromZone, at.ms);
    return {
      ms: at.ms, gap: at.gap, ambiguous: at.ambiguous,
      rows: zones.map(function (zone) {
        var p = localParts(zone, at.ms);
        return {
          zone: zone, y: p.y, m: p.m, d: p.d, h: p.h, mi: p.mi,
          offset: offsetMinutes(zone, at.ms), summer: isSummerTime(zone, at.ms), dayShift: dayShift(from, p)
        };
      })
    };
  }

  /*
   * For each hour of a day in `fromZone` (00:00, 01:00 … 23:00), the local time in each zone and
   * whether that whole hour is inside working hours (startHour to endHour) there.
   * Returns [{ hour, ms, cells: [{ h, mi, dayShift, working }], everyone }].
   */
  function workingHours(date, fromZone, zones, startHour, endHour) {
    var start = (startHour === undefined ? 9 : startHour) * 60;
    var end = (endHour === undefined ? 17 : endHour) * 60;
    var rows = [];
    var seen = {};
    for (var hour = 0; hour < 24; hour++) {
      var at = zonedToUtc({ y: date.y, m: date.m, d: date.d, h: hour, mi: 0 }, fromZone);
      if (at.gap || seen[at.ms]) continue; // an hour skipped when the clocks go forward
      seen[at.ms] = true;
      var cells = zones.map(function (zone) {
        var p = localParts(zone, at.ms);
        var mins = p.h * 60 + p.mi;
        return { h: p.h, mi: p.mi, dayShift: dayShift(date, p), working: mins >= start && mins + 60 <= end };
      });
      rows.push({ hour: hour, ms: at.ms, cells: cells, everyone: cells.every(function (c) { return c.working; }) });
    }
    return rows;
  }

  window.ToolNestCalc = {
    PLACES: PLACES, localParts: localParts, offsetMinutes: offsetMinutes, zonedToUtc: zonedToUtc,
    formatOffset: formatOffset, isSummerTime: isSummerTime, convert: convert, workingHours: workingHours, clock: clock
  };

  var form = document.getElementById("tz-form");
  if (!form) return;

  // ---------------------------------------------------------------- Page wiring

  var D = window.ToolNestDate;
  var el = function (id) { return document.getElementById(id); };
  var dateIn = el("tz-date");
  var timeIn = el("tz-time");
  var fromSel = el("tz-from");
  var addSel = el("tz-add");
  var twelve = /-(US|CA)$/i.test(navigator.language || "");
  var mine = "";
  try { mine = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { mine = ""; }

  var allZones = [];
  try { allZones = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []; } catch (e) { allZones = []; }
  var labelOf = {};
  PLACES.forEach(function (p) { labelOf[p[1]] = p[0]; });

  function nameOf(zone) {
    if (zone === mine) return "Your time: " + (labelOf[zone] || zone.replace(/_/g, " "));
    return labelOf[zone] || zone.replace(/_/g, " ").replace(/\//g, " / ");
  }

  function shortName(zone) {
    if (zone === mine) return "You";
    var label = labelOf[zone] || zone.split("/").pop().replace(/_/g, " ");
    return label.split(/[,(]/)[0].trim();
  }

  // "your time zone" or "New York", for sentences.
  function placeName(zone) {
    return zone === mine ? "your time zone" : shortName(zone);
  }

  function fillSelect(select, selected) {
    select.textContent = "";
    function opt(parent, zone, text) {
      var o = document.createElement("option");
      o.value = zone;
      o.textContent = text;
      if (zone === selected) o.selected = true;
      parent.appendChild(o);
    }
    if (mine) opt(select, mine, nameOf(mine));
    var common = document.createElement("optgroup");
    common.label = "Popular places";
    PLACES.forEach(function (p) { if (p[1] !== mine) opt(common, p[1], p[0]); });
    select.appendChild(common);
    var others = allZones.filter(function (z) { return !labelOf[z] && z !== mine; });
    if (others.length) {
      var all = document.createElement("optgroup");
      all.label = "All time zones";
      others.forEach(function (z) { opt(all, z, z.replace(/_/g, " ")); });
      select.appendChild(all);
    }
  }

  var zones = [];
  ["America/Los_Angeles", "America/New_York", "Europe/London", "Australia/Sydney"].forEach(function (z) {
    if (zones.indexOf(z) < 0) zones.push(z);
  });
  if (mine && zones.indexOf(mine) < 0) zones.unshift(mine);

  fillSelect(fromSel, mine || "Europe/London");
  fillSelect(addSel, "");
  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a place to add…";
  addSel.insertBefore(placeholder, addSel.firstChild);
  addSel.value = "";

  function dateText(p) {
    return D.WEEKDAYS[D.weekday(p)].slice(0, 3) + " " + (twelve ? D.MONTHS[p.m - 1].slice(0, 3) + " " + p.d : p.d + " " + D.MONTHS[p.m - 1].slice(0, 3));
  }

  function dayWord(n) {
    if (!n) return "";
    return n > 0 ? "next day" : "previous day";
  }

  function readParts() {
    var d = D.parse(dateIn.value);
    var t = /^(\d{2}):(\d{2})/.exec(timeIn.value || "");
    dateIn.closest(".field").classList.toggle("invalid", !d);
    timeIn.closest(".field").classList.toggle("invalid", !t);
    if (!d || !t) return null;
    return { y: d.y, m: d.m, d: d.d, h: Number(t[1]), mi: Number(t[2]) };
  }

  function removeZone(zone) {
    zones = zones.filter(function (z) { return z !== zone; });
    update();
    var first = el("tz-list").querySelector("button");
    (first || addSel).focus();
  }

  function update() {
    var list = el("tz-list");
    var parts = readParts();
    list.textContent = "";
    if (!parts) {
      el("tz-main").textContent = "—";
      el("tz-note").hidden = true;
      el("tz-hours").textContent = "";
      return;
    }
    var fromZone = fromSel.value;
    var r = convert(parts, fromZone, zones);
    var fromLocal = localParts(fromZone, r.ms);
    el("tz-main").textContent = clock(fromLocal.h, fromLocal.mi, twelve) + " " + shortName(fromZone);
    el("tz-utc").textContent = new Date(r.ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";

    r.rows.forEach(function (row) {
      var li = document.createElement("li");
      li.className = "tz-row";
      var name = document.createElement("span");
      name.className = "tz-name";
      name.textContent = nameOf(row.zone);
      var meta = document.createElement("small");
      meta.textContent = formatOffset(row.offset) + (row.summer ? " · summer time" : "");
      name.appendChild(meta);
      var time = document.createElement("span");
      time.className = "tz-time";
      time.textContent = clock(row.h, row.mi, twelve);
      var day = document.createElement("small");
      day.textContent = dateText(row) + (row.dayShift ? " · " + dayWord(row.dayShift) : "");
      time.appendChild(day);
      var del = document.createElement("button");
      del.type = "button";
      del.className = "tz-remove";
      del.setAttribute("aria-label", "Remove " + nameOf(row.zone));
      del.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      del.addEventListener("click", function () { removeZone(row.zone); });
      li.appendChild(name);
      li.appendChild(time);
      li.appendChild(del);
      list.appendChild(li);
    });

    var note = el("tz-note");
    note.hidden = !(r.gap || r.ambiguous);
    if (r.gap) note.textContent = "The clocks go forward at that time in " + placeName(fromZone) + ", so " + clock(parts.h, parts.mi, twelve) + " doesn't happen that day. We've moved it on by the clock change.";
    else if (r.ambiguous) note.textContent = "The clocks go back at that time in " + placeName(fromZone) + ", so " + clock(parts.h, parts.mi, twelve) + " happens twice that day. We've used the first one.";

    drawHours(parts, fromZone);
  }

  // Table: each hour of the chosen day, and the time in each place, green inside 9:00 to 17:00.
  function drawHours(parts, fromZone) {
    var box = el("tz-hours");
    box.textContent = "";
    var cols = [fromZone].concat(zones.filter(function (z) { return z !== fromZone; }));
    var rows = workingHours(parts, fromZone, cols, 9, 17);
    var table = document.createElement("table");
    table.className = "tz-table";
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    cols.forEach(function (z) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = shortName(z);
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    var good = 0;
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      if (row.everyone) { tr.className = "is-everyone"; good++; }
      if (row.hour === parts.h) tr.classList.add("is-chosen");
      row.cells.forEach(function (c, i) {
        var td = document.createElement(i === 0 ? "th" : "td");
        if (i === 0) td.scope = "row";
        td.className = c.working ? "is-working" : "";
        td.textContent = clock(c.h, c.mi, twelve) + (c.dayShift > 0 ? " +1" : c.dayShift < 0 ? " −1" : "");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    var wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.appendChild(table);
    el("tz-hours-summary").textContent = good
      ? good + (good === 1 ? " hour works" : " hours work") + " for everyone (shown in bold): inside 9:00 to 17:00 in every place."
      : "No hour falls inside 9:00 to 17:00 in every place on this day. The green cells show who's in working hours.";
    box.appendChild(wrap);
  }

  addSel.addEventListener("change", function () {
    var z = addSel.value;
    if (z && zones.indexOf(z) < 0) zones.push(z);
    addSel.value = "";
    update();
  });
  form.addEventListener("input", update);
  form.addEventListener("change", function (e) { if (e.target !== addSel) update(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  el("tz-now").addEventListener("click", setNow);

  function setNow() {
    var p = localParts(fromSel.value, Date.now());
    dateIn.value = D.iso(p);
    timeIn.value = (p.h < 10 ? "0" : "") + p.h + ":" + (p.mi < 10 ? "0" : "") + p.mi;
    update();
  }

  setNow();
})();
