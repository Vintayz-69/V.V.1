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

// ---------------- Resume and CV makers (one per country, shared engine js/resume.js)
function loadResume(country) {
  const sandbox = { window: {}, document: { getElementById: () => null } };
  vm.createContext(sandbox);
  for (const file of ["js/resume.js", `js/tools/resume-${country}.js`]) {
    vm.runInContext(fs.readFileSync(path.join(JS, file), "utf8"), sandbox);
  }
  return { T: sandbox.window.ToolNestCalc, R: sandbox.window.ToolNestResume };
}
{
  const { R } = loadResume("us");
  const dropped = [];
  check("resume clean: accents kept, others simplified", R.clean("Zoë “café” – ő ł 中 🎨", dropped), "Zoë “café” – o l");
  check("resume clean: unsupported characters reported", dropped.join(""), "中🎨");
  check("resume clean: spaces and minus", R.clean("5 000 − 10"), "5 000 - 10");
  check("resume skills split, not inside brackets", R.tags("Figma, Photoshop (web, print); SQL\n• Excel").join("|"), "Figma|Photoshop (web, print)|SQL|Excel");
  check("resume pasted bullets removed", R.lines("• one\n- two\n\n-5% costs").join("|"), "one|two|-5% costs");
  check("resume wrap by width", R.wrap("aaa bbb ccc", 7, (s) => s.length).join("|"), "aaa bbb|ccc");
  check("resume wrap long word", R.wrap("abcdefghij", 4, (s) => s.length).join("|"), "abcd|efgh|ij");
  check("resume date range", R.dateRange("Jan 2020", "Present"), "Jan 2020 – Present");
  check("resume date end only", R.dateRange("", "2018"), "2018");
  const safe = R.sanitize({ name: 5, experience: [{ title: "x".repeat(6000) }] });
  check("resume draft: non-text dropped", safe.name, undefined);
  check("resume draft: long text cut", safe.experience[0].title.length, 5000);
}
{
  // Each country's headings, in its order (README §5; guidance in each tools/resume-*.js file).
  const headings = {
    us: "Professional Summary|Skills|Work Experience|Education|Certifications",
    uk: "Personal Profile|Key Skills|Employment History|Education and Qualifications|Interests|Additional Information|References",
    ca: "Summary of Qualifications|Skills|Work Experience|Volunteer Experience|Education|Certifications|Languages",
    au: "Personal Summary|Key Skills|Work Experience|Education|Qualifications and Certificates|Achievements|Referees",
  };
  const paper = { us: "letter", uk: "a4", ca: "letter", au: "a4" };
  for (const c of Object.keys(headings)) {
    const { T } = loadResume(c);
    check(`resume ${c} headings`, T.doc(T.config.example).sections.map((s) => s.heading).join("|"), headings[c]);
    check(`resume ${c} paper`, T.config.paper, paper[c]);
    check(`resume ${c} example has no privacy warnings`, T.warnings(T.config.example).length, 0);
    check(`resume ${c} empty sections left out`, T.doc({ name: "A", skills: " , ," }).sections.length, 0);
  }
}
{
  const { T } = loadResume("us");
  const text = T.text(T.config.example);
  check("resume US text starts with name", text.split("\n")[0], "JORDAN RIVERA");
  check("resume US text job line", text.includes("WORK EXPERIENCE\nSenior Graphic Designer | Mar 2022 – Present\nHarbor & Pine Creative | Austin, TX"), true);
  check("resume US file name", T.fileName("Jordan Rivera"), "Jordan-Rivera-Resume");
  check("resume US file name without a name", T.fileName(""), "Resume");
  check("resume US phone is not an ID", T.warnings({ phone: "(512) 555-0142" }).length, 0);
  check("resume US SSN spotted", T.warnings({ summary: "SSN 123-45-6789" }).length, 1);
  check("resume US birthdate advice", T.warnings({ summary: "Date of birth: 1 May 1990" })[0].startsWith("CareerOneStop"), true);
}
{
  const { T } = loadResume("uk");
  check("resume UK file name", T.fileName("Zoë O'Brien"), "Zoe-OBrien-CV");
  check("resume UK NI number spotted", T.warnings({ additional: "NI: AB 12 34 56 C" }).length, 1);
  check("resume UK same advice shown once", T.warnings({ summary: "Married. Date of birth 1990." }).length, 1);
  const refs = (mode, people) => T.doc({ references: { mode, people } }).sections.map((s) => s.items[0].text || s.items[0].name).join("|");
  check("resume UK references on request", refs("request", []), "References are available on request.");
  check("resume UK references left out", refs("none", [{ name: "A" }]), "");
  check("resume UK referees listed", refs("list", [{ name: "Ann Lee", title: "Manager" }]), "Ann Lee");
}
{
  const { T } = loadResume("ca");
  check("resume CA SIN spotted", T.warnings({ summary: "SIN 046 454 286" })[0].includes("Social Insurance Number"), true);
  check("resume CA phone is not a SIN", T.warnings({ phone: "(905) 555-0187" }).length, 0);
}
{
  const { T } = loadResume("au");
  check("resume AU international phone is not an ID", T.warnings({ phone: "+61 491 570 156", references: { people: [{ phone: "+61 491 570 157" }] } }).length, 0);
  check("resume AU date of birth advice", T.warnings({ summary: "DOB 01/02/1990" })[0].startsWith("Workforce Australia"), true);
  check("resume AU bank details advice", T.warnings({ additional: "BSB 062-000" }).length, 1);
}

