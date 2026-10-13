/* Fuel Cost Calculator: the fuel and money a trip takes, in miles or kilometres, with US mpg,
   UK mpg, L/100 km or km/L, and the cost split between passengers. Runs in the browser. */
(function () {
  "use strict";

  var T = window.ToolNest;
  var KM_PER_MILE = 1.609344;
  var LITRES = { usgal: 3.785411784, ukgal: 4.54609, litre: 1 }; // exact legal definitions

  /*
   * v: { distance, distUnit: "mi" | "km", economy, econUnit: "mpg-us" | "mpg-uk" | "l100" | "kml",
   *      price, priceUnit: "usgal" | "ukgal" | "litre", roundTrip, people }
   */
  function calculate(v) {
    var trips = v.roundTrip ? 2 : 1;
    var km = v.distance * (v.distUnit === "mi" ? KM_PER_MILE : 1) * trips;
    var miles = km / KM_PER_MILE;
    var litres;
    if (v.econUnit === "mpg-us") litres = miles / v.economy * LITRES.usgal;
    else if (v.econUnit === "mpg-uk") litres = miles / v.economy * LITRES.ukgal;
    else if (v.econUnit === "kml") litres = km / v.economy;
    else litres = km * v.economy / 100;
    var perLitre = v.price / LITRES[v.priceUnit];
    var cost = litres * perLitre;
    var people = Math.max(1, Math.floor(v.people || 1));
    var round = function (n, d) { var f = Math.pow(10, d); return Math.round(n * f) / f; };
    return {
      litres: round(litres, 2),
      usGallons: round(litres / LITRES.usgal, 2),
      ukGallons: round(litres / LITRES.ukgal, 2),
      cost: round(cost, 2),
      perPerson: round(cost / people, 2),
      perMile: round(cost / miles, 3),
      perKm: round(cost / km, 3),
      km: round(km, 1),
      miles: round(miles, 1)
    };
  }

  window.ToolNestCalc = calculate;
  if (!document.getElementById("calc-form")) return;

  var el = function (id) { return document.getElementById(id); };

  // Sensible units for the visitor's country, set once (they can change them).
  var lang = (navigator.language || "").toUpperCase();
  if (/-GB$/.test(lang)) { el("econUnit").value = "mpg-uk"; el("priceUnit").value = "litre"; el("economy").value = "45"; el("price").value = "1.40"; }
  else if (/-(AU|CA)$/.test(lang) || !/-US$/.test(lang) && lang) { el("distUnit").value = "km"; el("econUnit").value = "l100"; el("priceUnit").value = "litre"; el("economy").value = "7.5"; el("price").value = "1.80"; el("distance").value = "400"; }

  T.setupCalculator({
    rules: {
      distance: { min: 0, max: 1000000 },
      economy: { min: 0.1, max: 1000 },
      price: { min: 0, max: 100000 },
      people: { min: 1, max: 100 }
    },
    defaults: { distance: "300", economy: "30", price: "3.50", people: "1", roundTrip: false },
    outputs: ["out-cost", "out-person", "out-fuel", "out-per-distance", "out-total-distance"],
    render: function (v, currency) {
      var r = calculate({
        distance: v.distance, distUnit: el("distUnit").value, economy: v.economy, econUnit: el("econUnit").value,
        price: v.price, priceUnit: el("priceUnit").value, roundTrip: el("roundTrip").checked, people: v.people
      });
      var money = function (n, d) { return T.formatMoney(n, currency, d); };
      var miles = el("distUnit").value === "mi";
      T.setText("out-cost", money(r.cost));
      T.setText("out-person", money(r.perPerson));
      T.setText("out-fuel", T.formatNumber(r.litres, 1) + " litres (" + T.formatNumber(r.usGallons, 2) + " US gal, " + T.formatNumber(r.ukGallons, 2) + " UK gal)");
      T.setText("out-per-distance", miles ? money(r.perMile, 3) + " per mile" : money(r.perKm, 3) + " per km");
      T.setText("out-total-distance", miles ? T.formatNumber(r.miles, 1) + " miles" : T.formatNumber(r.km, 1) + " km");
    }
  });
})();
