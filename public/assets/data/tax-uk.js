/*
 * UK tax figures for tax year 2026 to 2027 (6 April 2026 – 5 April 2027) — the ONLY place these
 * numbers live (LEGAL.md §2, §6). Checked 2026-09-28 against:
 *   Income Tax (England, Wales, NI): https://www.gov.uk/income-tax-rates
 *   Scottish Income Tax:            https://www.gov.uk/scottish-income-tax
 *   Class 2 and Class 4 NI:         https://www.gov.uk/self-employed-national-insurance-rates
 *   Class 1 NI and Employment Allowance: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 *   Employment Allowance one-director rule: https://www.gov.uk/claim-employment-allowance/eligibility
 *   Dividend allowance and rates:   https://www.gov.uk/tax-on-dividends
 *   Corporation Tax (FY2026):       https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax/rates-and-allowances-corporation-tax
 *   Payments on account:            https://www.gov.uk/understand-self-assessment-bill/payments-on-account
 *   Vehicle flat rates:             https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles
 *   Employee mileage (bikes):       https://www.gov.uk/expenses-and-benefits-business-travel-mileage/rules-for-tax
 *   Working from home flat rates:   https://www.gov.uk/simpler-income-tax-simplified-expenses/working-from-home
 *   Student and Postgraduate Loan thresholds (checked 2026-09-30):
 *                                   https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 *                                   https://www.gov.uk/repaying-your-student-loan/what-you-pay
 *   VAT rates and registration threshold (checked 2026-09-30):
 *                                   https://www.gov.uk/vat-rates
 *                                   https://www.gov.uk/vat-registration/when-to-register
 *
 * TO UPDATE: before 6 April each year, replace the figures, change `taxYear` and `checked`,
 * then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestTaxUK = {
  taxYear: "2026 to 2027",
  checked: "2026-09-28",

  personalAllowance: 12570,
  allowanceTaperStart: 100000, // allowance falls by £1 for every £2 above this

  // Bands on TAXABLE income (after the allowance): [upper limit, rate].
  bands: {
    ruk: [[37700, 0.20], [125140, 0.40], [Infinity, 0.45]],
    // Scotland: starter to £16,537, basic to £29,526, intermediate to £43,662, higher to £75,000,
    // advanced to £125,140, top above — shown on GOV.UK with the standard £12,570 allowance.
    scotland: [[3967, 0.19], [16956, 0.20], [31092, 0.21], [62430, 0.42], [125140, 0.45], [Infinity, 0.48]]
  },

  class4: { lowerProfitsLimit: 12570, upperProfitsLimit: 50270, mainRate: 0.06, upperRate: 0.02 },
  class2: { weeklyRate: 3.65, smallProfitsThreshold: 7105 }, // treated as paid at or above the threshold

  class1: {
    primaryThreshold: 12570, upperEarningsLimit: 50270, employeeMainRate: 0.08, employeeUpperRate: 0.02,
    secondaryThreshold: 5000, employerRate: 0.15,
    employmentAllowance: 10500 // not available if the director is the only employee paid above the secondary threshold
  },

  dividends: { allowance: 500, basicRate: 0.1075, higherRate: 0.3575, additionalRate: 0.3935 },

  corporationTax: { smallProfitsRate: 0.19, mainRate: 0.25, lowerLimit: 50000, upperLimit: 250000, marginalFraction: 3 / 200 },

  paymentsOnAccount: {
    minimumBill: 1000, collectedAtSourceLimit: 0.80,
    dueDates: { first: "2027-01-31", second: "2027-07-31", balancing: "2028-01-31" }, // for 2026 to 2027
    previousBalancing: "2027-01-31" // balancing payment for 2025 to 2026
  },

  // Simplified expenses (self-employed) and approved mileage rates, pence per mile.
  mileage: {
    "2026-27": { car: [[10000, 0.55], [Infinity, 0.25]], motorcycle: [[Infinity, 0.24]], bicycle: [[Infinity, 0.20]] },
    "2025-26": { car: [[10000, 0.45], [Infinity, 0.25]], motorcycle: [[Infinity, 0.24]], bicycle: [[Infinity, 0.20]] }
  },

  // Working from home flat rates: [minimum hours in the month, £ per month]. Under 25 hours: not allowed.
  workFromHome: [[101, 26], [51, 18], [25, 10]],

  // Student loan repayments through PAYE: a share of yearly earnings above the plan's threshold.
  // A Postgraduate Loan is repaid at the same time as any other plan.
  studentLoans: {
    plan1: { threshold: 26900, rate: 0.09 },
    plan2: { threshold: 29385, rate: 0.09 },
    plan4: { threshold: 33795, rate: 0.09 },
    plan5: { threshold: 25000, rate: 0.09 },
    postgraduate: { threshold: 21000, rate: 0.06 }
  },

  // VAT: standard rate since 4 January 2011. Register when taxable turnover for the last 12 months
  // goes over the threshold, or is expected to in the next 30 days.
  vat: { standard: 0.20, reduced: 0.05, zero: 0, registrationThreshold: 90000 }
};