// ---------------- Freelance Invoice Generator (Stage 1 Phase D)
{
  const calc = load("invoice-generator");
  // Worked example: Sarah Chen
  expectAll("invoice-generator Sarah Chen", calc({
    items: [
      { desc: "Brand", qty: 1, rate: 2500 },
      { desc: "UI", qty: 25, rate: 85 },
      { desc: "System", qty: 1, rate: 750 }
    ],
    discountPct: 5,
    taxPct: 0
  }), { subtotal: 5375, discount: 268.75, taxable: 5106.25, tax: 0, total: 5106.25 });

  // Example with tax
  expectAll("invoice-generator with tax", calc({
    items: [{ qty: 10, rate: 100 }],
    discountPct: 10,
    taxPct: 20
  }), { subtotal: 1000, discount: 100, taxable: 900, tax: 180, total: 1080 });

  // Simple item
  expectAll("invoice-generator simple", calc({
    items: [{ qty: 2, rate: 50 }],
    discountPct: 0,
    taxPct: 5
  }), { subtotal: 100, discount: 0, taxable: 100, tax: 5, total: 105 });
}

// ---------------- Profit Margin & Markup Calculator (Stage 4 Business)
{
  const calc = load("profit-margin");
  // Worked example from page: candle craft store
  expectAll("profit-margin candle store", calc({ cost: 60, revenue: 100, expenses: 15 }),
    { grossProfit: 40, grossMargin: 40, markup: 66.67, netProfit: 25, netMargin: 25 });
  expectAll("profit-margin retail", calc({ cost: 200, revenue: 350, expenses: 50 }),
    { grossProfit: 150, grossMargin: 42.86, markup: 75, netProfit: 100, netMargin: 28.57 });
  expectAll("profit-margin break-even", calc({ cost: 50, revenue: 50, expenses: 0 }),
    { grossProfit: 0, grossMargin: 0, markup: 0, netProfit: 0, netMargin: 0 });
}

// ---------------- Break-Even Analysis Calculator (Stage 4 Business)
{
  const calc = load("break-even");
  // Worked example from page: coffee roaster
  expectAll("break-even coffee roaster", calc({ fixed: 5000, price: 50, variable: 20 }),
    { contributionMargin: 30, cmRatio: 60, units: 166.67, revenue: 8333.33 });
  expectAll("break-even software", calc({ fixed: 12000, price: 100, variable: 40 }),
    { contributionMargin: 60, cmRatio: 60, units: 200, revenue: 20000 });
  expectAll("break-even small shop", calc({ fixed: 2500, price: 25, variable: 10 }),
    { contributionMargin: 15, cmRatio: 60, units: 166.67, revenue: 4166.67 });
}

// ---------------- Payment Processing Fee Calculator (Stage 4 Business)
{
  const calc = load("payment-fee");
  // Worked example from page: Web developer Stripe
  expectAll("payment-fee Stripe $1k", calc({ amount: 1000, pct: 2.9, fixedFee: 0.30 }),
    { fee: 29.30, net: 970.70, effectiveRate: 2.93, grossUp: 1030.18, grossUpFee: 30.18 });
  expectAll("payment-fee PayPal $100", calc({ amount: 100, pct: 3.49, fixedFee: 0.49 }),
    { fee: 3.98, net: 96.02, effectiveRate: 3.98, grossUp: 104.12, grossUpFee: 4.12 });
  expectAll("payment-fee zero fee", calc({ amount: 500, pct: 0, fixedFee: 0 }),
    { fee: 0, net: 500, effectiveRate: 0, grossUp: 500, grossUpFee: 0 });
}

// ---------------- Salary to Hourly Calculator (Stage 2 Career)
{
  const calc = load("salary-to-hourly");
  // Worked example from page: Jordan $65k
  expectAll("salary-to-hourly Jordan", calc({ salary: 65000, hours: 40, days: 5, weeks: 52 }),
    { annualHours: 2080, hourly: 31.25, daily: 250, weekly: 1250, biweekly: 2500, monthly: 5416.67, overtime: 46.88 });
  expectAll("salary-to-hourly UK hours", calc({ salary: 90000, hours: 37.5, days: 5, weeks: 50 }),
    { annualHours: 1875, hourly: 48, daily: 360, weekly: 1800, biweekly: 3600, monthly: 7500, overtime: 72 });
  expectAll("salary-to-hourly part time", calc({ salary: 40000, hours: 20, days: 4, weeks: 52 }),
    { annualHours: 1040, hourly: 38.46, daily: 192.31, weekly: 769.23, biweekly: 1538.46, monthly: 3333.33, overtime: 57.69 });
}

// ---------------- Word Counter & Readability Analyzer (Stage 5 Education)
{
  const calc = load("word-counter");
  const sample = "The quick brown fox jumps over the lazy dog. It was a sunny day in the park.";
  const r1 = calc({ text: sample });
  check("word-counter words", r1.words, 17);
  check("word-counter sentences", r1.sentences, 2);
  check("word-counter chars", r1.chars, 76);
  check("word-counter chars no spaces", r1.charsNoSpaces, 60);
  check("word-counter paragraphs", r1.paragraphs, 1);

  const r2 = calc({ text: "" });
  check("word-counter empty words", r2.words, 0);
  check("word-counter empty sentences", r2.sentences, 0);

  const r3 = calc({ text: "First paragraph here.\n\nSecond paragraph with multiple words and thoughts." });
  check("word-counter multi-para words", r3.words, 10);
  check("word-counter multi-para count", r3.paragraphs, 2);
}

