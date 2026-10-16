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
  const sandbox = { window: { crypto: globalThis.crypto }, document: { getElementById: () => null }, crypto: globalThis.crypto, TextEncoder, TextDecoder, URL };
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
  // Page text: "$1,000 including HST" in Ontario leaves $884.96 before tax
  expectAll("CA Ontario remove $1,000", calc({ province: "ON", mode: "remove", amount: 1000, pst: 0 }), { before: 884.96 });
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
  // Page text: adding a 40% markup to a $60 cost gives a 28.6% margin, not 40%
  expectAll("profit-margin markup is not margin", calc({ cost: 60, revenue: 84, expenses: 0 }),
    { grossProfit: 24, grossMargin: 28.57, markup: 40 });
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
  // Interest is charged in whole cents each month on a payment rounded to the cent, so total
  // interest is a little different from payment × months − loan. Checked against a separate
  // month-by-month simulation.
  const std = calc({ homePrice: 400000, downPayment: 80000, rate: 6.5, termYears: 30, propertyTax: 4000, homeInsurance: 1200 });
  expectAll("mortgage $400k standard", std,
    { loanAmount: 320000, monthlyPI: 2022.62, monthlyTax: 333.33, monthlyInsurance: 100, totalMonthly: 2455.95, totalInterest: 408140.64 });
  // Page worked example: principal paid.
  expectAll("mortgage page example first payment", std, { firstInterest: 1733.33, firstPrincipal: 289.29 });
  expectAll("mortgage page example year 1", std.years[0], { principal: 3576.76, interest: 20694.68, balance: 316423.24 });
  expectAll("mortgage page example year 5", std.years[4], { balance: 299554.97 });
  check("mortgage page example principal after 5 years", 320000 - std.years[4].balance, 20445.03);
  check("mortgage page example paid in year 1", std.years[0].principal + std.years[0].interest, 24271.44);
  check("mortgage page example balance after 1 payment", 320000 - std.firstPrincipal, 319710.71);
  check("mortgage schedule length", std.years.length, 30);
  check("mortgage schedule ends at 0", std.years[29].balance, 0);
  check("mortgage schedule principal adds up to loan", std.years.reduce((a, y) => a + y.principal, 0), 320000);
  const short = calc({ homePrice: 250000, downPayment: 50000, rate: 5.0, termYears: 15, propertyTax: 0, homeInsurance: 0 });
  expectAll("mortgage $250k 15-yr", short,
    { loanAmount: 200000, monthlyPI: 1581.59, totalMonthly: 1581.59, totalInterest: 84685.48, firstInterest: 833.33, firstPrincipal: 748.26 });
  check("mortgage 15-yr year 1 principal", short.years[0].principal, 9187.77);
  const zero = calc({ homePrice: 100000, downPayment: 10000, rate: 0, termYears: 10, propertyTax: 0, homeInsurance: 0 });
  expectAll("mortgage zero interest", zero,
    { loanAmount: 90000, monthlyPI: 750, totalMonthly: 750, totalInterest: 0, firstPrincipal: 750 });
  check("mortgage zero interest year 1", zero.years[0].principal, 9000);
  check("mortgage no loan", calc({ homePrice: 100000, downPayment: 100000, rate: 5, termYears: 30 }).years.length, 0);
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
  // Page text: the "Example" section shows exactly this output
  check("json-formatter page example", calc({ text: '{"name":"Alice","skills":["design","writing"],"active":true}' }).pretty,
    ['{', '  "name": "Alice",', '  "skills": [', '    "design",', '    "writing"', '  ],', '  "active": true', '}'].join(String.fromCharCode(10)));
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
  // Page text: one shade darker passes AA for normal text
  const darker = calc({ fg: "#767676", bg: "#ffffff" });
  check("color-contrast #767676 ratio", darker.ratio, 4.54);
  check("color-contrast #767676 passes AA normal", darker.aaNormal, true);
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
  expectAll("tip before rounding up", calc({ bill: 42.30, tipPct: 15, split: 1, roundUp: false }),
    { tipAmount: 6.35, total: 48.65 });
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
  // Page text: a 2.5x ROAS still loses money when product costs are 65% of revenue
  expectAll("roas 2.5x with 65% costs loses money", calc({ adSpend: 1000, revenue: 2500, cogs: 65, otherExpenses: 0, orders: 50 }),
    { roas: 2.5, netProfit: -125, breakEvenRoas: 2.86 });
}

// ================ Tools added 5 October 2026 (one per section)

// ---------------- Effective hourly rate (worked by hand)
{
  const calc = load("effective-hourly-rate");
  // Sam: $2,400 fee, 40 hours, 3% payment fee, $100 costs, $60 target.
  // fees 2,400 × 3% = 72; kept 2,400 − 72 − 100 = 2,228; 2,228 ÷ 40 = 55.70;
  // hours at target 2,228 ÷ 60 = 37.13; fee needed (60 × 40 + 100) ÷ 0.97 = 2,577.32
  expectAll("effective-hourly Sam", calc({ fee: 2400, hours: 40, feePct: 3, expenses: 100, target: 60 }),
    { fees: 72, net: 2228, effective: 55.7, gap: -4.3, hoursAtTarget: 37.13, feeNeeded: 2577.32 });
  // £1,500 for 25 hours, no fees or costs: 1,500 ÷ 25 = 60, no target
  const plain = calc({ fee: 1500, hours: 25, feePct: 0, expenses: 0, target: null });
  expectAll("effective-hourly no fees", plain, { fees: 0, net: 1500, effective: 60 });
  check("effective-hourly no target", plain.feeNeeded, undefined);
  // $800 on a platform taking 10%, 20 hours, $50 target: kept 720; 36 an hour;
  // hours at target 720 ÷ 50 = 14.4; fee needed 50 × 20 ÷ 0.9 = 1,111.11
  expectAll("effective-hourly platform", calc({ fee: 800, hours: 20, feePct: 10, expenses: 0, target: 50 }),
    { fees: 80, net: 720, effective: 36, gap: -14, hoursAtTarget: 14.4, feeNeeded: 1111.11 });
}

// ---------------- Rate increase (worked by hand)
{
  const calc = load("rate-increase");
  // $75 → $90, 100 hours a month, 10% of work lost:
  // now 7,500; all stay 9,000; rise 20%; break-even loss 1 − 75/90 = 16.67%; hours to match 7,500 ÷ 90 = 83.33;
  // after 90 × 90 = 8,100; change +600
  expectAll("rate-increase 75 to 90", calc({ oldRate: 75, newRate: 90, hours: 100, loss: 10 }),
    { now: 7500, allStay: 9000, rise: 20, breakEvenLoss: 16.67, hoursToMatch: 83.33, after: 8100, change: 600 });
  // £50 → £55, 80 hours, 15% lost: break-even 9.09%; after 55 × 68 = 3,740; change −260
  expectAll("rate-increase loses money", calc({ oldRate: 50, newRate: 55, hours: 80, loss: 15 }),
    { now: 4000, allStay: 4400, rise: 10, breakEvenLoss: 9.09, hoursToMatch: 72.73, after: 3740, change: -260 });
  // $100 → $125, 60 hours, 20% lost is exactly break-even: 125 × 48 = 6,000
  expectAll("rate-increase exactly even", calc({ oldRate: 100, newRate: 125, hours: 60, loss: 20 }),
    { rise: 25, breakEvenLoss: 20, hoursToMatch: 48, after: 6000, change: 0 });
}

// ---------------- Freelance retainer
{
  const calc = load("retainer");
  // Page example: $75 × 20 h, 10% off, 6 months, client uses 16 h.
  expectAll("retainer page example", calc({ rate: 75, hours: 20, discount: 10, months: 6, used: 16 }),
    { full: 1500, fee: 1350, saving: 150, effective: 67.5, atUsage: 84.38, contract: 8100, unused: 4 });
  expectAll("retainer no discount", calc({ rate: 100, hours: 10, discount: 0, months: 12, used: 10 }),
    { fee: 1000, effective: 100, atUsage: 100, contract: 12000 });
  expectAll("retainer over-used", calc({ rate: 60, hours: 35, discount: 15, months: 3, used: 40 }),
    { full: 2100, fee: 1785, saving: 315, contract: 5355, atUsage: 44.63, unused: 0 });
}

// ---------------- Customer lifetime value
{
  const calc = load("customer-lifetime-value");
  // Page example: $50 orders, 4 a year, 60% margin, 3 years, $120 to win.
  expectAll("clv page example", calc({ order: 50, orders: 4, margin: 60, years: 3, cac: 120 }),
    { yearly: 200, lifetimeRevenue: 600, clv: 360, ratio: 3, payback: 12, net: 240 });
  expectAll("clv subscription", calc({ order: 30, orders: 12, margin: 40, years: 2, cac: 100 }),
    { yearly: 360, lifetimeRevenue: 720, clv: 288, ratio: 2.88, payback: 8.33, net: 188 });
  expectAll("clv big ticket", calc({ order: 1000, orders: 1, margin: 25, years: 5, cac: 500 }),
    { clv: 1250, ratio: 2.5, payback: 24, net: 750 });
  expectAll("clv no cost, no margin", calc({ order: 10, orders: 1, margin: 0, years: 1, cac: 0 }),
    { clv: 0, ratio: null, payback: null });
}

// ---------------- Job offer comparison
{
  const calc = load("job-offer");
  // Page example: remote £50,000 at 37.5 h vs £55,000 + £5,000 bonus, 45 h, 200 days at £15 and 1.5 h.
  const a = { salary: 50000, bonus: 0, benefits: 0, hours: 37.5, days: 0, cost: 0, time: 0 };
  const b = { salary: 55000, bonus: 5000, benefits: 0, hours: 45, days: 200, cost: 15, time: 1.5 };
  const r = calc({ a, b });
  expectAll("job offer A", r.a, { value: 50000, hours: 1950, hourly: 25.64 });
  expectAll("job offer B", r.b, { pay: 60000, commuteCost: 3000, value: 57000, hours: 2640, hourly: 21.59 });
  expectAll("job offer gaps", r, { valueGap: 7000, hourlyGap: -4.05 });
  const c = calc({ a: { salary: 60000, bonus: 3000, benefits: 2000, hours: 40, days: 220, cost: 10, time: 1 },
                   b: { salary: 64000, bonus: 0, benefits: 1000, hours: 40, days: 0, cost: 0, time: 0 } });
  expectAll("job offer commute A", c.a, { value: 62800, hours: 2300, hourly: 27.3 });
  expectAll("job offer remote B", c.b, { value: 65000, hourly: 31.25 });
  expectAll("job offer same", calc({ a, b: a }), { valueGap: 0, hourlyGap: 0 });
}

// ---------------- Weighted grade
{
  const calc = load("weighted-grade");
  // Page example: final exam (25%) not taken yet.
  expectAll("weighted grade page example", calc({ rows: [{ weight: 20, score: 92 }, { weight: 15, score: 85 }, { weight: 25, score: 78 }, { weight: 15, score: 88 }, { weight: 25, score: "" }] }),
    { average: 85.13, totalWeight: 75, earned: 63.85, remaining: 25 });
  expectAll("weighted grade even split", calc({ rows: [{ weight: 50, score: 80 }, { weight: 50, score: 90 }] }), { average: 85, totalWeight: 100, remaining: 0 });
  expectAll("weighted grade 30/70", calc({ rows: [{ weight: 30, score: 100 }, { weight: 70, score: 70 }] }), { average: 79, earned: 79 });
  expectAll("weighted grade empty", calc({ rows: [{ weight: "", score: "" }] }), { average: 0, totalWeight: 0 });
}

// ---------------- Savings goal (checked against a month-by-month simulation)
{
  const calc = load("savings-goal");
  expectAll("savings goal page example", calc({ goal: 20000, current: 2000, months: 36, rate: 4 }),
    { monthly: 464.77, deposits: 16731.54, interest: 1268.46, noInterest: 500, reached: false });
  expectAll("savings goal no interest", calc({ goal: 10000, current: 0, months: 24, rate: 0 }), { monthly: 416.67, interest: 0 });
  expectAll("savings goal 5 years", calc({ goal: 50000, current: 5000, months: 60, rate: 5 }), { monthly: 640.87, deposits: 38452.33 });
  expectAll("savings goal already reached", calc({ goal: 1000, current: 1000, months: 12, rate: 3 }), { monthly: 0, reached: true, interest: 30.42 });
}

// ---------------- Monthly expenses (page worked example and bill converter)
{
  const calc = load("monthly-expenses");
  const blank = { rent: null, counciltax: null, energy: null, water: null, broadband: null, food: null, transport: null,
    insurance: null, debt: null, childcare: null, subscriptions: null, other: null, income: null };
  const sam = calc({ ...blank, rent: 950, counciltax: 140, energy: 120, water: 40, broadband: 55, food: 300,
    transport: 120, insurance: 30, subscriptions: 25, other: 150, income: 2400 });
  expectAll("monthly expenses page example", sam, { total: 1930, yearly: 23160, weekly: 445.38, leftOver: 470, spentPct: 80.4 });
  expectAll("monthly expenses page example biggest", sam.biggest, { key: "rent", share: 49.2 });
  check("monthly expenses rows shown", sam.items.length, 10);
  const two = calc({ ...blank, rent: 1200, food: 400 });
  expectAll("monthly expenses no income", two, { total: 1600, yearly: 19200, weekly: 369.23, leftOver: null, spentPct: null });
  check("monthly expenses two items biggest", two.biggest.share, 75);
  expectAll("monthly expenses overspend", calc({ ...blank, rent: 1500, other: 1000, income: 2000 }), { total: 2500, leftOver: -500, spentPct: 125 });
  check("monthly expenses equal costs keep form order", calc({ ...blank, energy: 100, transport: 100 }).biggest.key, "energy");
  // Page text: "× 4 gets weekly bills wrong".
  check("bill weekly", calc.toMonthly(20, "weekly"), 86.67);
  check("bill every 4 weeks", calc.toMonthly(100, "fourweekly"), 108.33);
  check("bill yearly", calc.toMonthly(1800, "yearly"), 150);
  check("bill quarterly", calc.toMonthly(90, "quarterly"), 30);
  check("bill fortnightly", calc.toMonthly(500, "fortnightly"), 1083.33);
}

// ---------------- Unix timestamp converter
{
  const C = load("unix-timestamp");
  check("timestamp 0", C.toDate(0, "auto").iso, "1970-01-01T00:00:00.000Z");
  check("timestamp page example (seconds)", C.toDate(1700000000, "auto").iso, "2023-11-14T22:13:20.000Z");
  check("timestamp milliseconds detected", C.toDate(1700000000000, "auto").unit, "ms");
  check("timestamp milliseconds", C.toDate(1700000000000, "auto").iso, "2023-11-14T22:13:20.000Z");
  check("timestamp out of range", C.toDate(1e14, "s"), null);
  check("timestamp forced seconds", C.toDate(1700000000000, "s").unit, "s");
  check("timestamp 2038 limit", C.toDate(2147483647, "s").iso, "2038-01-19T03:14:07.000Z");
  check("timestamp negative", C.toDate(-86400, "auto").iso, "1969-12-31T00:00:00.000Z");
  check("date to timestamp UTC", C.fromDate({ y: 2026, mo: 10, d: 5, h: 12, mi: 0, s: 0 }, "utc").seconds, 1791201600);
  check("date to timestamp 2038", C.fromDate({ y: 2038, mo: 1, d: 19, h: 3, mi: 14, s: 7 }, "utc").seconds, 2147483647);
  check("relative past", C.relative(-3 * 86400000), "3 days ago");
  check("relative future", C.relative(2 * 3600000 + 5000), "in 2 hours");
  check("relative now", C.relative(400), "just now");
  // Page text: weekdays of the worked examples.
  const weekday = (ts) => new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(C.toDate(ts, "auto").ms));
  check("timestamp weekdays", [0, 1700000000, 2147483647].map(weekday).join(","), "Thursday,Tuesday,Tuesday");
}

// ---------------- Percentage calculator
{
  const calc = load("percentage");
  check("percent of", calc({ mode: "of", a: 15, b: 80 }).result, 12);
  check("percent what", calc({ mode: "what", a: 30, b: 120 }).result, 25);
  check("percent change up", calc({ mode: "change", a: 50, b: 65 }).result, 30);
  check("percent change down", calc({ mode: "change", a: 80, b: 60 }).result, -25);
  check("percent change from 0", calc({ mode: "change", a: 0, b: 10 }).result, null);
  expectAll("percent adjust", calc({ mode: "adjust", a: 15, b: 200 }), { up: 230, down: 170, amount: 30 });
  check("percent what of 0", calc({ mode: "what", a: 5, b: 0 }).result, null);
  check("percent of decimals", calc({ mode: "of", a: 17.5, b: 64 }).result, 11.2);
  // Page text: 230 minus 15% is 195.50, and 230 ÷ 1.15 = 200.
  check("percent up then down", calc({ mode: "adjust", a: 15, b: 230 }).down, 195.5);
  check("percent undo a rise", Math.round(230 / 1.15 * 100) / 100, 200);
}

