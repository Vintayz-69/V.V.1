/*
 * UK Child Benefit and the High Income Child Benefit Charge, 2026 to 2027 — the ONLY place these
 * figures live (LEGAL.md §2, §6). Checked 2026-10-27 against:
 *   Weekly rates (HMRC "Tax credits, Child Benefit and Guardian's Allowance" rates, updated
 *   9 March 2026): https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance
 *   Also shown on https://www.gov.uk/child-benefit/what-youll-get
 *   The charge: 1% for every £200 of adjusted net income over £60,000, all of it over £80,000;
 *   the partner with the higher income pays; pay through PAYE or Self Assessment; opting out:
 *     https://www.gov.uk/child-benefit-tax-charge
 *     https://www.gov.uk/hmrc-internal-manuals/paye-manual/paye14015 ("each £200 of income which
 *     falls between £60,000 and £80,000")
 *   Adjusted net income: take off Gift Aid and relief-at-source pension contributions grossed up,
 *   £1.25 for every £1 (updated 30 May 2025): https://www.gov.uk/guidance/adjusted-net-income
 * The legislation (ITEPA 2003 s681C) couldn't be read automatically, so how a part-£200 is treated
 * wasn't confirmed; the tool counts whole £200 steps and the page says so.
 *
 * TO UPDATE: Child Benefit rates change each April. Check the pages above, change the figures,
 * `taxYear` and `checked`, then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestChildBenefitUK = {
  taxYear: "2026 to 2027",
  checked: "2026-10-27",
  eldest: 27.05,      // £ a week, eldest or only child
  other: 17.90,       // £ a week, each other child
  threshold: 60000,
  step: 200,          // 1% for every £200 over the threshold
  fullAt: 80000,
  reliefGrossUp: 1.25 // £1 of Gift Aid or relief-at-source pension contribution reduces income by £1.25
};