// ---------------- College GPA Calculator (Stage 5 Education)
{
  const calc = load("gpa-calculator");
  // Worked example from page: student 4 classes
  expectAll("gpa-calculator student", calc({
    courses: [
      { name: "Economics", credits: 3, grade: "A" },
      { name: "Calculus I", credits: 4, grade: "B+" },
      { name: "Computer Science", credits: 4, grade: "A-" },
      { name: "Academic Writing", credits: 3, grade: "A" }
    ]
  }), { totalCredits: 14, totalPoints: 52, gpa: 3.71, standing: "About A-" });

  expectAll("gpa-calculator 4.0", calc({
    courses: [
      { credits: 4, grade: "A" },
      { credits: 4, grade: "A" }
    ]
  }), { totalCredits: 8, totalPoints: 32, gpa: 4.0, standing: "About A" });

  expectAll("gpa-calculator passing", calc({
    courses: [
      { credits: 3, grade: "C" },
      { credits: 3, grade: "C" }
    ]
  }), { totalCredits: 6, totalPoints: 12, gpa: 2.0, standing: "About C" });
}

// ---------------- UK VAT (page examples)
{
  const calc = load("uk-vat", ["data/tax-uk.js"]);
  expectAll("UK VAT add 20%", calc({ mode: "add", amount: 1000, rate: "standard" }), { vat: 200, after: 1200 });
  expectAll("UK VAT remove 20%", calc({ mode: "remove", amount: 1200, rate: "standard" }), { before: 1000, vat: 200 });
  expectAll("UK VAT remove £59.99", calc({ mode: "remove", amount: 59.99, rate: "standard" }), { before: 49.99, vat: 10 });
  expectAll("UK VAT remove 5%", calc({ mode: "remove", amount: 105, rate: "reduced" }), { before: 100, vat: 5 });
  check("UK VAT one-sixth rule", calc({ mode: "remove", amount: 240, rate: "standard" }).vat, 40);
  expectAll("UK VAT zero rate", calc({ mode: "add", amount: 80, rate: "zero" }), { vat: 0, after: 80 });
}

// ---------------- UK take-home pay, PAYE 2026 to 2027 (page examples)
{
  const calc = load("uk-take-home", UK_LIBS);
  const sam = { salary: 35000, region: "ruk", pensionPct: 5, pensionType: "net", plan: "plan2", postgraduate: false };
  expectAll("UK PAYE Sam", calc(sam), { pension: 1750, taxable: 20680, incomeTax: 4136, ni: 1794.4, studentLoan: 505.35, takeHome: 26814.25, monthly: 2234.52 });
  // FAQ: salary sacrifice saves 1,750 × 8% NI and 1,750 × 9% student loan
  const sac = calc({ ...sam, pensionType: "sacrifice" });
  check("UK PAYE sacrifice NI saving", 1794.4 - sac.ni, 140);
  check("UK PAYE sacrifice loan saving", 505.35 - sac.studentLoan, 157.5);
  expectAll("UK PAYE £60k", calc({ salary: 60000, region: "ruk", pensionPct: 0, pensionType: "net", plan: "none", postgraduate: false }),
    { incomeTax: 11432, ni: 3210.6, takeHome: 45357.4 });
  // £110,000 with 10% salary sacrifice: pay 99,000 keeps the full allowance
  expectAll("UK PAYE £110k sacrifice", calc({ salary: 110000, region: "ruk", pensionPct: 10, pensionType: "sacrifice", plan: "none", postgraduate: false }),
    { personalAllowance: 12570, incomeTax: 27032, ni: 3990.6, takeHome: 67977.4 });
  // Scotland £30,000: 3,967 × 19% + 12,989 × 20% + 474 × 21%
  expectAll("UK PAYE Scotland £30k", calc({ salary: 30000, region: "scotland", pensionPct: 0, pensionType: "net", plan: "none", postgraduate: false }),
    { incomeTax: 3451.07, ni: 1394.4, takeHome: 25154.53 });
  check("UK PAYE Plan 2 + Postgraduate", calc({ salary: 35000, region: "ruk", pensionPct: 0, pensionType: "net", plan: "plan2", postgraduate: true }).studentLoan, 1345.35);
  check("UK PAYE Plan 1", calc({ salary: 30000, region: "ruk", pensionPct: 0, pensionType: "net", plan: "plan1", postgraduate: false }).studentLoan, 279);
  check("UK PAYE below Plan 5 threshold", calc({ salary: 24000, region: "ruk", pensionPct: 0, pensionType: "net", plan: "plan5", postgraduate: false }).studentLoan, 0);
}

// ---------------- UK holiday entitlement (page examples)
{
  const calc = load("uk-holiday", ["data/employment-uk.js"]);
  check("UK holiday 5 days", calc({ mode: "days", days: 5 }).entitlement, 28);
  check("UK holiday 3 days", calc({ mode: "days", days: 3 }).entitlement, 16.8);
  expectAll("UK holiday 6 days capped", calc({ mode: "days", days: 6 }), { entitlement: 28, capped: true });
  expectAll("UK holiday 30 hours over 4 days", calc({ mode: "hours", hours: 30, days: 4 }), { entitlement: 168, days: 22.4, capped: false });
  check("UK holiday hours cap (60 h over 6 days)", calc({ mode: "hours", hours: 60, days: 6 }).entitlement, 280);
  check("UK holiday irregular 30 hours (3.621)", Math.round(calc({ mode: "irregular", worked: 30 }).entitlement * 1000), 3621);
  check("UK holiday leaving after 6 months", calc({ mode: "days", days: 5, fraction: 0.5 }).entitlement, 14);
}