// ---------------- Image tools (resize, compress, convert, crop)
const IMAGE_LIBS = ["js/pdf-common.js", "js/image-common.js"];
{
  const R = load("image-resize", IMAGE_LIBS);
  // Page example: a 4,032 × 3,024 phone photo.
  const px = (o) => { const s = R.fitSize(4032, 3024, o); return `${s.width}x${s.height}`; };
  check("resize width 1200 keeps shape", px({ mode: "pixels", width: 1200, keepRatio: true }), "1200x900");
  check("resize scale for width 1200", (1200 / 4032).toFixed(4), "0.2976");
  check("resize 50%", px({ mode: "percent", percent: 50 }), "2016x1512");
  check("resize fit inside 1080 box", px({ mode: "pixels", width: 1080, height: 1080, keepRatio: true }), "1080x810");
  check("resize fit scale", Math.min(1080 / 4032, 1080 / 3024).toFixed(4), "0.2679");
  check("resize height only", px({ mode: "pixels", height: 600, keepRatio: true }), "800x600");
  check("resize stretch", px({ mode: "pixels", width: 500, height: 500, keepRatio: false }), "500x500");
  check("resize stretch width only", px({ mode: "pixels", width: 500, keepRatio: false }), "500x3024");
  check("resize enlarge 200%", px({ mode: "percent", percent: 200 }), "8064x6048");
  check("resize never below 1 px", (() => { const s = R.fitSize(10, 1000, { mode: "pixels", width: 1, keepRatio: true }); return `${s.width}x${s.height}`; })(), "1x100");
  check("resize nothing asked", R.fitSize(100, 100, { mode: "pixels", keepRatio: true }), null);
  // Shrinking goes through halving steps, ending at the exact size.
  check("resize steps", R.downscaleSteps(4032, 3024, 1200, 900).map((s) => `${s.width}x${s.height}`).join(","), "2016x1512,1200x900");
  check("resize steps enlarge", R.downscaleSteps(100, 100, 300, 300).map((s) => `${s.width}x${s.height}`).join(","), "300x300");
  check("resize steps big shrink", R.downscaleSteps(4000, 4000, 400, 400).map((s) => s.width).join(","), "2000,1000,500,400");
  check("output same jpg", R.outputType("image/jpeg", "same"), "image/jpeg");
  check("output same gif → png", R.outputType("image/gif", "same"), "image/png");
  check("output same heic → jpg", R.outputType("image/heic", "same"), "image/jpeg");
  check("output chosen webp", R.outputType("image/png", "webp"), "image/webp");
  check("resize file name", R.outName("Holiday photo.JPEG", "image/jpeg", "-1200x900"), "Holiday photo-1200x900.jpg");

  const CP = load("image-compress", IMAGE_LIBS);
  // Page example: 3,200 KB → 480 KB is 85% smaller.
  check("compress saving", CP.percentSaved(3200, 480), 85);
  check("compress bigger shows negative", CP.percentSaved(100, 120), -20);
  const lim = CP.limitSize(4032, 3024, 1920);
  check("compress longest side 1920", `${lim.width}x${lim.height}`, "1920x1440");
  check("compress pixels before", 4032 * 3024, 12192768);
  check("compress pixels after", lim.width * lim.height, 2764800);
  check("compress fewer pixels %", Math.round((1 - 2764800 / 12192768) * 100), 77);
  check("compress never enlarges", JSON.stringify(CP.limitSize(800, 600, 1920)), '{"width":800,"height":600}');
  check("compress tall photo", (() => { const s = CP.limitSize(3024, 4032, 1280); return `${s.width}x${s.height}`; })(), "960x1280");
  check("compress KB", CP.KB, 1024);
}

// Target-size search, with a pretend encoder whose file size grows with quality and area.
async function imageSearchTests() {
  const CP = load("image-compress", IMAGE_LIBS);
  const fake = (base) => (q, scale) => Promise.resolve(Math.round(base * scale * scale * (0.15 + q)));
  const a = await CP.searchQuality(fake(400000), 200 * 1024);
  check("compress target met", a.met, true);
  check("compress target under limit", a.size <= 200 * 1024, true);
  check("compress target full size", a.scale, 1);
  check("compress target quality close", a.quality > 0.3 && a.quality < 0.4, true);
  const b = await CP.searchQuality(fake(400000), 1000000);
  check("compress target easy → top quality", b.quality, 0.95);
  const c = await CP.searchQuality(fake(4000000), 50 * 1024);
  check("compress target shrinks picture", c.scale < 1, true);
  check("compress target met after shrinking", c.met && c.size <= 50 * 1024, true);
  const d = await CP.searchQuality(() => Promise.resolve(1e9), 1024);
  check("compress target impossible", d.met, false);
}

{
  const CV = load("image-convert", IMAGE_LIBS);
  // Page examples.
  check("convert webp to jpg name", CV.outName("photo.webp", CV.outputType("image/webp", "jpg"), ""), "photo.jpg");
  check("convert png name", CV.outName("Logo final.PNG", "image/jpeg", ""), "Logo final.jpg");
  check("convert to png", CV.outputType("image/jpeg", "png"), "image/png");
  check("convert colour ok", CV.safeColour("#ff0000", "#ffffff"), "#ff0000");
  check("convert colour bad", CV.safeColour("red; x", "#ffffff"), "#ffffff");
}

{
  const CR = load("image-crop", IMAGE_LIBS);
  const box = (b) => `${b.x},${b.y} ${b.width}x${b.height}`;
  // Page examples: 4,032 × 3,024 photo.
  check("crop square", box(CR.centerBox(4032, 3024, CR.ratioOf("1:1"))), "504,0 3024x3024");
  check("crop 16:9", box(CR.centerBox(4032, 3024, CR.ratioOf("16:9"))), "0,378 4032x2268");
  check("crop 4:5", box(CR.centerBox(4032, 3024, CR.ratioOf("4:5"))), "807,0 2419x3024");
  check("crop free = whole", box(CR.centerBox(4032, 3024, CR.ratioOf("free"))), "0,0 4032x3024");
  check("crop original ratio", CR.ratioOf("original", 4032, 3024).toFixed(3), "1.333");
  const b = { x: 100, y: 100, width: 200, height: 100 };
  check("crop move clamps right", box(CR.moveBox(b, 1000, 0, 400, 300)), "200,100 200x100");
  check("crop move clamps top", box(CR.moveBox(b, 0, -500, 400, 300)), "100,0 200x100");
  check("crop drag se", box(CR.resizeBox(b, "se", 50, 20, 0, 400, 300)), "100,100 250x120");
  check("crop drag nw", box(CR.resizeBox(b, "nw", -50, -50, 0, 400, 300)), "50,50 250x150");
  check("crop drag past edge", box(CR.resizeBox(b, "e", 500, 0, 0, 400, 300)), "100,100 300x100");
  check("crop drag can't flip", box(CR.resizeBox(b, "w", 500, 0, 0, 400, 300)), "299,100 1x100");
  check("crop ratio kept on corner", box(CR.resizeBox({ x: 0, y: 0, width: 100, height: 100 }, "se", 50, 10, 1, 400, 300)), "0,0 150x150");
  check("crop ratio kept at edge", box(CR.resizeBox({ x: 0, y: 0, width: 100, height: 100 }, "se", 500, 500, 1, 400, 300)), "0,0 300x300");
  check("crop ratio side handle", box(CR.resizeBox({ x: 100, y: 100, width: 100, height: 100 }, "e", 40, 0, 1, 400, 300)), "100,80 140x140");
  check("crop typed box fits", box(CR.fitBox({ x: 350, y: -5, width: 100, height: 999 }, 400, 300)), "300,0 100x300");
  check("crop turned size", JSON.stringify(CR.turnedSize(4032, 3024, 1)), '{"width":3024,"height":4032}');
  check("crop name", CR.outName("me.png", "image/png", "-cropped"), "me-cropped.png");
}

// ---------------- Date and time tools
const TIME_LIBS = ["js/date-common.js"];
{
  const calc = load("date-difference", TIME_LIBS);
  const d = (s) => { const [y, m, dd] = s.split("-").map(Number); return { y, m, d: dd }; };
  // Page examples.
  expectAll("days 11 Oct → 25 Dec 2026", calc(d("2026-10-11"), d("2026-12-25"), false),
    { days: 75, weeks: 10, weekDays: 5, years: 0, months: 2, monthDays: 14, weekdays: 54, hours: 1800 });
  expectAll("days whole 2026", calc(d("2026-01-01"), d("2026-12-31"), false), { days: 364, months: 11, monthDays: 30 });
  expectAll("days whole 2026 counting end", calc(d("2026-01-01"), d("2026-12-31"), true), { days: 365, years: 1, months: 0, monthDays: 0 });
  expectAll("days 31 Jan → 1 Mar", calc(d("2026-01-31"), d("2026-03-01"), false), { days: 29, months: 1, monthDays: 1 });
  expectAll("days leap year", calc(d("2028-02-28"), d("2028-03-01"), false), { days: 2 });
  expectAll("days backwards", calc(d("2026-12-25"), d("2026-10-11"), false), { days: 75, reversed: true });
  expectAll("days Monday to Friday counting end", calc(d("2026-10-12"), d("2026-10-16"), true), { days: 5, weekdays: 5 });
  expectAll("days same day", calc(d("2026-10-11"), d("2026-10-11"), false), { days: 0, weekdays: 0 });
}

{
  const sandbox = { window: {}, document: { getElementById: () => null } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(JS, "js/date-common.js"), "utf8"), sandbox);
  const D = sandbox.window.ToolNestDate;
  check("date weekday 1 Jan 1970", D.weekday({ y: 1970, m: 1, d: 1 }), 4);
  check("date weekday 11 Oct 2026", D.WEEKDAYS[D.weekday({ y: 2026, m: 10, d: 11 })], "Sunday");
  check("date add month clamps", D.iso(D.addMonths({ y: 2026, m: 1, d: 31 }, 1)), "2026-02-28");
  check("date add month leap", D.iso(D.addMonths({ y: 2028, m: 1, d: 31 }, 1)), "2028-02-29");
  check("date add months back over year", D.iso(D.addMonths({ y: 2026, m: 2, d: 15 }, -3)), "2025-11-15");
  check("date parse rejects 31 Feb", D.parse("2026-02-31"), null);
  check("date long UK", D.longDate({ y: 2026, m: 10, d: 11 }, false), "Sunday 11 October 2026");
  check("date long US", D.longDate({ y: 2026, m: 10, d: 11 }, true), "Sunday, October 11, 2026");
  check("date weekdays in a week", D.weekdaysBetween({ y: 2026, m: 10, d: 11 }, { y: 2026, m: 10, d: 18 }), 5);
  check("date year 1", D.iso(D.fromDays(D.toDays({ y: 1, m: 3, d: 1 }))), "0001-03-01");
}

{
  const calc = load("date-add", TIME_LIBS);
  const sandbox = { window: {}, document: { getElementById: () => null } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(JS, "js/date-common.js"), "utf8"), sandbox);
  const D = sandbox.window.ToolNestDate;
  const say = (r) => D.longDate(r.date, false);
  // Page examples.
  check("add 30 days", say(calc({ y: 2026, m: 10, d: 11 }, { days: 30 }, 1)), "Tuesday 10 November 2026");
  check("add 30 days gap", calc({ y: 2026, m: 10, d: 11 }, { days: 30 }, 1).days, 30);
  check("add 1 month from 31 Jan", say(calc({ y: 2026, m: 1, d: 31 }, { months: 1 }, 1)), "Saturday 28 February 2026");
  check("subtract 90 days", say(calc({ y: 2026, m: 3, d: 15 }, { days: 90 }, -1)), "Monday 15 December 2025");
  check("subtract 90 days gap", calc({ y: 2026, m: 3, d: 15 }, { days: 90 }, -1).days, -90);
  check("add mixed: 14 months", D.iso(calc({ y: 2026, m: 10, d: 11 }, { years: 1, months: 2 }, 1).date), "2027-12-11");
  check("add mixed", say(calc({ y: 2026, m: 10, d: 11 }, { years: 1, months: 2, weeks: 3, days: 4 }, 1)), "Wednesday 5 January 2028");
  check("add nothing", calc({ y: 2026, m: 10, d: 11 }, {}, 1).days, 0);
  check("add 1 month 5 March", D.iso(calc({ y: 2026, m: 3, d: 5 }, { months: 1 }, 1).date), "2026-04-05");
}

{
  const W = load("week-number", TIME_LIBS);
  const wk = (y, m, d) => { const r = W.isoWeek({ y, m, d }); return `${r.year}-W${r.week}`; };
  const sandbox = { window: {}, document: { getElementById: () => null } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(JS, "js/date-common.js"), "utf8"), sandbox);
  const D = sandbox.window.ToolNestDate;
  // Page examples.
  check("week 11 Oct 2026", wk(2026, 10, 11), "2026-W41");
  check("week Thursday 8 Oct is day 281", W.dayOfYear({ y: 2026, m: 10, d: 8 }), 281);
  check("week 41 starts Monday 5 Oct", D.iso(W.isoWeekStart(2026, 41)), "2026-10-05");
  check("week US style 11 Oct 2026", W.usWeek({ y: 2026, m: 10, d: 11 }), 42);
  check("week 1 Jan 2026", wk(2026, 1, 1), "2026-W1");
  check("week 1 of 2026 starts 29 Dec 2025", D.iso(W.isoWeekStart(2026, 1)), "2025-12-29");
  check("week 1 Jan 2027", wk(2027, 1, 1), "2026-W53");
  check("week 2026 has 53 weeks", W.weeksInYear(2026), 53);
  check("week 2027 has 52 weeks", W.weeksInYear(2027), 52);
  const next53 = [2027, 2028, 2029, 2030, 2031, 2032].find((y) => W.weeksInYear(y) === 53);
  check("week next 53-week year", next53, 2032);
  check("week 31 Dec 2026", wk(2026, 12, 31), "2026-W53");
  check("week 29 Dec 2025 is 2026 week 1", wk(2025, 12, 29), "2026-W1");
  check("week US 1 Jan", W.usWeek({ y: 2026, m: 1, d: 1 }), 1);
  check("week US Sunday 4 Jan 2026", W.usWeek({ y: 2026, m: 1, d: 4 }), 2);
  check("week 2026 day 1 Thursday", D.WEEKDAYS[D.weekday({ y: 2026, m: 1, d: 1 })], "Thursday");
}

{
  const C = load("time-zone", TIME_LIBS);
  const at = (p, from, zones) => C.convert(p, from, zones).rows.map((r) => `${C.clock(r.h, r.mi)} ${C.formatOffset(r.offset)}${r.summer ? " S" : ""}${r.dayShift ? " " + r.dayShift : ""}`).join(" | ");
  const Z = ["Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Australia/Sydney"];
  // Page examples.
  check("tz 11 Oct 2026 12:00 London", at({ y: 2026, m: 10, d: 11, h: 12, mi: 0 }, "Europe/London", Z),
    "12:00 UTC+1 S | 07:00 UTC−4 S | 04:00 UTC−7 S | 16:30 UTC+5:30 | 22:00 UTC+11 S");
  check("tz 11 Oct UTC", new Date(C.convert({ y: 2026, m: 10, d: 11, h: 12, mi: 0 }, "Europe/London", []).ms).toISOString(), "2026-10-11T11:00:00.000Z");
  check("tz 27 Oct gap week", at({ y: 2026, m: 10, d: 27, h: 12, mi: 0 }, "Europe/London", ["Europe/London", "America/New_York"]), "12:00 UTC | 08:00 UTC−4 S");
  check("tz 2 Nov New York", at({ y: 2026, m: 11, d: 2, h: 9, mi: 0 }, "America/New_York", ["Europe/London", "Australia/Sydney"]), "14:00 UTC | 01:00 UTC+11 S 1");
  // Page FAQ: 2:30 AM on 8 March 2026 doesn't happen in New York.
  check("tz spring gap", C.zonedToUtc({ y: 2026, m: 3, d: 8, h: 2, mi: 30 }, "America/New_York").gap, true);
  check("tz fall back twice", C.zonedToUtc({ y: 2026, m: 11, d: 1, h: 1, mi: 30 }, "America/New_York").ambiguous, true);
  check("tz fall back uses first", new Date(C.zonedToUtc({ y: 2026, m: 11, d: 1, h: 1, mi: 30 }, "America/New_York").ms).toISOString(), "2026-11-01T05:30:00.000Z");
  check("tz UK changes 25 Oct", C.offsetMinutes("Europe/London", Date.UTC(2026, 9, 25, 2)), 0);
  check("tz UK summer 24 Oct", C.offsetMinutes("Europe/London", Date.UTC(2026, 9, 24, 12)), 60);
  check("tz US changes 1 Nov", C.offsetMinutes("America/New_York", Date.UTC(2026, 10, 1, 7)), -300);
  check("tz US spring 8 Mar", C.offsetMinutes("America/New_York", Date.UTC(2026, 2, 8, 8)), -240);
  check("tz UK spring 29 Mar", C.offsetMinutes("Europe/London", Date.UTC(2026, 2, 29, 2)), 60);
  check("tz US before UK in March", C.offsetMinutes("Europe/London", Date.UTC(2026, 2, 9, 12)) - C.offsetMinutes("America/New_York", Date.UTC(2026, 2, 9, 12)), 240);
  check("tz Sydney summer starts 4 Oct", C.isSummerTime("Australia/Sydney", Date.UTC(2026, 9, 5)), true);
  check("tz Sydney winter in July", C.isSummerTime("Australia/Sydney", Date.UTC(2026, 6, 1)), false);
  check("tz India no summer time", C.isSummerTime("Asia/Kolkata", Date.UTC(2026, 6, 1)), false);
  check("tz offset words", [60, -240, 330, 0, -150].map(C.formatOffset).join(" "), "UTC+1 UTC−4 UTC+5:30 UTC UTC−2:30");
  check("tz 12-hour clock", [C.clock(0, 5, true), C.clock(12, 0, true), C.clock(13, 30, true)].join(" "), "12:05 AM 12:00 PM 1:30 PM");
  // Page text: on Monday 12 October 2026, 14:00, 15:00 and 16:00 London time suit London and New York.
  const rows = C.workingHours({ y: 2026, m: 10, d: 12 }, "Europe/London", ["Europe/London", "America/New_York"], 9, 17);
  check("tz meeting hours", rows.filter((r) => r.everyone).map((r) => r.hour).join(","), "14,15,16");
  check("tz meeting hours NY times", rows.filter((r) => r.everyone).map((r) => r.cells[1].h).join(","), "9,10,11");
  check("tz day has 24 rows", rows.length, 24);
  check("tz spring day has 23 rows", C.workingHours({ y: 2026, m: 3, d: 8 }, "America/New_York", ["America/New_York"]).length, 23);
  check("tz every listed place is real", C.PLACES.every((p) => { try { C.offsetMinutes(p[1], 0); return true; } catch (e) { return false; } }), true);
}

