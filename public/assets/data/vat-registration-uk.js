/*
 * UK VAT registration timing rules — the ONLY place these figures live (LEGAL.md §2, §6).
 * Checked 2026-10-27 against GOV.UK "VAT registration: when to register":
 *   https://www.gov.uk/vat-registration/when-to-register
 * Register if taxable turnover for the last 12 months goes over the threshold, within 30 days of the
 * end of the month you went over; effective date is the first day of the second month after you go
 * over (GOV.UK example: over on 15 July, register by 30 August, effective 1 September). If you expect
 * to go over in the next 30 days alone, register by the end of that 30-day period.
 * The £90,000 threshold itself comes from tax-uk.js.
 *
 * TO UPDATE: check the page whenever the threshold changes, change
 * `checked`, then run `node tests/run-tests.js`.
 */
window.ToolNestVatRegistrationUK = {
  checked: "2026-10-27",
  registerWithinDays: 30,  // after the end of the month you went over
  effectiveMonthsAfter: 2  // first day of the second month after you go over
};