// ---------------- UK statutory redundancy pay (page examples)
{
  const calc = load("uk-redundancy", ["data/employment-uk.js"]);
  expectAll("redundancy age 45, 10 years, £600", calc({ age: 45, years: 10, weekly: 600 }), { weeks: 12, pay: 7200, capped: false });
  expectAll("redundancy age 30, 8 years, capped", calc({ age: 30, years: 8, weekly: 900 }), { weeks: 8, weeklyUsed: 751, pay: 6008 });
  expectAll("redundancy age 24, 5 years", calc({ age: 24, years: 5, weekly: 400 }), { weeks: 3.5, pay: 1400 });
  expectAll("redundancy maximum", calc({ age: 62, years: 25, weekly: 800 }), { counted: 20, weeks: 30, pay: 22530 });
  expectAll("redundancy under 2 years", calc({ age: 30, years: 1, weekly: 500 }), { qualifies: false, pay: 0 });
  // GOV.UK ready reckoner cells: age 41 with 2 years = 2 weeks; age 42 with 2 years = 2.5 weeks
  check("redundancy age 41, 2 years", calc({ age: 41, years: 2, weekly: 100 }).weeks, 2);
  check("redundancy age 42, 2 years", calc({ age: 42, years: 2, weekly: 100 }).weeks, 2.5);
}

// ---------------- Pay rise (page examples)
{
  const calc = load("pay-rise");
  expectAll("pay rise $50k to $53k", calc({ mode: "amount", current: 50000, newPay: 53000, inflation: 3 }),
    { percent: 6, increase: 3000, monthly: 250, real: 2.91, keepUp: 51500, versusInflation: 1500 });
  expectAll("pay rise £40k + 4.5%", calc({ mode: "percent", current: 40000, percent: 4.5, inflation: null }), { newPay: 41800, increase: 1800, monthly: 150, real: null });
  check("pay rise 5% vs 3% inflation", calc({ mode: "percent", current: 100, percent: 5, inflation: 3 }).real, 1.94);
  check("pay rise 2% vs 4% inflation", calc({ mode: "percent", current: 100, percent: 2, inflation: 4 }).real, -1.92);
}

// ---------------- Overtime (page examples)
{
  const calc = load("overtime");
  expectAll("overtime $20, 40 + 5", calc({ rate: 20, regular: 40, overtime: 5, overtimeRate: 1.5, double: 0, weeks: 1 }),
    { regularPay: 800, overtimePay: 150, weekly: 950, average: 21.11 });
  expectAll("overtime £15 with double time", calc({ rate: 15, regular: 37.5, overtime: 4, overtimeRate: 1.5, double: 2, weeks: 1 }),
    { regularPay: 562.5, overtimePay: 90, doublePay: 60, weekly: 712.5 });
  expectAll("overtime A$32 time and a quarter", calc({ rate: 32, regular: 38, overtime: 6, overtimeRate: 1.25, double: 0, weeks: 4 }),
    { regularPay: 1216, overtimePay: 240, weekly: 1456, yearly: 5824 });
}

// ---------------- Timesheet (page examples)
{
  const T = load("timesheet");
  check("timesheet parse 9:00", T.parseTime("9:00"), 540);
  check("timesheet parse 5:30pm", T.parseTime("5:30pm"), 1050);
  check("timesheet parse 12am", T.parseTime("12am"), 0);
  check("timesheet parse 0930", T.parseTime("0930"), 570);
  check("timesheet rejects 25:00", T.parseTime("25:00"), null);
  check("timesheet rejects 9:75", T.parseTime("9:75"), null);
  check("timesheet day 9:00-17:30 less 30", T.rowMinutes({ start: "09:00", end: "17:30", breakMin: "30" }), 480);
  check("timesheet night shift", T.rowMinutes({ start: "22:00", end: "06:00", breakMin: "30" }), 450);
  check("timesheet 8:15-16:45 less 45", T.rowMinutes({ start: "8:15", end: "16:45", breakMin: "45" }), 465);
  check("timesheet bad break not counted", T.rowMinutes({ start: "9:00", end: "17:00", breakMin: "abc" }), null);
  check("timesheet h:mm", T.hhmm(465), "7:45");
  const day = { start: "09:00", end: "17:30", breakMin: "30" };
  expectAll("timesheet five days at $25", T.calculate({ rows: [day, day, day, day, day, { start: "", end: "", breakMin: "" }], rate: 25, overtimeAfter: null, overtimeRate: 1.5 }),
    { hours: 40, pay: 1000 });
  const long = { start: "08:00", end: "17:00", breakMin: "" };
  expectAll("timesheet 45 hours, overtime after 40", T.calculate({ rows: [long, long, long, long, long], rate: 18, overtimeAfter: 40, overtimeRate: 1.5 }),
    { hours: 45, regularHours: 40, overtimeHours: 5, pay: 855 });
}

