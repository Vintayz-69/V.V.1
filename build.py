"""
ToolNest page builder.

  1. Edit page content in src/pages/<name>.html (or the shared layout below).
  2. Run:  python build.py
  3. Deploy the public/ folder (Cloudflare Pages "build output directory" = public).

The output is plain HTML — nothing runs on a server. Never edit public/**/index.html by hand:
the next build overwrites it.

Placeholders you can use inside src/pages files:
  {{root}}            relative path to the site root, e.g. "../../"
  {{icon:NAME}}       inline SVG icon (see ICONS)
  {{flag:us}} / {{flag:uk}}
  {{cards:GROUP}}     cards for live tools in a group (pricing, income)
  {{soon:GROUP}}      "coming soon" cards (planning, tax)
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src", "pages")
OUT = os.path.join(ROOT, "public")

DOMAIN = "https://toolnest.com"  # Change once the real domain is bought.
BRAND = "ToolNest"
TODAY = "2026-09-28"

# Site verification codes (paste only the code, not the whole tag). Leave "" until you have one.
#   Google Search Console → Add property → "URL prefix" → HTML tag → copy the content="..." value.
#   (Easier: choose the "Domain" property and verify with a DNS record in Cloudflare; then leave this empty.)
#   Bing Webmaster Tools → Add site → HTML meta tag → copy the content="..." value.
#   (Or import your site from Google Search Console; then leave this empty.)
GOOGLE_SITE_VERIFICATION = ""
BING_SITE_VERIFICATION = ""


def human_date(iso):
    months = ["January", "February", "March", "April", "May", "June", "July",
              "August", "September", "October", "November", "December"]
    y, m, d = iso.split("-")
    return f"{int(d)} {months[int(m) - 1]} {y}"


# ---------------------------------------------------------------- Tools

TOOLS = {
    "hourly-rate": dict(
        path="freelance/freelance-hourly-rate-calculator/",
        name="Freelance Hourly Rate Calculator",
        card="Freelance hourly rate calculator",
        short="Find the hourly rate you need to hit your take-home income goal after tax, expenses and time off.",
        icon="clock", group="pricing",
    ),
    "day-rate": dict(
        path="freelance/contractor-day-rate-calculator/",
        name="Contractor Day Rate Calculator",
        card="Contractor day rate calculator",
        short="Work out the day rate you need, allowing for holidays and gaps between contracts.",
        icon="calendar", group="pricing",
    ),
    "project-pricing": dict(
        path="freelance/project-pricing-calculator/",
        name="Project Pricing Calculator",
        card="Project pricing calculator",
        short="Turn your hours, costs and a safety buffer into a fixed project quote and deposit.",
        icon="briefcase", group="pricing",
    ),
    "hourly-to-annual": dict(
        path="freelance/hourly-to-annual-income-calculator/",
        name="Hourly to Annual Income Calculator",
        card="Hourly to annual income calculator",
        short="See what an hourly rate adds up to per day, week, month and year.",
        icon="trending", group="income",
    ),
    "billable-hours": dict(
        path="freelance/billable-hours-calculator/",
        name="Billable Hours Calculator",
        card="Billable hours calculator",
        short="Work out how many hours you can realistically bill once admin and sales are counted.",
        icon="pie", group="income",
    ),
    "late-payment": dict(
        path="freelance/late-payment-interest-calculator/",
        name="Late Payment Interest Calculator",
        card="Late payment interest calculator",
        short="Calculate interest and fixed compensation on an overdue invoice, including UK statutory interest.",
        icon="receipt", group="income",
    ),
    "emergency-fund": dict(
        path="freelance/emergency-fund-calculator/",
        name="Emergency Fund Calculator for Freelancers",
        card="Emergency fund calculator",
        short="Work out how much cash to keep for quiet months, and how long it will take to save.",
        icon="shield", group="planning",
    ),
    "retirement-savings": dict(
        path="freelance/retirement-savings-calculator/",
        name="Retirement Savings Calculator",
        card="Retirement savings calculator",
        short="See what your pension or retirement savings could grow to, and the income they might give you.",
        icon="sunrise", group="planning",
    ),
    "income-smoothing": dict(
        path="freelance/income-smoothing-calculator/",
        name="Income Smoothing Calculator",
        card="Income smoothing calculator",
        short="Turn irregular freelance income into a steady monthly salary with a safety buffer.",
        icon="wave", group="planning",
    ),
    "us-self-employment-tax": dict(
        path="us/self-employment-tax-calculator/",
        name="Self-Employment Tax Calculator (2026)",
        card="Self-employment tax calculator",
        short="Work out 2026 Social Security and Medicare tax on your freelance profit, and the half you can deduct.",
        icon="receipt", group="us-tax", parent="us",
    ),
    "us-quarterly-tax": dict(
        path="us/quarterly-estimated-tax-calculator/",
        name="Quarterly Estimated Tax Calculator (2026)",
        card="Quarterly estimated tax calculator",
        short="See what to pay the IRS each quarter in 2026, including the safe harbor that avoids penalties.",
        icon="calendar", group="us-tax", parent="us",
    ),
    "us-1099-vs-w2": dict(
        path="us/1099-vs-w2-calculator/",
        name="1099 vs W-2 Calculator",
        card="1099 vs W-2 calculator",
        short="Find the 1099 hourly rate that matches a W-2 salary and benefits package.",
        icon="briefcase", group="us-tax", parent="us",
    ),
    "us-take-home": dict(
        path="us/freelancer-take-home-pay-calculator/",
        name="Freelancer Take-Home Pay Calculator (2026)",
        card="Freelancer take-home pay calculator",
        short="See what you keep after 2026 federal income tax, self-employment tax and state tax.",
        icon="trending", group="us-tax", parent="us",
    ),
    "us-mileage": dict(
        path="us/business-mileage-deduction-calculator/",
        name="Business Mileage Deduction Calculator (2026)",
        card="Business mileage deduction calculator",
        short="Work out your deduction with the 2026 IRS rates, including the July 1 rate change.",
        icon="clock", group="us-tax", parent="us",
    ),
    "us-home-office": dict(
        path="us/home-office-deduction-calculator/",
        name="Home Office Deduction Calculator",
        card="Home office deduction calculator",
        short="Compare the simplified and regular home office methods and see which gives more.",
        icon="shield", group="us-tax", parent="us",
    ),
    "uk-self-employed-tax": dict(
        path="uk/self-employed-tax-calculator/",
        name="Self-Employed Tax and NI Calculator (2026/27)",
        card="Self-employed tax and NI calculator",
        short="Work out Income Tax and Class 4 National Insurance on your 2026 to 2027 profits, including Scotland.",
        icon="receipt", group="uk-tax", parent="uk",
    ),
    "uk-payments-on-account": dict(
        path="uk/payments-on-account-calculator/",
        name="Payments on Account Calculator",
        card="Payments on account calculator",
        short="See what Self Assessment payments are due in January and July, and plan for the first-year shock.",
        icon="calendar", group="uk-tax", parent="uk",
    ),
    "uk-sole-trader-vs-ltd": dict(
        path="uk/sole-trader-vs-limited-company-calculator/",
        name="Sole Trader vs Limited Company Calculator (2026/27)",
        card="Sole trader vs limited company calculator",
        short="Compare take-home pay as a sole trader and as a company director, with 2026 to 2027 dividend rates.",
        icon="briefcase", group="uk-tax", parent="uk",
    ),
    "uk-mileage": dict(
        path="uk/business-mileage-allowance-calculator/",
        name="Business Mileage Allowance Calculator (55p rate)",
        card="Business mileage allowance calculator",
        short="Claim mileage at HMRC's rates, including the new 55p car rate from April 2026.",
        icon="clock", group="uk-tax", parent="uk",
    ),
    "uk-work-from-home": dict(
        path="uk/working-from-home-expenses-calculator/",
        name="Working From Home Expenses Calculator",
        card="Working from home expenses calculator",
        short="Compare HMRC's flat rate with a share of your actual bills and claim the higher.",
        icon="shield", group="uk-tax", parent="uk",
    ),
    "ca-self-employed-tax": dict(
        path="canada/self-employed-tax-calculator/",
        name="Self-Employed Tax Calculator Canada (2026)",
        card="Self-employed tax calculator",
        short="Work out 2026 federal tax and both halves of CPP on your self-employment income.",
        icon="receipt", group="ca-tax", parent="canada",
    ),
    "ca-instalments": dict(
        path="canada/tax-instalments-calculator/",
        name="Tax Instalments Calculator (Canada 2026)",
        card="Tax instalments calculator",
        short="Check if you need quarterly instalments in 2026 and compare the current-year and prior-year options.",
        icon="calendar", group="ca-tax", parent="canada",
    ),
    "ca-employee-vs-contractor": dict(
        path="canada/employee-vs-contractor-calculator/",
        name="Employee vs Contractor Calculator (Canada)",
        card="Employee vs contractor calculator",
        short="Find the contract rate that matches a salaried job once benefits and employer CPP are counted.",
        icon="briefcase", group="ca-tax", parent="canada",
    ),
    "ca-gst-hst": dict(
        path="canada/gst-hst-calculator/",
        name="GST/HST Calculator",
        card="GST/HST calculator",
        short="Add or remove GST, HST and provincial sales tax for any province or territory.",
        icon="formula", group="ca-tax", parent="canada",
    ),
    "au-sole-trader-tax": dict(
        path="australia/sole-trader-tax-calculator/",
        name="Sole Trader Tax Calculator (2026–27)",
        card="Sole trader tax calculator",
        short="Work out 2026–27 tax, Medicare levy and offsets on your sole trader income.",
        icon="receipt", group="au-tax", parent="australia",
    ),
    "au-gst": dict(
        path="australia/gst-calculator/",
        name="GST Calculator Australia",
        card="GST calculator",
        short="Add 10% GST to a price or work out the GST inside a total.",
        icon="formula", group="au-tax", parent="australia",
    ),
    "au-employee-vs-contractor": dict(
        path="australia/employee-vs-contractor-calculator/",
        name="Employee vs Contractor Calculator (Australia)",
        card="Employee vs contractor calculator",
        short="Find the contract rate that matches a salary plus 12% super and paid leave.",
        icon="briefcase", group="au-tax", parent="australia",
    ),
    "au-voluntary-super": dict(
        path="australia/voluntary-super-contribution-calculator/",
        name="Voluntary Super Contribution Calculator (2026–27)",
        card="Voluntary super contribution calculator",
        short="See the tax you save by adding to super, and check the new $32,500 cap.",
        icon="sunrise", group="au-tax", parent="australia",
    ),
}

# Sections a tool can live in: key -> (breadcrumb name, path, header nav key).
PARENTS = {
    "freelance": ("Freelancer Tools", "freelance/", "tools"),
    "us": ("United States", "us/", "us"),
    "uk": ("United Kingdom", "uk/", "uk"),
    "canada": ("Canada", "canada/", "tools"),
    "australia": ("Australia", "australia/", "tools"),
}

SOON = {
}

# ---------------------------------------------------------------- Pages

TOOL_CHIPS = ["{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]
CURRENCY_CHIP = "{{icon:globe}} USD · GBP · CAD · AUD"

PAGES = [
    dict(path="", src="home.html", kind="home", nav="home",
         title="ToolNest: Free Money Calculators for Freelancers",
         description="Free calculators for freelancers in the US, UK, Canada and Australia. Price your work, plan your income and chase late payments."),
    dict(path="freelance/", src="freelance.html", kind="section", nav="tools",
         title="Freelancer Money Tools and Calculators | ToolNest",
         description="Free calculators for freelancers: hourly rate, day rate, project pricing, billable hours and late payment interest.",
         h1="Freelancer Money Tools",
         intro="Free calculators to help freelancers and self-employed people price their work, plan their income and get paid on time.",
         chips=TOOL_CHIPS + [CURRENCY_CHIP]),

    dict(path="us/", src="us.html", kind="section", nav="us",
         title="US Freelancer Calculators for 1099 Workers | ToolNest",
         description="Free 2026 tax calculators for US freelancers and 1099 contractors: self-employment tax, quarterly estimates, take-home pay and more.",
         h1="Freelancer Calculators for the United States",
         intro="Free tools for 1099 contractors and self-employed people in the US, plus what's different about freelancing in America.",
         chips=["{{flag:us}} Built for the US", "{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),
    dict(path="uk/", src="uk.html", kind="section", nav="uk",
         title="UK Self-Employed & Contractor Calculators | ToolNest",
         description="Free 2026/27 calculators for UK sole traders and contractors: self-employed tax and NI, payments on account, sole trader vs Ltd and more.",
         h1="Calculators for the Self-Employed in the UK",
         intro="Free tools for sole traders, freelancers and contractors in the UK, plus what's different about working for yourself here.",
         chips=["{{flag:uk}} Built for the UK", "{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),

    dict(tool="hourly-rate", src="hourly-rate.html", script="hourly-rate.js",
         title="Freelance Hourly Rate Calculator | ToolNest",
         description="Work out the hourly rate you need to charge as a freelancer, after tax, expenses, time off and unpaid hours. Free, in USD, GBP, CAD or AUD.",
         intro="Find the hourly rate you need to charge to reach your take-home income goal, after tax, business expenses, time off and the hours clients don't pay for.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["day-rate", "project-pricing", "billable-hours"]),
    dict(tool="day-rate", src="day-rate.html", script="day-rate.js",
         title="Contractor Day Rate Calculator | ToolNest",
         description="Work out the day rate you need as a contractor or freelancer, allowing for tax, expenses, holidays and gaps between contracts.",
         intro="Work out the day rate you need to charge, allowing for tax, expenses, holidays, public holidays and the gaps between contracts.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-rate", "project-pricing", "hourly-to-annual"]),
    dict(tool="project-pricing", src="project-pricing.html", script="project-pricing.js",
         title="Project Pricing Calculator for Freelancers | ToolNest",
         description="Turn estimated hours, your rate, costs and a risk buffer into a fixed project price and deposit. See what overruns do to your real hourly rate.",
         intro="Turn your estimated hours, hourly rate and project costs into a fixed-price quote, with a safety buffer and deposit worked out for you.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-rate", "day-rate", "late-payment"]),
    dict(tool="hourly-to-annual", src="hourly-to-annual.html", script="hourly-to-annual.js",
         title="Hourly to Annual Income Calculator | ToolNest",
         description="Convert an hourly rate into daily, weekly, monthly and yearly income. Set your own hours and weeks worked. Free, in USD, GBP, CAD or AUD.",
         intro="See what an hourly rate adds up to per day, week, month and year, based on the hours and weeks you actually work.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-rate", "billable-hours", "day-rate"]),
    dict(tool="billable-hours", src="billable-hours.html", script="billable-hours.js",
         title="Billable Hours Calculator for Freelancers | ToolNest",
         description="Work out how many hours you can really bill each week and year once admin, sales and time off are counted, and what that means for income.",
         intro="Work out how many hours you can really bill each week and year once admin, sales, learning and time off are taken out.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-rate", "hourly-to-annual", "project-pricing"]),
    dict(tool="emergency-fund", src="emergency-fund.html", script="emergency-fund.js",
         title="Emergency Fund Calculator for Freelancers | ToolNest",
         description="Work out how big your emergency fund should be as a freelancer, how many months your savings cover and how long it will take to save the rest.",
         intro="Work out how much cash to keep for quiet months, how long your savings would last today, and how long it will take to reach your goal.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["income-smoothing", "retirement-savings", "hourly-rate"]),
    dict(tool="retirement-savings", src="retirement-savings.html", script="retirement-savings.js",
         title="Retirement Savings Calculator for the Self-Employed | ToolNest",
         description="See what your retirement savings could grow to with monthly contributions, and the income they might give you. For freelancers in the US, UK, CA and AU.",
         intro="See what your retirement savings could grow to by the time you stop working, and roughly what income they could give you.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["emergency-fund", "income-smoothing", "hourly-rate"]),
    dict(tool="income-smoothing", src="income-smoothing.html", script="income-smoothing.js",
         title="Income Smoothing Calculator for Freelancers | ToolNest",
         description="Turn irregular freelance income into a steady monthly salary. See the buffer you need and how your months would have played out.",
         intro="Turn up-and-down freelance income into a steady monthly salary, and see how big a buffer you need to make it work.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["emergency-fund", "billable-hours", "hourly-rate"]),
    dict(tool="us-self-employment-tax", src="us-self-employment-tax.html", script="us-self-employment-tax.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Self-Employment Tax Calculator 2026 | ToolNest",
         description="Calculate 2026 self-employment tax on your 1099 or Schedule C profit: Social Security, Medicare, Additional Medicare and the deductible half.",
         intro="Work out the Social Security and Medicare tax you owe on your 2026 freelance profit, and how much of it you can deduct.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-take-home", "us-quarterly-tax", "us-1099-vs-w2"]),
    dict(tool="us-quarterly-tax", src="us-quarterly-tax.html", script="us-quarterly-tax.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Quarterly Estimated Tax Calculator 2026 | ToolNest",
         description="Work out your 2026 quarterly estimated tax payments for self-employed income, with IRS due dates and the safe harbor that avoids penalties.",
         intro="See how much to pay the IRS each quarter for 2026, the safe harbor amount that avoids an underpayment penalty, and when each payment is due.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-take-home", "us-self-employment-tax", "income-smoothing"]),
    dict(tool="us-1099-vs-w2", src="us-1099-vs-w2.html", script="us-1099-vs-w2.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="1099 vs W-2 Calculator: Contractor vs Employee | ToolNest",
         description="Compare a 1099 contractor rate with a W-2 salary and benefits. Find the break-even hourly rate, including employer payroll taxes.",
         intro="Find the 1099 hourly rate that matches a W-2 job once benefits, employer payroll tax and unpaid time off are counted.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-take-home", "hourly-rate", "us-self-employment-tax"]),
    dict(tool="us-take-home", src="us-take-home.html", script="us-take-home.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Freelancer Take-Home Pay Calculator 2026 | ToolNest",
         description="See your 2026 take-home pay as a self-employed freelancer after federal income tax, self-employment tax, the QBI deduction and state tax.",
         intro="Estimate what you keep from your 2026 freelance profit after federal income tax, self-employment tax and state tax.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-quarterly-tax", "us-self-employment-tax", "hourly-rate"]),
    dict(tool="us-mileage", src="us-mileage.html", script="us-mileage.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Business Mileage Deduction Calculator 2026 | ToolNest",
         description="Calculate your 2026 business mileage deduction with the IRS rates: 72.5 cents to June 30 and 76 cents from July 1. Includes parking and tolls.",
         intro="Work out your business mileage deduction using the official IRS rates, including the rate change on July 1, 2026.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-home-office", "us-take-home", "us-self-employment-tax"]),
    dict(tool="us-home-office", src="us-home-office.html", script="us-home-office.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Home Office Deduction Calculator (IRS 2026) | ToolNest",
         description="Compare the IRS simplified home office deduction ($5 per sq ft) with the regular method, and see which gives self-employed people more.",
         intro="Compare the simplified and regular home office deduction methods and see which gives you the bigger deduction.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-mileage", "us-take-home", "us-quarterly-tax"]),

    dict(tool="uk-self-employed-tax", src="uk-self-employed-tax.html", script="uk-self-employed-tax.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Self-Employed Tax Calculator UK 2026/27 | ToolNest",
         description="Calculate Income Tax and Class 4 National Insurance on your self-employed profits for 2026 to 2027. Includes Scottish rates and take-home pay.",
         intro="Work out the Income Tax and National Insurance you'll pay on your self-employed profits for 2026 to 2027, and what you'll take home.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-payments-on-account", "uk-sole-trader-vs-ltd", "uk-mileage"]),
    dict(tool="uk-payments-on-account", src="uk-payments-on-account.html", script="uk-payments-on-account.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Payments on Account Calculator (Self Assessment) | ToolNest",
         description="Work out your Self Assessment payments on account for January and July 2027, the balancing payment, and whether you need to pay them at all.",
         intro="See how much Self Assessment tax is due on 31 January and 31 July 2027, and whether you need to make payments on account at all.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-self-employed-tax", "income-smoothing", "emergency-fund"]),
    dict(tool="uk-sole-trader-vs-ltd", src="uk-sole-trader-vs-ltd.html", script="uk-sole-trader-vs-ltd.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Sole Trader vs Limited Company Calculator 2026/27 | ToolNest",
         description="Compare take-home pay as a sole trader and a limited company director for 2026 to 2027, with the new dividend tax rates and 15% employer NI.",
         intro="Compare your take-home pay as a sole trader and as a limited company director for 2026 to 2027, using the latest dividend and NI rates.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-self-employed-tax", "day-rate", "uk-payments-on-account"]),
    dict(tool="uk-mileage", src="uk-mileage.html", script="uk-mileage.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Business Mileage Allowance Calculator UK (55p) | ToolNest",
         description="Calculate your business mileage claim with HMRC rates: 55p a mile for cars and vans from April 2026 (45p before), 25p after 10,000 miles.",
         intro="Work out your business mileage claim using HMRC's rates, including the rise to 55p a mile for cars and vans from 6 April 2026.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-work-from-home", "uk-self-employed-tax", "uk-sole-trader-vs-ltd"]),
    dict(tool="uk-work-from-home", src="uk-work-from-home.html", script="uk-work-from-home.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Working From Home Expenses Calculator (UK) | ToolNest",
         description="Compare HMRC's simplified flat rate for working from home (£10, £18 or £26 a month) with a share of your actual bills, and claim the higher.",
         intro="Compare HMRC's flat rate for working from home with a share of your actual household bills, and see which lets you claim more.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-mileage", "uk-self-employed-tax", "billable-hours"]),

    dict(path="canada/", src="canada.html", kind="section", nav="tools",
         title="Self-Employed Tax Calculators for Canada | ToolNest",
         description="Free 2026 calculators for self-employed Canadians: federal tax and CPP, tax instalments, employee vs contractor and GST/HST.",
         h1="Calculators for the Self-Employed in Canada",
         intro="Free tools for freelancers and sole proprietors in Canada, built on official 2026 CRA figures.",
         chips=["{{icon:globe}} Built for Canada", "{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),
    dict(path="australia/", src="australia.html", kind="section", nav="tools",
         title="Sole Trader Tax Calculators for Australia | ToolNest",
         description="Free 2026–27 calculators for Australian sole traders: income tax and Medicare levy, GST, employee vs contractor and voluntary super.",
         h1="Calculators for Sole Traders in Australia",
         intro="Free tools for freelancers and sole traders in Australia, built on 2026–27 ATO figures.",
         chips=["{{icon:globe}} Built for Australia", "{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),

    dict(tool="ca-self-employed-tax", src="ca-self-employed-tax.html", script="ca-self-employed-tax.js", libs=["data/tax-ca.js", "js/ca-tax.js"],
         title="Self-Employed Tax Calculator Canada 2026 | ToolNest",
         description="Estimate 2026 federal income tax and CPP (including CPP2) on self-employment income in Canada, with your own provincial tax estimate.",
         intro="Work out federal income tax and both halves of CPP on your 2026 self-employment income, and estimate what you'll take home.",
         chips=["{{icon:globe}} Canada, tax year 2026"] + TOOL_CHIPS,
         related=["ca-instalments", "ca-gst-hst", "ca-employee-vs-contractor"]),
    dict(tool="ca-instalments", src="ca-instalments.html", script="ca-instalments.js", libs=["data/tax-ca.js", "js/ca-tax.js"],
         title="Tax Instalments Calculator Canada 2026 | ToolNest",
         description="Find out if you need to pay CRA tax instalments in 2026, and compare current-year and prior-year options with the four due dates.",
         intro="Check whether you need to pay tax instalments to the CRA for 2026, and how much to pay each quarter.",
         chips=["{{icon:globe}} Canada, tax year 2026"] + TOOL_CHIPS,
         related=["ca-self-employed-tax", "income-smoothing", "emergency-fund"]),
    dict(tool="ca-employee-vs-contractor", src="ca-employee-vs-contractor.html", script="ca-employee-vs-contractor.js", libs=["data/tax-ca.js", "js/ca-tax.js"],
         title="Employee vs Contractor Calculator Canada | ToolNest",
         description="Compare a contract rate with a salaried job in Canada. Find the break-even hourly rate including benefits and employer CPP.",
         intro="Find the contract hourly rate that matches a salaried job in Canada, once benefits and employer CPP are counted.",
         chips=["{{icon:globe}} Canada, tax year 2026"] + TOOL_CHIPS,
         related=["ca-self-employed-tax", "hourly-rate", "ca-gst-hst"]),
    dict(tool="ca-gst-hst", src="ca-gst-hst.html", script="ca-gst-hst.js", libs=["data/tax-ca.js", "js/ca-tax.js"],
         title="GST/HST Calculator for Every Province | ToolNest",
         description="Add or remove GST/HST for any Canadian province or territory, including Ontario 13% HST, Nova Scotia 14% and B.C. PST.",
         intro="Add GST or HST to a price, or work out the tax inside a total, for any Canadian province or territory.",
         chips=["{{icon:globe}} Canada, tax year 2026"] + TOOL_CHIPS,
         related=["ca-self-employed-tax", "project-pricing", "ca-instalments"]),

    dict(tool="au-sole-trader-tax", src="au-sole-trader-tax.html", script="au-sole-trader-tax.js", libs=["data/tax-au.js", "js/au-tax.js"],
         title="Sole Trader Tax Calculator Australia 2026–27 | ToolNest",
         description="Calculate 2026–27 income tax, Medicare levy, the low income tax offset and small business offset on your sole trader income.",
         intro="Work out the tax and Medicare levy on your 2026–27 sole trader income, including the small business income tax offset.",
         chips=["{{icon:globe}} Australia, 2026–27"] + TOOL_CHIPS,
         related=["au-voluntary-super", "au-gst", "au-employee-vs-contractor"]),
    dict(tool="au-gst", src="au-gst.html", script="au-gst.js", libs=["data/tax-au.js", "js/au-tax.js"],
         title="GST Calculator Australia: Add or Remove 10% | ToolNest",
         description="Add 10% GST to a price or work out the GST in a GST-inclusive total. Includes when sole traders must register for GST.",
         intro="Add 10% GST to a price, or work out how much GST is inside a total.",
         chips=["{{icon:globe}} Australia, 2026–27"] + TOOL_CHIPS,
         related=["au-sole-trader-tax", "project-pricing", "au-employee-vs-contractor"]),
    dict(tool="au-employee-vs-contractor", src="au-employee-vs-contractor.html", script="au-employee-vs-contractor.js", libs=["data/tax-au.js", "js/au-tax.js"],
         title="Employee vs Contractor Calculator Australia | ToolNest",
         description="Compare a contract rate with a salary plus 12% super in Australia. Find the break-even hourly rate once paid leave is counted.",
         intro="Find the contract hourly rate that matches an Australian salary once 12% super and paid leave are counted.",
         chips=["{{icon:globe}} Australia, 2026–27"] + TOOL_CHIPS,
         related=["au-sole-trader-tax", "au-voluntary-super", "hourly-rate"]),
    dict(tool="au-voluntary-super", src="au-voluntary-super.html", script="au-voluntary-super.js", libs=["data/tax-au.js", "js/au-tax.js"],
         title="Voluntary Super Contribution Calculator 2026–27 | ToolNest",
         description="See how much tax you save by salary sacrificing or making deductible super contributions in 2026–27, with the $32,500 cap check.",
         intro="See how much tax you could save by adding extra concessional contributions to super in 2026–27.",
         chips=["{{icon:globe}} Australia, 2026–27"] + TOOL_CHIPS,
         related=["au-sole-trader-tax", "retirement-savings", "au-employee-vs-contractor"]),

    dict(tool="late-payment", src="late-payment.html", script="late-payment.js", libs=["data/rates-uk.js"],
         title="Late Payment Interest Calculator (UK & US) | ToolNest",
         description="Calculate interest on an overdue invoice. Includes UK statutory interest (8% + base rate) and fixed compensation, or use your contract rate.",
         intro="Work out how much interest and compensation you can claim on an overdue invoice, using UK statutory interest or the rate in your contract.",
         chips=["{{icon:globe}} UK statutory or contract rate"] + TOOL_CHIPS,
         related=["project-pricing", "hourly-rate", "billable-hours"]),

    dict(path="about/", src="about.html", kind="legal", nav="about",
         title="About ToolNest", h1="About ToolNest",
         description="ToolNest builds free, accurate calculators for freelancers and self-employed people in the US, UK, Canada and Australia."),
    dict(path="contact/", src="contact.html", kind="legal",
         title="Contact ToolNest", h1="Contact Us",
         description="Get in touch with ToolNest to report a mistake, suggest a new calculator or ask a question."),
    dict(path="privacy-policy/", src="privacy-policy.html", kind="legal",
         title="Privacy Policy | ToolNest", h1="Privacy Policy",
         description="How ToolNest handles personal information, cookies and analytics, and your privacy rights in the UK, the US and India."),
    dict(path="terms/", src="terms.html", kind="legal",
         title="Terms of Use | ToolNest", h1="Terms of Use",
         description="The terms that apply when you use the ToolNest website and calculators."),
    dict(path="disclaimer/", src="disclaimer.html", kind="legal",
         title="Disclaimer | ToolNest", h1="Disclaimer",
         description="ToolNest calculators provide estimates for planning only and are not tax, legal or financial advice."),
]

# Fill in tool page defaults from TOOLS.
for p in PAGES:
    if "tool" in p:
        t = TOOLS[p["tool"]]
        p.setdefault("path", t["path"])
        p.setdefault("h1", t["name"])
        p.setdefault("kind", "tool")
        p.setdefault("parent", t.get("parent", "freelance"))
        p.setdefault("nav", PARENTS[p["parent"]][2])
    p.setdefault("updated", TODAY)

# ---------------------------------------------------------------- Icons (drawn for this site)

ICONS = {
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    "calendar": '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    "briefcase": '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
    "trending": '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    "pie": '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>',
    "receipt": '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    "shield": '<path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z"/>',
    "sunrise": '<path d="M3 19h18M12 4v3M5.6 8.6l1.8 1.8M18.4 8.6l-1.8 1.8M7 19a5 5 0 0 1 10 0"/>',
    "wave": '<path d="M3 12c2.5-5 5.5-5 8 0s5.5 5 8 0"/><path d="M3 18h18" opacity=".4"/>',
    "flag": '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "lock": '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "formula": '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7.5h8M8.5 12.5l3 3M11.5 12.5l-3 3M14 14h3"/>',
    "refresh": '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
}


def icon(name, cls="icon"):
    return (f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{ICONS[name]}</svg>')


LOGO = ('<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">'
        '<rect width="32" height="32" rx="9" fill="#1d4ed8"/>'
        '<rect x="8" y="17" width="4" height="7" rx="1.5" fill="#fff" opacity=".6"/>'
        '<rect x="14" y="12.5" width="4" height="11.5" rx="1.5" fill="#fff" opacity=".8"/>'
        '<rect x="20" y="8" width="4" height="16" rx="1.5" fill="#fff"/></svg>')

_flag_count = [0]


def flag(code):
    """Simplified US and UK flags, drawn as SVG (emoji flags don't show on Windows)."""
    _flag_count[0] += 1
    n = _flag_count[0]
    if code == "us":
        # 13 stripes on a 26-unit-high canvas: red base with 6 white stripes, blue canton.
        stripes = "".join(f'<rect y="{i * 2}" width="38" height="2" fill="#fff"/>' for i in range(1, 13, 2))
        return ('<svg class="flag" viewBox="0 0 38 26" role="img" aria-label="United States">'
                f'<rect width="38" height="26" fill="#b22234"/>{stripes}'
                '<rect width="15.2" height="14" fill="#3c3b6e"/></svg>')
    if code == "uk":
        return (f'<svg class="flag" viewBox="0 0 60 30" role="img" aria-label="United Kingdom">'
                f'<clipPath id="uk-s{n}"><path d="M0,0 v30 h60 v-30 z"/></clipPath>'
                f'<clipPath id="uk-t{n}"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>'
                f'<g clip-path="url(#uk-s{n})"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/>'
                '<path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>'
                f'<path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#uk-t{n})" stroke="#C8102E" stroke-width="4"/>'
                '<path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/>'
                '<path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>')
    raise ValueError(code)


# ---------------------------------------------------------------- Pieces

def depth_of(path):
    return len([s for s in path.split("/") if s])


def tool_card(slug, up):
    t = TOOLS[slug]
    return f"""<li><a class="card" href="{up}{t['path']}">
  <div class="card-top"><span class="card-icon">{icon(t['icon'])}</span><span class="badge">Free</span></div>
  <h3>{t['card']}</h3>
  <p>{t['short']}</p>
  <span class="go">Open calculator {icon('arrow')}</span>
</a></li>"""


def soon_card(name, short, icon_name):
    return f"""<li><div class="card soon">
  <div class="card-top"><span class="card-icon">{icon(icon_name)}</span><span class="badge muted">Coming soon</span></div>
  <h3>{name}</h3>
  <p>{short}</p>
</div></li>"""


def expand(text, up):
    def sub(m):
        key, arg = m.group(1), m.group(2)
        if key == "root":
            return up
        if key == "icon":
            return icon(arg)
        if key == "flag":
            return flag(arg)
        if key == "cards":
            return "\n".join(tool_card(s, up) for s, t in TOOLS.items() if t["group"] == arg)
        if key == "soon":
            return "\n".join(soon_card(*c) for c in SOON[arg])
        raise KeyError(m.group(0))
    return re.sub(r"\{\{(\w+)(?::([\w-]+))?\}\}", sub, text)


def json_ld(page):
    url = f"{DOMAIN}/{page['path']}"
    graph = []
    if page["kind"] == "home":
        graph.append({"@type": "WebSite", "name": BRAND, "url": f"{DOMAIN}/"})
    else:
        items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": f"{DOMAIN}/"}]
        if page["kind"] == "tool":
            pname, ppath, _ = PARENTS[page["parent"]]
            items.append({"@type": "ListItem", "position": 2, "name": pname, "item": f"{DOMAIN}/{ppath}"})
        items.append({"@type": "ListItem", "position": len(items) + 1, "name": page["h1"]})
        graph.append({"@type": "BreadcrumbList", "itemListElement": items})
    if page["kind"] == "tool":
        graph.append({
            "@type": "WebApplication", "name": page["h1"], "url": url,
            "applicationCategory": "FinanceApplication", "operatingSystem": "Any",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        })
    data = json.dumps({"@context": "https://schema.org", "@graph": graph}, indent=2, ensure_ascii=False)
    return f'<script type="application/ld+json">\n{data}\n</script>'


def header(page, up):
    home = up or "./"

    def cur(name):
        return ' aria-current="page"' if page.get("nav") == name else ""

    return f"""<a class="skip-link" href="#main">Skip to content</a>

<header class="site-header">
  <div class="container">
    <a class="logo" href="{home}">{LOGO}{BRAND}</a>
    <nav class="site-nav" aria-label="Main">
      <ul>
        <li class="hide-sm"><a href="{home}"{cur('home')}>Home</a></li>
        <li><a href="{up}freelance/"{cur('tools')}>Tools</a></li>
        <li><a class="nav-country" href="{up}us/"{cur('us')}>{flag('us')}US</a></li>
        <li><a class="nav-country" href="{up}uk/"{cur('uk')}>{flag('uk')}UK</a></li>
        <li class="hide-md"><a href="{up}about/"{cur('about')}>About</a></li>
        <li class="hide-sm"><a class="nav-cta" href="{up}{TOOLS['hourly-rate']['path']}">Rate calculator</a></li>
      </ul>
    </nav>
  </div>
</header>"""


def footer(up):
    home = up or "./"

    def links(group):
        return "\n".join(f'          <li><a href="{up}{t["path"]}">{t["card"][0].upper() + t["card"][1:]}</a></li>'
                         for t in TOOLS.values() if t["group"] in group)

    return f"""<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="logo" href="{home}">{LOGO}{BRAND}</a>
        <p class="about-text">Free, accurate money calculators for freelancers and self-employed people in the US, UK, Canada and Australia.</p>
      </div>
      <nav aria-label="Pricing tools">
        <h2>Pricing</h2>
        <ul>
{links(('pricing',))}
        </ul>
      </nav>
      <nav aria-label="Income tools">
        <h2>Income &amp; planning</h2>
        <ul>
{links(('income', 'planning'))}
        </ul>
      </nav>
      <nav aria-label="Countries">
        <h2>Countries</h2>
        <ul>
          <li><a href="{up}us/">United States</a></li>
          <li><a href="{up}uk/">United Kingdom</a></li>
          <li><a href="{up}canada/">Canada</a></li>
          <li><a href="{up}australia/">Australia</a></li>
        </ul>
      </nav>
      <nav aria-label="Company">
        <h2>Company</h2>
        <ul>
          <li><a href="{up}about/">About</a></li>
          <li><a href="{up}contact/">Contact</a></li>
          <li><a href="{up}privacy-policy/">Privacy Policy</a></li>
          <li><a href="{up}terms/">Terms of Use</a></li>
          <li><a href="{up}disclaimer/">Disclaimer</a></li>
        </ul>
      </nav>
    </div>
    <div class="footer-bottom">
      <p>© <span id="year">{TODAY[:4]}</span> {BRAND}. All rights reserved.</p>
      <p>Estimates only. Not tax, legal or financial advice.</p>
    </div>
  </div>
</footer>"""


def page_hero(page, up):
    home = up or "./"
    crumbs = [f'<li><a href="{home}">Home</a></li>']
    if page["kind"] == "tool":
        pname, ppath, _ = PARENTS[page["parent"]]
        crumbs.append(f'<li><a href="{up}{ppath}">{pname}</a></li>')
    crumbs.append(f'<li aria-current="page">{page["h1"]}</li>')
    intro = f'\n    <p class="intro">{page["intro"]}</p>' if page.get("intro") else ""
    chips = ""
    if page.get("chips"):
        chips = '\n    <div class="meta-row">' + "".join(f'<span class="chip">{c}</span>' for c in page["chips"]) + "</div>"
    return f"""<section class="page-hero">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol>{''.join(crumbs)}</ol></nav>
    <h1>{page['h1']}</h1>{intro}{chips}
  </div>
</section>"""


def related(page, up):
    cards = "\n".join(tool_card(s, up) for s in page.get("related", []))
    return f"""<section class="section">
    <div class="section-head"><div><span class="kicker">Keep going</span><h2>Related tools</h2></div>
      <a class="btn btn-sm" href="{up}{PARENTS[page['parent']][1]}">All {PARENTS[page['parent']][0].replace('Freelancer Tools', 'freelancer')} tools</a></div>
    <ul class="card-grid">
{cards}
    </ul>
  </section>"""


def updated_line(page):
    return f'<p class="updated">Last updated: <time datetime="{page["updated"]}">{human_date(page["updated"])}</time></p>'


def main_content(page, up, body):
    kind = page["kind"]
    if kind == "home":
        return body
    hero = page_hero(page, up)
    if kind == "section":
        return f"{hero}\n<div class=\"container\">\n{body}\n</div>"
    if kind == "legal":
        return f"{hero}\n<div class=\"container\">\n  <div class=\"content legal\">\n{body}\n{updated_line(page)}\n  </div>\n</div>"
    # tool
    return f"""{hero}
<div class="container">
{body}
  {related(page, up)}
  <div class="content">
    <div class="disclaimer">
      <p><strong>Disclaimer:</strong> results are estimates for planning only and are not tax, legal or financial advice. Rules and rates vary by country, state and personal situation. Check with a qualified accountant before making decisions. <a href="{up}disclaimer/">Read the full disclaimer</a>.</p>
    </div>
    {updated_line(page)}
  </div>
</div>"""


def render(page):
    up = "../" * depth_of(page["path"])
    with open(os.path.join(SRC, page["src"]), encoding="utf-8") as f:
        body = f.read()
    main_html = expand(main_content(page, up, body), up)
    canonical = f"{DOMAIN}/{page['path']}"
    scripts = [f'<script src="{up}assets/js/common.js"></script>']
    for lib in page.get("libs", []):
        scripts.append(f'<script src="{up}assets/{lib}"></script>')
    if page.get("script"):
        scripts.append(f'<script src="{up}assets/js/tools/{page["script"]}"></script>')
    scripts_html = "\n".join(scripts)

    verify = ""
    if page["kind"] == "home":
        if GOOGLE_SITE_VERIFICATION:
            verify += f'<meta name="google-site-verification" content="{GOOGLE_SITE_VERIFICATION}">\n'
        if BING_SITE_VERIFICATION:
            verify += f'<meta name="msvalidate.01" content="{BING_SITE_VERIFICATION}">\n'

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{page['title']}</title>
<meta name="description" content="{page['description']}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#0b1b34">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{page.get('h1', page['title'])}">
<meta property="og:description" content="{page['description']}">
<meta property="og:url" content="{canonical}">
<meta name="twitter:card" content="summary">
{verify}<link rel="icon" href="{up}favicon.svg" type="image/svg+xml">
<link rel="preload" href="{up}assets/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{up}assets/css/style.css">
{json_ld(page)}
</head>
<body>
{header(page, up)}

<main id="main">
{main_html}
</main>

{footer(up)}

{scripts_html}
</body>
</html>
"""


# ---------------------------------------------------------------- Site files

FAVICON = LOGO.replace(' class="logo-mark"', ' xmlns="http://www.w3.org/2000/svg"').replace(' aria-hidden="true" focusable="false"', "")

# Security headers for Cloudflare Pages. If you add ads, analytics or any outside
# script, update the Content-Security-Policy too (LEGAL.md §4 and §5).
HEADERS = """/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; img-src 'self' data:; style-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'

/assets/*
  Cache-Control: public, max-age=604800
"""


def write(rel, text):
    path = os.path.join(OUT, *rel.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def main():
    for page in PAGES:
        write(page["path"] + "index.html", render(page))

    urls = "\n".join(
        f"  <url>\n    <loc>{DOMAIN}/{p['path']}</loc>\n    <lastmod>{p['updated']}</lastmod>\n  </url>"
        for p in PAGES)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n'
          f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    write("favicon.svg", FAVICON + "\n")
    write("_headers", HEADERS)
    print(f"Built {len(PAGES)} pages into public/")


if __name__ == "__main__":
    main()