// ---------------- Text tools
{
  const C = load("case-converter");
  // Page examples.
  check("case title", C.convert("HOW TO PRICE YOUR WORK: A GUIDE FOR FREELANCERS", "title"), "How to Price Your Work: A Guide for Freelancers");
  check("case sentence", C.convert("HOW TO PRICE YOUR WORK: A GUIDE FOR FREELANCERS", "sentence"), "How to price your work: a guide for freelancers");
  check("case camel", C.convert("invoice total amount", "camel"), "invoiceTotalAmount");
  check("case snake", C.convert("invoice total amount", "snake"), "invoice_total_amount");
  check("case pascal", C.convert("invoice total amount", "pascal"), "InvoiceTotalAmount");
  check("case kebab", C.convert("invoice total amount", "kebab"), "invoice-total-amount");
  check("case constant", C.convert("invoice total amount", "constant"), "INVOICE_TOTAL_AMOUNT");
  check("case table sentence", C.convert("how to price your work. it's easier than you think.", "sentence"), "How to price your work. It's easier than you think.");
  check("case table capitalized", C.convert("how to price your work", "capitalized"), "How To Price Your Work");
  check("case upper", C.convert("How to price", "upper"), "HOW TO PRICE");
  check("case lower", C.convert("How To PRICE", "lower"), "how to price");
  check("case sentence lone i", C.convert("yes, i think i'm right.", "sentence"), "Yes, I think I'm right.");
  check("case sentence after quote", C.convert('he said "no." "then why?" she asked.', "sentence"), 'He said "no." "Then why?" She asked.');
  check("case title keeps NASA and iPhone", C.convert("a NASA test of my iPhone", "title"), "A NASA Test of My iPhone");
  check("case title last word", C.convert("what are you looking at", "title"), "What Are You Looking At");
  check("case title hyphen", C.convert("state-of-the-art tools", "title"), "State-of-the-Art Tools");
  check("case title each line", C.convert("the first line\nthe second line", "title"), "The First Line\nThe Second Line");
  check("case accents", C.convert("élan straße", "upper"), "ÉLAN STRASSE");
  check("case camel split", C.convert("XMLHttpRequest userID", "snake"), "xml_http_request_user_id");
  check("case code per line", C.convert("client name\nunit price", "camel"), "clientName\nunitPrice");
  expectAll("case stats", C.stats("Hello world\nline two"), { characters: 20, words: 4, lines: 2 });
  check("case stats empty", C.stats("").lines, 0);
}

{
  const C = load("text-compare");
  // Page examples.
  const w = C.compare("The price is $1,200 for the full project.", "The price is $1,350 for the whole project.", { mode: "words" });
  expectAll("compare words", w, { added: 2, removed: 2, same: 6, identical: false });
  check("compare words removed text", w.ops.filter((o) => o.type === "del").map((o) => o.items.join("")).join("|"), "$1,200|full");
  const email = "Dear Sam,\nThanks for the brief.\nThe price is $1,200.\nBest,\nAlex";
  const email2 = "Dear Sam,\nThanks for the brief.\nThe price is $1,350.\nIt includes two rounds of changes.\nBest,\nAlex";
  expectAll("compare lines", C.compare(email, email2, { mode: "lines" }), { added: 2, removed: 1, same: 4 });
  check("compare identical", C.compare("a\nb", "a\nb", { mode: "lines" }).identical, true);
  check("compare ignore case", C.compare("Hello World", "hello world", { mode: "lines", ignoreCase: true }).identical, true);
  check("compare case matters by default", C.compare("Hello", "hello", { mode: "lines" }).identical, false);
  check("compare ignore spaces", C.compare("a  b \nc", "a b\nc", { mode: "lines", ignoreSpace: true }).identical, true);
  check("compare windows line breaks", C.compare("a\r\nb", "a\nb", { mode: "lines" }).identical, true);
  check("compare empty vs text", C.compare("", "one\ntwo", { mode: "lines" }).added, 2);
  // The changes always rebuild both texts, and are as few as possible.
  let ok = true;
  const lcs = (a, b) => { const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0)); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]); return dp[a.length][b.length]; };
  let seed = 7;
  const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let t = 0; t < 500; t++) {
    const a = Array.from({ length: rand(10) }, () => "abc"[rand(3)]);
    const b = Array.from({ length: rand(10) }, () => "abc"[rand(3)]);
    const ops = C.diff(a, b);
    const ra = [], rb = [];
    let edits = 0;
    ops.forEach((o) => { if (o.type !== "ins") ra.push(...o.items); if (o.type !== "del") rb.push(...o.items); if (o.type !== "same") edits += o.items.length; });
    if (ra.join() !== a.join() || rb.join() !== b.join() || edits !== a.length + b.length - 2 * lcs(a, b)) ok = false;
  }
  check("compare 500 random texts rebuild and are minimal", ok, true);
}

{
  const tidy = load("line-tools");
  const list = "banana\nApple\nitem 10\napple\nbanana\n\nitem 2\nitem 10";
  // Page example.
  const r = tidy(list, { trim: true, removeEmpty: true, dedupe: true, ignoreCase: true, sort: "az" });
  check("lines example result", r.lines.join(","), "Apple,banana,item 2,item 10");
  expectAll("lines example counts", r, { before: 8, after: 4, duplicates: 3, empty: 1 });
  check("lines case kept apart", tidy(list, { trim: true, removeEmpty: true, dedupe: true, ignoreCase: false, sort: "az" }).lines.join(","), "Apple,apple,banana,item 2,item 10");
  check("lines keep order", tidy("c\na\nc\nb", { dedupe: true, sort: "none" }).lines.join(","), "c,a,b");
  check("lines Z to A", tidy("item 2\nitem 10\nitem 1", { sort: "za" }).lines.join(","), "item 10,item 2,item 1");
  check("lines shortest", tidy("ccc\na\nbb", { sort: "short" }).lines.join(","), "a,bb,ccc");
  check("lines longest", tidy("ccc\na\nbb", { sort: "long" }).lines.join(","), "ccc,bb,a");
  check("lines reverse", tidy("1\n2\n3", { sort: "reverse" }).lines.join(","), "3,2,1");
  check("lines trim makes duplicates", tidy("apple \n  apple", { trim: true, dedupe: true }).duplicates, 1);
  check("lines no trim keeps them", tidy("apple \n  apple", { trim: false, dedupe: true }).duplicates, 0);
  check("lines empty input", tidy("", { dedupe: true }).after, 0);
  check("lines accents sort", tidy("Éclair\nzebra\napple", { sort: "az" }).lines.join(","), "apple,Éclair,zebra");
  check("lines odd names", tidy("__proto__\nconstructor\n__proto__", { dedupe: true }).lines.join(","), "__proto__,constructor");
}

// ---------------- Popular tools: discount, password, QR code, random numbers, colour, Base64, timer
{
  const calc = load("discount");
  // Page examples.
  expectAll("discount 25% off $80", calc({ price: 80, off: 25 }), { sale: 60, saved: 20, totalOff: 25, toPay: 60 });
  expectAll("discount 20% then 10%", calc({ price: 120, off: 20, extra: 10 }), { afterFirst: 96, sale: 86.4, saved: 33.6, totalOff: 28 });
  expectAll("discount plus 8% tax", calc({ price: 86.4, off: 0, tax: 8 }), { taxAmount: 6.91, toPay: 93.31 });
  check("discount percent off 50 → 35", calc.percentOff(50, 35), 30);
  check("discount percent off price rise", calc.percentOff(50, 60), -20);
  check("discount percent off from 0", calc.percentOff(0, 10), null);
  expectAll("discount $100 20% + 10%", calc({ price: 100, off: 20, extra: 10 }), { sale: 72, totalOff: 28 });
  check("discount 100% off", calc({ price: 50, off: 100 }).sale, 0);
  // FAQ: $60 after 25% off came from $80.
  check("discount original from sale", 60 / 0.75, 80);
}

{
  const P = load("password-generator");
  const all = { length: 20, lower: true, upper: true, digits: true, symbols: true };
  // Page example: 90 characters, 20 long = 129.8 bits; 6 digits = 19.9 bits; 83 without look-alikes.
  check("password pool size", P.groups(all).join("").length, 90);
  check("password bits 20 of 90", P.entropyBits(all), 129.8);
  check("password bits 6 digits", P.entropyBits({ length: 6, digits: true }), 19.9);
  check("password look-alikes removed", P.groups({ ...all, noLookalike: true }).join("").length, 83);
  check("password labels", [30, 50, 70, 90].map(P.strengthLabel).join(","), "Weak,Fair,Strong,Very strong");
  let lengthsOk = true, setsOk = true, lookOk = true;
  for (let i = 0; i < 300; i++) {
    const pw = P.generate(all);
    if (pw.length !== 20) lengthsOk = false;
    if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw) || !/[^a-zA-Z0-9]/.test(pw)) setsOk = false;
    if (/[Il1O0o|]/.test(P.generate({ ...all, noLookalike: true }))) lookOk = false;
  }
  check("password length", lengthsOk, true);
  check("password has every type ticked", setsOk, true);
  check("password no look-alikes", lookOk, true);
  check("password digits only", /^\d{8}$/.test(P.generate({ length: 8, digits: true })), true);
  check("password nothing ticked", P.generate({ length: 8 }), "");
  // Every allowed character turns up about equally often (no bias).
  const counts = {};
  for (let i = 0; i < 20000; i++) { const c = P.generate({ length: 1, digits: true }); counts[c] = (counts[c] || 0) + 1; }
  const vals = Object.values(counts);
  check("password digits all used", vals.length, 10);
  check("password digits even spread", Math.max(...vals) / Math.min(...vals) < 1.25, true);
}

{
  const Q = load("qr-code", ["vendor/qrcode-generator/qrcode.js"]);
  // Page examples.
  check("qr wifi", Q.payload({ kind: "wifi", ssid: "Cafe Guest", password: "sunny-day-42", security: "WPA" }), "WIFI:T:WPA;S:Cafe Guest;P:sunny-day-42;;");
  check("qr wifi escaping", Q.payload({ kind: "wifi", ssid: "My;Net", password: 'a"b:c', security: "WPA", hidden: true }), 'WIFI:T:WPA;S:My\\;Net;P:a\\"b\\:c;H:true;;');
  check("qr wifi open", Q.payload({ kind: "wifi", ssid: "Guest", password: "", security: "WPA" }), "WIFI:T:nopass;S:Guest;;");
  check("qr email", Q.payload({ kind: "email", to: "hello@example.com", subject: "Quote request" }), "mailto:hello@example.com?subject=Quote%20request");
  check("qr phone", Q.payload({ kind: "phone", number: "+44 1632 960123" }), "tel:+441632960123");
  const m = Q.matrix("https://vintayz.com/", "M");
  check("qr example size", m.size, 25);
  check("qr example version", m.version, 2);
  check("qr example pixels", Math.floor(600 / (25 + 8)) * (25 + 8), 594);
  check("qr finder corner dark", m.dark(0, 0) && m.dark(0, 6) && m.dark(6, 0) && !m.dark(1, 1), true);
  check("qr too long", !!Q.matrix("x".repeat(3000), "H").error, true);
  check("qr unicode works", !!Q.matrix("Café 👋", "M").size, true);
  check("qr higher level is bigger", Q.matrix("https://vintayz.com/", "H").size > m.size, true);
  check("qr svg", Q.svg(m, 10, 4, "#000000", "#ffffff").startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="330"'), true);
  check("qr contrast black on white", Math.round(Q.contrast("#000000", "#ffffff")), 21);
}

{
  const R = load("random-number");
  let inRange = true, unique = true;
  for (let i = 0; i < 200; i++) {
    const r = R.numbers({ min: 1, max: 6, count: 3, unique: false });
    if (r.numbers.some((n) => n < 1 || n > 6 || n % 1)) inRange = false;
    const u = R.numbers({ min: 1, max: 10, count: 10, unique: true, sort: true });
    if (u.numbers.join(",") !== "1,2,3,4,5,6,7,8,9,10") unique = false;
  }
  check("random numbers in range", inRange, true);
  check("random no repeats uses every number", unique, true);
  check("random too many without repeats", !!R.numbers({ min: 1, max: 5, count: 6, unique: true }).error, true);
  check("random min above max", !!R.numbers({ min: 10, max: 1, count: 1 }).error, true);
  check("random negatives", R.numbers({ min: -10, max: -10, count: 1 }).numbers[0], -10);
  check("random big unique sample", new Set(R.numbers({ min: 1, max: 1000000, count: 500, unique: true }).numbers).size, 500);
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 30000; i++) counts[R.numbers({ min: 1, max: 6, count: 1 }).numbers[0] - 1]++;
  check("random fair dice", Math.max(...counts) / Math.min(...counts) < 1.1, true);
  const list = "Alex\nSam\n\nPriya\nJordan\nChen\nMaria";
  const p = R.pick(list, 2);
  check("random pick count", p.picks.length + "/" + p.total, "2/6");
  check("random pick distinct", new Set(p.picks).size, 2);
  check("random pick too many", !!R.pick(list, 7).error, true);
  check("random pick empty", !!R.pick("\n \n", 1).error, true);
}

{
  const C = load("color-converter");
  const c = C.parse("#1d4ed8");
  // Page example.
  check("colour hex to rgb", JSON.stringify(c), '{"r":29,"g":78,"b":216}');
  check("colour hsl", JSON.stringify(C.toHsl(c)), '{"h":224,"s":76,"l":48}');
  check("colour hsv", JSON.stringify(C.toHsv(c)), '{"h":224,"s":87,"v":85}');
  check("colour cmyk", JSON.stringify(C.toCmyk(c)), '{"c":87,"m":64,"y":0,"k":15}');
  check("colour contrast with white", C.contrast(c, { r: 255, g: 255, b: 255 }), 6.7);
  check("colour short hex", C.hex(C.parse("#f00")), "#ff0000");
  check("colour red hsl", JSON.stringify(C.toHsl(C.parse("#f00"))), '{"h":0,"s":100,"l":50}');
  check("colour white hsl", JSON.stringify(C.toHsl(C.parse("#ffffff"))), '{"h":0,"s":0,"l":100}');
  check("colour rgb text", C.hex(C.parse("rgb(29, 78, 216)")), "#1d4ed8");
  check("colour rgb spaces", C.hex(C.parse("29 78 216")), "#1d4ed8");
  check("colour hsl text", C.hex(C.parse("hsl(0, 100%, 50%)")), "#ff0000");
  check("colour bad", C.parse("#12345"), null);
  check("colour rgb over 255", C.parse("rgb(300, 0, 0)"), null);
  check("colour black cmyk", JSON.stringify(C.toCmyk({ r: 0, g: 0, b: 0 })), '{"c":0,"m":0,"y":0,"k":100}');
  check("colour shades count", C.shades(c).length, 9);
  // Round trip for every hue step.
  let ok = true;
  for (let h = 0; h < 360; h += 15) {
    const rgb = C.fromHsl(h, 60, 40);
    const back = C.toHsl(rgb);
    if (Math.abs(back.l - 40) > 1 || Math.abs(back.s - 60) > 1) ok = false;
  }
  check("colour hsl round trip", ok, true);
}

{
  const B = load("base64");
  // Page examples.
  check("base64 hello", B.encode("Hello, world!"), "SGVsbG8sIHdvcmxkIQ==");
  check("base64 emoji", B.encode("Hello, world! 👋"), "SGVsbG8sIHdvcmxkISDwn5GL");
  check("base64 Man", B.encode("Man"), "TWFu");
  check("base64 Ma", B.encode("Ma"), "TWE=");
  check("base64 M", B.encode("M"), "TQ==");
  check("base64 url-safe", B.encode("??>", true), "Pz8-");
  check("base64 standard", B.encode("??>"), "Pz8+");
  check("base64 decode", B.decode("SGVsbG8sIHdvcmxkISDwn5GL").text, "Hello, world! 👋");
  check("base64 decode url-safe", B.decode("Pz8-").text, "??>");
  check("base64 decode no padding", B.decode("TQ").text, "M");
  check("base64 decode spaces", B.decode("SGVs bG8=\n").text, "Hello");
  check("base64 invalid", !!B.decode("abc$").error, true);
  check("base64 not text", !!B.decode(B.bytesToBase64(new Uint8Array([255, 254, 0]))).error, true);
  check("base64 matches Node", B.encode("Ünïcödé ✓ 日本"), Buffer.from("Ünïcödé ✓ 日本").toString("base64"));
}

{
  const T = load("timer");
  check("timer 5 min", T.formatTimer(300000), "05:00");
  check("timer rounds up", T.formatTimer(4200), "00:05");
  check("timer last moment", T.formatTimer(1), "00:01");
  check("timer zero", T.formatTimer(0), "00:00");
  check("timer hour", T.formatTimer(T.toMs(1, 2, 3)), "1:02:03");
  check("stopwatch", T.formatStopwatch(83456), "01:23.45");
  check("stopwatch hour", T.formatStopwatch(3723990), "1:02:03.99");
  check("timer toMs", T.toMs(0, 25, 0), 1500000);
}

// ---------------- More tools: fuel cost, unit price, sales tax, commission, UUID, URL, hash, regex
{
  const calc = load("fuel-cost");
  // Page examples.
  expectAll("fuel US", calc({ distance: 300, distUnit: "mi", economy: 30, econUnit: "mpg-us", price: 3.5, priceUnit: "usgal", people: 1 }), { usGallons: 10, cost: 35 });
  check("fuel US return", calc({ distance: 300, distUnit: "mi", economy: 30, econUnit: "mpg-us", price: 3.5, priceUnit: "usgal", roundTrip: true, people: 1 }).cost, 70);
  expectAll("fuel UK", calc({ distance: 200, distUnit: "mi", economy: 45, econUnit: "mpg-uk", price: 1.4, priceUnit: "litre", people: 1 }), { ukGallons: 4.44, litres: 20.2, cost: 28.29 });
  expectAll("fuel Australia", calc({ distance: 500, distUnit: "km", economy: 6.5, econUnit: "l100", price: 1.9, priceUnit: "litre", people: 2 }), { litres: 32.5, cost: 61.75, perPerson: 30.88 });
  check("fuel km per litre", calc({ distance: 150, distUnit: "km", economy: 15, econUnit: "kml", price: 2, priceUnit: "litre", people: 1 }).litres, 10);
  // FAQ: 30 US MPG is about 36 UK MPG.
  check("fuel US to UK mpg", Math.round(30 * 4.54609 / 3.785411784), 36);
}