// ---------------- Business days (page examples)
{
  const B = load("business-days", ["data/holidays.js"]);
  check("business days Oct 2026 England", B.countBetween("2026-10-01", "2026-10-31", "england-and-wales", true).days, 22);
  expectAll("business days Oct 2026 US", B.countBetween("2026-10-01", "2026-10-31", "us", true), { days: 21, weekends: 9, calendarDays: 31 });
  check("business days start not counted", B.countBetween("2026-10-01", "2026-10-31", "none", false).days, 21);
  check("business days backwards", B.countBetween("2026-10-31", "2026-10-01", "none", true).days, -22);
  check("add 10 days England", B.addDays("2026-12-18", 10, "england-and-wales").date, "2027-01-06");
  check("add 10 days England skips 3 holidays", B.addDays("2026-12-18", 10, "england-and-wales").holidays.length, 3);
  check("add 10 days Scotland", B.addDays("2026-12-18", 10, "scotland").date, "2027-01-07");
  check("add 10 days US", B.addDays("2026-12-18", 10, "us").date, "2027-01-05");
  check("add -1 day from Monday", B.addDays("2026-10-05", -1, "none").date, "2026-10-02");
  check("holidays outside the list flagged", B.addDays("2027-12-20", 10, "us").uncovered, true);
  check("holidays inside the list not flagged", B.countBetween("2026-10-01", "2026-10-31", "us", true).uncovered, false);
}

// ---------------- UK degree classification (page examples)
{
  const D = load("uk-degree");
  const a = D.calculate({ year2: 62, year3: 68, finalWeight: 200 / 3 });
  check("degree 62/68 at 1:2 mark", a.mark, 66);
  check("degree 62/68 at 1:2 class", a.classification, "Upper second-class honours (2:1)");
  check("degree first needs 74", a.needed[70], 74);
  const b = D.calculate({ year2: 58, year3: 72, finalWeight: 60 });
  check("degree 58/72 at 40:60 mark", b.mark, 66.4);
  check("degree final year only", D.calculate({ year2: 50, year3: 71, finalWeight: 100 }).classification, "First-class honours (1st)");
  check("degree boundary 70 is a First", D.classify(70), "First-class honours (1st)");
  check("degree 39.99 below pass", D.classify(39.99), "Below the usual pass mark of 40");
  check("degree 1:2 preset rounding", D.calculate({ year2: 70, year3: 70, finalWeight: 66.6667 }).classification, "First-class honours (1st)");
}

// ---------------- Final grade (page examples)
{
  const calc = load("final-grade");
  check("final grade 78/25/80", calc({ current: 78, weight: 25, target: 80 }).needed, 86);
  check("final grade 72/40/70", calc({ current: 72, weight: 40, target: 70 }).needed, 67);
  const c = calc({ current: 85, weight: 30, target: 90 });
  check("final grade 85/30/90", c.needed, 101.67);
  check("final grade 85/30/90 not possible", c.possible, false);
  check("final grade best case", c.gradeWith(100), 89.5);
}

// ---------------- Citation generator (page examples)
{
  const C = load("citation");
  const article = { type: "journal", authors: "Lee, Anna M.\nOkafor, Daniel", title: "Remote work and freelance income", container: "Journal of Work Studies",
    year: "2025", volume: "12", issue: "3", pages: "45-67", doi: "10.1234/jws.2025.045" };
  check("cite APA journal", C.plain(C.cite("apa", article)),
    "Lee, A. M., & Okafor, D. (2025). Remote work and freelance income. Journal of Work Studies, 12(3), 45–67. https://doi.org/10.1234/jws.2025.045");
  check("cite APA journal italics", C.html(C.cite("apa", article)),
    "Lee, A. M., &amp; Okafor, D. (2025). Remote work and freelance income. <i>Journal of Work Studies</i>, <i>12</i>(3), 45–67. https://doi.org/10.1234/jws.2025.045");
  check("cite MLA journal", C.plain(C.cite("mla", { ...article, title: "Remote Work and Freelance Income" })),
    "Lee, Anna M., and Daniel Okafor. “Remote Work and Freelance Income.” Journal of Work Studies, vol. 12, no. 3, 2025, pp. 45-67, https://doi.org/10.1234/jws.2025.045.");
  check("cite Harvard journal", C.plain(C.cite("harvard", article)),
    "Lee, A.M. and Okafor, D. (2025) ‘Remote work and freelance income’, Journal of Work Studies, 12(3), pp. 45–67. Available at: https://doi.org/10.1234/jws.2025.045.");

  const book = { type: "book", authors: "Priya Shah\nTom Walker", title: "Working for yourself: A practical guide", year: "2024", edition: "2", publisher: "Northbridge Press" };
  check("cite APA book", C.plain(C.cite("apa", book)), "Shah, P., & Walker, T. (2024). Working for yourself: A practical guide (2nd ed.). Northbridge Press.");
  check("cite MLA book", C.plain(C.cite("mla", book)), "Shah, Priya, and Tom Walker. Working for yourself: A practical guide. 2nd ed., Northbridge Press, 2024.");
  check("cite Harvard book", C.plain(C.cite("harvard", book)), "Shah, P. and Walker, T. (2024) Working for yourself: A practical guide. 2nd edn. Northbridge Press.");

  const web = { type: "website", org: "National Careers Service", title: "How to write a cover letter", container: "GOV.UK",
    url: "https://nationalcareers.service.gov.uk/careers-advice/covering-letter", accessed: "2026-09-30" };
  check("cite APA web page, no date", C.plain(C.cite("apa", web)),
    "National Careers Service. (n.d.). How to write a cover letter. GOV.UK. https://nationalcareers.service.gov.uk/careers-advice/covering-letter");
  check("cite MLA web page", C.plain(C.cite("mla", web)),
    "National Careers Service. “How to write a cover letter.” GOV.UK, nationalcareers.service.gov.uk/careers-advice/covering-letter. Accessed 30 Sept. 2026.");
  check("cite Harvard web page", C.plain(C.cite("harvard", web)),
    "National Careers Service (no date) How to write a cover letter. Available at: https://nationalcareers.service.gov.uk/careers-advice/covering-letter (Accessed: 30 September 2026).");
  check("cite APA dated web page", C.plain(C.cite("apa", { type: "website", authors: "Jones, Kim", title: "Pricing your work", container: "Freelance Weekly", date: "2026-03-05", url: "https://example.com/p" })),
    "Jones, K. (2026, March 5). Pricing your work. Freelance Weekly. https://example.com/p");
  check("cite APA no author", C.plain(C.cite("apa", { type: "book", title: "Style guide", year: "2020", publisher: "Acme" })), "Style guide. (2020). Acme.");
  check("cite MLA three authors", C.plain(C.cite("mla", { type: "book", authors: "A, Ann\nB, Bob\nC, Cy", title: "T", publisher: "P", year: "2020" })), "A, Ann, et al. T. P, 2020.");
  check("cite Harvard four authors", C.plain(C.cite("harvard", { type: "book", authors: "A, Ann\nB, Bob\nC, Cy\nD, Di", title: "T", year: "2020", publisher: "P" })), "A, A. et al. (2020) T. P.");
  check("cite APA 21 authors", C.plain(C.cite("apa", { type: "book", authors: Array.from({ length: 21 }, (_, i) => "N" + i + ", A").join("\n"), title: "T", year: "2020" })).startsWith("N0, A., N1, A.") &&
    C.plain(C.cite("apa", { type: "book", authors: Array.from({ length: 21 }, (_, i) => "N" + i + ", A").join("\n"), title: "T", year: "2020" })).includes("N18, A., . . . N20, A. (2020)"), true);
  check("cite initials with hyphen", C.initials("Jean-Paul"), "J.-P.");
  check("cite HTML is escaped", C.html(C.cite("apa", { type: "book", title: "<b>x</b>", year: "2020" })).includes("&lt;b&gt;"), true);
}

