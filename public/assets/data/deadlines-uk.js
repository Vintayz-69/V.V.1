/*
 * UK Self Assessment and Making Tax Digital deadlines, October 2026 to January 2028 — the ONLY place
 * these dates live (LEGAL.md §2, §6). Checked 2026-10-27 against:
 *   Self Assessment deadlines for 2025 to 2026 (register by 5 October 2026, paper by 31 October 2026,
 *   online by 30 December 2026 to pay through your tax code, online and pay by 31 January 2027,
 *   second payment on account 31 July); each date is one year later for 2026 to 2027:
 *     https://www.gov.uk/self-assessment-tax-returns/deadlines
 *   Paying through your tax code (owe less than £3,000, already pay tax through PAYE):
 *     https://www.gov.uk/pay-self-assessment-tax-bill/through-your-tax-code
 *   Payments on account (31 January and 31 July): https://www.gov.uk/understand-self-assessment-bill/payments-on-account
 *   Making Tax Digital quarterly update deadlines (7 August, 7 November, 7 February, 7 May) and
 *   start dates (6 April 2026, 6 April 2027):
 *     https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
 *     https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax
 *
 * who: "all" (everyone in Self Assessment), "poa" (people who make payments on account),
 *      "mtd" (people using Making Tax Digital for Income Tax), "new" (first tax return).
 *
 * TO UPDATE: add the next year's dates before the last one here passes (change `to`), then run
 * `node tests/run-tests.js`.
 */
window.ToolNestDeadlinesUK = {
  checked: "2026-10-27",
  to: "2028-01-31",
  events: [
    { date: "2026-10-31", who: "all", title: "Paper tax return for 2025 to 2026", detail: "HMRC must receive it by 11:59pm. Online returns have until 31 January." },
    { date: "2026-11-07", who: "mtd", title: "Making Tax Digital update: 6 April to 5 October 2026", detail: "Second quarterly update for 2026 to 2027." },
    { date: "2026-12-30", who: "all", title: "Online return for 2025 to 2026, to pay through your tax code", detail: "Only if you already pay tax through PAYE (for example as an employee or with a company pension) and owe less than £3,000." },
    { date: "2027-01-31", who: "all", title: "Online tax return for 2025 to 2026, and pay what you owe", detail: "Includes the balancing payment for 2025 to 2026." },
    { date: "2027-01-31", who: "poa", title: "First payment on account for 2026 to 2027", detail: "Half of your 2025 to 2026 tax bill, paid at the same time as the balancing payment." },
    { date: "2027-02-07", who: "mtd", title: "Making Tax Digital update: 6 April 2026 to 5 January 2027", detail: "Third quarterly update for 2026 to 2027." },
    { date: "2027-04-05", who: "all", title: "End of the 2026 to 2027 tax year", detail: "The 2027 to 2028 tax year starts on 6 April." },
    { date: "2027-04-06", who: "all", title: "Making Tax Digital starts for qualifying income over £30,000", detail: "If your self-employed and property income before expenses was over £30,000 in 2025 to 2026." },
    { date: "2027-05-07", who: "mtd", title: "Making Tax Digital update: 6 April 2026 to 5 April 2027", detail: "Fourth quarterly update for 2026 to 2027." },
    { date: "2027-07-31", who: "poa", title: "Second payment on account for 2026 to 2027", detail: "The other half of your 2025 to 2026 tax bill." },
    { date: "2027-08-07", who: "mtd", title: "Making Tax Digital update: 6 April to 5 July 2027", detail: "First quarterly update for 2027 to 2028." },
    { date: "2027-10-05", who: "new", title: "Register for Self Assessment for 2026 to 2027", detail: "If it's your first tax return, or you didn't need to send one for 2025 to 2026." },
    { date: "2027-10-31", who: "all", title: "Paper tax return for 2026 to 2027", detail: "HMRC must receive it by 11:59pm." },
    { date: "2027-11-07", who: "mtd", title: "Making Tax Digital update: 6 April to 5 October 2027", detail: "Second quarterly update for 2027 to 2028." },
    { date: "2027-12-30", who: "all", title: "Online return for 2026 to 2027, to pay through your tax code", detail: "Only if you already pay tax through PAYE (for example as an employee or with a company pension) and owe less than £3,000." },
    { date: "2028-01-31", who: "all", title: "Online tax return for 2026 to 2027, and pay what you owe", detail: "Includes the balancing payment for 2026 to 2027." },
    { date: "2028-01-31", who: "poa", title: "First payment on account for 2027 to 2028", detail: "Half of your 2026 to 2027 tax bill." }
  ]
};