{
  const U = load("unit-price");
  const r = U.compare([{ price: 3.49, size: 500, unit: "g" }, { price: 6.29, size: 1, unit: "kg" }]);
  check("unit price small per kg", r.rows[0].per.kg, 6.98);
  check("unit price big per kg", r.rows[1].per.kg, 6.29);
  check("unit price best", r.rows.map((x) => x.best).join(), "false,true");
  check("unit price 11% more", r.rows[0].extraPct, 11);
  const v = U.compare([{ price: 1.29, size: 12, unit: "usfloz" }, { price: 2.49, size: 2, unit: "l" }]);
  check("unit price can per litre", v.rows[0].per.l.toFixed(3), "3.635");
  check("unit price bottle per litre", v.rows[1].per.l.toFixed(3), "1.245");
  check("unit price 192% more", v.rows[0].extraPct, 192);
  check("unit price lb = 16 oz", U.compare([{ price: 4, size: 1, unit: "lb" }, { price: 4, size: 16, unit: "oz" }]).rows.every((x) => x.best), true);
  check("unit price mixed groups", !!U.compare([{ price: 1, size: 1, unit: "kg" }, { price: 1, size: 1, unit: "l" }]).error, true);
  check("unit price per item", U.compare([{ price: 6, size: 12, unit: "item" }]).rows[0].per.item, 0.5);
}

{
  const calc = load("sales-tax");
  // Page examples.
  expectAll("sales tax add 8.25%", calc({ amount: 100, rate: 8.25, mode: "add" }), { tax: 8.25, gross: 108.25 });
  expectAll("sales tax add 6%", calc({ amount: 49.99, rate: 6, mode: "add" }), { tax: 3, gross: 52.99 });
  expectAll("sales tax remove", calc({ amount: 54.13, rate: 8.25, mode: "remove" }), { net: 50, tax: 4.13, gross: 54.13 });
  check("sales tax wrong way", Math.round(54.13 * (1 - 0.0825) * 100) / 100, 49.66);
  expectAll("sales tax zero rate", calc({ amount: 20, rate: 0, mode: "remove" }), { net: 20, tax: 0 });
}

{
  const calc = load("commission");
  // Page examples.
  expectAll("commission flat", calc({ sales: 50000, rate: 5 }), { commission: 2500, effectiveRate: 5 });
  check("commission with base", calc({ sales: 50000, rate: 5, base: 2000 }).total, 4500);
  const tier = { rate: 5, tiered: true, threshold: 40000, rate2: 8 };
  expectAll("commission tiered", calc({ sales: 60000, ...tier }), { commission: 3600, effectiveRate: 6 });
  check("commission tiered below threshold", calc({ sales: 30000, ...tier }).commission, 1500);
  check("commission goal flat", calc.salesNeeded(3000, { rate: 5 }), 60000);
  check("commission goal tiered", calc.salesNeeded(3000, tier), 52500);
  check("commission goal under threshold", calc.salesNeeded(1000, tier), 20000);
  check("commission goal impossible", calc.salesNeeded(100, { rate: 0 }), null);
}

{
  const U = load("uuid");
  let ok4 = true, ok7 = true;
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const a = U.v4();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(a)) ok4 = false;
    seen.add(a);
    const b = U.v7();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(b)) ok7 = false;
  }
  check("uuid v4 format", ok4, true);
  check("uuid v4 all different", seen.size, 500);
  check("uuid v7 format", ok7, true);
  // Page example: 1,760,140,000,000 ms → 0199d084-fb00-7…
  const e = U.v7(1760140000000);
  check("uuid v7 time prefix", e.slice(0, 13), "0199d084-fb00");
  expectAll("uuid inspect v7", U.inspect(e), { valid: true, version: 7, time: 1760140000000 });
  check("uuid v7 date", new Date(U.inspect(e).time).toISOString(), "2025-10-10T23:46:40.000Z");
  check("uuid v7 sorts by time", U.v7(1000) < U.v7(2000), true);
  check("uuid format", U.format("0199d084-fb00-7000-8000-000000000000", { upper: true, hyphens: false, braces: true }), "{0199D084FB0070008000000000000000}");
  check("uuid inspect braces/upper", U.inspect("{0199D084FB0070008000000000000000}").version, 7);
  check("uuid inspect bad", U.inspect("not-a-uuid").valid, false);
  check("uuid nil", U.inspect("00000000-0000-0000-0000-000000000000").nil, true);
  // A version 1 UUID from RFC 9562 appendix A.1: 2022-02-22 19:22:22 UTC.
  check("uuid v1 time", new Date(U.inspect("C232AB00-9414-11EC-B3C8-9F6BDECED846").time).toISOString(), "2022-02-22T19:22:22.000Z");
}

{
  const U = load("url-encode");
  // Page example.
  check("url encode", U.encode("café & croissants = £3.50?", "component"), "caf%C3%A9%20%26%20croissants%20%3D%20%C2%A33.50%3F");
  check("url encode plus", U.encode("a b", "component", true), "a+b");
  check("url encode mailto subject", U.encode("Invoice #104", "component"), "Invoice%20%23104");
  check("url encode full keeps structure", U.encode("https://example.com/a b?x=1&y=é", "full"), "https://example.com/a%20b?x=1&y=%C3%A9");
  check("url decode", U.decode("caf%C3%A9%20%26").text, "café &");
  check("url decode plus", U.decode("a+b", true).text, "a b");
  check("url decode error", !!U.decode("100%").error, true);
  const p = U.parse("https://vintayz.com:8080/tools/?q=qr%20code&lang=en#top");
  check("url parse host", p.parts[1][1], "vintayz.com");
  check("url parse params", JSON.stringify(p.params), '[["q","qr code"],["lang","en"]]');
  check("url parse bad", !!U.parse("not a url").error, true);
}