// ---------------- Cover letter maker (shared resume engine)
{
  const sandbox = { window: {}, document: { getElementById: () => null } };
  vm.createContext(sandbox);
  for (const file of ["js/resume.js", "js/tools/cover-letter.js"]) vm.runInContext(fs.readFileSync(path.join(JS, file), "utf8"), sandbox);
  const L = sandbox.window.ToolNestCalc;
  const uk = { ...L.EXAMPLES.uk, country: "uk", date: "2026-09-30" };
  check("cover letter UK greeting, named", L.greeting(uk), "Dear Ms Anna Patel,");
  check("cover letter UK sign-off, named", L.signOff(uk), "Yours sincerely,");
  check("cover letter UK, no name", L.greeting({ ...uk, recipient: "" }) + " " + L.signOff({ ...uk, recipient: "" }), "Dear Sir or Madam, Yours faithfully,");
  check("cover letter US", L.greeting({ country: "us" }) + " " + L.signOff({ country: "us" }), "Dear Hiring Manager, Sincerely,");
  check("cover letter chosen sign-off", L.signOff({ ...uk, signOff: "Best regards," }), "Best regards,");
  check("cover letter UK date", L.formatDate("2026-09-30", "uk"), "30 September 2026");
  check("cover letter US date", L.formatDate("2026-09-30", "us"), "September 30, 2026");
  const text = L.text(uk).split("\n");
  check("cover letter text starts with name", text[0], "Hannah Clarke");
  check("cover letter text has subject", text.includes("Application for Senior Marketing Executive (reference MK-204)"), true);
  check("cover letter text ends with name", text[text.length - 1], "Hannah Clarke");
  check("cover letter example has no privacy warnings", L.warnings(uk).length + L.warnings({ ...L.EXAMPLES.us, country: "us" }).length, 0);
  check("cover letter spots a date of birth", L.warnings({ ...uk, middle: "Date of birth: 1 May 1990" }).length, 1);
  check("cover letter UK example word count in range", L.wordCount(uk) >= 200 && L.wordCount(uk) <= 400, true);
  check("cover letter US example word count in range", L.wordCount(L.EXAMPLES.us) >= 200 && L.wordCount(L.EXAMPLES.us) <= 400, true);
  check("cover letter file name", L.fileName("Zoë O'Brien"), "Zoe-OBrien-Cover-Letter");
  const fake = (t, f, s) => t.length * s * 0.5;
  check("cover letter example fits one page", L.layout(uk, { font: "sans" }, fake).pages.length, 1);
  check("cover letter UK paper A4", L.layout(uk, {}, fake).size.join("x"), "595.28x841.89");
  check("cover letter US paper Letter", L.layout({ ...uk, country: "us" }, {}, fake).size.join("x"), "612x792");
  check("cover letter long letter runs on", L.layout({ ...uk, middle: Array(12).fill(L.EXAMPLES.uk.middle).join("\n\n") }, {}, fake).pages.length > 1, true);
}

// ---------------- Quote generator (same script as the invoice generator; page example)
{
  const calc = load("invoice-generator");
  expectAll("quote Oak & Pixel", calc({ items: [{ qty: 1, rate: 1800 }, { qty: 5, rate: 120 }, { qty: 1, rate: 650 }], discountPct: 0, taxPct: 20 }),
    { subtotal: 3050, tax: 610, total: 3660 });
}

// ---------------- Compound interest
{
  const calc = load("compound-interest");
  expectAll("compound-interest 10yr lump", calc({ principal: 10000, monthlyDeposit: 0, rate: 7, years: 10, frequency: 12 }),
    { totalInvested: 10000, futureValue: 20096.61, totalInterest: 10096.61 });
  expectAll("compound-interest 5yr monthly", calc({ principal: 5000, monthlyDeposit: 200, rate: 6, years: 5, frequency: 12 }),
    { totalInvested: 17000, futureValue: 20698.26, totalInterest: 3698.26 });
  expectAll("compound-interest zero rate", calc({ principal: 1000, monthlyDeposit: 100, rate: 0, years: 2, frequency: 12 }),
    { totalInvested: 3400, futureValue: 3400, totalInterest: 0 });
}

