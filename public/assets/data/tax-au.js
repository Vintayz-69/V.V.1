/*
 * Australia figures for the 2026–27 income year (1 July 2026 – 30 June 2027) — the ONLY place
 * these numbers live (LEGAL.md §2, §6). Checked 2026-09-28. The ATO website blocks automated
 * reading, so ATO figures were confirmed through ato.gov.au search results and, where possible,
 * a second official source:
 *   Rates: 2024–25 thresholds https://treasury.gov.au/tax-cuts ; 16% → 15% from 1 July 2026
 *          https://treasury.gov.au/policy-topics/taxation/budget2026-27 and
 *          https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 *   Medicare levy 2%:  https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy
 *   LITO:              https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset
 *   Small business income tax offset (16%, max $1,000, turnover < $5m):
 *                      https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/income-and-deductions-for-business/concessions-offsets-and-rebates/small-business-income-tax-offset
 *   Super guarantee 12%: https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee
 *   Concessional cap $32,500 from 1 July 2026: https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps
 *   Division 293 ($250,000): https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax
 *   GST 10%, $75,000 threshold: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst
 *
 * Not included: the 2026–27 Medicare levy low-income thresholds (not confirmed at the time of checking),
 * so the full 2% levy is applied and pages say so.
 *
 * TO UPDATE: before 1 July each year (Budget in May announces changes).
 */
window.ToolNestTaxAU = {
  incomeYear: "2026–27",
  checked: "2026-09-28",

  // Resident rates, excluding the Medicare levy: [upper limit, rate].
  brackets: [[18200, 0], [45000, 0.15], [135000, 0.30], [190000, 0.37], [Infinity, 0.45]],
  medicareLevy: 0.02,

  lito: { max: 700, firstTaperStart: 37500, firstTaperRate: 0.05, secondTaperStart: 45000, secondTaperBase: 325, secondTaperRate: 0.015 },

  smallBusinessOffset: { rate: 0.16, max: 1000, turnoverLimit: 5000000 },

  super: { guaranteeRate: 0.12, concessionalCap: 32500, contributionsTax: 0.15, division293Threshold: 250000, division293Rate: 0.15 },

  gst: { rate: 0.10, registrationThreshold: 75000 }
};
