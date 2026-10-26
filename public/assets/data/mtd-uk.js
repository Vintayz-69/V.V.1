/*
 * Making Tax Digital for Income Tax — the ONLY place these figures live (LEGAL.md §2, §6).
 * Checked 2026-10-27 against:
 *   Thresholds and start dates (updated 26 March 2026):
 *     https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax
 *   Qualifying income: self-employment and property income before expenses, added together; your
 *   share of jointly owned property; sole traders' part-year income annualised (6 months doubled);
 *   not employment, partnership shares, dividends or pensions (updated 11 September 2026):
 *     https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax
 *   Exemptions, including qualifying income of £20,000 or less and no National Insurance number
 *   (updated 28 May 2026):
 *     https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax
 *   Quarterly update periods and deadlines, penalty points (updated 16 October 2026):
 *     https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
 *
 * TO UPDATE: HMRC may announce new thresholds or dates. Check the pages above, change the figures
 * and `checked`, then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestMtdUK = {
  checked: "2026-10-27",

  // You must use it if qualifying income on that year's return is MORE THAN the threshold.
  thresholds: [
    { year: "2024 to 2025", threshold: 50000, start: "6 April 2026" },
    { year: "2025 to 2026", threshold: 30000, start: "6 April 2027" },
    { year: "2026 to 2027", threshold: 20000, start: "6 April 2028" }
  ],

  // Standard update periods (6 April to 5 April). Each update is cumulative from 6 April.
  quarters: [
    { to: "5 July", due: "7 August" },
    { to: "5 October", due: "7 November" },
    { to: "5 January", due: "7 February" },
    { to: "5 April", due: "7 May" }
  ],

  // No penalty points for late quarterly updates in the 2026 to 2027 tax year. After that, each
  // missed deadline is a point, and reaching this many points means a penalty of this amount.
  noUpdatePointsYear: "2026 to 2027",
  penaltyPoints: 4,
  penaltyAmount: 200
};