// ---------------- Mortgage payment
{
  const calc = load("mortgage");
  expectAll("mortgage $400k standard", calc({ homePrice: 400000, downPayment: 80000, rate: 6.5, termYears: 30, propertyTax: 4000, homeInsurance: 1200 }),
    { loanAmount: 320000, monthlyPI: 2022.62, monthlyTax: 333.33, monthlyInsurance: 100, totalMonthly: 2455.95, totalInterest: 408142.36 });
  expectAll("mortgage $250k 15-yr", calc({ homePrice: 250000, downPayment: 50000, rate: 5.0, termYears: 15, propertyTax: 0, homeInsurance: 0 }),
    { loanAmount: 200000, monthlyPI: 1581.59, totalMonthly: 1581.59, totalInterest: 84685.71 });
  expectAll("mortgage zero interest", calc({ homePrice: 100000, downPayment: 10000, rate: 0, termYears: 10, propertyTax: 0, homeInsurance: 0 }),
    { loanAmount: 90000, monthlyPI: 750, totalMonthly: 750, totalInterest: 0 });
}

// ---------------- TDEE & Calorie Deficit
{
  const calc = load("tdee");
  expectAll("tdee male 30 moderate", calc({ unit: "metric", gender: "male", age: 30, weightKg: 80, heightCm: 180, activity: 1.55 }),
    { bmr: 1780, tdee: 2759, weightLoss: 2259, mildLoss: 2509, mildGain: 3009, weightGain: 3259 });
  expectAll("tdee female 25 sedentary", calc({ unit: "metric", gender: "female", age: 25, weightKg: 60, heightCm: 165, activity: 1.2 }),
    { bmr: 1345, tdee: 1614, weightLoss: 1114, mildLoss: 1364 });
  const imp = calc({ unit: "imperial", gender: "male", age: 40, weightLbs: 176.37, heightFt: 5, heightIn: 10.866, activity: 1.375 });
  check("tdee imperial BMR", imp.bmr, 1730);
  check("tdee imperial TDEE", imp.tdee, 2379);
}

// ---------------- BMI Calculator
{
  const calc = load("bmi");
  expectAll("bmi metric healthy", calc({ unit: "metric", weightKg: 70, heightCm: 175 }),
    { bmi: 22.86, category: "Normal (Healthy)", minWeightKg: 56.7, maxWeightKg: 76.3, prime: 0.91 });
  expectAll("bmi metric obese", calc({ unit: "metric", weightKg: 95, heightCm: 175 }),
    { bmi: 31.02, category: "Obese (Class I)", prime: 1.24 });
  const imp = calc({ unit: "imperial", weightLbs: 150, heightFt: 5, heightIn: 8 });
  check("bmi imperial score", imp.bmi, 22.81);
  check("bmi imperial category", imp.category, "Normal (Healthy)");
}

// ---------------- JSON Formatter
{
  const calc = load("json-formatter");
  const valid = calc({ text: '{"name":"Alice","skills":["js","css"]}' });
  check("json-formatter valid status", valid.valid, true);
  check("json-formatter key count", valid.keys, 2);
  check("json-formatter beautified", valid.pretty.includes('  "name": "Alice"'), true);
  const invalid = calc({ text: '{"broken": json}' });
  check("json-formatter invalid status", invalid.valid, false);
  const empty = calc({ text: '   ' });
  check("json-formatter empty status", empty.valid, false);
}

// ---------------- WCAG Color Contrast
{
  const calc = load("color-contrast");
  expectAll("color-contrast black on white", calc({ fg: "#000000", bg: "#ffffff" }),
    { ratio: 21, aaNormal: true, aaaNormal: true, aaLarge: true, aaaLarge: true, aaUI: true });
  const mid = calc({ fg: "#777777", bg: "#ffffff" });
  check("color-contrast mid grey ratio", mid.ratio, 4.48);
  check("color-contrast mid grey fails AA normal", mid.aaNormal, false);
  check("color-contrast mid grey passes AA large", mid.aaLarge, true);
  const same = calc({ fg: "#ffffff", bg: "#ffffff" });
  check("color-contrast same color ratio", same.ratio, 1);
  check("color-contrast same color fails AA", same.aaNormal, false);
}

// ---------------- Tip & Bill Split
{
  const calc = load("tip");
  expectAll("tip $100 20% 2 split", calc({ bill: 100, tipPct: 20, split: 2, roundUp: false }),
    { tipAmount: 20, total: 120, perPersonTotal: 60, perPersonTip: 10 });
  expectAll("tip $85.50 18% 3 split", calc({ bill: 85.50, tipPct: 18, split: 3, roundUp: false }),
    { tipAmount: 15.39, total: 100.89, perPersonTotal: 33.63 });
  expectAll("tip round up", calc({ bill: 42.30, tipPct: 15, split: 1, roundUp: true }),
    { tipAmount: 6.70, total: 49.00, perPersonTotal: 49.00, effectivePct: 15.8 });
}

