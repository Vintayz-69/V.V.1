/*
 * US information return (Form 1099) thresholds for payments made in 2026 — the ONLY place these
 * figures live (LEGAL.md §2, §6). Checked 2026-10-27 against:
 *   Form 1099-NEC: nonemployee compensation of $2,000 or more, for tax years beginning after 2025
 *   ("increased to $2,000 and may be adjusted for inflation beginning in calendar year 2027");
 *   furnish to the recipient and file with the IRS by January 31 (next business day if that's a
 *   weekend: January 31, 2027 is a Sunday); card and payment app payments go on Form 1099-K
 *   instead; payments to corporations generally not reported. Instructions (Rev. 12/2026):
 *     https://www.irs.gov/instructions/i1099mec
 *   Form 1099-K from payment apps and online marketplaces: more than $20,000 AND more than
 *   200 transactions in a calendar year; card processors send one whatever the amount; apps may
 *   send one for less; all income must be reported with or without a form (updated 28 June 2026):
 *     https://www.irs.gov/businesses/understanding-your-form-1099-k
 *     https://www.irs.gov/newsroom/the-working-families-tax-cuts-what-gig-economy-workers-should-know
 * The $400 self-employment tax rule and the 92.35% net earnings factor come from tax-us.js.
 *
 * TO UPDATE: each January, check the IRS instructions for an inflation-adjusted 1099-NEC figure,
 * change the figures and `checked`, then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestInfoReturnsUS = {
  checked: "2026-10-27",
  paymentYear: 2026,
  necThreshold: 2000,          // $2,000 or more from one payer
  kAmount: 20000,              // more than this...
  kTransactions: 200,          // ...and more than this many transactions
  formsDue: "February 1, 2027" // January 31, 2027 is a Sunday
};
