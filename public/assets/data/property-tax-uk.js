/*
 * UK Stamp Duty Land Tax (England and Northern Ireland) and Capital Gains Tax figures — the ONLY
 * place these numbers live (LEGAL.md §2, §6). Checked 2026-10-20 against:
 *   SDLT residential rates, first-time buyer relief (£300,000 at 0%, 5% to £500,000, none above
 *   £500,000), 2% non-UK resident surcharge (on top of any other rates), GOV.UK examples £295,000 =
 *   £4,750 and first-time buyer £500,000 = £10,000:
 *     https://www.gov.uk/stamp-duty-land-tax/residential-property-rates
 *   Higher rates for additional dwellings from 1 April 2025 (5%, 7%, 10%, 15%, 17%; purchases of
 *   £40,000 or more; GOV.UK example £300,000 = £20,000):
 *     https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property
 *   SDLT is for England and Northern Ireland; Scotland has LBTT and Wales LTT; return and payment
 *   within 14 days of completion: https://www.gov.uk/stamp-duty-land-tax
 *   Capital Gains Tax 2026 to 2027: 18% within the basic rate band, 24% above, from 6 April 2026;
 *   £3,000 allowance; GOV.UK examples £20,000 income + £12,600 gains = £1,728 and + £52,600 = £10,842:
 *     https://www.gov.uk/capital-gains-tax/rates
 *     https://www.gov.uk/capital-gains-tax/allowances
 *   UK residential property: report and pay within 60 days of completion:
 *     https://www.gov.uk/report-and-pay-your-capital-gains-tax/if-you-sold-a-property-in-the-uk-on-or-after-6-april-2020
 *   The basic rate band (£37,700) and Personal Allowance come from tax-uk.js.
 *
 * TO UPDATE: check the pages above before each tax year (and after any Budget), change the figures
 * and `checked`, then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestPropertyTaxUK = {
  checked: "2026-10-20",

  sdlt: {
    from: "2025-04-01", // rates for purchases completed on or after this date
    // [upper limit of the band, rate]
    standard: [[125000, 0], [250000, 0.02], [925000, 0.05], [1500000, 0.10], [Infinity, 0.12]],
    firstTimeBuyer: { bands: [[300000, 0], [500000, 0.05]], maxPrice: 500000 },
    additional: { surcharge: 0.05, minPrice: 40000 }, // added to every band
    nonResident: { surcharge: 0.02 }                  // added to every band, on top of any other rates
  },

  cgt: {
    taxYear: "2026 to 2027",
    allowance: 3000,
    basicRate: 0.18,  // gains that fit inside the basic rate band
    higherRate: 0.24  // gains above it
  }
};