// ---------------- Universal Unit Converter
{
  const calc = load("unit-converter");
  check("unit-converter miles to km", calc({ category: "length", value: 10, from: "mi", to: "km" }).result, 16.09);
  check("unit-converter lbs to kg", calc({ category: "weight", value: 150, from: "lb", to: "kg" }).result, 68.04);
  check("unit-converter celsius to fahrenheit", calc({ category: "temperature", value: 100, from: "c", to: "f" }).result, 212);
  check("unit-converter fahrenheit to celsius", calc({ category: "temperature", value: 32, from: "f", to: "c" }).result, 0);
  check("unit-converter gallons to liters", calc({ category: "volume", value: 5, from: "gal_us", to: "l" }).result, 18.93);
}

// ---------------- US Salaried Take-Home Pay
{
  const calc = load("us-take-home-pay", ["data/tax-us.js"]);
  expectAll("us-take-home-pay $75k single", calc({ salary: 75000, status: "single", preTax: 0, stateRate: 0 }),
    { taxableIncome: 58900, fedTax: 7670, totalFica: 5737.5, totalTaxes: 13407.5, netAnnual: 61592.5, netMonthly: 5132.71, netBiweekly: 2368.94 });
  expectAll("us-take-home-pay $120k with 401k & state tax", calc({ salary: 120000, status: "single", preTax: 5000, stateRate: 5 }),
    { fedTax: 16470, totalFica: 9180, stateTax: 5750, totalTaxes: 31400, netAnnual: 83600, netMonthly: 6966.67, netBiweekly: 3215.38 });
  expectAll("us-take-home-pay $50k mfj", calc({ salary: 50000, status: "mfj", preTax: 0, stateRate: 0 }),
    { taxableIncome: 17800, fedTax: 1780, totalFica: 3825, netAnnual: 44395 });
}

// ---------------- E-Commerce ROAS & Break-Even
{
  const calc = load("roas");
  expectAll("roas 4x profitable campaign", calc({ adSpend: 2000, revenue: 8000, cogs: 40, otherExpenses: 500, orders: 100 }),
    { roas: 4.0, roasPct: 400, netProfit: 2300, netMargin: 28.8, breakEvenRoas: 1.67, cpa: 20, aov: 80 });
  expectAll("roas 2.5x slim margin", calc({ adSpend: 1000, revenue: 2500, cogs: 50, otherExpenses: 0, orders: 50 }),
    { roas: 2.5, roasPct: 250, netProfit: 250, netMargin: 10.0, breakEvenRoas: 2.0, cpa: 20, aov: 50 });
  expectAll("roas 1.0x loss campaign", calc({ adSpend: 500, revenue: 500, cogs: 30, otherExpenses: 0, orders: 10 }),
    { roas: 1.0, roasPct: 100, netProfit: -150, breakEvenRoas: 1.43 });
}

// Real PDFs with pdf-lib, run in Node's own context (pdf-lib rejects objects from a vm sandbox).
// Page counts must match the worked examples on each page.
async function resumePdfTests() {
  const PDFLib = require(path.join(JS, "vendor", "pdf-lib", "pdf-lib.min.js"));
  const expected = {
    us: { size: "612x792", normal: 1, compact: 1 },
    uk: { size: "595.28x841.89", normal: 1, compact: 1 },
    ca: { size: "612x792", normal: 2, compact: 1 },
    au: { size: "595.28x841.89", normal: 2, compact: 1 },
  };
  for (const c of Object.keys(expected)) {
    global.window = {};
    global.document = { getElementById: () => null };
    for (const file of ["js/resume.js", `js/tools/resume-${c}.js`]) vm.runInThisContext(fs.readFileSync(path.join(JS, file), "utf8"));
    const T = window.ToolNestCalc;
    const R = window.ToolNestResume;
    delete global.window;
    delete global.document;
    for (const spacing of ["normal", "compact"]) {
      const lay = T.layout(T.config.example, { font: "sans", spacing }, R.pdfMeasure(PDFLib, "sans"));
      const bytes = await R.makePdf(PDFLib, lay, { title: "Example", author: T.config.example.name, lang: T.config.lang });
      const pdf = await PDFLib.PDFDocument.load(bytes);
      const size = pdf.getPage(0).getSize();
      check(`resume ${c} PDF ${spacing} pages`, pdf.getPageCount(), expected[c][spacing]);
      check(`resume ${c} PDF paper size`, `${size.width}x${size.height}`, expected[c].size);
      check(`resume ${c} PDF within length advice`, pdf.getPageCount() <= T.config.maxPages, true);
    }
    // A long resume: no section heading may be the last line on a page.
    const long = { ...T.config.example, experience: Array.from({ length: 14 }, (_, i) => ({ ...T.config.example.experience[i % 2] })) };
    const lay = T.layout(long, { font: "serif" }, R.pdfMeasure(PDFLib, "serif"));
    const headingSize = T.config.bodySize.normal + 0.5;
    const stranded = lay.pages.slice(0, -1).filter((p) => {
      const body = p.runs.filter((r) => !/Page \d+ of/.test(r.t));
      const lastY = Math.max(...body.map((r) => r.y));
      return body.some((r) => r.s === headingSize && r.f === "bold" && r.y === lastY);
    }).length;
    check(`resume ${c} long resume runs to several pages`, lay.pages.length > 2, true);
    check(`resume ${c} no heading left alone at a page foot`, stranded, 0);
  }
}

resumePdfTests().catch((err) => {
  failed++;
  console.log(`FAIL  resume PDF tests: ${err.message}`);
}).then(() => require("./pdf-tests.js")(check, expectAll)).catch((err) => {
  failed++;
  console.log("FAIL  PDF tool tests stopped:", err);
}).then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