async function hashTests() {
  const H = load("hash");
  const c = require("crypto");
  let ok = true;
  for (let n = 0; n < 200; n++) {
    const b = c.randomBytes(n * 13);
    if (H.md5(new Uint8Array(b)) !== c.createHash("md5").update(b).digest("hex")) ok = false;
  }
  check("hash md5 matches Node (200 inputs)", ok, true);
  const h = await H.hashAll(new TextEncoder().encode("hello"));
  // Page examples.
  check("hash md5 hello", h["MD5"], "5d41402abc4b2a76b9719d911017c592");
  check("hash sha1 hello", h["SHA-1"], "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  check("hash sha256 hello", h["SHA-256"], "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  check("hash sha512 hello", h["SHA-512"], c.createHash("sha512").update("hello").digest("hex"));
  const H2 = await H.hashAll(new TextEncoder().encode("Hello"));
  check("hash sha256 Hello", H2["SHA-256"], "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969");
  check("hash match", H.match(h, "SHA256: 2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824"), "SHA-256");
  check("hash no match", H.match(h, "abc"), false);
  check("hash empty md5", H.md5(new Uint8Array(0)), "d41d8cd98f00b204e9800998ecf8427e");
}

{
  const R = load("regex-worker");
  const t = "sent on 2026-10-13, paid by 2026-11-12";
  // Page example.
  check("regex dates", JSON.stringify(R.run(String.raw`\b\d{4}-\d{2}-\d{2}\b`, "g", t, null).matches.map((m) => [m.text, m.index])), '[["2026-10-13",8],["2026-11-12",28]]');
  check("regex replace groups", R.run(String.raw`(\d{4})-(\d{2})-(\d{2})`, "g", t, "$3/$2/$1").replaced, "sent on 13/10/2026, paid by 12/11/2026");
  check("regex named group", R.run(String.raw`(?<amount>[$£€]\s?\d[\d,]*(?:\.\d{2})?)`, "g", "for $1,250.00 and £980.50", null).matches.map((m) => m.named.amount).join("|"), "$1,250.00|£980.50");
  check("regex not global = first only", R.run("a", "", "aaa", null).total, 1);
  check("regex empty matches don't loop", R.run("x*", "g", "abc", null).total, 4);
  check("regex invalid", !!R.run("(", "g", "x", null).error, true);
  check("regex ignore case", R.run("hello", "gi", "Hello HELLO", null).total, 2);
  const emails = R.run(String.raw`\b[\w.+-]+@[\w-]+\.[\w.-]+\b`, "g", "Invoice to sam@example.com. Copy accounts@example.co.uk.", null);
  check("regex default email example", emails.matches.map((m) => m.text).join("|"), "sam@example.com|accounts@example.co.uk");
}

// ---------------- US federal tax brackets (2026)
{
  const calc = load("us-tax-bracket", US_LIBS);
  // Page example: single, $75,000, standard deduction $16,100.
  const r = calc({ income: 75000, status: "single", itemized: null });
  expectAll("us brackets page example", r, { deduction: 16100, taxable: 58900, tax: 7670, marginal: 0.22, effective: 10.23, toNextBracket: 46800, band: 2 });
  check("us brackets page rows", r.rows.slice(0, 3).map((x) => x.tax).join(","), "1240,4560,1870");
  expectAll("us brackets mfj $150k", calc({ income: 150000, status: "mfj", itemized: null }), { taxable: 117800, tax: 15340, marginal: 0.22 });
  expectAll("us brackets below deduction", calc({ income: 10000, status: "single", itemized: null }), { taxable: 0, tax: 0, marginal: 0.1, effective: 0 });
  expectAll("us brackets hoh itemized", calc({ income: 300000, status: "hoh", itemized: 30000 }), { taxable: 270000, tax: 61461, marginal: 0.35 });
  expectAll("us brackets top", calc({ income: 1000000, status: "single", itemized: null }), { toNextBracket: null, marginal: 0.37 });
}

// ---------------- UK dividend tax (2026 to 2027)
{
  const calc = load("uk-dividend-tax", UK_LIBS);
  // Page example: £12,570 salary + £40,000 dividends.
  expectAll("uk dividends page example", calc({ other: 12570, dividends: 40000, region: "ruk" }),
    { allowanceUsed: 500, basic: 37200, higher: 2300, dividendTax: 4821.25, otherTax: 0, keep: 35178.75, effective: 12.05 });
  expectAll("uk dividends only", calc({ other: 0, dividends: 20000, region: "ruk" }),
    { paOnDividends: 12570, basic: 6930, dividendTax: 744.98 });
  expectAll("uk dividends higher rate", calc({ other: 60000, dividends: 10000, region: "ruk" }),
    { basic: 0, higher: 9500, dividendTax: 3396.25 });
  expectAll("uk dividends allowance taper", calc({ other: 100000, dividends: 20000, region: "ruk" }),
    { personalAllowance: 2570, higher: 19500, dividendTax: 6971.25 });
  expectAll("uk dividends within allowance", calc({ other: 30000, dividends: 500, region: "ruk" }), { dividendTax: 0, allowanceUsed: 500 });
  // Scotland: dividends use UK-wide bands, so the dividend tax is the same; only tax on the salary differs.
  check("uk dividends Scotland same dividend tax", calc({ other: 40000, dividends: 10000, region: "scotland" }).dividendTax,
    calc({ other: 40000, dividends: 10000, region: "ruk" }).dividendTax);
}

// ---------------- Canada CPP and EI (2026, employees outside Quebec)
{
  const calc = load("ca-cpp-ei", ["data/tax-ca.js"]);
  // Page example: $60,000 paid every two weeks.
  expectAll("ca cpp ei page example", calc({ salary: 60000, periods: 26 }),
    { cpp: 3361.75, cpp2: 0, ei: 978, employee: 4339.75, perPeriod: 166.91, employerEi: 1369.2, employer: 4730.95 });
  expectAll("ca cpp ei maximums", calc({ salary: 100000, periods: 12 }),
    { cpp: 4230.45, cpp2: 416, ei: 1123.07, employee: 5769.52, cppMax: 4230.45, cpp2Max: 416, eiMax: 1123.07 });
  expectAll("ca cpp ei low income", calc({ salary: 3000, periods: 52 }), { cpp: 0, ei: 48.9, employee: 48.9 });
}

// ---------------- Australia take-home pay (2026–27)
{
  const calc = load("au-take-home", AU_LIBS);
  // Page example: $90,000 plus super.
  expectAll("au take-home page example", calc({ salary: 90000, includesSuper: false }),
    { basic: 17520, lito: 0, incomeTax: 17520, medicare: 1800, total: 19320, takeHome: 70680, monthly: 5890, fortnightly: 2718.46, weekly: 1359.23, superAmount: 10800 });
  expectAll("au take-home $40k with LITO", calc({ salary: 40000, includesSuper: false }),
    { basic: 3270, lito: 575, incomeTax: 2695, medicare: 800, takeHome: 36505 });
  expectAll("au take-home package incl. super", calc({ salary: 112000, includesSuper: true }),
    { base: 100000, superAmount: 12000, incomeTax: 20520, medicare: 2000, takeHome: 77480 });
}

// ---------------- Brain games (/games/)
const GAME_LIBS = ["js/games-common.js"];
function loadGameHelpers() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(JS, "js/games-common.js"), "utf8"), sandbox);
  return sandbox.window.ToolNestGames;
}
{
  // Shared helpers. Fisher-Yates with a "random" that always gives 0, worked by hand:
  // [1,2,3,4] → swap 3↔0 [4,2,3,1] → swap 2↔0 [3,2,4,1] → swap 1↔0 [2,3,4,1]
  const G = loadGameHelpers();
  check("games shuffle by hand", G.shuffle([1, 2, 3, 4], () => 0).join(","), "2,3,4,1");
  check("games shuffle leaves original alone", (() => { const a = [1, 2, 3]; G.shuffle(a, () => 0); return a.join(","); })(), "1,2,3");
  check("games formatTime 75s", G.formatTime(75), "1:15");
  check("games formatTime 3725s", G.formatTime(3725), "1:02:05");
  check("games formatTime 0", G.formatTime(0), "0:00");
  const r1 = G.makeRng(42), r2 = G.makeRng(42);
  check("games seeded rng repeats", [r1(), r1(), r1()].join() === [r2(), r2(), r2()].join(), true);
  check("games rng in range", Array.from({ length: 1000 }, G.makeRng(7)).every((x) => x >= 0 && x < 1), true);
}
{
  const T = load("typing-test", GAME_LIBS);
  // (7 ÷ 5) ÷ 0.1 minutes = 14 WPM
  expectAll("typing perfect short", T.score("the cat", "the cat", 6), { correct: 7, errors: 0, wpm: 14, rawWpm: 14, accuracy: 100 });
  // Page worked example: 300 typed, 285 correct, 1 minute → 57 WPM, raw 60, 95%
  expectAll("typing page example", T.score("a".repeat(300), "a".repeat(285) + "b".repeat(15), 60),
    { typed: 300, correct: 285, errors: 15, wpm: 57, rawWpm: 60, accuracy: 95 });
  // Page: the same 285 correct characters in 30 seconds → 114 WPM
  expectAll("typing page 30-second example", T.score("a".repeat(285), "a".repeat(285), 30), { wpm: 114, accuracy: 100 });
  // One wrong letter in five, 1 minute: (4 ÷ 5) = 0.8 → 1 WPM, 80%
  expectAll("typing one mistake", T.score("hello", "hxllo", 60), { correct: 4, errors: 1, wpm: 1, accuracy: 80 });
  expectAll("typing nothing typed", T.score("hello", "", 0), { typed: 0, wpm: 0, accuracy: 100 });
  check("typing extra characters ignored", T.score("hi", "hi there", 60).typed, 2);
  const text = T.buildText();
  check("typing passages are plain keyboard characters", /^[\x20-\x7e]+$/.test(text), true);
  check("typing passages have no double spaces", text.includes("  "), false);
  check("typing text uses every passage", T.PASSAGES.every((p) => text.includes(p)), true);
  check("typing text long enough for 2 minutes at 150 WPM", text.length >= 150 * 5 * 2, true);
}
{
  const R = load("reaction-time");
  // Page worked example: (300 + 250 + 350 + 280 + 320) ÷ 5 = 300
  expectAll("reaction page example", R.summary([300, 250, 350, 280, 320]), { count: 5, average: 300, best: 250, slowest: 350 });
  expectAll("reaction rounds half up", R.summary([199, 200]), { average: 200, best: 199, slowest: 200 });
  expectAll("reaction no tries", R.summary([]), { count: 0, average: 0 });
  check("reaction shortest wait", R.randomWait(() => 0), 1500);
  check("reaction middle wait", R.randomWait(() => 0.5), 3000);
  check("reaction longest wait under 4.5s", R.randomWait(() => 0.9999) <= 4500, true);
}
{
  const S = load("sudoku", GAME_LIBS);
  const grid = Array(81).fill(0);
  grid[0] = 5; // row 1, column 1
  check("sudoku same row blocked", S.canPlace(grid, 8, 5), false);
  check("sudoku same column blocked", S.canPlace(grid, 72, 5), false);
  check("sudoku same box blocked", S.canPlace(grid, 20, 5), false);
  check("sudoku elsewhere allowed", S.canPlace(grid, 40, 5), true);
  grid[8] = 5;
  check("sudoku conflict found", S.conflicts(grid).join(","), "0,8");
  // A known valid grid: row r is 1..9 shifted by (3r + r div 3).
  const full = Array.from({ length: 81 }, (_, i) => { const r = Math.floor(i / 9), c = i % 9; return ((r * 3 + Math.floor(r / 3) + c) % 9) + 1; });
  check("sudoku pattern grid is solved", S.isSolved(full), true);
  const holes = full.slice();
  [0, 10, 20, 40, 60, 80].forEach((i) => { holes[i] = 0; });
  check("sudoku solves back to the pattern", S.solve(holes).join(""), full.join(""));
  check("sudoku few holes: one solution", S.countSolutions(holes, 2), 1);
  check("sudoku empty grid: many solutions", S.countSolutions(Array(81).fill(0), 2), 2);
  check("sudoku grid with a repeated number has no solution", S.solve(grid), null); // two 5s in row 1
  const { makeRng } = loadGameHelpers();
  for (const [level, seed] of [["easy", 1], ["medium", 2], ["hard", 3]]) {
    const g = S.generate(level, makeRng(seed));
    const given = g.puzzle.filter(Boolean).length;
    check(`sudoku ${level} clue count matches`, given, g.clues);
    check(`sudoku ${level} has exactly one solution`, S.countSolutions(g.puzzle, 2), 1);
    check(`sudoku ${level} solution is valid`, S.isSolved(g.solution), true);
    check(`sudoku ${level} givens match solution`, g.puzzle.every((v, i) => !v || v === g.solution[i]), true);
    check(`sudoku ${level} reaches its target`, level === "hard" ? given <= 30 : given === S.CLUES[level], true);
  }
}
{
  const M = load("number-merge");
  // Page scoring table
  const a = M.slideLine([2, 2, 2, 2]);
  check("merge 2·2·2·2 left", a.line.join(","), "4,4,0,0");
  check("merge 2·2·2·2 points", a.score, 8);
  const b = M.slideLine([2, 2, 4, 0]);
  check("merge 2·2·4 left (no double join)", b.line.join(","), "4,4,0,0");
  check("merge 2·2·4 points", b.score, 4);
  const c = M.slideLine([4, 0, 4, 8]);
  check("merge 4·_·4·8 left", c.line.join(","), "8,8,0,0");
  check("merge 4·_·4·8 points", c.score, 8);
  check("merge single tile slides", M.slideLine([0, 0, 0, 2]).line.join(","), "2,0,0,0");
  const row = [2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const right = M.move(row, "right");
  check("merge move right", right.grid.slice(0, 4).join(","), "0,0,2,4");
  check("merge move right points", right.score, 4);
  const col = [2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0];
  check("merge move up", [0, 4, 8, 12].map((i) => M.move(col, "up").grid[i]).join(","), "4,4,0,0");
  check("merge move down", [0, 4, 8, 12].map((i) => M.move(col, "down").grid[i]).join(","), "0,0,4,4");
  check("merge merged cells marked", M.move([2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "left").merged.join(","), "0,1");
  check("merge nothing moves", M.move([2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "left").moved, false);
  const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  check("merge checkerboard is stuck", M.canMove(stuck), false);
  check("merge empty cell can move", M.canMove(stuck.map((v, i) => (i === 5 ? 0 : v))), true);
  check("merge equal neighbours can move", M.canMove(stuck.map((v, i) => (i === 1 ? 2 : v))), true);
  const g1 = M.emptyGrid();
  check("merge new tile cell", M.addTile(g1, () => 0), 0);
  check("merge new tile is 2", g1[0], 2);
  const g2 = M.emptyGrid();
  check("merge new tile 4 at last cell", M.addTile(g2, () => 0.95) + ":" + g2[15], "15:4");
}
{
  const Mem = load("memory-match", GAME_LIBS);
  // [0,0,1,1] with "random" 0: swap 3↔0 [1,0,1,0], swap 2↔0 [1,0,1,0], swap 1↔0 [0,1,1,0]
  check("memory deal by hand", Mem.deal(2, () => 0).join(","), "0,1,1,0");
  const deck = Mem.deal(12);
  check("memory 12 pairs makes 24 cards", deck.length, 24);
  check("memory every picture twice", Array.from({ length: 12 }, (_, i) => deck.filter((d) => d === i).length).every((n) => n === 2), true);
  // Page scoring table
  check("memory 8 pairs in 16 moves", Mem.rating(8, 16), 50);
  check("memory 12 pairs in 20 moves", Mem.rating(12, 20), 60);
  check("memory perfect game", Mem.rating(8, 8), 100);
  check("memory 8 pairs in 24 moves", Mem.rating(8, 24), 33);
}
{
  // Klondike Solitaire. Suits: 0 spades, 1 hearts, 2 diamonds, 3 clubs.
  const Sol = load("solitaire", GAME_LIBS);
  const card = (rank, suit, up = true) => ({ rank, suit, up });
  const dealt = Sol.deal(null, 1);
  check("solitaire deal pile sizes", dealt.tableau.map((p) => p.length).join(","), "1,2,3,4,5,6,7");
  check("solitaire deal only top cards face up", dealt.tableau.every((p) => p.every((c, i) => c.up === (i === p.length - 1))), true);
  check("solitaire deal stock", dealt.stock.length, 24);
  const all = [...dealt.stock, ...dealt.tableau.flat()].map((c) => c.suit * 13 + c.rank);
  check("solitaire deal uses 52 different cards", new Set(all).size, 52);
  check("solitaire red 6 on black 7", Sol.canStack(card(6, 1), [card(7, 0)]), true);
  check("solitaire black 6 on red 7", Sol.canStack(card(6, 3), [card(7, 2)]), true);
  check("solitaire red 6 on red 7", Sol.canStack(card(6, 1), [card(7, 2)]), false);
  check("solitaire 5 on 7", Sol.canStack(card(5, 1), [card(7, 0)]), false);
  check("solitaire King on empty pile", Sol.canStack(card(13, 0), []), true);
  check("solitaire Queen on empty pile", Sol.canStack(card(12, 0), []), false);
  check("solitaire Ace starts foundation", Sol.canFound(card(1, 1), []), true);
  check("solitaire 2 hearts on Ace hearts", Sol.canFound(card(2, 1), [card(1, 1)]), true);
  check("solitaire 2 spades on Ace hearts", Sol.canFound(card(2, 0), [card(1, 1)]), false);
  check("solitaire 3 hearts on Ace hearts", Sol.canFound(card(3, 1), [card(1, 1)]), false);
  // Draw 3 from a 5-card stock [A..5 of spades]: takes 5, 4, 3; then 2, 1; then turns the waste back over.
  const empty7 = () => [[], [], [], [], [], [], []];
  let s = { stock: [1, 2, 3, 4, 5].map((r) => card(r, 0, false)), waste: [], foundations: [[], [], [], []], tableau: empty7(), drawCount: 3 };
  s = Sol.draw(s);
  check("solitaire draw 3 waste", s.waste.map((c) => c.rank).join(","), "5,4,3");
  check("solitaire draw 3 face up", s.waste.every((c) => c.up), true);
  s = Sol.draw(s);
  check("solitaire draw rest", s.stock.length + ":" + s.waste.map((c) => c.rank).join(","), "0:5,4,3,2,1");
  s = Sol.draw(s);
  check("solitaire recycle waste", s.stock.map((c) => c.rank).join(",") + ":" + s.waste.length + ":" + s.stock.some((c) => c.up), "1,2,3,4,5:0:false");
  check("solitaire nothing to draw", Sol.draw({ ...s, stock: [], waste: [] }), null);
  // Page worked example: red 7 of hearts onto black 8 of clubs turns over the card beneath.
  const t = empty7();
  t[0] = [card(8, 3)];
  t[1] = [card(12, 2, false), card(7, 1)];
  t[2] = [card(6, 0)];
  t[3] = [card(9, 2)];
  const ex = { stock: [], waste: [card(1, 2)], foundations: [[], [], [], []], tableau: t, drawCount: 1 };
  const aceTo = Sol.bestMove(ex, { type: "waste" });
  check("solitaire Ace goes to a foundation", aceTo && aceTo.type, "foundation");
  const ex2 = Sol.move(ex, { type: "tableau", i: 1, index: 1 }, { type: "tableau", i: 0 });
  check("solitaire 7 on 8", ex2.tableau[0].map((c) => c.rank).join(","), "8,7");
  check("solitaire card beneath turns over", ex2.tableau[1][0].up, true);
  const ex3 = Sol.move(ex2, { type: "tableau", i: 2, index: 0 }, { type: "tableau", i: 0 });
  check("solitaire 8-7-6 run", ex3.tableau[0].map((c) => c.rank).join(","), "8,7,6");
  check("solitaire original state unchanged", ex.tableau[0].length, 1);
  const ex4 = Sol.move(ex3, { type: "tableau", i: 0, index: 0 }, { type: "tableau", i: 3 });
  check("solitaire whole run moves onto red 9", ex4.tableau[3].map((c) => c.rank).join(","), "9,8,7,6");
  check("solitaire broken run can't move", Sol.move({ ...ex, tableau: [[card(8, 3), card(5, 1)], [card(9, 1)], [], [], [], [], []] }, { type: "tableau", i: 0, index: 0 }, { type: "tableau", i: 1 }), null);
  check("solitaire lone King doesn't hop between empty piles", Sol.bestMove({ ...ex, tableau: [[card(13, 0)], [], [], [], [], [], []] }, { type: "tableau", i: 0, index: 0 }), null);
  // Finish: every suit up to Queen at home, four Kings face up in the piles.
  const near = { stock: [], waste: [], foundations: [0, 1, 2, 3].map((su) => Array.from({ length: 12 }, (_, k) => card(k + 1, su))), tableau: [[card(13, 0)], [card(13, 1)], [card(13, 2)], [card(13, 3)], [], [], []], drawCount: 1 };
  check("solitaire can finish", Sol.canAutoFinish(near), true);
  let fin = near;
  let steps = 0;
  for (let n = Sol.autoFinishStep(fin); n; n = Sol.autoFinishStep(fin)) { fin = n; steps++; }
  check("solitaire finish takes 4 moves", steps, 4);
  check("solitaire won", Sol.isWon(fin), true);
  check("solitaire can't finish with cards in stock", Sol.canAutoFinish({ ...near, stock: [card(2, 0, false)] }), false);
}
{
  const Mf = load("mine-finder", GAME_LIBS);
  const { makeRng } = loadGameHelpers();
  check("mines corner has 3 neighbours", Mf.neighbours(0, 9, 9).length, 3);
  check("mines edge has 5 neighbours", Mf.neighbours(4, 9, 9).length, 5);
  check("mines middle has 8 neighbours", Mf.neighbours(40, 9, 9).length, 8);
  // Page table
  check("mines levels", Object.values(Mf.LEVELS).map((l) => `${l.rows}x${l.cols}/${l.mines}`).join(" "), "9x9/10 12x12/24 16x16/40");
  for (const [key, lv] of Object.entries(Mf.LEVELS)) {
    const mines = Mf.placeMines(lv.rows, lv.cols, lv.mines, 40, makeRng(9));
    check(`mines ${key} count`, mines.filter(Boolean).length, lv.mines);
    check(`mines ${key} first tap area safe`, [40, ...Mf.neighbours(40, lv.rows, lv.cols)].some((i) => mines[i]), false);
  }
  // 3×3 with mines in two corners: centre touches 2, top middle touches 1, the other corners 0.
  const c3 = Mf.counts([true, false, false, false, false, false, false, false, true], 3, 3);
  check("mines counts by hand", [c3[4], c3[1], c3[2], c3[6]].join(","), "2,1,0,0");
  // 4×4 with one mine in the bottom-right corner: one tap on the top-left opens all 15 safe squares.
  const b = Mf.makeBoard(4, 4, Array.from({ length: 16 }, (_, i) => i === 15));
  check("mines numbers next to the mine", [b.counts[10], b.counts[11], b.counts[14], b.counts[0]].join(","), "1,1,1,0");
  check("mines flood opens 15", Mf.reveal(b, 0).length, 15);
  check("mines board cleared", Mf.isCleared(b), true);
  const b2 = Mf.makeBoard(4, 4, Array.from({ length: 16 }, (_, i) => i === 15));
  b2.flags[5] = true;
  check("mines flag stops opening", Mf.reveal(b2, 5).length, 0);
  check("mines not cleared", Mf.isCleared(b2), false);
}
{
  const W = load("word-search", GAME_LIBS);
  const { makeRng } = loadGameHelpers();
  check("words across", W.cellsBetween(0, 3, 10).join(","), "0,1,2,3");
  check("words diagonal", W.cellsBetween(0, 33, 10).join(","), "0,11,22,33");
  check("words backwards", W.cellsBetween(33, 0, 10).join(","), "33,22,11,0");
  check("words not a straight line", W.cellsBetween(0, 12, 10), null);
  check("words match either way", W.match([{ word: "CAT", cells: [0, 1, 2] }], [2, 1, 0]), "CAT");
  check("words no match", W.match([{ word: "CAT", cells: [0, 1, 2] }], [0, 1]), null);
  // Page claims: 16 words per theme; Q, X and Z never used as filler; easy 10×10 with 8 words, hard 12×12 with 12.
  for (const [key, theme] of Object.entries(W.THEMES)) {
    check(`words ${key} has 16 different words`, new Set(theme.words).size, 16);
    check(`words ${key} plain capitals`, theme.words.every((w) => /^[A-Z]+$/.test(w)), true);
  }
  check("words levels", Object.values(W.LEVELS).map((l) => `${l.size}/${l.count}/${l.dirs.length}`).join(" "), "10/8/4 12/12/8");
  let seed = 1;
  for (const theme of Object.keys(W.THEMES)) {
    for (const level of ["easy", "hard"]) {
      const p = W.generate(theme, level, makeRng(seed++));
      const lv = W.LEVELS[level];
      const label = `words ${theme} ${level}`;
      check(`${label} made`, !!p, true);
      check(`${label} word count`, p.placed.length, lv.count);
      check(`${label} grid size`, p.grid.length, lv.size * lv.size);
      check(`${label} words spelled in grid`, p.placed.every((w) => w.cells.map((i) => p.grid[i]).join("") === w.word), true);
      check(`${label} words in straight lines`, p.placed.every((w) => (W.cellsBetween(w.cells[0], w.cells[w.cells.length - 1], lv.size) || []).join() === w.cells.join()), true);
      const used = new Set(p.placed.flatMap((w) => w.cells));
      check(`${label} no Q, X or Z filler`, p.grid.some((ch, i) => !used.has(i) && /[QXZ]/.test(ch)), false);
      if (level === "easy") check(`${label} only forward words`, p.placed.every((w) => w.cells[1] - w.cells[0] > 0 || w.cells[1] - w.cells[0] === -(lv.size - 1)), true);
    }
  }
}
{
  const MM = load("mental-math");
  const { makeRng } = loadGameHelpers();
  // Page worked example: 24 right in 60 seconds = 24 per minute.
  check("math page example", MM.rate(24, 60), 24);
  check("math 30 seconds", MM.rate(15, 30), 30);
  check("math no time", MM.rate(5, 0), 0);
  // Page tips
  check("math tip 47 + 38", 40 + 30 + (7 + 8), 85);
  check("math tip 92 − 57", (60 - 57) + (92 - 60), 35);
  check("math tip 9 × 7", 10 * 7 - 7, 63);
  check("math tip 84 ÷ 7", 7 * 12, 84);
  const rng = makeRng(5);
  for (const level of ["easy", "medium", "hard"]) {
    const qs = Array.from({ length: 2000 }, () => MM.makeProblem(level, rng));
    const ops = [...new Set(qs.map((q) => q.op))].sort().join("");
    check(`math ${level} operations`, ops, { easy: "+−", medium: "+×−", hard: "+×÷−" }[level]);
    const right = qs.every((q) => q.answer === { "+": q.a + q.b, "−": q.a - q.b, "×": q.a * q.b, "÷": q.a / q.b }[q.op]);
    check(`math ${level} answers right`, right, true);
    check(`math ${level} whole answers of 0 or more`, qs.every((q) => Number.isInteger(q.answer) && q.answer >= 0), true);
    const max = { easy: 20, medium: 100, hard: 1000 }[level];
    check(`math ${level} add/take away up to ${max}`, qs.filter((q) => q.op === "+" || q.op === "−").every((q) => q.a <= max && q.b <= max), true);
    const table = level === "hard" ? 12 : 10;
    check(`math ${level} times tables up to ${table}`, qs.filter((q) => q.op === "×").every((q) => q.a <= table && q.b <= table), true);
    check(`math ${level} division answers up to 12`, qs.filter((q) => q.op === "÷").every((q) => q.answer >= 2 && q.answer <= 12 && q.b <= 12), true);
  }
}
{
  const NM = load("number-memory");
  const { makeRng } = loadGameHelpers();
  // Page table: 1 second + 0.4 seconds per digit
  check("memory test 3 digits", NM.showTime(3), 2200);
  check("memory test 5 digits", NM.showTime(5), 3000);
  check("memory test 10 digits", NM.showTime(10), 5000);
  check("memory test number with random 0", NM.makeNumber(7, () => 0), "1000000");
  const nums = Array.from({ length: 500 }, (_, i) => NM.makeNumber(3 + (i % 10), makeRng(i)));
  check("memory test lengths", nums.every((n, i) => n.length === 3 + (i % 10)), true);
  check("memory test never starts with 0", nums.every((n) => n[0] !== "0"), true);
  check("memory test spaces ignored", NM.isRight("1234567", "1 234 567"), true);
  check("memory test wrong digit", NM.isRight("123", "124"), false);
  check("memory test grouped", NM.grouped("1234567"), "1 234 567");
  check("memory test grouped tip", NM.grouped("4820193"), "4 820 193");
  check("memory test short not grouped", NM.grouped("123"), "123");
}
{
  // Sliding Puzzle
  const SP = load("sliding-puzzle", GAME_LIBS);
  const { makeRng } = loadGameHelpers();
  const s3 = SP.solvedBoard(3);
  check("slide solved 3x3", s3.join(","), "1,2,3,4,5,6,7,8,0");
  check("slide solved is solved", SP.isSolved(s3), true);
  check("slide one tile", SP.slide(s3, 3, 7).join(","), "1,2,3,4,5,6,7,0,8");
  check("slide two tiles in a row", SP.slide(s3, 3, 6).join(","), "1,2,3,4,5,6,0,7,8");
  check("slide two tiles in a column", SP.slide(s3, 3, 2).join(","), "1,2,0,4,5,3,7,8,6");
  check("slide not in line", SP.slide(s3, 3, 0), null);
  check("slide tiles next to gap", SP.movable(SP.solvedBoard(4), 4).join(","), "11,14");
  // Swapping two tiles makes a puzzle impossible (page: "only half of all orders can be solved").
  const swap = (b, x, y) => { const c = b.slice(); const i = c.indexOf(x), j = c.indexOf(y); [c[i], c[j]] = [c[j], c[i]]; return c; };
  check("slide 15 puzzle solvable", SP.isSolvable(SP.solvedBoard(4), 4), true);
  check("slide 14-15 swapped unsolvable", SP.isSolvable(swap(SP.solvedBoard(4), 14, 15), 4), false);
  check("slide 8 puzzle solvable", SP.isSolvable(s3, 3), true);
  check("slide 7-8 swapped unsolvable", SP.isSolvable(swap(s3, 7, 8), 3), false);
  check("slide gap moved up still solvable", SP.isSolvable(SP.slide(SP.solvedBoard(4), 4, 11), 4), true);
  for (const n of [3, 4, 5]) {
    let ok = true;
    for (let seed = 1; seed <= 20; seed++) {
      const b = SP.scramble(n, makeRng(seed));
      ok = ok && SP.isSolvable(b, n) && !SP.isSolved(b) && [...b].sort((x, y) => x - y).every((v, i) => v === i);
    }
    check(`slide ${n}x${n} scrambles are solvable and mixed`, ok, true);
  }
  // Page table: random slides used = 60 × tiles squared
  check("slide mixing moves", [3, 4, 5].map((n) => 60 * n * n).join(","), "540,960,1500");
}
{
  // Four in a Row. Index = row × 7 + column, row 0 at the top.
  const FR = load("four-in-a-row", GAME_LIBS);
  check("four lines on the board", FR.LINES.length, 69);
  check("four lines through bottom middle", FR.LINES.filter((l) => l.includes(38)).length, 7);
  check("four lines through a corner", FR.LINES.filter((l) => l.includes(0)).length, 3);
  const e = FR.emptyBoard();
  check("four counter lands at the bottom", FR.landingRow(e, 3), 5);
  let col = e;
  for (let k = 0; k < 6; k++) col = FR.drop(col, 0, k % 2 ? 2 : 1);
  check("four full column", FR.landingRow(col, 0) + ":" + FR.drop(col, 0, 1), "-1:null");
  check("four full column not a move", FR.validMoves(col).includes(0), false);
  const put = (cells, p) => { const b = FR.emptyBoard(); cells.forEach((i) => { b[i] = p; }); return b; };
  const across = FR.winner(put([35, 36, 37, 38], 1));
  check("four across wins", across && across.player + ":" + across.cells.join(","), "1:35,36,37,38");
  check("four down wins", FR.winner(put([14, 21, 28, 35], 2)).player, 2);
  check("four diagonal wins", FR.winner(put([35, 29, 23, 17], 1)).player, 1);
  check("four other diagonal wins", FR.winner(put([38, 30, 22, 14], 2)).player, 2);
  check("four three is not a win", FR.winner(put([35, 36, 37], 1)), null);
  // Computer takes its own win, and blocks yours.
  const toWin = put([35, 36, 37], 2);
  toWin[28] = 1; toWin[29] = 1;
  for (const level of ["medium", "hard"]) check(`four ${level} takes the win`, FR.bestMove(toWin, 2, level), 3);
  const toBlock = put([35, 36, 37], 1);
  toBlock[28] = 2;
  for (const level of ["medium", "hard"]) check(`four ${level} blocks you`, FR.bestMove(toBlock, 2, level), 3);
  check("four full board", FR.isFull(Array(42).fill(1)), true);
}
{
  const NG = load("nonogram", GAME_LIBS);
  const { makeRng } = loadGameHelpers();
  check("nonogram clue 2 1", NG.lineClue([1, 1, 0, 1]).join(" "), "2 1");
  check("nonogram clue 1 2", NG.lineClue([0, 1, 0, 1, 1, 0]).join(" "), "1 2");
  check("nonogram clue full", NG.lineClue([1, 1, 1]).join(" "), "3");
  check("nonogram clue empty", NG.lineClue([0, 0]).length, 0);
  const c2 = NG.clues([1, 0, 1, 1], 2);
  check("nonogram 2x2 clues", JSON.stringify(c2), '{"rows":[[1],[2]],"cols":[[2],[1]]}');
  // Page worked example: clue 8 in a row of 10 → 8 − (10 − 8) = 6 sure squares; "4 5" fills 4 + 1 + 5 = 10.
  const sure = (clue, n) => { const left = Array(n).fill(0), right = Array(n).fill(0); for (let i = 0; i < clue; i++) { left[i] = 1; right[n - 1 - i] = 1; } return left.filter((v, i) => v && right[i]).length; };
  check("nonogram overlap example", sure(8, 10), 6);
  check("nonogram full-width example", 4 + 1 + 5, 10);
  for (const n of [5, 10, 15]) {
    let ok = true;
    for (let seed = 1; seed <= 10; seed++) {
      const p = NG.generate(n, makeRng(seed * 7 + n));
      ok = ok && p.grid.length === n * n && p.clues.rows.every((r) => r.length) && p.clues.cols.every((c) => c.length) &&
        NG.fits(p.grid, n, p.clues) && !NG.fits(Array(n * n).fill(0), n, p.clues);
    }
    check(`nonogram ${n}x${n} puzzles have clues for every line and their picture fits`, ok, true);
  }
}
{
  const SQ = load("sequence-memory", GAME_LIBS);
  check("sequence right so far", SQ.check([1, 2, 3], [1]), "more");
  check("sequence all right", SQ.check([1, 2, 3], [1, 2, 3]), "done");
  check("sequence wrong", SQ.check([1, 2, 3], [1, 3]), "wrong");
  check("sequence nothing tapped yet", SQ.check([4], []), "more");
  let seq = [];
  for (let k = 0; k < 50; k++) seq = SQ.extend(seq);
  check("sequence grows by one", seq.length, 50);
  check("sequence uses the 9 squares", seq.every((p) => p >= 0 && p < 9), true);
  // Page table: 0.75 seconds per square
  check("sequence 4 squares", SQ.playTime(4), 3000);
  check("sequence 8 squares", SQ.playTime(8), 6000);
  check("sequence 12 squares", SQ.playTime(12), 9000);
}
{
  const SN = load("snake", GAME_LIBS);
  const { makeRng } = loadGameHelpers();
  const g = SN.newGame(makeRng(1));
  check("snake starts 3 long", g.snake.length, 3);
  check("snake board 15x15", SN.SIZE * SN.SIZE, 225);
  check("snake food not on snake", g.snake.some((p) => p[0] === g.food[0] && p[1] === g.food[1]), false);
  const away = { ...g, food: [0, 0] };
  const moved = SN.step(away);
  check("snake moves right", moved.snake[0].join(",") + ":" + moved.snake.length, "7,4:3");
  check("snake can't turn back", SN.turn(away, "left").queued.length, 0);
  check("snake turn queued", SN.turn(away, "up").queued.join(), "up");
  check("snake up then left kept", SN.turn(SN.turn(away, "up"), "left").queued.join(), "up,left");
  // Page worked example: 10 pieces of food → 3 + 10 = 13 long, score 10.
  let s = { ...g, food: [7, 4] };
  for (let k = 0; k < 10; k++) {
    s = SN.step(s);
    const h = s.snake[0];
    s = { ...s, food: [h[0], h[1] + 1] };
  }
  check("snake after 10 food", s.snake.length + ":" + s.score + ":" + s.dead, "13:10:false");
  check("snake hits wall", SN.step({ ...g, snake: [[0, 5], [1, 5], [2, 5]], dir: "up", queued: [], food: [9, 9] }).dead, true);
  const ring = { ...g, snake: [[1, 1], [1, 2], [2, 2], [2, 1]], queued: [], food: [9, 9] };
  check("snake can follow its tail", SN.step({ ...ring, dir: "down" }).dead, false);
  check("snake hits itself", SN.step({ ...ring, dir: "right" }).dead, true);
  check("snake full board has no food", SN.placeFood(Array.from({ length: 225 }, (_, i) => [Math.floor(i / 15), i % 15])), null);
  // Page table: steps per second
  check("snake speeds", ["slow", "normal", "fast"].map((k) => Math.round(1000 / SN.SPEEDS[k] * 10) / 10).join(","), "5,7.1,11.1");
}

// ---------------- Resignation letter maker (shared resume engine)
{
  const sandbox = { window: {}, document: { getElementById: () => null } };
  vm.createContext(sandbox);
  for (const file of ["js/resume.js", "js/tools/resignation-letter.js"]) vm.runInContext(fs.readFileSync(path.join(JS, file), "utf8"), sandbox);
  const L = sandbox.window.ToolNestCalc;
  const uk = { ...L.EXAMPLE, country: "uk" };
  // Page example: letter dated 5 October 2026, last day 2 November 2026.
  check("resignation opening", L.opening(uk),
    "Please accept this letter as formal notice of my resignation from my position as Operations Coordinator at Harbourline Logistics. My last working day will be 2 November 2026.");
  check("resignation notice days", L.noticeDays(uk), 28);
  check("resignation notice missing date", L.noticeDays({ ...uk, lastDay: "" }), null);
  check("resignation US date format", L.opening({ ...uk, country: "us" }).endsWith("November 2, 2026."), true);
  check("resignation no last day", L.opening({ ...uk, lastDay: "" }).endsWith("Harbourline Logistics."), true);
  check("resignation UK greeting, named", L.greeting(uk) + " " + L.signOff(uk), "Dear Ms Priya Shah, Yours sincerely,");
  check("resignation UK, no name", L.greeting({ ...uk, recipient: "" }) + " " + L.signOff({ ...uk, recipient: "" }), "Dear Sir or Madam, Yours faithfully,");
  check("resignation Australia", L.greeting({ country: "au" }) + " " + L.signOff({ country: "au" }), "Dear Manager, Kind regards,");
  const text = L.text(uk).split("\n");
  check("resignation text starts with name", text[0], "Sam Taylor");
  check("resignation text subject", text.includes("Resignation: Operations Coordinator"), true);
  check("resignation text ends with name", text[text.length - 1], "Sam Taylor");
  check("resignation thanks paragraph optional", L.text({ ...uk, thanks: false }).includes("Thank you for the support"), false);
  check("resignation handover paragraph optional", L.text({ ...uk, handover: true }).includes("handover smooth"), true);
  check("resignation example has no privacy warnings", L.warnings(uk).length, 0);
  check("resignation spots bank details", L.warnings({ ...uk, extra: "Please pay my final salary to sort code 12-34-56" }).length >= 1, true);
  check("resignation file name", L.fileName("Zoë O'Brien"), "Zoe-OBrien-Resignation-Letter");
  const fake = (t, f, s) => t.length * s * 0.5;
  check("resignation example fits one page", L.layout(uk, { font: "sans" }, fake).pages.length, 1);
  check("resignation UK paper A4", L.layout(uk, {}, fake).size.join("x"), "595.28x841.89");
  check("resignation US paper Letter", L.layout({ ...uk, country: "us" }, {}, fake).size.join("x"), "612x792");
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

// ---------------- Money page upgrades (2026-10-17): every number quoted in the new example tables
{
  // Hourly rate: four freelancers, two currencies
  const hr = load("hourly-rate");
  expectAll("hourly-rate designer", hr({ income: 55000, expenses: 4000, tax: 25, weeksOff: 5, hours: 40, billable: 65 }), { billableHours: 1222, hourly: 63.28 });
  expectAll("hourly-rate developer", hr({ income: 90000, expenses: 5000, tax: 30, weeksOff: 6, hours: 40, billable: 75 }), { billableHours: 1380, hourly: 96.79 });
  expectAll("hourly-rate copywriter", hr({ income: 32000, expenses: 1500, tax: 20, weeksOff: 6, hours: 35, billable: 60 }), { billableHours: 966, hourly: 42.96 });
  expectAll("hourly-rate VA", hr({ income: 24000, expenses: 1000, tax: 15, weeksOff: 6, hours: 30, billable: 80 }), { billableHours: 1104, hourly: 26.48 });
  check("hourly-rate Alex 7.5-hour day about $480", Math.round(hr({ income: 60000, expenses: 6000, tax: 25, weeksOff: 4, hours: 40, billable: 70 }).hourly * 7.5), 480);

  // US self-employment tax at $40k, $75k, $120k (single, no wages)
  const se = load("us-self-employment-tax", US_LIBS);
  expectAll("US SE $40k", se({ profit: 40000, status: "single", wages: 0 }), { netEarnings: 36940, socialSecurity: 4580.56, medicare: 1071.26, total: 5651.82, deductibleHalf: 2825.91, additionalMedicare: 0 });
  expectAll("US SE $75k", se({ profit: 75000, status: "single", wages: 0 }), { netEarnings: 69262.5, socialSecurity: 8588.55, medicare: 2008.61, total: 10597.16, deductibleHalf: 5298.58 });
  expectAll("US SE $120k", se({ profit: 120000, status: "single", wages: 0 }), { netEarnings: 110820, socialSecurity: 13741.68, medicare: 3213.78, total: 16955.46, deductibleHalf: 8477.73 });
  check("US SE 14.13% of profit", Math.round(se({ profit: 75000, status: "single", wages: 0 }).effective * 10000) / 100, 14.13);

  // UK self-employed at £25k, £50k, £100k
  const ukse = load("uk-self-employed-tax", UK_LIBS);
  for (const [p, it, ni, th, pm] of [[25000, 2486, 745.8, 21768.2, 1814.02], [50000, 7486, 2245.8, 40268.2, 3355.68], [100000, 27432, 3256.6, 69311.4, 5775.95]]) {
    const r = ukse({ profit: p, region: "ruk" });
    expectAll(`UK SE £${p}`, { ...r, perMonth: r.takeHome / 12 }, { incomeTax: it, class4: ni, takeHome: th, perMonth: pm });
  }

  // UK take-home table and the £100k trap
  const th = load("uk-take-home", UK_LIBS);
  const paye = (salary) => th({ salary, region: "ruk", pensionPct: 0, pensionType: "net", plan: "none", postgraduate: false });
  for (const [s, it, ni, take, pm] of [
    [25000, 2486, 994.4, 21519.6, 1793.3], [30000, 3486, 1394.4, 25119.6, 2093.3], [35000, 4486, 1794.4, 28719.6, 2393.3],
    [40000, 5486, 2194.4, 32319.6, 2693.3], [45000, 6486, 2594.4, 35919.6, 2993.3], [50000, 7486, 2994.4, 39519.6, 3293.3],
    [60000, 11432, 3210.6, 45357.4, 3779.78], [70000, 15432, 3410.6, 51157.4, 4263.12], [80000, 19432, 3610.6, 56957.4, 4746.45],
    [90000, 23432, 3810.6, 62757.4, 5229.78], [100000, 27432, 4010.6, 68557.4, 5713.12]]) {
    expectAll(`UK PAYE table £${s}`, paye(s), { incomeTax: it, ni, takeHome: take, monthly: pm });
  }
  check("UK PAYE £50k to £60k gain", paye(60000).takeHome - paye(50000).takeHome, 5837.8);
  check("UK PAYE £110k take-home", paye(110000).takeHome, 72357.4);
  check("UK PAYE £125,140 take-home", paye(125140).takeHome, 78110.6);
  check("UK PAYE £100k trap: extra tax", paye(110000).incomeTax - paye(100000).incomeTax, 6000);
  check("UK PAYE £100k trap: extra NI", paye(110000).ni - paye(100000).ni, 200);

  // Sole trader vs limited company: table, and the company never ahead from £20k to £200k
  const st = load("uk-sole-trader-vs-ltd", UK_LIBS);
  for (const [p, sole, ltd] of [[30000, 25468.2, 24403.45], [40000, 32868.2, 31632.7], [50000, 40268.2, 38861.95], [60000, 46111.4, 46091.2],
    [80000, 57711.4, 55764.87], [100000, 69311.4, 65209.62], [150000, 92040.4, 85109.9]]) {
    const r = st({ profit: p, region: "ruk", salary: 12570, companyCosts: 0 });
    check(`UK sole vs ltd £${p} sole`, r.sole.takeHome, sole);
    check(`UK sole vs ltd £${p} ltd`, r.ltd.takeHome, ltd);
  }
  // Page: with no running costs the company only wins between about £60,200 and £60,500, by about £15 at most;
  // with £500 of running costs it never wins from £20,000 to £200,000.
  let lowWin = Infinity, highWin = 0, bestGain = 0, aheadWithCosts = 0;
  for (let p = 20000; p <= 200000; p += 50) {
    const r = st({ profit: p, region: "ruk", salary: 12570, companyCosts: 0 });
    const gain = r.ltd.takeHome - r.sole.takeHome;
    if (gain > 0) { lowWin = Math.min(lowWin, p); highWin = Math.max(highWin, p); bestGain = Math.max(bestGain, gain); }
    const c = st({ profit: p, region: "ruk", salary: 12570, companyCosts: 500 });
    if (c.ltd.takeHome > c.sole.takeHome) aheadWithCosts++;
  }
  check("UK company wins from about £60,200", lowWin >= 60150 && lowWin <= 60250, true);
  check("UK company wins up to about £60,500", highWin >= 60450 && highWin <= 60550, true);
  check("UK company best gain about £15", Math.round(bestGain), 15);
  check("UK company never ahead with £500 costs", aheadWithCosts, 0);

  // Contractor day rate: Marcus (US)
  expectAll("day-rate Marcus US", load("day-rate")({ income: 80000, expenses: 6000, tax: 28, daysOff: 26, benchWeeks: 6, hoursPerDay: 8 }),
    { days: 204, day: 574.07, hourly: 71.76 });

  // 1099 vs W-2: Taylor
  expectAll("US 1099 Taylor", load("us-1099-vs-w2", US_LIBS)({ salary: 75000, benefits: 9000, rate: 50, hours: 35, weeks: 46 }),
    { employerTax: 5737.5, w2Value: 89737.5, hours: 1610, breakEven: 55.74, gross1099: 80500, difference: -9237.5 });

  // Canada self-employed, before provincial tax
  const ca = load("ca-self-employed-tax", CA_LIBS);
  for (const [e, cpp, fed, left] of [[40000, 4343.5, 2688.63, 32967.87], [60000, 6723.5, 5155.43, 48121.07], [90000, 9292.9, 10666.44, 70040.66]]) {
    const r = ca({ earnings: e, provincial: 0 });
    check(`CA SE $${e} CPP`, r.cpp.total, cpp);
    check(`CA SE $${e} federal`, r.federal, fed);
    check(`CA SE $${e} left`, r.takeHome, left);
  }
}

// ---------------- Thin page deepening, batch 1 (2026-10-17): numbers quoted in the new sections
{
  // Commission: tiered table, retroactive comparison, two offers
  const com = load("commission");
  const tier = { rate: 5, tiered: true, threshold: 40000, rate2: 8 };
  for (const [s, c] of [[30000, 1500], [40000, 2000], [50000, 2800], [60000, 3600], [80000, 5200]]) check(`commission tiered $${s}`, com({ sales: s, ...tier }).commission, c);
  const retro = (s) => (s > 40000 ? s * 0.08 : s * 0.05);
  for (const [s, c] of [[30000, 1500], [40000, 2000], [50000, 4000], [60000, 4800], [80000, 6400]]) check(`commission retroactive $${s}`, retro(s), c);
  check("commission offers break-even", (55000 - 45000) / (0.03 - 0.01), 500000);
  check("commission offer A at $300k", com({ sales: 300000, rate: 3, base: 45000 }).total, 54000);
  check("commission offer B at $300k", com({ sales: 300000, rate: 1, base: 55000 }).total, 58000);
  check("commission rate from payslip", 2500 / 50000 * 100, 5);

  // Sales tax: round total, rate from receipt, per-item rounding
  const st = load("sales-tax");
  expectAll("sales tax $50 total at 7%", st({ amount: 50, rate: 7, mode: "remove" }), { net: 46.73, tax: 3.27 });
  check("sales tax rate from receipt", 5.6 / 80 * 100, 7);
  check("sales tax per item", st({ amount: 0.99, rate: 8.25, mode: "add" }).tax * 3, 0.24);
  check("sales tax on total", st({ amount: 2.97, rate: 8.25, mode: "add" }).tax, 0.25);
  check("sales tax mental 8% of $45", 45 * 0.08, 3.6);

  // Savings goal tables
  const sg = load("savings-goal");
  for (const [m, plain, at4, int4] of [[12, 833.33, 818.17, 182.01], [24, 416.67, 400.92, 378.02], [36, 277.78, 261.91, 571.37], [60, 166.67, 150.83, 950.09]]) {
    check(`savings $10k ${m}m no interest`, sg({ goal: 10000, current: 0, months: m, rate: 0 }).monthly, plain);
    expectAll(`savings $10k ${m}m at 4%`, sg({ goal: 10000, current: 0, months: m, rate: 4 }), { monthly: at4, interest: int4 });
  }
  check("savings Sara 48 months", sg({ goal: 20000, current: 2000, months: 48, rate: 4 }).monthly, 339.76);
  check("savings Sara $5,000 start", sg({ goal: 20000, current: 5000, months: 36, rate: 4 }).monthly, 376.19);
  check("savings Sara 5%", sg({ goal: 20000, current: 2000, months: 36, rate: 5 }).monthly, 456.14);
  check("savings biweekly", 464.77 * 12 / 26, 214.51);
  check("savings weekly", 464.77 * 12 / 52, 107.25);

  // Overtime table and yearly figure
  const ot = load("overtime");
  for (const r of [15, 18, 20, 25, 30]) {
    check(`overtime ${r} x1.25`, r * 1.25, Math.round(r * 125) / 100);
    check(`overtime ${r} x1.5`, ot({ rate: r, regular: 0, overtime: 1, overtimeRate: 1.5, double: 0, weeks: 1 }).overtimeHourly, r * 1.5);
    check(`overtime ${r} x2`, ot({ rate: r, regular: 0, overtime: 0, overtimeRate: 1.5, double: 1, weeks: 1 }).doubleHourly, r * 2);
  }
  expectAll("overtime 48 weeks", ot({ rate: 20, regular: 40, overtime: 5, overtimeRate: 1.5, double: 0, weeks: 48 }), { yearly: 45600 });
  check("overtime extra over 48 weeks", 150 * 48, 7200);
  check("overtime UK average example", 450 / 47.5, 9.47);

  // Pay rise table and compounding
  const pr = load("pay-rise");
  for (const [p, np, inc, m, w] of [[2, 51000, 1000, 83.33, 19.23], [3, 51500, 1500, 125, 28.85], [5, 52500, 2500, 208.33, 48.08], [10, 55000, 5000, 416.67, 96.15]]) {
    expectAll(`pay rise ${p}% on $50k`, pr({ mode: "percent", current: 50000, percent: p, inflation: null }), { newPay: np, increase: inc, monthly: m, weekly: w });
  }
  check("pay rise 3% five years", 50000 * 1.03 ** 5, 57963.7);

  // Timesheet week
  const T = load("timesheet");
  const rows = [{ start: "8:30", end: "17:00", breakMin: "30" }, { start: "9:00", end: "18:15", breakMin: "45" }, { start: "9:00", end: "17:30", breakMin: "30" },
    { start: "8:00", end: "16:00", breakMin: "30" }, { start: "9:00", end: "15:00", breakMin: "" }];
  check("timesheet Jo days", rows.map((r) => T.hhmm(T.rowMinutes(r))).join(" "), "8:00 8:30 8:00 7:30 6:00");
  expectAll("timesheet Jo week", T.calculate({ rows, rate: 16, overtimeAfter: null, overtimeRate: 1.5 }), { hours: 38, pay: 608 });
  check("timesheet 7.30 vs 7.5 minutes lost", (7.5 - 7.3) * 60, 12);

  // Australia: employee vs contractor
  const ae = load("au-employee-vs-contractor", AU_LIBS);
  for (const [w, be, diff] of [[40, 70, 0], [42, 66.67, 5320], [44, 63.64, 10640], [46, 60.87, 15960], [48, 58.33, 21280]]) {
    expectAll(`AU contractor Liam ${w} weeks`, ae({ salary: 95000, benefits: 0, rate: 70, hours: 38, weeks: w }), { breakEven: be, difference: diff });
  }
  expectAll("AU contractor Mia", ae({ salary: 120000, benefits: 0, rate: 80, hours: 38, weeks: 42 }),
    { super: 14400, package: 134400, hours: 1596, breakEven: 84.21, gross: 127680, difference: -6720 });

  // Canada: employee vs contractor
  const ce = load("ca-employee-vs-contractor", CA_LIBS);
  for (const [w, be, diff] of [[42, 55.39, -621.45], [44, 52.88, 3503.55], [46, 50.58, 7628.55], [48, 48.47, 11753.55]]) {
    expectAll(`CA contractor Sanjay ${w} weeks`, ce({ salary: 75000, benefits: 8000, rate: 55, hours: 37.5, weeks: w }), { breakEven: be, difference: diff });
  }
  expectAll("CA contractor Olivia", ce({ salary: 90000, benefits: 10000, rate: 60, hours: 35, weeks: 44 }),
    { employerCpp: 4646.45, package: 104646.45, hours: 1540, breakEven: 67.95, gross: 92400, difference: -12246.45 });
  check("CA contractor Sanjay % above salary per hour", Math.round((50.58 / (75000 / 1950) - 1) * 100), 32);
  check("CA contractor Olivia % above salary per hour", Math.round((67.95 / (90000 / 1820) - 1) * 100), 37);

  // Australia: GST table and discounted invoice
  const g = load("au-gst", AU_LIBS);
  for (const [a, add, rb, rg] of [[100, 110, 90.91, 9.09], [250, 275, 227.27, 22.73], [500, 550, 454.55, 45.45], [1000, 1100, 909.09, 90.91], [2500, 2750, 2272.73, 227.27], [5000, 5500, 4545.45, 454.55]]) {
    check(`AU GST add $${a}`, g({ mode: "add", amount: a }).after, add);
    expectAll(`AU GST remove $${a}`, g({ mode: "remove", amount: a }), { before: rb, gst: rg });
  }
  expectAll("AU GST discounted invoice", g({ mode: "add", amount: 2000 * 0.9 }), { gst: 180, after: 1980 });

  // Australia: voluntary super at different incomes
  const sup = load("au-voluntary-super", AU_LIBS);
  for (const [i, saved, net, change] of [[60000, 3350, 1850, -6650], [90000, 3200, 1700, -6800], [150000, 3900, 2400, -6100]]) {
    expectAll(`AU super $${i}`, sup({ income: i, employer: i * 0.12, extra: 10000 }), { taxSaved: saved, contributionsTax: 1500, netBenefit: net, takeHomeChange: change, overCap: false });
  }
  expectAll("AU super $200k over cap", sup({ income: 200000, employer: 24000, extra: 10000 }), { concessional: 34000, overCap: true });

  // UK: working from home, mileage
  const wfh = load("uk-work-from-home", UK_LIBS);
  for (const [h, y] of [[24, 0], [40, 120], [80, 216], [120, 312]]) check(`UK WFH year at ${h} hours`, wfh.calculate({ hours: h, months: 12, bills: 0, share: 0 }).simplified, y);
  check("UK WFH £312 saves at 26%", 312 * 0.26, 81.12);
  expectAll("UK WFH Tom", wfh.calculate({ hours: 60, months: 10, bills: 4000, share: 15 }), { simplified: 180, actual: 600, best: "actual" });
  const mil = load("uk-mileage", UK_LIBS);
  for (const [m, now, before] of [[2000, 1100, 900], [5000, 2750, 2250], [10000, 5500, 4500], [15000, 6750, 5750], [20000, 8000, 7000]]) {
    check(`UK mileage ${m} 2026-27`, mil({ year: "2026-27", vehicle: "car", miles: m, taxRate: 0 }).allowance, now);
    check(`UK mileage ${m} 2025-26`, mil({ year: "2025-26", vehicle: "car", miles: m, taxRate: 0 }).allowance, before);
  }
  expectAll("UK mileage Dev motorcycle", mil({ year: "2026-27", vehicle: "motorcycle", miles: 4000, taxRate: 26 }), { allowance: 960, saving: 249.6 });

  // Canada: instalment situations
  const ci = load("ca-instalments", CA_LIBS);
  expectAll("CA instalments first big year", ci({ current: 9000, last: 1500, before: 0, quebec: false }), { required: false, lower: 0 });
  expectAll("CA instalments Quebec", ci({ current: 4000, last: 2500, before: 1000, quebec: true }), { threshold: 1800, required: true, lower: 625 });
  expectAll("CA instalments income fell", ci({ current: 6000, last: 14000, before: 12000, quebec: false }), { required: true, currentYear: 1500, priorYear: 3500, lower: 1500 });
}

// ---------------- Thin page deepening, batch 2a (2026-10-17): US and UK tax pages
{
  const th = load("us-take-home", US_LIBS);
  for (const [p, st, total, take, share] of [[40000, "single", 7426.93, 32573.07, 18.6], [60000, "single", 12037.2, 47962.8, 20.1], [100000, "single", 22364.55, 77635.45, 22.4],
    [150000, "single", 37607.62, 112392.38, 25.1], [100000, "mfj", 19464.13, 80535.87, 19.5], [150000, "mfj", 30989.8, 119010.2, 20.7]]) {
    const r = th({ profit: p, status: st, stateRate: 0 });
    expectAll(`US take-home table $${p} ${st}`, { ...r, share: Math.round(r.total / p * 1000) / 10 }, { total, takeHome: take, share });
  }
  check("US take-home set-aside example", 2000 * 0.25, 500);

  const ho = load("us-home-office", US_LIBS);
  for (const [c, reg, best] of [[8000, 1000, "simplified"], [12000, 1500, "regular"], [18000, 2250, "regular"]]) {
    expectAll(`US home office Sam $${c}`, ho({ office: 250, home: 2000, expenses: c, profit: 50000 }), { simplified: 1250, regular: reg, best });
  }
  check("US home office level point", ho({ office: 250, home: 2000, expenses: 10000, profit: 50000 }).regular, 1250);
  check("US home office Alex saving at 30%", 3200 * 0.3, 960);

  const mi = load("us-mileage", US_LIBS);
  for (const [m, even, late] of [[1000, 742.5, 760], [3000, 2227.5, 2280], [5000, 3712.5, 3800], [10000, 7425, 7600]]) {
    check(`US mileage ${m} split`, mi({ year: "2026", milesByPeriod: [m / 2, m / 2], extra: 0, taxRate: 0 }).deduction, even);
    check(`US mileage ${m} from July`, mi({ year: "2026", milesByPeriod: [0, m], extra: 0, taxRate: 0 }).deduction, late);
  }
  check("US mileage FAQ saving", mi({ year: "2026", milesByPeriod: [0, 5000], extra: 0, taxRate: 30 }).saving, 1140);

  const tb = load("us-tax-bracket", US_LIBS);
  for (const [i, st, taxable, tax, marg, eff] of [[40000, "single", 23900, 2620, 0.12, 6.55], [60000, "single", 43900, 5020, 0.12, 8.37], [100000, "single", 83900, 13170, 0.22, 13.17],
    [150000, "single", 133900, 24734, 0.24, 16.49], [60000, "mfj", 27800, 2840, 0.12, 4.73], [100000, "mfj", 67800, 7640, 0.12, 7.64], [150000, "mfj", 117800, 15340, 0.22, 10.23]]) {
    expectAll(`US brackets table $${i} ${st}`, tb({ income: i, status: st, itemized: null }), { taxable, tax, marginal: marg, effective: eff });
  }
  check("US brackets raise $75k to $80k", tb({ income: 80000, status: "single", itemized: null }).tax - tb({ income: 75000, status: "single", itemized: null }).tax, 1100);

  const poa = load("uk-payments-on-account", UK_LIBS);
  expectAll("UK POA Tom second year", poa({ lastBill: 9000, paidOnAccount: 8000, atSource: 0, nextBill: 7000 }), { eachPayment: 4500, january: 5500, july: 4500, balancingNext: -2000 });
  expectAll("UK POA Amir", poa({ lastBill: 1800, paidOnAccount: 0, atSource: 8000, nextBill: null }), { needed: false, january: 1800, july: 0 });
  expectAll("UK POA Beth", poa({ lastBill: 3000, paidOnAccount: 0, atSource: 6000, nextBill: null }), { needed: true, eachPayment: 1500, january: 4500, july: 1500 });
  check("UK POA Amir share", Math.round(8000 / 9800 * 1000) / 10, 81.6);
  check("UK POA Beth share", Math.round(6000 / 9000 * 1000) / 10, 66.7);

  const vat = load("uk-vat", ["data/tax-uk.js"]);
  for (const [a, add, inside, before] of [[100, 120, 16.67, 83.33], [500, 600, 83.33, 416.67], [1000, 1200, 166.67, 833.33], [2500, 3000, 416.67, 2083.33]]) {
    check(`UK VAT add £${a}`, vat({ mode: "add", amount: a, rate: "standard" }).after, add);
    expectAll(`UK VAT remove £${a}`, vat({ mode: "remove", amount: a, rate: "standard" }), { vat: inside, before });
  }
  check("UK VAT day rate £400", vat({ mode: "add", amount: 400, rate: "standard" }).after, 480);

  const dv = load("uk-dividend-tax", UK_LIBS);
  for (const [d, basic, higher, tax, eff, keep] of [[10000, 9500, 0, 1021.25, 10.21, 8978.75], [20000, 19500, 0, 2096.25, 10.48, 17903.75], [30000, 29500, 0, 3171.25, 10.57, 26828.75],
    [50000, 37200, 12300, 8396.25, 16.79, 41603.75], [80000, 37200, 42300, 19121.25, 23.9, 60878.75]]) {
    expectAll(`UK dividends £${d}`, dv({ other: 12570, dividends: d, region: "ruk" }), { allowanceUsed: 500, basic, higher, dividendTax: tax, effective: eff, keep });
  }

  const hol = load("uk-holiday", ["data/employment-uk.js"]);
  for (const [d, e] of [[1, 5.6], [2, 11.2], [3, 16.8], [4, 22.4], [5, 28], [6, 28]]) check(`UK holiday ${d} days table`, hol({ mode: "days", days: d }).entitlement, e);
  check("UK holiday starts 3 months in", 28 * 9 / 12, 21);
}

// ---------------- Thin page deepening, batch 2b (2026-10-17): Australia, Canada, UK redundancy, general money tools
{
  const st = load("au-sole-trader-tax", AU_LIBS);
  for (const [i, tax, med, take, eff] of [[40000, 2171.8, 800, 37028.2, 7.43], [60000, 7420, 1200, 51380, 14.37], [80000, 13520, 1600, 64880, 18.9],
    [100000, 19520, 2000, 78480, 21.52], [150000, 35570, 3000, 111430, 25.71]]) {
    const r = st({ income: i, eligible: true });
    expectAll(`AU sole trader $${i}`, { ...r, eff: Math.round(r.total / i * 10000) / 100 }, { incomeTax: tax, medicare: med, takeHome: take, eff });
  }
  expectAll("AU sole trader $40k offsets", st({ income: 40000, eligible: true }), { basic: 3270, lito: 575, smallBusinessOffset: 523.2 });
  check("AU small business offset full from about $52,400", st({ income: 52400, eligible: true }).smallBusinessOffset < 1000 && st({ income: 52500, eligible: true }).smallBusinessOffset === 1000, true);
  check("AU set-aside 19% of $10,000", 10000 * 0.19, 1900);

  const th = load("au-take-home", AU_LIBS);
  for (const [i, tax, med, take, ft, mo] of [[50000, 5270, 1000, 43730, 1681.92, 3644.17], [70000, 11520, 1400, 57080, 2195.38, 4756.67], [90000, 17520, 1800, 70680, 2718.46, 5890],
    [100000, 20520, 2000, 77480, 2980, 6456.67], [120000, 26520, 2400, 91080, 3503.08, 7590], [150000, 36570, 3000, 110430, 4247.31, 9202.5]]) {
    expectAll(`AU take-home $${i}`, th({ salary: i, includesSuper: false }), { incomeTax: tax, medicare: med, takeHome: take, fortnightly: ft, monthly: mo });
  }
  check("AU take-home LITO at $50k", th({ salary: 50000, includesSuper: false }).lito, 250);
  expectAll("AU take-home $100k package", th({ salary: 100000, includesSuper: true }), { base: 89285.71, superAmount: 10714.29, takeHome: 70194.29 });
  check("AU package difference", 77480 - th({ salary: 100000, includesSuper: true }).takeHome, 7285.71);

  const ce = load("ca-cpp-ei", ["data/tax-ca.js"]);
  for (const [i, cpp, cpp2, ei, tot, per] of [[40000, 2171.75, 0, 652, 2823.75, 108.61], [50000, 2766.75, 0, 815, 3581.75, 137.76], [60000, 3361.75, 0, 978, 4339.75, 166.91],
    [70000, 3956.75, 0, 1123.07, 5079.82, 195.38], [80000, 4230.45, 216, 1123.07, 5569.52, 214.21], [90000, 4230.45, 416, 1123.07, 5769.52, 221.9]]) {
    expectAll(`CA CPP/EI $${i}`, ce({ salary: i, periods: 26 }), { cpp, cpp2, ei, employee: tot, perPeriod: per });
  }
  check("CA employer on $60k", ce({ salary: 60000, periods: 26 }).employer, 4730.95);

  const gh = load("ca-gst-hst", CA_LIBS);
  for (const [a, h, t] of [[500, 65, 565], [1000, 130, 1130], [2500, 325, 2825], [5000, 650, 5650]]) {
    expectAll(`CA HST Ontario $${a}`, gh({ province: "ON", mode: "add", amount: a, pst: 0 }), { gst: h, after: t });
  }

  const rd = load("uk-redundancy", ["data/employment-uk.js"]);
  for (const [a, y, w, pay] of [[35, 10, 10, 6000], [45, 10, 12, 7200], [55, 15, 22, 13200], [50, 20, 24.5, 14700]]) {
    expectAll(`UK redundancy age ${a}, ${y} years`, rd({ age: a, years: y, weekly: 600 }), { weeks: w, pay });
  }

  const bh = load("billable-hours");
  for (const [u, pct, yr, rev, per] of [[16, 0.6, 1104, 82800, 45], [12, 0.7, 1288, 96600, 52.5], [8, 0.8, 1472, 110400, 60], [4, 0.9, 1656, 124200, 67.5]]) {
    expectAll(`billable unpaid ${u}`, bh({ hours: 40, weeksOff: 6, admin: u, sales: 0, learning: 0, other: 0, rate: 75 }), { pct, year: yr, revenue: rev, perHourWorked: per });
  }
  check("billable one unpaid hour costs", 46 * 75, 3450);

  const jo = load("job-offer");
  const offerA = { salary: 50000, bonus: 0, benefits: 0, hours: 37.5, days: 0, cost: 0, time: 0 };
  for (const [d, cc, v, h, hr] of [[0, 0, 60000, 2340, 25.64], [100, 1500, 58500, 2490, 23.49], [200, 3000, 57000, 2640, 21.59]]) {
    expectAll(`job offer B ${d} days`, jo({ a: offerA, b: { salary: 55000, bonus: 5000, benefits: 0, hours: 45, days: d, cost: 15, time: 1.5 } }).b, { commuteCost: cc, value: v, hours: h, hourly: hr });
  }
  expectAll("job offer B 37.5 h hybrid", jo({ a: offerA, b: { salary: 55000, bonus: 5000, benefits: 0, hours: 37.5, days: 100, cost: 15, time: 1.5 } }).b, { value: 58500, hours: 2100, hourly: 27.86 });

  const ef = load("emergency-fund");
  for (const [m, t, g, mo] of [[3, 10500, 5500, 7], [6, 21000, 16000, 20], [9, 31500, 26500, 34], [12, 42000, 37000, 47]]) {
    expectAll(`emergency fund ${m} months`, ef({ personal: 3000, business: 500, months: m, saved: 5000, save: 800 }), { target: t, gap: g, monthsToGoal: mo });
  }

  const rt = load("retainer");
  for (const [u, r, un] of [[20, 67.5, 0], [16, 84.38, 4], [12, 112.5, 8], [10, 135, 10]]) {
    expectAll(`retainer used ${u}`, rt({ rate: 75, hours: 20, discount: 10, months: 6, used: u }), { atUsage: r, unused: un });
  }

  for (const [t, m, sal] of [[25, 10, 3037.5], [25, 0, 3375], [30, 10, 2835], [20, 10, 3240]]) {
    check(`income smoothing salary ${t}/${m}`, 4500 * (1 - t / 100) * (1 - m / 100), sal);
  }

  const pf = load("payment-fee");
  for (const [a, f, n, e, g] of [[5, 0.44, 4.56, 8.9, 5.46], [50, 1.75, 48.25, 3.5, 51.8], [100, 3.2, 96.8, 3.2, 103.3], [500, 14.8, 485.2, 2.96, 515.24],
    [1000, 29.3, 970.7, 2.93, 1030.18], [5000, 145.3, 4854.7, 2.91, 5149.64]]) {
    expectAll(`payment fee $${a}`, pf({ amount: a, pct: 2.9, fixedFee: 0.3 }), { fee: f, net: n, effectiveRate: e, grossUp: g });
  }

  const pp = load("project-pricing");
  for (const [b, pr, dep, eff] of [[0, 3200, 1600, 75], [10, 3520, 1760, 83], [15, 3680, 1840, 87], [20, 3840, 1920, 91], [30, 4160, 2080, 99]]) {
    expectAll(`project pricing buffer ${b}%`, pp({ hours: 40, rate: 75, costs: 200, buffer: b, deposit: 50 }), { price: pr, deposit: dep, effective: eff });
  }

  const ro = load("roas");
  for (const [c, be, np] of [[20, 1.25, 1400], [30, 1.43, 1100], [40, 1.67, 800], [50, 2, 500], [60, 2.5, 200], [70, 3.33, -100]]) {
    expectAll(`ROAS cogs ${c}%`, ro({ adSpend: 1000, revenue: 3000, cogs: c, otherExpenses: 0, orders: 30 }), { roas: 3, breakEvenRoas: be, netProfit: np });
  }

  const ha = load("hourly-to-annual");
  for (const [r, y52, m52, y46] of [[15, 31200, 2600, 27600], [20, 41600, 3466.67, 36800], [25, 52000, 4333.33, 46000], [30, 62400, 5200, 55200], [40, 83200, 6933.33, 73600], [50, 104000, 8666.67, 92000]]) {
    expectAll(`hourly-to-annual $${r} 52 weeks`, ha({ rate: r, hours: 40, days: 5, weeks: 52 }), { annual: y52, monthly: m52 });
    check(`hourly-to-annual $${r} 46 weeks`, ha({ rate: r, hours: 40, days: 5, weeks: 46 }).annual, y46);
  }

  const rs = load("retirement-savings");
  for (const [age, m, pot, paid, inc] of [[25, 500, 811662.18, 250000, 32466.49], [30, 500, 609391.64, 220000, 24375.67], [35, 500, 450907.38, 190000, 18036.3],
    [30, 250, 332275.9, 115000, 13291.04], [30, 1000, 1163623.13, 430000, 46544.93]]) {
    expectAll(`retirement start ${age}, $${m}`, rs({ age, retireAge: 65, current: 10000, monthly: m, returnPct: 5, withdrawPct: 4 }), { pot, contributed: paid, yearlyIncome: inc });
  }

  const cl = load("customer-lifetime-value");
  for (const [o, y, v, r, pb] of [[4, 3, 360, 3, 12], [5, 3, 450, 3.75, 9.6], [4, 4, 480, 4, 12], [5, 4, 600, 5, 9.6]]) {
    expectAll(`CLV ${o} orders ${y} years`, cl({ order: 50, orders: o, margin: 60, years: y, cac: 120 }), { clv: v, ratio: r, payback: pb });
  }

  const B = load("business-days", ["data/holidays.js"]);
  const last = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const eng = [21, 20, 22, 20, 19, 22, 23, 20, 22, 22, 21, 21];
  const us = [20, 19, 22, 22, 20, 21, 22, 21, 21, 21, 19, 22];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    check(`working days 2026-${mm} England`, B.countBetween(`2026-${mm}-01`, `2026-${mm}-${last[m - 1]}`, "england-and-wales", true).days, eng[m - 1]);
    check(`working days 2026-${mm} US`, B.countBetween(`2026-${mm}-01`, `2026-${mm}-${last[m - 1]}`, "us", true).days, us[m - 1]);
  }
  check("working days 2026 England", B.countBetween("2026-01-01", "2026-12-31", "england-and-wales", true).days, 253);
  check("working days 2026 US", B.countBetween("2026-01-01", "2026-12-31", "us", true).days, 250);
  check("weekdays 2026", B.countBetween("2026-01-01", "2026-12-31", "none", true).days, 261);
}

// ---------------- Off-topic page deepening, batch 3a (2026-10-17)
{
  const pc = load("percentage");
  check("percent tip 18% of 45", pc({ mode: "of", a: 18, b: 45 }).result, 8.1);
  check("percent 25% off 80", pc({ mode: "adjust", a: 25, b: 80 }).down, 60);
  check("percent 42 of 50", pc({ mode: "what", a: 42, b: 50 }).result, 84);
  check("percent rent change", pc({ mode: "change", a: 1200, b: 1290 }).result, 7.5);
  check("percent late fee", pc({ mode: "adjust", a: 3, b: 2500 }).up, 2575);
  check("percent original after 20% off", 64 / 0.8, 80);
  check("percent original after 5% rise", 2100 / 1.05, 2000);

  check("unit price multi-buy per item", 5 / 3, 1.67);
  check("unit price single costs more", Math.round((1.89 / (5 / 3) - 1) * 100), 13);

  check("random odds 3 of 50", 3 / 50 * 100, 6);
  check("random dice face", 100 / 6, 16.67);

  for (const [n, len] of [[100, 136], [1000, 1336], [10000, 13336], [1048576, 1398104]]) {
    check(`base64 length for ${n} bytes`, load("base64").encode("a".repeat(n)).length, len);
  }

  const T = (t) => new Date(t * 1000).toISOString().slice(0, 19);
  check("timestamp 1e9", T(1e9), "2001-09-09T01:46:40");
  check("timestamp 1.7e9", T(1.7e9), "2023-11-14T22:13:20");
  check("timestamp 2e9", T(2e9), "2033-05-18T03:33:20");
  check("timestamp 2038", T(2147483647), "2038-01-19T03:14:07");

  check("regex digits only", /^\d+$/.test("12345") && !/^\d+$/.test("12a45"), true);
  check("regex doubled word", (/\b(\w+)\s+\1\b/i.exec("the the cat") || [])[0], "the the");
  check("regex trim spaces", "  hi  ".replace(/^\s+|\s+$/g, ""), "hi");
  check("regex thousands", (/\b\d{1,3}(,\d{3})*(\.\d+)?\b/.exec("total 1,234.56 due") || [])[0], "1,234.56");

  for (const [y2, need] of [[50, 65], [55, 62.5], [60, 60], [65, 57.5]]) check(`degree 2:1 after ${y2}`, (60 * 3 - y2) / 2, need);
}

// ---------------- Freelance tax set-aside calculator (all four countries)
{
  const ALL = ["data/tax-us.js", "js/us-tax.js", "data/tax-uk.js", "js/uk-tax.js", "data/tax-ca.js", "js/ca-tax.js", "data/tax-au.js", "js/au-tax.js"];
  const sa = load("tax-set-aside", ALL);
  // Page examples: each matches the country's own calculator.
  expectAll("set-aside US $60k single", sa({ country: "us", profit: 60000, payment: 2000, status: "single", stateRate: 0 }), { tax: 12037.2, fromPayment: 401.24 });
  check("set-aside US rate", Math.round(sa({ country: "us", profit: 60000, payment: 0, status: "single", stateRate: 0 }).rate * 1000) / 10, 20.1);
  expectAll("set-aside UK £40k", sa({ country: "uk", profit: 40000, payment: 2000, region: "ruk" }), { tax: 7131.8, fromPayment: 356.59 });
  check("set-aside UK parts", load("uk-self-employed-tax", UK_LIBS)({ profit: 40000, region: "ruk" }).incomeTax, 5486);
  check("set-aside UK class 4", load("uk-self-employed-tax", UK_LIBS)({ profit: 40000, region: "ruk" }).class4, 1645.8);
  expectAll("set-aside CA $60k 5%", sa({ country: "ca", profit: 60000, payment: 2000, provincial: 5 }), { tax: 14682.59, fromPayment: 489.42 });
  expectAll("set-aside AU $80k", sa({ country: "au", profit: 80000, payment: 2000, eligible: true }), { tax: 15120, fromPayment: 378, takeHome: 64880 });
  check("set-aside AU no offset costs $1,000 more", sa({ country: "au", profit: 80000, payment: 0, eligible: false }).tax, 16120);
  check("set-aside US with 5% state", sa({ country: "us", profit: 80000, payment: 0, status: "single", stateRate: 5 }).tax, 20647.47);
  expectAll("set-aside zero profit", sa({ country: "uk", profit: 0, payment: 1000, region: "ruk" }), { tax: 0, rate: 0, fromPayment: 0 });
  check("set-aside keep + aside = payment", Math.round((sa({ country: "ca", profit: 60000, payment: 2000, provincial: 5 }).keepFromPayment + 489.42) * 100) / 100, 2000);
}

// ---------------- Guides: numbers quoted in the two guides
{
  const poa = load("uk-payments-on-account", UK_LIBS);
  expectAll("guide Priya first January", poa({ lastBill: 7131.8, paidOnAccount: 0, atSource: 0, nextBill: null }), { eachPayment: 3565.9, january: 10697.7 });
  const hr = load("hourly-rate")({ income: 60000, expenses: 6000, tax: 25, weeksOff: 4, hours: 40, billable: 70 });
  check("guide Alex 7.5-hour day", hr.hourly * 7.5, 479.91);
  check("guide Alex 8-hour day", hr.day, 511.9);
  check("guide one unpaid hour a day for 200 days", Math.round(hr.hourly * 200 / 100) * 100, 12800);
  expectAll("guide Priya day rate", load("day-rate")({ income: 60000, expenses: 5000, tax: 30, daysOff: 33, benchWeeks: 4, hoursPerDay: 7.5 }), { days: 207, day: 438.23, hourly: 58.43 });
}

// ---------------- Off-topic page deepening, batch 3b (2026-10-17)
{
  check("snake max food", 15 * 15 - 3, 222);
  for (const [n, c] of [[4, 6561], [6, 531441], [8, 43046721]]) check(`sequence memory 9^${n}`, 9 ** n, c);
  const MM = load("memory-match");
  for (const [m, sc] of [[8, 100], [10, 80], [12, 67], [16, 50], [20, 40]]) check(`memory match 8 pairs in ${m}`, Math.round(8 / m * 100), sc);
  const gpa = load("gpa-calculator");
  const course = (g) => ({ courses: [{ credits: 3, grade: "A" }, { credits: 4, grade: g }, { credits: 4, grade: "A-" }, { credits: 3, grade: "A" }] });
  for (const [g, v] of [["A", 3.91], ["A-", 3.83], ["B+", 3.71], ["B", 3.63], ["C", 3.34]]) check(`GPA with Calculus ${g}`, gpa(course(g)).gpa, v);
  const wg = load("weighted-grade")({ rows: [{ weight: 20, score: 92 }, { weight: 15, score: 85 }, { weight: 25, score: 78 }, { weight: 15, score: 88 }, { weight: 25, score: "" }] });
  for (const [t, need] of [[90, 104.6], [85, 84.6], [80, 64.6], [70, 24.6]]) check(`weighted grade final for ${t}%`, (t - wg.earned) / 0.25, need);
}

// ---------------- Late payment interest table (2026-10-17)
{
  const lp = load("late-payment", ["data/rates-uk.js"]);
  const add = (d, n) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  for (const [a, n, i, e, c] of [[1000, 30, 9.66, 70, 79.66], [1000, 60, 19.32, 70, 89.32], [1000, 90, 28.97, 70, 98.97],
    [5000, 30, 48.29, 70, 118.29], [5000, 60, 96.58, 70, 166.58], [5000, 90, 144.86, 70, 214.86],
    [20000, 30, 193.15, 100, 293.15], [20000, 60, 386.3, 100, 486.3], [20000, 90, 579.45, 100, 679.45]]) {
    expectAll(`late payment £${a} ${n} days`, lp.calculate({ mode: "uk", amount: a, dueDate: "2026-08-01", paidDate: add("2026-08-01", n), baseRate: 3.75, includeComp: true }), { days: n, interest: i, extra: e, claim: c });
  }
  // The data file gives 3.75% for both 2026 reference dates (31 Dec 2025 and 30 Jun 2026).
  const sb = { window: {} }; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(JS, "data/rates-uk.js"), "utf8"), sb);
  const R = sb.window.ToolNestRatesUK;
  const rateOn = (d) => R.bankRate.find((b) => b.from <= d).rate;
  check("Bank Rate on 31 Dec 2025", rateOn("2025-12-31"), 3.75);
  check("Bank Rate on 30 Jun 2026", rateOn("2026-06-30"), 3.75);
}

hashTests().catch((err) => {
  failed++;
  console.log(`FAIL  hash tests: ${err.message}`);
}).then(imageSearchTests).catch((err) => {
  failed++;
  console.log(`FAIL  image search tests: ${err.message}`);
}).then(resumePdfTests).catch((err) => {
  failed++;
  console.log(`FAIL  resume PDF tests: ${err.message}`);
}).then(() => require("./pdf-tests.js")(check, expectAll)).catch((err) => {
  failed++;
  console.log("FAIL  PDF tool tests stopped:", err);
}).then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
