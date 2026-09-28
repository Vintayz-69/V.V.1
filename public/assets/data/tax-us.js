/*
 * US federal tax figures for tax year 2026 — the ONLY place these numbers live (LEGAL.md §2, §6).
 * Checked 2026-09-28 against:
 *   Brackets, standard deduction, QBI thresholds: IRS Rev. Proc. 2025-32 — https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
 *     and https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
 *   Social Security wage base: IRS Topic 751 — https://www.irs.gov/taxtopics/tc751
 *   SE tax rates, Additional Medicare thresholds, $400 rule: https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes
 *   92.35% rule, due dates, 110% rule: 2026 Form 1040-ES — https://www.irs.gov/pub/irs-pdf/f1040es.pdf
 *   $1,000 rule and 90%/100% safe harbor: https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes
 *   Mileage: https://www.irs.gov/tax-professionals/standard-mileage-rates
 *   Home office simplified method: https://www.irs.gov/businesses/small-businesses-self-employed/simplified-option-for-home-office-deduction
 *
 * TO UPDATE (every January, and when the IRS announces mid-year changes): replace the figures below,
 * change `year` and `checked`, then run `node tests/run-tests.js` and fix the examples.
 */
window.ToolNestTaxUS = {
  year: 2026,
  checked: "2026-09-28",

  // [upper limit of bracket, rate]. Filing statuses: single, mfj (married filing jointly),
  // mfs (married filing separately), hoh (head of household).
  brackets: {
    single: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]],
    mfj: [[24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]],
    mfs: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [384350, 0.35], [Infinity, 0.37]],
    hoh: [[17700, 0.10], [67450, 0.12], [105700, 0.22], [201750, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]]
  },
  standardDeduction: { single: 16100, mfj: 32200, mfs: 16100, hoh: 24150 },

  selfEmployment: {
    netEarningsFactor: 0.9235, // only 92.35% of net profit is subject to SE tax
    minimumNetEarnings: 400,   // no SE tax below this
    socialSecurityRate: 0.124,
    socialSecurityWageBase: 184500,
    medicareRate: 0.029
  },
  additionalMedicare: {
    rate: 0.009,
    threshold: { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000 }
  },
  employerPayroll: { socialSecurityRate: 0.062, medicareRate: 0.0145 },

  // Section 199A: below the threshold, the deduction is 20% of QBI (capped at 20% of taxable income).
  qbi: { rate: 0.20, threshold: { single: 201750, mfj: 403500, mfs: 201775, hoh: 201750 } },

  estimatedTax: {
    minimumOwed: 1000,
    currentYearPct: 90,
    priorYearPct: 100,
    highIncomePriorYearPct: 110,
    highIncomeAGI: { single: 150000, mfj: 150000, mfs: 75000, hoh: 150000 },
    dueDates: ["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"]
  },

  // Business standard mileage rates in dollars per mile. 2026 changed on 1 July.
  mileage: {
    2026: [{ from: "2026-01-01", to: "2026-06-30", rate: 0.725 }, { from: "2026-07-01", to: "2026-12-31", rate: 0.76 }],
    2025: [{ from: "2025-01-01", to: "2025-12-31", rate: 0.70 }]
  },

  homeOffice: { simplifiedRatePerSqFt: 5, simplifiedMaxSqFt: 300 }
};
