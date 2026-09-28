/*
 * Canada figures for tax year 2026 — the ONLY place these numbers live (LEGAL.md §2, §6).
 * Checked 2026-09-28 against (CRA / Canada.ca):
 *   Federal rates and brackets: https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html
 *   Basic personal amount:      https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/federal-government-budgets/basic-personal-amount.html
 *   CPP:   https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html
 *   CPP2:  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/calculating-deductions/making-deductions/second-additional-cpp-contribution-rates-maximums.html
 *   CPP tax treatment (base = credit, enhanced/CPP2 = deduction):
 *          https://www.canada.ca/en/revenue-agency/news/2023/05/the-canada-pension-plan-enhancement--businesses-individuals-and-self-employed-what-it-means-for-you.html
 *   EI:    https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html
 *   Instalments: https://www.canada.ca/en/revenue-agency/services/payments/payments-cra/individual-payments/income-tax-instalments.html
 *   GST/HST rates: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html
 *   PST: B.C. https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst ,
 *        Saskatchewan https://www.saskatchewan.ca/business/taxes-licensing-and-reporting/provincial-taxes-policies-and-bulletins/provincial-sales-tax ,
 *        Manitoba https://www.gov.mb.ca/finance/taxation/taxes/retail.html
 *   QST is not pre-filled: visitors enter it from Revenu Québec.
 *
 * TO UPDATE: every January (CRA publishes new brackets, CPP and EI in November/December).
 */
window.ToolNestTaxCA = {
  year: 2026,
  checked: "2026-09-28",

  federalBrackets: [[58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33]],
  creditRate: 0.14, // lowest federal rate, used for non-refundable credits
  basicPersonalAmount: { max: 16452, min: 14829, phaseOutStart: 181440, phaseOutEnd: 258482 },

  cpp: {
    ympe: 74600, basicExemption: 3500, rate: 0.0595, baseRate: 0.0495, // each of employee / employer
    yampe: 85000, cpp2Rate: 0.04
  },
  ei: { maxInsurable: 68900, employeeRate: 0.0163, employerMultiplier: 1.4 }, // outside Quebec

  instalments: {
    threshold: 3000, quebecThreshold: 1800,
    dueDates: ["2026-03-15", "2026-06-15", "2026-09-15", "2026-12-15"]
  },

  // GST/HST rate and provincial sales tax (null = enter it yourself).
  salesTax: {
    AB: { name: "Alberta", type: "GST", rate: 0.05, pst: 0 },
    BC: { name: "British Columbia", type: "GST", rate: 0.05, pst: 0.07 },
    MB: { name: "Manitoba", type: "GST", rate: 0.05, pst: 0.07 },
    NB: { name: "New Brunswick", type: "HST", rate: 0.15, pst: 0 },
    NL: { name: "Newfoundland and Labrador", type: "HST", rate: 0.15, pst: 0 },
    NS: { name: "Nova Scotia", type: "HST", rate: 0.14, pst: 0 },
    NT: { name: "Northwest Territories", type: "GST", rate: 0.05, pst: 0 },
    NU: { name: "Nunavut", type: "GST", rate: 0.05, pst: 0 },
    ON: { name: "Ontario", type: "HST", rate: 0.13, pst: 0 },
    PE: { name: "Prince Edward Island", type: "HST", rate: 0.15, pst: 0 },
    QC: { name: "Quebec", type: "GST", rate: 0.05, pst: null },
    SK: { name: "Saskatchewan", type: "GST", rate: 0.05, pst: 0.06 },
    YT: { name: "Yukon", type: "GST", rate: 0.05, pst: 0 }
  }
};
