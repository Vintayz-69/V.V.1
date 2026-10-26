/*
 * Canada GST/HST small supplier timing rules — the ONLY place these figures live (LEGAL.md §2, §6).
 * Checked 2026-10-27 against CRA "When to register for and start charging the GST/HST"
 * (page modified 2026-06-16):
 *   https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html
 * Over the threshold in a single calendar quarter: you stop being a small supplier on the supply that
 * takes you over, and charge GST/HST on it. Over the threshold across the last four (or fewer)
 * consecutive calendar quarters: you stop being a small supplier at the end of the month following
 * that quarter, and your effective date is no later than your first supply after that. Either way,
 * register within 29 days of the effective date. Calendar quarters start in January, April, July
 * and October. CRA examples: $29,000 over four quarters stays small; $38,000 in one quarter; $25,000 +
 * $25,000 over two quarters to March 2020 → stops April 30, 2020; $32,000 over four quarters to March
 * 2020 → stops April 30, 2020. The $30,000 threshold comes from tax-ca.js.
 *
 * TO UPDATE: check the CRA page each January, change `checked`, then run `node tests/run-tests.js`.
 */
window.ToolNestGstRegistrationCA = {
  checked: "2026-10-27",
  quartersCounted: 4,
  registerWithinDays: 29
};
