/*
 * UK trading and property allowances — the ONLY place these figures live (LEGAL.md §2, §6).
 * Checked 2026-10-27 against GOV.UK "Tax-free allowances on property and trading income"
 * (last updated 8 May 2019, still current):
 *   https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income
 * Up to £1,000 a year each, on gross income (before expenses). Gross trading income of £1,000 or
 * less: no need to tell HMRC (with exceptions). Over £1,000: register for Self Assessment by
 * 5 October after the tax year, and either deduct the allowance or your expenses, not both.
 * Can't be used with trade or property income from your employer (or your spouse's or civil
 * partner's), or from a company or partnership you or someone connected to you owns or controls.
 * Income tax and National Insurance figures come from tax-uk.js.
 *
 * TO UPDATE: check the GOV.UK page before 6 April each year, change the figures and `checked`,
 * then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestAllowancesUK = {
  checked: "2026-10-27",
  trading: 1000,
  property: 1000
};
