/*
 * UK statutory sick, maternity and paternity pay for tax year 2026 to 2027 — the ONLY place these
 * numbers live (LEGAL.md §2, §6). Checked 2026-10-20 against:
 *   Rates and thresholds for employers 2026 to 2027 (SSP £123.25 or 80% of AWE; SMP and SPP £194.32
 *   or 90% of AWE; Lower Earnings Limit £129 a week; SMP from 5 April 2026, the rest from 6 April 2026):
 *     https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 *   SSP paid for up to 28 weeks, for qualifying days: https://www.gov.uk/statutory-sick-pay/what-youll-get
 *   SSP daily rate = weekly rate ÷ qualifying days in the week, × qualifying days sick (GOV.UK's
 *   examples: £185 AWE, 5 days, 3 sick = £73.95; 6 days, 4 sick = £82.16; £145 AWE, 4 days, 2 sick = £58):
 *     https://www.gov.uk/guidance/statutory-sick-pay-manually-calculate-your-employees-payments
 *   Waiting days removed and no earnings minimum for SSP from 6 April 2026:
 *     https://www.gov.uk/guidance/sickness-absences-that-start-before-and-end-on-or-after-6-april-2026
 *   SMP: 90% of AWE for 6 weeks, then £194.32 or 90% for 33 weeks (39 weeks in all), £129 a week
 *   earnings and 26 weeks' employment needed: https://www.gov.uk/maternity-pay-leave/pay
 *                                             https://www.gov.uk/maternity-pay-leave/eligibility
 *   Paternity: up to 2 weeks, together or as one-week blocks, ending within 52 weeks of the birth;
 *   £129 a week earnings and 26 weeks' employment needed: https://www.gov.uk/paternity-pay-leave/leave
 *                                                         https://www.gov.uk/paternity-pay-leave/eligibility
 *
 * TO UPDATE: these rates usually change every April. Check the GOV.UK pages, change the figures,
 * `taxYear` and `checked`, then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestStatutoryPayUK = {
  taxYear: "2026 to 2027",
  checked: "2026-10-20",

  ssp: {
    weeklyRate: 123.25,  // or the earnings share below, whichever is lower
    earningsShare: 0.80, // of average weekly earnings
    maxWeeks: 28
  },

  // Statutory Maternity Pay and Statutory Paternity Pay
  parental: {
    flatRate: 194.32,    // or the earnings share below, whichever is lower
    earningsShare: 0.90, // of average weekly earnings
    lowerEarningsLimit: 129, // average weekly earnings needed to qualify
    maternityWeeks: 39,
    maternityHigherWeeks: 6, // first weeks paid at 90% of earnings with no cap
    paternityWeeks: 2
  }
};
