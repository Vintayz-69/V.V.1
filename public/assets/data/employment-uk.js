/*
 * UK employment rights figures (holiday and redundancy) — the ONLY place these numbers live
 * (LEGAL.md §2, §6). Checked 2026-09-30 against:
 *   Holiday entitlement (5.6 weeks, 28-day cap): https://www.gov.uk/holiday-entitlement-rights
 *   Irregular hours and part-year workers (12.07% of hours worked, leave years starting on or
 *   after 1 April 2024): https://www.gov.uk/holiday-entitlement-rights/calculate-leave-entitlement
 *                        https://www.legislation.gov.uk/uksi/2023/1426/regulation/3/made
 *   Statutory redundancy pay (England, Scotland and Wales): https://www.gov.uk/redundant-your-rights/redundancy-pay
 *     "If you were made redundant on or after 6 April 2026, your weekly pay is capped at £751 and
 *     the maximum statutory redundancy pay you can get is £22,530."
 *   Northern Ireland has its own limits (nidirect.gov.uk), so the redundancy tool doesn't cover it.
 *
 * TO UPDATE: the redundancy weekly pay cap usually changes every April. Check the GOV.UK page,
 * change the figures and `checked`, then run `node tests/run-tests.js`.
 */
window.ToolNestEmploymentUK = {
  checked: "2026-09-30",

  holiday: {
    weeks: 5.6,           // statutory minimum paid holiday a year
    maxDays: 28,          // statutory paid holiday is capped at 28 days
    irregularRate: 0.1207 // irregular hours and part-year workers: 12.07% of hours worked
  },

  redundancy: {
    from: "2026-04-06",   // the cap below applies to redundancies on or after this date
    weeklyPayCap: 751,
    maxYears: 20,         // only the last 20 years of service count
    minYears: 2,          // at least 2 years' service to qualify
    // [youngest age for the whole year, weeks' pay for that year of service]
    bands: [[41, 1.5], [22, 1], [0, 0.5]]
  }
};
