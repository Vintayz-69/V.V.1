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
 * Rent a Room Scheme (checked 2026-10-27): £7,500 a year tax-free, £3,750 if someone else also gets
 * income from letting accommodation in the same property; furnished accommodation in your only or main
 * home; receipts include payments for meals, goods and services such as cleaning or laundry; over the
 * limit, choose Method A (receipts minus expenses and capital allowances) or Method B (receipts minus
 * the limit, no expenses). HS223 Rent a Room Scheme (2026), updated 6 April 2026, with its "Chris"
 * example (£10,600 receipts, £9,000 expenses: A £1,600, B £3,100):
 *   https://www.gov.uk/government/publications/rent-a-room-for-traders-hs223-self-assessment-helpsheet/hs223-rent-a-room-scheme-2026
 *   https://www.gov.uk/rent-room-in-your-home/the-rent-a-room-scheme
 * Marriage Allowance (checked 2026-10-27): transfer £1,260 of your Personal Allowance to your husband,
 * wife or civil partner, which reduces their tax by up to £252 in the tax year; you must not pay Income
 * Tax (income below your Personal Allowance, usually £12,570); your partner must pay basic rate (income
 * between £12,571 and £50,270, or £12,571 and £43,662 in Scotland); claims can be backdated to
 * 6 April 2022:
 *   https://www.gov.uk/marriage-allowance
 * Income tax and National Insurance figures come from tax-uk.js.
 *
 * TO UPDATE: check the GOV.UK page before 6 April each year, change the figures and `checked`,
 * then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestAllowancesUK = {
  checked: "2026-10-27",
  trading: 1000,
  property: 1000,
  rentARoom: 7500,
  rentARoomShared: 3750,
  marriageAllowance: 1260,      // Personal Allowance transferred
  marriageAllowanceSaving: 252, // the most it reduces the partner's tax by
  marriageAllowanceBackdateFrom: "2022-04-06"
};
