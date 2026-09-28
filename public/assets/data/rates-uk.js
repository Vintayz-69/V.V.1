/*
 * UK late payment figures — the ONLY place these numbers live (LEGAL.md §2, §6).
 *
 * Statutory interest = 8% + Bank of England Bank Rate ("reference rate") in force on:
 *   - 31 December, for interest that starts running 1 January – 30 June
 *   - 30 June,     for interest that starts running 1 July – 31 December
 *   Source: The Late Payment of Commercial Debts (Rate of Interest) (No. 3) Order 2002,
 *           https://www.legislation.gov.uk/uksi/2002/1675/made
 *           https://www.gov.uk/late-commercial-payments-interest-debt-recovery/charging-interest-commercial-debt
 *
 * Fixed compensation per late invoice (business to business):
 *   Source: https://www.gov.uk/late-commercial-payments-interest-debt-recovery/claim-debt-recovery-costs
 *
 * Bank Rate history source: https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp
 *
 * TO UPDATE: after each 30 June and 31 December, check the Bank of England page, add any new
 * Bank Rate changes to the top of `bankRate`, and move `checkedUpTo` forward.
 */
window.ToolNestRatesUK = {
  checkedUpTo: "2026-09-28",
  statutoryAddOn: 8,
  // Bank Rate changes, newest first: { from: date the new rate took effect, rate: % }
  bankRate: [
    { from: "2025-12-18", rate: 3.75 },
    { from: "2025-08-07", rate: 4.0 },
    { from: "2025-05-08", rate: 4.25 },
    { from: "2025-02-06", rate: 4.5 },
    { from: "2024-11-07", rate: 4.75 },
    { from: "2024-08-01", rate: 5.0 },
    { from: "2023-08-03", rate: 5.25 },
    { from: "2023-06-22", rate: 5.0 },
    { from: "2023-05-11", rate: 4.5 },
    { from: "2023-03-23", rate: 4.25 }
  ],
  compensation: [
    { below: 1000, amount: 40 },
    { below: 10000, amount: 70 },
    { below: Infinity, amount: 100 }
  ]
};
