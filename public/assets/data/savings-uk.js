/*
 * UK tax on savings interest, 2026 to 2027 — the ONLY place these figures live (LEGAL.md §2, §6).
 * Checked 2026-10-27 against GOV.UK "Tax on savings interest: how much is tax-free":
 *   https://www.gov.uk/apply-tax-free-interest-on-savings/how-much-is-tax-free
 * Starting rate for savings up to £5,000, reduced by £1 for every £1 of other income (not savings
 * interest or dividends) above the Personal Allowance, so none from £17,570; the Personal Allowance
 * is used on other income first; Personal Savings Allowance £1,000 (basic rate), £500 (higher rate),
 * £0 (additional rate), with the band found by adding interest to other income. GOV.UK examples:
 * wages £16,000 + interest £200 → starting rate £1,570, no tax; interest £1,300 for a basic rate
 * taxpayer → £300 taxed at 20% = £60. ISAs: interest usually not taxed (overview page). Collection: bank
 * tells HMRC; tax code if £10,000 or less and employed or a pension; Self Assessment over £10,000:
 *   https://www.gov.uk/apply-tax-free-interest-on-savings/how-you-pay-tax-on-savings-interest
 * Scottish taxpayers pay the same tax as the rest of the UK on savings interest
 * (https://www.gov.uk/scottish-income-tax); the tool doesn't cover Scotland.
 * Income Tax bands and the Personal Allowance come from tax-uk.js.
 *
 * TO UPDATE: check the page before 6 April each year, change the figures and `checked`, then run
 * `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestSavingsUK = {
  checked: "2026-10-27",
  startingRate: 5000,
  personalSavingsAllowance: { basic: 1000, higher: 500, additional: 0 }
};
