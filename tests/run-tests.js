/*
 * Calculator tests — every tool is checked against at least 3 examples worked out by hand
 * (LEGAL.md §6, README §7). Run:  node tests/run-tests.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const JS = path.join(__dirname, "..", "public", "assets");

function load(tool, extra = []) {
  const sandbox = { window: {}, document: { getElementById: () => null } };
  sandbox.window.ToolNest = {};
  vm.createContext(sandbox);
  for (const file of [...extra, `js/tools/${tool}.js`]) {
    vm.runInContext(fs.readFileSync(path.join(JS, file), "utf8"), sandbox);
  }
  return sandbox.window.ToolNestCalc;
}

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const got = typeof actual === "number" ? Math.round(actual * 100) / 100 : actual;
  if (got === expected) {
    passed++;
  } else {
    failed++;
    console.log(`FAIL  ${label}: got ${got}, expected ${expected}`);
  }
}

function expectAll(name, result, expected) {
  for (const [key, value] of Object.entries(expected)) check(`${name} → ${key}`, result[key], value);
}

// ---------------- Freelance hourly rate
{
  const calc = load("hourly-rate");
  expectAll("hourly-rate README example", calc({ income: 60000, expenses: 6000, tax: 25, weeksOff: 4, hours: 40, billable: 70 }),
    { hourly: 63.99, day: 511.9, monthly: 7166.67, billableHours: 1344, revenue: 86000 });
  expectAll("hourly-rate UK example", calc({ income: 45000, expenses: 3000, tax: 30, weeksOff: 6, hours: 37.5, billable: 65 }),
    { hourly: 60.01, day: 480.08, monthly: 5607.14, billableHours: 1121.25 });
  expectAll("hourly-rate zero tax", calc({ income: 30000, expenses: 0, tax: 0, weeksOff: 2, hours: 30, billable: 100 }),
    { hourly: 20, day: 160, monthly: 2500, billableHours: 1500 });
}

// ---------------- Contractor day rate
{
  const calc = load("day-rate");
  const priya = { income: 60000, expenses: 5000, tax: 30, daysOff: 33, benchWeeks: 4, hoursPerDay: 7.5 };
  expectAll("day-rate Priya", calc(priya), { days: 207, day: 438.23, hourly: 58.43, weekly: 2191.17, monthly: 7559.52 });
  expectAll("day-rate Priya no gaps", calc({ ...priya, benchWeeks: 0 }), { days: 227, day: 399.62 });
  expectAll("day-rate simple", calc({ income: 52000, expenses: 0, tax: 0, daysOff: 0, benchWeeks: 0, hoursPerDay: 8 }),
    { days: 260, day: 200, hourly: 25, weekly: 1000, monthly: 4333.33 });
}

// ---------------- Project pricing
{
  const calc = load("project-pricing");
  expectAll("project-pricing Sam", calc({ hours: 40, rate: 75, costs: 200, buffer: 15, deposit: 50 }),
    { labour: 3000, buffer: 480, price: 3680, deposit: 1840, balance: 1840, effective: 87 });
  expectAll("project-pricing plain", calc({ hours: 10, rate: 100, costs: 0, buffer: 0, deposit: 0 }),
    { price: 1000, deposit: 0, balance: 1000, effective: 100 });
  expectAll("project-pricing mixed", calc({ hours: 12.5, rate: 80, costs: 150, buffer: 20, deposit: 25 }),
    { labour: 1000, buffer: 230, price: 1380, deposit: 345, balance: 1035, effective: 98.4 });
  // Page text: 50 hours instead of 40 → $69.60/hour; 60 hours → $58.00/hour.
  check("project-pricing overrun 25%", (3680 - 200) / 50, 69.6);
}

// ---------------- Hourly to annual
{
  const calc = load("hourly-to-annual");
  expectAll("hourly-to-annual Jordan", calc({ rate: 30, hours: 40, days: 5, weeks: 52 }),
    { weekly: 1200, annual: 62400, monthly: 5200, biweekly: 2400, daily: 240, hoursYear: 2080 });
  expectAll("hourly-to-annual freelancer", calc({ rate: 30, hours: 40, days: 5, weeks: 46 }), { annual: 55200 });
  expectAll("hourly-to-annual UK hours", calc({ rate: 22.5, hours: 37.5, days: 5, weeks: 52 }),
    { weekly: 843.75, annual: 43875, monthly: 3656.25, daily: 168.75, hoursYear: 1950 });
}

// ---------------- Billable hours
{
  const calc = load("billable-hours");
  expectAll("billable-hours Maria", calc({ hours: 40, weeksOff: 6, admin: 4, sales: 5, learning: 2, other: 1, rate: 75 }),
    { week: 28, year: 1288, pct: 0.7, unpaidYear: 552, revenue: 96600, perHourWorked: 52.5 });
  expectAll("billable-hours all billable", calc({ hours: 30, weeksOff: 0, admin: 0, sales: 0, learning: 0, other: 0, rate: 50 }),
    { week: 30, year: 1560, pct: 1, revenue: 78000, perHourWorked: 50 });
  expectAll("billable-hours busy", calc({ hours: 45, weeksOff: 4, admin: 5, sales: 8, learning: 3, other: 2, rate: 60 }),
    { week: 27, year: 1296, pct: 0.6, unpaidYear: 864, revenue: 77760, perHourWorked: 36 });
}

// ---------------- Late payment interest
{
  const lp = load("late-payment", ["data/rates-uk.js"]);
  expectAll("late-payment Chris (UK)", lp.calculate({ mode: "uk", amount: 5000, dueDate: "2026-08-01", paidDate: "2026-09-30", baseRate: 3.75, includeComp: true }),
    { days: 60, rate: 11.75, daily: 1.61, interest: 96.58, extra: 70, claim: 166.58, total: 5166.58 });
  // GOV.UK's own example (£1,000, base rate 0.5%, 50 days). GOV.UK rounds the daily figure to 23p and gets £11.50;
  // unrounded it is £11.64.
  expectAll("late-payment GOV.UK example", lp.calculate({ mode: "uk", amount: 1000, dueDate: "2026-01-01", paidDate: "2026-02-20", baseRate: 0.5, includeComp: false }),
    { days: 50, rate: 8.5, interest: 11.64, extra: 0, claim: 11.64 });
  expectAll("late-payment contract rate", lp.calculate({ mode: "custom", amount: 2000, dueDate: "2026-01-10", paidDate: "2026-03-11", customRate: 18, fee: 25 }),
    { days: 60, rate: 18, interest: 59.18, extra: 25, claim: 84.18, total: 2084.18 });

  check("reference date: due 30 Jun → starts 1 Jul", lp.referenceDate("2026-06-30"), "2026-06-30");
  check("reference date: due 31 Dec → starts 1 Jan", lp.referenceDate("2026-12-31"), "2026-12-31");
  check("reference date: due 15 Mar", lp.referenceDate("2026-03-15"), "2025-12-31");
  check("reference date: due 29 Jun", lp.referenceDate("2026-06-29"), "2025-12-31");
  check("Bank Rate on 31 Dec 2025", lp.bankRateOn("2025-12-31"), 3.75);
  check("Bank Rate on 30 Jun 2026", lp.bankRateOn("2026-06-30"), 3.75);
  check("Bank Rate on 30 Jun 2025", lp.bankRateOn("2025-06-30"), 4.25);
  check("Bank Rate after verified range", lp.bankRateOn("2026-12-31"), null);
  check("compensation £999.99", lp.compensationFor(999.99), 40);
  check("compensation £1,000", lp.compensationFor(1000), 70);
  check("compensation £9,999.99", lp.compensationFor(9999.99), 70);
  check("compensation £10,000", lp.compensationFor(10000), 100);
}

// ---------------- Emergency fund
{
  const calc = load("emergency-fund");
  expectAll("emergency-fund Dana", calc({ personal: 3000, business: 500, months: 6, saved: 5000, save: 800 }),
    { monthly: 3500, target: 21000, gap: 16000, covers: 1.43, monthsToGoal: 20 });
  expectAll("emergency-fund already there", calc({ personal: 2000, business: 0, months: 3, saved: 7000, save: 0 }),
    { target: 6000, gap: 0, covers: 3.5, monthsToGoal: 0 });
  expectAll("emergency-fund rounds up", calc({ personal: 1000, business: 250, months: 12, saved: 0, save: 700 }),
    { target: 15000, gap: 15000, monthsToGoal: 22 }); // 15,000 ÷ 700 = 21.4 → 22 months
  expectAll("emergency-fund no saving", calc({ personal: 1000, business: 0, months: 6, saved: 0, save: 0 }), { monthsToGoal: Infinity });
}

// ---------------- Retirement savings
{
  const calc = load("retirement-savings");
  // Leo: 10,000 × 1.05^35 = 55,160.15; 500 × (1.05^35 − 1) ÷ (1.05^(1/12) − 1) = 554,231.49
  expectAll("retirement Leo", calc({ age: 30, retireAge: 65, current: 10000, monthly: 500, returnPct: 5, withdrawPct: 4 }),
    { months: 420, pot: 609391.64, contributed: 220000, growth: 389391.64, yearlyIncome: 24375.67, monthlyIncome: 2031.31 });
  expectAll("retirement zero growth", calc({ age: 40, retireAge: 60, current: 5000, monthly: 300, returnPct: 0, withdrawPct: 5 }),
    { months: 240, pot: 77000, contributed: 77000, growth: 0, yearlyIncome: 3850 });
  // Lump sum only: 20,000 × 1.06^10 = 35,816.95
  expectAll("retirement lump sum", calc({ age: 55, retireAge: 65, current: 20000, monthly: 0, returnPct: 6, withdrawPct: 4 }),
    { months: 120, pot: 35816.95 });
}

// ---------------- Income smoothing
{
  const calc = load("income-smoothing");
  const sam = calc([2500, 2000, 4000, 3000, 6500, 5000, 7000, 4500, 6000, 5500, 3500, 4500], { tax: 25, safety: 10, bufferMonths: 3 });
  expectAll("smoothing Sam", sam, { months: 12, avg: 4500, salary: 3037.5, lowest: 2000, highest: 7000, bufferTarget: 9112.5, startBuffer: 3525, leftOver: 4050 });
  check("smoothing Sam month 4 running total", sam.rows[3].running, -3525);
  expectAll("smoothing steady income", calc([3000, 3000, 3000], { tax: 20, safety: 0, bufferMonths: 2 }),
    { avg: 3000, salary: 2400, startBuffer: 0, leftOver: 0, bufferTarget: 4800 });
  // Good month first: 10,000 then 0, 2,000 → avg 4,000; salary 4,000 × 0.7 × 0.95 = 2,660
  expectAll("smoothing good start", calc([10000, 0, 2000], { tax: 30, safety: 5, bufferMonths: 1 }),
    { avg: 4000, salary: 2660, startBuffer: 0, leftOver: 420 });
}

// ---------------- US federal (tax year 2026)
const US_LIBS = ["data/tax-us.js", "js/us-tax.js"];
{
  const sb = { window: {} };
  vm.createContext(sb);
  for (const f of US_LIBS) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), sb);
  const U = sb.window.ToolNestUS;

  // Bracket tables reproduce the "base tax" amounts printed in Rev. Proc. 2025-32.
  check("US single tax at $50,400", U.incomeTax(50400, "single"), 5800);
  check("US single tax at $201,775", U.incomeTax(201775, "single"), 41024);
  check("US single tax at $640,600", U.incomeTax(640600, "single"), 192979.25);
  check("US MFJ tax at $100,800", U.incomeTax(100800, "mfj"), 11600);
  check("US MFJ tax at $768,700", U.incomeTax(768700, "mfj"), 206583.5);
  check("US HoH tax at $67,450", U.incomeTax(67450, "hoh"), 7740);
  check("US HoH tax at $201,750", U.incomeTax(201750, "hoh"), 39207);
  check("US MFS tax at $384,350", U.incomeTax(384350, "mfs"), 103291.75);

  // Hand-worked: single, $80,000 profit (see take-home page).
  const j = U.estimate(80000, "single");
  check("US Jamie SE tax", j.se.total, 11303.64);
  check("US Jamie half SE", j.se.deductibleHalf, 5651.82);
  check("US Jamie QBI", j.qbiDeduction, 11649.64);
  check("US Jamie taxable", j.taxable, 46598.54);
  check("US Jamie income tax", j.incomeTax, 5343.83);
  check("US Jamie take-home", j.takeHome, 63352.53);
  // MFJ, $150,000: net 138,525; SE 21,194.33; QBI 20% × 107,202.84; tax 2,480 + 12% × (85,762.27 − 24,800)
  const m = U.estimate(150000, "mfj");
  check("US MFJ 150k SE tax", m.se.total, 21194.32); // exact value 21,194.325 (half a cent)
  check("US MFJ 150k QBI", m.qbiDeduction, 21440.57);
  check("US MFJ 150k income tax", m.incomeTax, 9795.47);
  // Single, $250,000: SS capped at 184,500; Additional Medicare 0.9% × (230,875 − 200,000); above QBI threshold.
  const h = U.estimate(250000, "single");
  check("US 250k SS part", h.se.socialSecurity, 22878);
  check("US 250k SE tax", h.se.total, 29573.38);
  check("US 250k Additional Medicare", h.se.additionalMedicare, 277.88);
  check("US 250k QBI not applied", h.qbiApplies, false);
  check("US 250k income tax", h.incomeTax, 46572.26);
  // W-2 wages use up the wage base and the Additional Medicare threshold.
  const w = U.selfEmploymentTax(100000, "single", 150000);
  check("US SE with W-2: SS part", w.socialSecurity, 4278);
  check("US SE with W-2: total", w.total, 6956.15);
  check("US SE with W-2: Additional Medicare", w.additionalMedicare, 381.15);
  check("US SE under $400 net earnings", U.selfEmploymentTax(400, "single").total, 0);
}
{
  const calc = load("us-quarterly-tax", US_LIBS);
  expectAll("US quarterly, no prior year", calc({ profit: 80000, status: "single", withholding: 0, priorTax: null, priorAgi: null }),
    { owed: 16647.47, required: true, safeTarget: 14982.72, safeQuarterly: 3745.68, fullQuarterly: 4161.87 });
  expectAll("US quarterly, prior year 100%", calc({ profit: 80000, status: "single", withholding: 0, priorTax: 12000, priorAgi: 90000 }),
    { safeTarget: 12000, safeQuarterly: 3000, priorPct: 100, usesPriorYear: true });
  expectAll("US quarterly, prior year 110%", calc({ profit: 80000, status: "single", withholding: 2000, priorTax: 12000, priorAgi: 160000 }),
    { safeTarget: 13200, safePay: 11200, safeQuarterly: 2800, priorPct: 110 });
  // $10,000 profit: SE 1,412.96; taxable 0 after standard deduction → owed 1,412.96; withholding 500 → 912.96 < 1,000.
  expectAll("US quarterly, under $1,000", calc({ profit: 10000, status: "single", withholding: 500, priorTax: null, priorAgi: null }),
    { owed: 1412.96, required: false, safePay: 0 });
}
{
  const calc = load("us-1099-vs-w2", US_LIBS);
  expectAll("US 1099 Riley", calc({ salary: 90000, benefits: 12000, rate: 65, hours: 40, weeks: 48 }),
    { employerTax: 6885, w2Value: 108885, hours: 1920, breakEven: 56.71, gross1099: 124800, difference: 15915 });
  // Salary above the wage base: 184,500 × 6.2% + 200,000 × 1.45% = 11,439 + 2,900
  expectAll("US 1099 high salary", calc({ salary: 200000, benefits: 0, rate: 100, hours: 40, weeks: 50 }),
    { employerTax: 14339, w2Value: 214339, breakEven: 107.17 });
  expectAll("US 1099 part-time", calc({ salary: 50000, benefits: 5000, rate: 40, hours: 25, weeks: 46 }),
    { employerTax: 3825, w2Value: 58825, hours: 1150, breakEven: 51.15, difference: -12825 });
}
{
  const calc = load("us-mileage", US_LIBS);
  expectAll("US mileage Morgan 2026", calc({ year: "2026", milesByPeriod: [5000, 6000], extra: 200, taxRate: 30 }),
    { miles: 11000, mileage: 8185, deduction: 8385, saving: 2515.5 });
  expectAll("US mileage 2025", calc({ year: "2025", milesByPeriod: [10000], extra: 0, taxRate: 0 }), { mileage: 7000, deduction: 7000 });
  expectAll("US mileage second half only", calc({ year: "2026", milesByPeriod: [0, 1234], extra: 50, taxRate: 25 }),
    { mileage: 937.84, deduction: 987.84, saving: 246.96 });
}
{
  const calc = load("us-home-office", US_LIBS);
  expectAll("US home office Alex", calc({ office: 200, home: 1500, expenses: 24000, profit: 50000 }),
    { simplified: 1000, regular: 3200, best: "regular", bestAmount: 3200, capped: false });
  expectAll("US home office 300 sq ft cap", calc({ office: 350, home: 2000, expenses: 6000, profit: 50000 }),
    { simplifiedRaw: 1500, simplified: 1500, regular: 1050, best: "simplified" });
  expectAll("US home office profit cap", calc({ office: 200, home: 1000, expenses: 20000, profit: 800 }),
    { simplified: 800, regular: 800, capped: true });
}
{
  const calc = load("us-take-home", US_LIBS);
  expectAll("US take-home with 5% state", calc({ profit: 80000, status: "single", stateRate: 5 }),
    { state: 4000, total: 20647.47, takeHome: 59352.53 });
}

// ---------------- UK (tax year 2026 to 2027)
const UK_LIBS = ["data/tax-uk.js", "js/uk-tax.js"];
{
  const sb = { window: {} };
  vm.createContext(sb);
  for (const f of UK_LIBS) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), sb);
  const U = sb.window.ToolNestUK;

  // Priya, England, £45,000: IT 32,430 × 20%; NI 32,430 × 6%.
  expectAll("UK Priya rUK", U.soleTrader(45000, "ruk"), { personalAllowance: 12570, incomeTax: 6486, class4: 1945.8, takeHome: 36568.2 });
  // Scotland £45,000: 3,967×19% + 12,989×20% + 14,136×21% + 1,338×42%
  expectAll("UK Priya Scotland", U.soleTrader(45000, "scotland"), { incomeTax: 6882.05, takeHome: 36172.15 });
  // £110,000: allowance 12,570 − 5,000; IT 37,700×20% + 64,730×40%; NI 37,700×6% + 59,730×2%
  expectAll("UK £110k taper", U.soleTrader(110000, "ruk"), { personalAllowance: 7570, incomeTax: 33432, class4: 3456.6 });
  // £150,000: no allowance; 37,700×20% + 87,440×40% + 24,860×45% = 7,540 + 34,976 + 11,187
  expectAll("UK £150k additional rate", U.soleTrader(150000, "ruk"), { personalAllowance: 0, incomeTax: 53703 });
  check("UK Class 2 treated as paid at £7,105", U.soleTrader(7105, "ruk").class2Treated, true);
  check("UK Class 2 not treated below", U.soleTrader(7104, "ruk").class2Treated, false);
  check("UK Corporation Tax £40k", U.corporationTax(40000), 7600);
  check("UK Corporation Tax £100k marginal", U.corporationTax(100000), 22750); // 25,000 − 150,000 × 3/200
  check("UK Corporation Tax £300k", U.corporationTax(300000), 75000);
  check("UK employer NI on £12,570", U.employerNI(12570), 1135.5);
  check("UK employee NI on £30,000", U.employeeNI(30000), 1394.4);
  // Dividends £10,000 on top of £45,000 taxable salary: 500 allowance, then 9,500 all higher rate
  check("UK dividend tax higher band", U.dividendTax(10000, 45000), 3396.25);
  // Straddles basic/higher: other taxable 30,000, dividends 10,000 → 500 allowance (30,000–30,500),
  // 7,200 basic (to 37,700) × 10.75% + 2,300 higher × 35.75%
  check("UK dividend tax straddling", U.dividendTax(10000, 30000), 1596.25);
}
{
  const calc = load("uk-sole-trader-vs-ltd", UK_LIBS);
  const sam = calc({ profit: 60000, region: "ruk", salary: 12570, companyCosts: 0 });
  check("UK Sam sole take-home", sam.sole.takeHome, 46111.4);
  check("UK Sam ltd corporation tax", sam.ltd.corporationTax, 8795.96);
  check("UK Sam ltd dividends", sam.ltd.dividends, 37498.55);
  check("UK Sam ltd dividend tax", sam.ltd.dividendTax, 3977.34);
  check("UK Sam ltd take-home", sam.ltd.takeHome, 46091.2); // unrounded parts: 12,570 + 37,498.545 − 3,977.344
  // With £1,500 running costs: company profit 44,794.50; CT 8,510.96; dividends 36,283.55; tax (35,783.55 × 10.75%)
  const costs = calc({ profit: 60000, region: "ruk", salary: 12570, companyCosts: 1500 });
  check("UK ltd with costs take-home", costs.ltd.takeHome, 45006.81); // 12,570 + 36,283.545 − 3,846.731
  // £120,000, salary £12,570: company profit 106,294.50; CT 26,573.63 − 2,155.58 marginal
  const hi = calc({ profit: 120000, region: "ruk", salary: 12570, companyCosts: 0 });
  check("UK £120k ltd corporation tax", hi.ltd.corporationTax, 24418.04);
}
{
  const calc = load("uk-payments-on-account", UK_LIBS);
  expectAll("UK POA Tom first year", calc({ lastBill: 8000, paidOnAccount: 0, atSource: 0, nextBill: 9000 }),
    { needed: true, eachPayment: 4000, january: 12000, july: 4000, balancingNext: 1000 });
  expectAll("UK POA second year", calc({ lastBill: 9000, paidOnAccount: 8000, atSource: 0, nextBill: 7000 }),
    { eachPayment: 4500, balancingLast: 1000, january: 5500, july: 4500, balancingNext: -2000, refundNext: true });
  expectAll("UK POA under £1,000", calc({ lastBill: 900, paidOnAccount: 0, atSource: 0, nextBill: null }),
    { needed: false, reason: "bill", january: 900, july: 0 });
  // 85% collected at source: bill 3,000, PAYE 17,000
  expectAll("UK POA over 80% at source", calc({ lastBill: 3000, paidOnAccount: 0, atSource: 17000, nextBill: null }),
    { needed: false, reason: "source", eachPayment: 0 });
}
{
  const calc = load("uk-mileage", UK_LIBS);
  expectAll("UK mileage Lucy 2026-27", calc({ year: "2026-27", vehicle: "car", miles: 12000, taxRate: 26 }), { allowance: 6000, saving: 1560 });
  // GOV.UK's own example: 12,000 miles at the 2025-26 rates = £5,000
  expectAll("UK mileage GOV.UK example", calc({ year: "2025-26", vehicle: "car", miles: 12000, taxRate: 0 }), { allowance: 5000 });
  // GOV.UK simplified expenses example: 11,000 miles = £5,750
  expectAll("UK mileage GOV.UK 11,000 miles", calc({ year: "2026-27", vehicle: "car", miles: 11000, taxRate: 0 }), { allowance: 5750 });
  expectAll("UK mileage motorcycle", calc({ year: "2026-27", vehicle: "motorcycle", miles: 3000, taxRate: 0 }), { allowance: 720 });
}
{
  const w = load("uk-work-from-home", UK_LIBS);
  check("UK WFH 24 hours", w.flatRateFor(24), 0);
  check("UK WFH 25 hours", w.flatRateFor(25), 10);
  check("UK WFH 51 hours", w.flatRateFor(51), 18);
  check("UK WFH 101 hours", w.flatRateFor(101), 26);
  expectAll("UK WFH Ella", w.calculate({ hours: 120, months: 12, bills: 3000, share: 10 }), { simplified: 312, actual: 300, best: "simplified" });
  expectAll("UK WFH actual wins", w.calculate({ hours: 60, months: 10, bills: 4000, share: 15 }), { simplified: 180, actual: 600, best: "actual" });
}

// ---------------- Canada (tax year 2026)
const CA_LIBS = ["data/tax-ca.js", "js/ca-tax.js"];
{
  const sb = { window: {} };
  vm.createContext(sb);
  for (const f of CA_LIBS) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), sb);
  const C = sb.window.ToolNestCA;

  // CRA maximums: CPP (74,600 − 3,500) × 11.9% = 8,460.90; CPP2 (85,000 − 74,600) × 8% = 832
  const max = C.selfEmployedCpp(100000);
  check("CA CPP self-employed max", max.cpp1, 8460.9);
  check("CA CPP2 self-employed max", max.cpp2, 832);
  check("CA employer CPP max", C.employerCpp(100000), 4230.45 + 416);
  check("CA BPA full", C.basicPersonalAmount(181440), 16452);
  check("CA BPA minimum", C.basicPersonalAmount(258482), 14829);
  check("CA BPA halfway", C.basicPersonalAmount(219961), 15640.5);
  check("CA federal tax at $58,523", C.bracketTax(58523), 8193.22);

  // Jordan, $60,000: CPP 6,723.50; deduction 3,361.75 + 565; federal 14% × 56,073.25 − 14% × (16,452 + 2,796.75)
  const j = C.selfEmployed(60000, 5);
  check("CA Jordan CPP", j.cpp.total, 6723.5);
  check("CA Jordan CPP deduction", j.cpp.deduction, 3926.75);
  check("CA Jordan base CPP credit amount", j.cpp.creditAmount, 2796.75);
  check("CA Jordan net income", j.netIncome, 56073.25);
  check("CA Jordan federal tax", j.federal, 5155.43);
  check("CA Jordan provincial 5%", j.provincial, 2803.66);
  check("CA Jordan take-home", j.takeHome, 45317.41);
  // Low income: $15,000 → CPP 1,368.50; federal tax 0 (credits exceed tax)
  const low = C.selfEmployed(15000, 0);
  check("CA low income CPP", low.cpp.total, 1368.5);
  check("CA low income federal", low.federal, 0);
}
{
  const calc = load("ca-instalments", CA_LIBS);
  expectAll("CA instalments Mei", calc({ current: 12000, last: 10000, before: 8000, quebec: false }),
    { required: true, currentYear: 3000, priorYear: 2500, lower: 2500 });
  expectAll("CA instalments not required (prior years low)", calc({ current: 5000, last: 2000, before: 2500, quebec: false }), { required: false, lower: 0 });
  expectAll("CA instalments Quebec threshold", calc({ current: 2000, last: 1900, before: 0, quebec: true }), { required: true, lower: 475 });
  expectAll("CA instalments current under threshold", calc({ current: 3000, last: 9000, before: 9000, quebec: false }), { required: false });
}
{
  const calc = load("ca-employee-vs-contractor", CA_LIBS);
  expectAll("CA contractor Sanjay", calc({ salary: 75000, benefits: 8000, rate: 55, hours: 37.5, weeks: 46 }),
    { employerCpp: 4246.45, package: 87246.45, hours: 1725, breakEven: 50.58, gross: 94875, difference: 7628.55, employeeEi: 1123.07 });
  expectAll("CA contractor low salary", calc({ salary: 40000, benefits: 0, rate: 30, hours: 40, weeks: 48 }),
    { employerCpp: 2171.75, package: 42171.75, breakEven: 21.96 });
  expectAll("CA contractor over YAMPE", calc({ salary: 120000, benefits: 5000, rate: 90, hours: 35, weeks: 46 }),
    { employerCpp: 4646.45, package: 129646.45, breakEven: 80.53 });
}
{
  const calc = load("ca-gst-hst", CA_LIBS);
  expectAll("CA HST Ontario add", calc({ province: "ON", mode: "add", amount: 1000, pst: 0 }), { gst: 130, after: 1130 });
  expectAll("CA B.C. add with PST", calc({ province: "BC", mode: "add", amount: 1000, pst: 0.07 }), { gst: 50, pst: 70, after: 1120 });
  expectAll("CA Nova Scotia remove", calc({ province: "NS", mode: "remove", amount: 1140, pst: 0 }), { before: 1000, gst: 140 });
  expectAll("CA Alberta remove", calc({ province: "AB", mode: "remove", amount: 525, pst: 0 }), { before: 500, gst: 25 });
}

// ---------------- Australia (2026–27)
const AU_LIBS = ["data/tax-au.js", "js/au-tax.js"];
{
  const sb = { window: {} };
  vm.createContext(sb);
  for (const f of AU_LIBS) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), sb);
  const A = sb.window.ToolNestAU;

  check("AU tax at $45,000", A.incomeTax(45000), 4020);        // 26,800 × 15%
  check("AU tax at $135,000", A.incomeTax(135000), 31020);     // 4,020 + 90,000 × 30%
  check("AU tax at $190,000", A.incomeTax(190000), 51370);     // 31,020 + 55,000 × 37%
  check("AU LITO at $37,500", A.lito(37500), 700);
  check("AU LITO at $45,000", A.lito(45000), 325);
  check("AU LITO at $66,667", A.lito(66667), 0);

  expectAll("AU Chloe $80,000", A.individual(80000, 80000),
    { basic: 14520, lito: 0, smallBusinessOffset: 1000, incomeTax: 13520, medicare: 1600, takeHome: 64880 });
  // $40,000: LITO 700 − 5% × 2,500 = 575; SBITO 16% × 3,270 = 523.20
  expectAll("AU $40,000 sole trader", A.individual(40000, 40000),
    { basic: 3270, lito: 575, smallBusinessOffset: 523.2, incomeTax: 2171.8, medicare: 800, takeHome: 37028.2 });
  expectAll("AU $200,000 employee (no SBITO)", A.individual(200000, 0), { basic: 55870, incomeTax: 55870, medicare: 4000 });
}
{
  const calc = load("au-gst", AU_LIBS);
  expectAll("AU GST add", calc({ mode: "add", amount: 1000 }), { gst: 100, after: 1100 });
  expectAll("AU GST remove", calc({ mode: "remove", amount: 1100 }), { before: 1000, gst: 100 });
  expectAll("AU GST one-eleventh", calc({ mode: "remove", amount: 220 }), { gst: 20 });
}
{
  const calc = load("au-employee-vs-contractor", AU_LIBS);
  expectAll("AU contractor Liam", calc({ salary: 95000, benefits: 0, rate: 70, hours: 38, weeks: 44 }),
    { super: 11400, package: 106400, hours: 1672, breakEven: 63.64, gross: 117040, difference: 10640 });
  expectAll("AU contractor with bonus", calc({ salary: 60000, benefits: 3000, rate: 40, hours: 30, weeks: 45 }),
    { super: 7200, package: 70200, hours: 1350, breakEven: 52, difference: -16200 });
  expectAll("AU contractor full year", calc({ salary: 150000, benefits: 0, rate: 100, hours: 40, weeks: 48 }),
    { package: 168000, breakEven: 87.5 });
}
{
  const calc = load("au-voluntary-super", AU_LIBS);
  expectAll("AU super Aisha", calc({ income: 90000, employer: 10800, extra: 10000 }),
    { taxSaved: 3200, contributionsTax: 1500, netBenefit: 1700, concessional: 20800, capRoom: 11700, overCap: false, takeHomeChange: -6800 });
  // Division 293: income after contribution 250,000 + 30,000 contributions > 250,000 → extra 15% on the 10,000
  expectAll("AU super Division 293", calc({ income: 260000, employer: 20000, extra: 10000 }),
    { taxSaved: 4700, contributionsTax: 3000, netBenefit: 1700 });
  expectAll("AU super over the cap", calc({ income: 150000, employer: 18000, extra: 20000 }), { overCap: true, capRoom: -5500 });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
