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
  {{cards:GROUP}}     cards for live tools in a group (pricing, income, pdf-organize…)
  {{featured:PARENT}} cards for the tools marked featured=True in a section (e.g. pdf)
  {{soon:GROUP}}      "coming soon" cards (planning, tax)
"""
import hashlib
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src", "pages")
OUT = os.path.join(ROOT, "public")

DOMAIN = "https://vintayz.com"
BRAND = "ToolNest by Vintayz"  # ToolNest is the calculators part of Vintayz (vintayz.com)
OWNER = "Vintayz"
TODAY = "2026-09-28"

# Site verification codes (paste only the code, not the whole tag). Leave "" until you have one.
#   Google Search Console → Add property → "URL prefix" → HTML tag → copy the content="..." value.
#   (Easier: choose the "Domain" property and verify with a DNS record in Cloudflare; then leave this empty.)
#   Bing Webmaster Tools → Add site → HTML meta tag → copy the content="..." value.
#   (Or import your site from Google Search Console; then leave this empty.)
GOOGLE_SITE_VERIFICATION = ""
BING_SITE_VERIFICATION = ""

# AdSense publisher ID. Used only for the verification meta tag and ads.txt, which load nothing
# from Google. Do NOT add the AdSense <script> until LEGAL.md section 5 is fully done.
ADSENSE_PUBLISHER_ID = "ca-pub-3325212569816736"


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
        path="ca/self-employed-tax-calculator/",
        name="Self-Employed Tax Calculator Canada (2026)",
        card="Self-employed tax calculator",
        short="Work out 2026 federal tax and both halves of CPP on your self-employment income.",
        icon="receipt", group="ca-tax", parent="canada",
    ),
    "ca-instalments": dict(
        path="ca/tax-instalments-calculator/",
        name="Tax Instalments Calculator (Canada 2026)",
        card="Tax instalments calculator",
        short="Check if you need quarterly instalments in 2026 and compare the current-year and prior-year options.",
        icon="calendar", group="ca-tax", parent="canada",
    ),
    "ca-employee-vs-contractor": dict(
        path="ca/employee-vs-contractor-calculator/",
        name="Employee vs Contractor Calculator (Canada)",
        card="Employee vs contractor calculator",
        short="Find the contract rate that matches a salaried job once benefits and employer CPP are counted.",
        icon="briefcase", group="ca-tax", parent="canada",
    ),
    "ca-gst-hst": dict(
        path="ca/gst-hst-calculator/",
        name="GST/HST Calculator",
        card="GST/HST calculator",
        short="Add or remove GST, HST and provincial sales tax for any province or territory.",
        icon="formula", group="ca-tax", parent="canada",
    ),
    "au-sole-trader-tax": dict(
        path="au/sole-trader-tax-calculator/",
        name="Sole Trader Tax Calculator (2026–27)",
        card="Sole trader tax calculator",
        short="Work out 2026–27 tax, Medicare levy and offsets on your sole trader income.",
        icon="receipt", group="au-tax", parent="australia",
    ),
    "au-gst": dict(
        path="au/gst-calculator/",
        name="GST Calculator Australia",
        card="GST calculator",
        short="Add 10% GST to a price or work out the GST inside a total.",
        icon="formula", group="au-tax", parent="australia",
    ),
    "au-employee-vs-contractor": dict(
        path="au/employee-vs-contractor-calculator/",
        name="Employee vs Contractor Calculator (Australia)",
        card="Employee vs contractor calculator",
        short="Find the contract rate that matches a salary plus 12% super and paid leave.",
        icon="briefcase", group="au-tax", parent="australia",
    ),
    "au-voluntary-super": dict(
        path="au/voluntary-super-contribution-calculator/",
        name="Voluntary Super Contribution Calculator (2026–27)",
        card="Voluntary super contribution calculator",
        short="See the tax you save by adding to super, and check the new $32,500 cap.",
        icon="sunrise", group="au-tax", parent="australia",
    ),

    # PDF tools: everything happens in the visitor's browser (assets/js/pdf-common.js).
    "pdf-merge": dict(
        path="pdf/merge-pdf/",
        name="Merge PDF Files",
        card="Merge PDF",
        short="Join several PDFs into one file, in the order you choose.",
        icon="merge", group="pdf-organize", parent="pdf", keywords="combine join put together add attach one file multiple several",
        go="Open tool", featured=True,
    ),
    "pdf-split": dict(
        path="pdf/split-pdf/",
        name="Split PDF",
        card="Split PDF",
        short="Split a PDF into smaller files by page ranges, or one file per page.",
        icon="split", group="pdf-organize", parent="pdf", keywords="separate cut divide break apart chapters into files",
        go="Open tool", featured=True,
    ),
    "pdf-rotate": dict(
        path="pdf/rotate-pdf/",
        name="Rotate PDF Pages",
        card="Rotate PDF",
        short="Turn sideways or upside-down pages the right way up: one page or all of them.",
        icon="rotate", group="pdf-organize", parent="pdf", keywords="turn sideways upside down flip landscape portrait orientation",
        go="Open tool", featured=True,
    ),
    "pdf-delete-pages": dict(
        path="pdf/delete-pdf-pages/",
        name="Delete Pages from a PDF",
        card="Delete PDF pages",
        short="Remove the pages you don't need and save a new PDF.",
        icon="trash", group="pdf-organize", parent="pdf", keywords="remove erase drop blank unwanted",
        go="Open tool",
    ),
    "pdf-extract-pages": dict(
        path="pdf/extract-pdf-pages/",
        name="Extract Pages from a PDF",
        card="Extract PDF pages",
        short="Pick the pages you need and save just those as a new PDF.",
        icon="extract", group="pdf-organize", parent="pdf", keywords="pull out save select pick copy keep some",
        go="Open tool",
    ),
    "pdf-rearrange": dict(
        path="pdf/rearrange-pdf-pages/",
        name="Rearrange PDF Pages",
        card="Rearrange PDF pages",
        short="Drag pages into a new order, or reverse them, and save the PDF.",
        icon="grid", group="pdf-organize", parent="pdf", keywords="reorder organize organise sort order move reverse",
        go="Open tool",
    ),
    "pdf-jpg-to-pdf": dict(
        path="pdf/jpg-to-pdf/",
        name="JPG to PDF Converter",
        card="JPG to PDF",
        short="Turn photos and pictures (JPG, PNG and more) into one PDF.",
        icon="file", group="pdf-convert", parent="pdf", keywords="image photo picture png jpeg webp gif scan screenshot convert make",
        go="Open tool", featured=True,
    ),
    "pdf-to-jpg": dict(
        path="pdf/pdf-to-jpg/",
        name="PDF to JPG Converter",
        card="PDF to JPG",
        short="Save PDF pages as sharp JPG or PNG pictures.",
        icon="image", group="pdf-convert", parent="pdf", keywords="image photo picture png jpeg export convert save as",
        go="Open tool", featured=True,
    ),
    "pdf-compress": dict(
        path="pdf/compress-pdf/",
        name="Compress PDF",
        card="Compress PDF",
        short="Make a PDF smaller for email and uploads, while text stays sharp.",
        icon="compress", group="pdf-edit", parent="pdf", keywords="reduce shrink smaller size optimize optimise email upload mb",
        go="Open tool", featured=True,
    ),
    "pdf-page-numbers": dict(
        path="pdf/add-page-numbers-to-pdf/",
        name="Add Page Numbers to a PDF",
        card="Add page numbers",
        short="Number the pages of a PDF, in the corner and style you choose.",
        icon="hash", group="pdf-edit", parent="pdf", keywords="number numbering footer header",
        go="Open tool",
    ),
    "pdf-watermark": dict(
        path="pdf/add-watermark-to-pdf/",
        name="Add a Watermark to a PDF",
        card="Add a watermark",
        short="Stamp DRAFT, CONFIDENTIAL or your own words across the pages.",
        icon="droplet", group="pdf-edit", parent="pdf", keywords="stamp draft confidential copy sample mark",
        go="Open tool",
    ),

    # Resume and CV makers: one per country, all built in the visitor's browser (assets/js/resume.js).
    "resume-us": dict(
        path="resume-maker/us-resume-builder/",
        name="US Resume Builder",
        card="US resume builder",
        short="A one-column US resume on Letter paper, following the US Department of Labor's CareerOneStop advice.",
        icon="resume", group="resume", parent="resume", go="Open builder",
    ),
    "resume-uk": dict(
        path="resume-maker/uk-cv-maker/",
        name="UK CV Maker",
        card="UK CV maker",
        short="A UK CV on A4 with a personal profile and references line, following National Careers Service advice.",
        icon="resume", group="resume", parent="resume", go="Open builder",
    ),
    "resume-ca": dict(
        path="resume-maker/canada-resume-builder/",
        name="Canadian Resume Builder",
        card="Canadian resume builder",
        short="A Canadian resume of up to two pages, with volunteer work and languages, following Job Bank advice.",
        icon="resume", group="resume", parent="resume", go="Open builder",
    ),
    "resume-au": dict(
        path="resume-maker/australia-resume-builder/",
        name="Australian Resume Builder",
        card="Australian resume builder",
        short="An Australian resume on A4 with key skills and referees, following Workforce Australia's template.",
        icon="resume", group="resume", parent="resume", go="Open builder",
    ),

    # Invoice Generator (Stage 1 Phase D)
    "invoice-generator": dict(
        path="freelance/invoice-generator/",
        name="Freelance Invoice Generator",
        card="Freelance invoice generator",
        short="Create, customize and download professional freelance invoices as PDFs. No sign-up, no watermarks, files stay on your device.",
        icon="receipt", group="income", parent="freelance", go="Create invoice",
    ),

    # Business tools (Stage 4)
    "profit-margin": dict(
        path="business/profit-margin-calculator/",
        name="Profit Margin & Markup Calculator",
        card="Profit margin calculator",
        short="Find your gross margin, markup percentage and net profit from your costs and selling price.",
        icon="percent", group="business-pricing", parent="business",
    ),
    "break-even": dict(
        path="business/break-even-calculator/",
        name="Break-Even Analysis Calculator",
        card="Break-even calculator",
        short="Find the exact unit volume and sales revenue needed to cover fixed overheads and start making a profit.",
        icon="trending", group="business-pricing", parent="business",
    ),
    "payment-fee": dict(
        path="business/payment-fee-calculator/",
        name="Payment Processing Fee Calculator",
        card="Payment fee calculator",
        short="Work out card processing fees, your net payout, and how much to invoice to cover the fee.",
        icon="card", group="business-ops", parent="business",
    ),

    # Career tools (Stage 2)
    "salary-to-hourly": dict(
        path="career/salary-to-hourly-calculator/",
        name="Salary to Hourly Calculator",
        card="Salary to hourly calculator",
        short="Convert an annual salary into equivalent hourly, daily, weekly, bi-weekly and overtime rates.",
        icon="clock", group="career-salary", parent="career",
    ),

    # Student and writing tools (Stage 5)
    "word-counter": dict(
        path="education/word-counter/",
        name="Word Counter & Readability Analyzer",
        card="Word counter",
        short="Count words, characters, sentences, estimated reading time, speaking time, and Flesch readability grade level.",
        icon="type-icon", group="education-writing", parent="education", go="Open tool",
    ),
    "gpa-calculator": dict(
        path="education/gpa-calculator/",
        name="College GPA Calculator (4.0 Scale)",
        card="College GPA calculator",
        short="Calculate semester and cumulative college GPA on a 4.0 scale, weighted by course credits.",
        icon="award", group="education-gpa", parent="education",
    ),
}

# Sections a tool can live in: key -> (breadcrumb name, path, header nav key).
PARENTS = {
    "freelance": ("Freelancer Tools", "freelance/", "tools"),
    "us": ("United States", "us/", "us"),
    "uk": ("United Kingdom", "uk/", "uk"),
    "canada": ("Canada", "ca/", "ca"),
    "australia": ("Australia", "au/", "au"),
    "pdf": ("PDF Tools", "pdf/", "pdf"),
    "resume": ("Resume & CV Maker", "resume-maker/", "resume"),
    "business": ("Business Tools", "business/", "business"),
    "career": ("Career & Salary", "career/", "career"),
    "education": ("Education & Writing", "education/", "education"),
}

SOON = {
}

# ---------------------------------------------------------------- Pages

TOOL_CHIPS = ["{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]
CURRENCY_CHIP = "{{icon:globe}} USD · GBP · CAD · AUD"
PDF_CHIPS = ["{{icon:lock}} Your files never leave your device", "{{icon:check}} Free, no sign-up"]
PDF_LIBS = ["js/pdf-common.js"]
PDF_DAY = "2026-09-29"
RESUME_CHIPS = ["{{icon:check}} Free, no sign-up, no watermark", "{{icon:lock}} Nothing you type leaves your device"]
RESUME_LIBS = ["js/resume.js"]
RESUME_DAY = "2026-09-29"

PAGES = [
    dict(path="", src="home.html", kind="home", nav="home", updated=PDF_DAY,
         title="ToolNest by Vintayz: Free Money Calculators for Freelancers",
         description="Free calculators for freelancers in the US, UK, Canada and Australia. Price your work, plan your income and chase late payments."),
    dict(path="freelance/", src="freelance.html", kind="section", nav="tools",
         title="Freelancer Money Tools and Calculators | ToolNest by Vintayz",
         description="Free calculators for freelancers: hourly rate, day rate, project pricing, billable hours and late payment interest.",
         h1="Freelancer Money Tools",
         intro="Free calculators to help freelancers and self-employed people price their work, plan their income and get paid on time.",
         chips=TOOL_CHIPS + [CURRENCY_CHIP]),

    dict(path="us/", src="us.html", kind="section", nav="us",
         title="US Freelancer Calculators for 1099 Workers | ToolNest by Vintayz",
         description="Free 2026 tax calculators for US freelancers and 1099 contractors: self-employment tax, quarterly estimates, take-home pay and more.",
         h1="Freelancer Calculators for the United States",
         intro="Free tools for 1099 contractors and self-employed people in the US, plus what's different about freelancing in America.",
         chips=["{{flag:us}} Built for the US", "{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),
    dict(path="uk/", src="uk.html", kind="section", nav="uk",
         title="UK Self-Employed & Contractor Calculators | ToolNest by Vintayz",
         description="Free 2026/27 calculators for UK sole traders and contractors: self-employed tax and NI, payments on account, sole trader vs Ltd and more.",
         h1="Calculators for the Self-Employed in the UK",
         intro="Free tools for sole traders, freelancers and contractors in the UK, plus what's different about working for yourself here.",
         chips=["{{flag:uk}} Built for the UK", "{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),

    dict(tool="hourly-rate", src="hourly-rate.html", script="hourly-rate.js",
         title="Freelance Hourly Rate Calculator | ToolNest by Vintayz",
         description="Work out the hourly rate you need to charge as a freelancer, after tax, expenses, time off and unpaid hours. Free, in USD, GBP, CAD or AUD.",
         intro="Find the hourly rate you need to charge to reach your take-home income goal, after tax, business expenses, time off and the hours clients don't pay for.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["day-rate", "project-pricing", "billable-hours"]),
    dict(tool="day-rate", src="day-rate.html", script="day-rate.js",
         title="Contractor Day Rate Calculator | ToolNest by Vintayz",
         description="Work out the day rate you need as a contractor or freelancer, allowing for tax, expenses, holidays and gaps between contracts.",
         intro="Work out the day rate you need to charge, allowing for tax, expenses, holidays, public holidays and the gaps between contracts.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-rate", "project-pricing", "hourly-to-annual"]),
    dict(tool="project-pricing", src="project-pricing.html", script="project-pricing.js",
         title="Project Pricing Calculator for Freelancers | ToolNest by Vintayz",
         description="Turn estimated hours, your rate, costs and a risk buffer into a fixed project price and deposit. See what overruns do to your real hourly rate.",
         intro="Turn your estimated hours, hourly rate and project costs into a fixed-price quote, with a safety buffer and deposit worked out for you.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-rate", "day-rate", "late-payment"]),
    dict(tool="hourly-to-annual", src="hourly-to-annual.html", script="hourly-to-annual.js",
         title="Hourly to Annual Income Calculator | ToolNest by Vintayz",
         description="Convert an hourly rate into daily, weekly, monthly and yearly income. Set your own hours and weeks worked. Free, in USD, GBP, CAD or AUD.",
         intro="See what an hourly rate adds up to per day, week, month and year, based on the hours and weeks you actually work.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-rate", "billable-hours", "day-rate"]),
    dict(tool="billable-hours", src="billable-hours.html", script="billable-hours.js",
         title="Billable Hours Calculator for Freelancers | ToolNest by Vintayz",
         description="Work out how many hours you can really bill each week and year once admin, sales and time off are counted, and what that means for income.",
         intro="Work out how many hours you can really bill each week and year once admin, sales, learning and time off are taken out.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-rate", "hourly-to-annual", "project-pricing"]),
    dict(tool="emergency-fund", src="emergency-fund.html", script="emergency-fund.js",
         title="Emergency Fund Calculator for Freelancers | ToolNest by Vintayz",
         description="Work out how big your emergency fund should be as a freelancer, how many months your savings cover and how long it will take to save the rest.",
         intro="Work out how much cash to keep for quiet months, how long your savings would last today, and how long it will take to reach your goal.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["income-smoothing", "retirement-savings", "hourly-rate"]),
    dict(tool="retirement-savings", src="retirement-savings.html", script="retirement-savings.js",
         title="Retirement Savings Calculator for the Self-Employed | ToolNest by Vintayz",
         description="See what your retirement savings could grow to with monthly contributions, and the income they might give you. For freelancers in the US, UK, CA and AU.",
         intro="See what your retirement savings could grow to by the time you stop working, and roughly what income they could give you.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["emergency-fund", "income-smoothing", "hourly-rate"]),
    dict(tool="income-smoothing", src="income-smoothing.html", script="income-smoothing.js",
         title="Income Smoothing Calculator for Freelancers | ToolNest by Vintayz",
         description="Turn irregular freelance income into a steady monthly salary. See the buffer you need and how your months would have played out.",
         intro="Turn up-and-down freelance income into a steady monthly salary, and see how big a buffer you need to make it work.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["emergency-fund", "billable-hours", "hourly-rate"]),
    dict(tool="us-self-employment-tax", src="us-self-employment-tax.html", script="us-self-employment-tax.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Self-Employment Tax Calculator 2026 | ToolNest by Vintayz",
         description="Calculate 2026 self-employment tax on your 1099 or Schedule C profit: Social Security, Medicare, Additional Medicare and the deductible half.",
         intro="Work out the Social Security and Medicare tax you owe on your 2026 freelance profit, and how much of it you can deduct.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-take-home", "us-quarterly-tax", "us-1099-vs-w2"]),
    dict(tool="us-quarterly-tax", src="us-quarterly-tax.html", script="us-quarterly-tax.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Quarterly Estimated Tax Calculator 2026 | ToolNest by Vintayz",
         description="Work out your 2026 quarterly estimated tax payments for self-employed income, with IRS due dates and the safe harbor that avoids penalties.",
         intro="See how much to pay the IRS each quarter for 2026, the safe harbor amount that avoids an underpayment penalty, and when each payment is due.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-take-home", "us-self-employment-tax", "income-smoothing"]),
    dict(tool="us-1099-vs-w2", src="us-1099-vs-w2.html", script="us-1099-vs-w2.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="1099 vs W-2 Calculator: Contractor vs Employee | ToolNest by Vintayz",
         description="Compare a 1099 contractor rate with a W-2 salary and benefits. Find the break-even hourly rate, including employer payroll taxes.",
         intro="Find the 1099 hourly rate that matches a W-2 job once benefits, employer payroll tax and unpaid time off are counted.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-take-home", "hourly-rate", "us-self-employment-tax"]),
    dict(tool="us-take-home", src="us-take-home.html", script="us-take-home.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Freelancer Take-Home Pay Calculator 2026 | ToolNest by Vintayz",
         description="See your 2026 take-home pay as a self-employed freelancer after federal income tax, self-employment tax, the QBI deduction and state tax.",
         intro="Estimate what you keep from your 2026 freelance profit after federal income tax, self-employment tax and state tax.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-quarterly-tax", "us-self-employment-tax", "hourly-rate"]),
    dict(tool="us-mileage", src="us-mileage.html", script="us-mileage.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Business Mileage Deduction Calculator 2026 | ToolNest by Vintayz",
         description="Calculate your 2026 business mileage deduction with the IRS rates: 72.5 cents to June 30 and 76 cents from July 1. Includes parking and tolls.",
         intro="Work out your business mileage deduction using the official IRS rates, including the rate change on July 1, 2026.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-home-office", "us-take-home", "us-self-employment-tax"]),
    dict(tool="us-home-office", src="us-home-office.html", script="us-home-office.js", libs=["data/tax-us.js", "js/us-tax.js"],
         title="Home Office Deduction Calculator (IRS 2026) | ToolNest by Vintayz",
         description="Compare the IRS simplified home office deduction ($5 per sq ft) with the regular method, and see which gives self-employed people more.",
         intro="Compare the simplified and regular home office deduction methods and see which gives you the bigger deduction.",
         chips=["{{flag:us}} US federal, tax year 2026"] + TOOL_CHIPS,
         related=["us-mileage", "us-take-home", "us-quarterly-tax"]),

    dict(tool="uk-self-employed-tax", src="uk-self-employed-tax.html", script="uk-self-employed-tax.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Self-Employed Tax Calculator UK 2026/27 | ToolNest by Vintayz",
         description="Calculate Income Tax and Class 4 National Insurance on your self-employed profits for 2026 to 2027. Includes Scottish rates and take-home pay.",
         intro="Work out the Income Tax and National Insurance you'll pay on your self-employed profits for 2026 to 2027, and what you'll take home.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-payments-on-account", "uk-sole-trader-vs-ltd", "uk-mileage"]),
    dict(tool="uk-payments-on-account", src="uk-payments-on-account.html", script="uk-payments-on-account.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Payments on Account Calculator (Self Assessment) | ToolNest by Vintayz",
         description="Work out your Self Assessment payments on account for January and July 2027, the balancing payment, and whether you need to pay them at all.",
         intro="See how much Self Assessment tax is due on 31 January and 31 July 2027, and whether you need to make payments on account at all.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-self-employed-tax", "income-smoothing", "emergency-fund"]),
    dict(tool="uk-sole-trader-vs-ltd", src="uk-sole-trader-vs-ltd.html", script="uk-sole-trader-vs-ltd.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Sole Trader vs Limited Company Calculator 2026/27 | ToolNest by Vintayz",
         description="Compare take-home pay as a sole trader and a limited company director for 2026 to 2027, with the new dividend tax rates and 15% employer NI.",
         intro="Compare your take-home pay as a sole trader and as a limited company director for 2026 to 2027, using the latest dividend and NI rates.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-self-employed-tax", "day-rate", "uk-payments-on-account"]),
    dict(tool="uk-mileage", src="uk-mileage.html", script="uk-mileage.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Business Mileage Allowance Calculator UK (55p) | ToolNest by Vintayz",
         description="Calculate your business mileage claim with HMRC rates: 55p a mile for cars and vans from April 2026 (45p before), 25p after 10,000 miles.",
         intro="Work out your business mileage claim using HMRC's rates, including the rise to 55p a mile for cars and vans from 6 April 2026.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-work-from-home", "uk-self-employed-tax", "uk-sole-trader-vs-ltd"]),
    dict(tool="uk-work-from-home", src="uk-work-from-home.html", script="uk-work-from-home.js", libs=["data/tax-uk.js", "js/uk-tax.js"],
         title="Working From Home Expenses Calculator (UK) | ToolNest by Vintayz",
         description="Compare HMRC's simplified flat rate for working from home (£10, £18 or £26 a month) with a share of your actual bills, and claim the higher.",
         intro="Compare HMRC's flat rate for working from home with a share of your actual household bills, and see which lets you claim more.",
         chips=["{{flag:uk}} UK, tax year 2026 to 2027"] + TOOL_CHIPS,
         related=["uk-mileage", "uk-self-employed-tax", "billable-hours"]),

    dict(path="ca/", src="canada.html", kind="section", nav="ca",
         title="Self-Employed Tax Calculators for Canada | ToolNest by Vintayz",
         description="Free 2026 calculators for self-employed Canadians: federal tax and CPP, tax instalments, employee vs contractor and GST/HST.",
         h1="Calculators for the Self-Employed in Canada",
         intro="Free tools for freelancers and sole proprietors in Canada, built on official 2026 CRA figures.",
         chips=["{{icon:globe}} Built for Canada", "{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),
    dict(path="au/", src="australia.html", kind="section", nav="au",
         title="Sole Trader Tax Calculators for Australia | ToolNest by Vintayz",
         description="Free 2026–27 calculators for Australian sole traders: income tax and Medicare levy, GST, employee vs contractor and voluntary super.",
         h1="Calculators for Sole Traders in Australia",
         intro="Free tools for freelancers and sole traders in Australia, built on 2026–27 ATO figures.",
         chips=["{{icon:globe}} Built for Australia", "{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),

    dict(tool="ca-self-employed-tax", src="ca-self-employed-tax.html", script="ca-self-employed-tax.js", libs=["data/tax-ca.js", "js/ca-tax.js"],
         title="Self-Employed Tax Calculator Canada 2026 | ToolNest by Vintayz",
         description="Estimate 2026 federal income tax and CPP (including CPP2) on self-employment income in Canada, with your own provincial tax estimate.",
         intro="Work out federal income tax and both halves of CPP on your 2026 self-employment income, and estimate what you'll take home.",
         chips=["{{icon:globe}} Canada, tax year 2026"] + TOOL_CHIPS,
         related=["ca-instalments", "ca-gst-hst", "ca-employee-vs-contractor"]),
    dict(tool="ca-instalments", src="ca-instalments.html", script="ca-instalments.js", libs=["data/tax-ca.js", "js/ca-tax.js"],
         title="Tax Instalments Calculator Canada 2026 | ToolNest by Vintayz",
         description="Find out if you need to pay CRA tax instalments in 2026, and compare current-year and prior-year options with the four due dates.",
         intro="Check whether you need to pay tax instalments to the CRA for 2026, and how much to pay each quarter.",
         chips=["{{icon:globe}} Canada, tax year 2026"] + TOOL_CHIPS,
         related=["ca-self-employed-tax", "income-smoothing", "emergency-fund"]),
    dict(tool="ca-employee-vs-contractor", src="ca-employee-vs-contractor.html", script="ca-employee-vs-contractor.js", libs=["data/tax-ca.js", "js/ca-tax.js"],
         title="Employee vs Contractor Calculator Canada | ToolNest by Vintayz",
         description="Compare a contract rate with a salaried job in Canada. Find the break-even hourly rate including benefits and employer CPP.",
         intro="Find the contract hourly rate that matches a salaried job in Canada, once benefits and employer CPP are counted.",
         chips=["{{icon:globe}} Canada, tax year 2026"] + TOOL_CHIPS,
         related=["ca-self-employed-tax", "hourly-rate", "ca-gst-hst"]),
    dict(tool="ca-gst-hst", src="ca-gst-hst.html", script="ca-gst-hst.js", libs=["data/tax-ca.js", "js/ca-tax.js"],
         title="GST/HST Calculator for Every Province | ToolNest by Vintayz",
         description="Add or remove GST/HST for any Canadian province or territory, including Ontario 13% HST, Nova Scotia 14% and B.C. PST.",
         intro="Add GST or HST to a price, or work out the tax inside a total, for any Canadian province or territory.",
         chips=["{{icon:globe}} Canada, tax year 2026"] + TOOL_CHIPS,
         related=["ca-self-employed-tax", "project-pricing", "ca-instalments"]),

    dict(tool="au-sole-trader-tax", src="au-sole-trader-tax.html", script="au-sole-trader-tax.js", libs=["data/tax-au.js", "js/au-tax.js"],
         title="Sole Trader Tax Calculator Australia 2026–27 | ToolNest by Vintayz",
         description="Calculate 2026–27 income tax, Medicare levy, the low income tax offset and small business offset on your sole trader income.",
         intro="Work out the tax and Medicare levy on your 2026–27 sole trader income, including the small business income tax offset.",
         chips=["{{icon:globe}} Australia, 2026–27"] + TOOL_CHIPS,
         related=["au-voluntary-super", "au-gst", "au-employee-vs-contractor"]),
    dict(tool="au-gst", src="au-gst.html", script="au-gst.js", libs=["data/tax-au.js", "js/au-tax.js"],
         title="GST Calculator Australia: Add or Remove 10% | ToolNest by Vintayz",
         description="Add 10% GST to a price or work out the GST in a GST-inclusive total. Includes when sole traders must register for GST.",
         intro="Add 10% GST to a price, or work out how much GST is inside a total.",
         chips=["{{icon:globe}} Australia, 2026–27"] + TOOL_CHIPS,
         related=["au-sole-trader-tax", "project-pricing", "au-employee-vs-contractor"]),
    dict(tool="au-employee-vs-contractor", src="au-employee-vs-contractor.html", script="au-employee-vs-contractor.js", libs=["data/tax-au.js", "js/au-tax.js"],
         title="Employee vs Contractor Calculator Australia | ToolNest by Vintayz",
         description="Compare a contract rate with a salary plus 12% super in Australia. Find the break-even hourly rate once paid leave is counted.",
         intro="Find the contract hourly rate that matches an Australian salary once 12% super and paid leave are counted.",
         chips=["{{icon:globe}} Australia, 2026–27"] + TOOL_CHIPS,
         related=["au-sole-trader-tax", "au-voluntary-super", "hourly-rate"]),
    dict(tool="au-voluntary-super", src="au-voluntary-super.html", script="au-voluntary-super.js", libs=["data/tax-au.js", "js/au-tax.js"],
         title="Voluntary Super Contribution Calculator 2026–27 | ToolNest by Vintayz",
         description="See how much tax you save by salary sacrificing or making deductible super contributions in 2026–27, with the $32,500 cap check.",
         intro="See how much tax you could save by adding extra concessional contributions to super in 2026–27.",
         chips=["{{icon:globe}} Australia, 2026–27"] + TOOL_CHIPS,
         related=["au-sole-trader-tax", "retirement-savings", "au-employee-vs-contractor"]),

    dict(tool="late-payment", src="late-payment.html", script="late-payment.js", libs=["data/rates-uk.js"],
         title="Late Payment Interest Calculator (UK & US) | ToolNest by Vintayz",
         description="Calculate interest on an overdue invoice. Includes UK statutory interest (8% + base rate) and fixed compensation, or use your contract rate.",
         intro="Work out how much interest and compensation you can claim on an overdue invoice, using UK statutory interest or the rate in your contract.",
         chips=["{{icon:globe}} UK statutory or contract rate"] + TOOL_CHIPS,
         related=["project-pricing", "hourly-rate", "billable-hours"]),

    dict(path="pdf/", src="pdf.html", kind="section", nav="pdf", updated=PDF_DAY,
         search=("Search PDF tools", "merge or JPG", "pdf"), libs=["js/tool-search.js"],
         title="Free PDF Tools That Never Upload Your Files | ToolNest by Vintayz",
         description="Merge, split, compress, rotate and convert PDFs for free. Every tool runs in your browser, so your files never leave your device.",
         h1="Free PDF Tools",
         intro="Merge, split, compress, rotate and convert PDFs in seconds. Every tool works inside your browser, so your files are never uploaded to us or anyone else.",
         chips=PDF_CHIPS + ["{{icon:globe}} Works on phones and computers"]),
    dict(tool="pdf-merge", src="pdf-merge.html", script="pdf-merge.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Merge PDF Files Free, Without Uploading | ToolNest by Vintayz",
         description="Combine PDF files into one, in any order. Free, no sign-up, and your files never leave your device: merging happens in your browser.",
         intro="Join two or more PDF files into one, in the order you choose. Your files are merged by your own browser and never uploaded.",
         chips=PDF_CHIPS,
         related=["pdf-split", "pdf-rearrange", "pdf-compress"]),
    dict(tool="pdf-split", src="pdf-split.html", script="pdf-split.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Split PDF: Separate Pages Into New Files | ToolNest by Vintayz",
         description="Split a PDF by page ranges, into equal parts or one file per page. Free and private: your PDF is split in your browser and never uploaded.",
         intro="Split one PDF into several smaller files: by page ranges, into equal parts, or one file for every page.",
         chips=PDF_CHIPS,
         related=["pdf-extract-pages", "pdf-merge", "pdf-delete-pages"]),
    dict(tool="pdf-compress", src="pdf-compress.html", script="pdf-compress.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Compress PDF: Reduce File Size Privately | ToolNest by Vintayz",
         description="Make a PDF smaller for email and uploads. Photos are re-saved at a smaller size while text stays sharp. Free, and your file never leaves your device.",
         intro="Make a PDF smaller so it's easier to email or upload. Photos inside it are re-saved at a smaller size, while text and drawings stay sharp.",
         chips=PDF_CHIPS,
         related=["pdf-split", "pdf-to-jpg", "pdf-merge"]),
    dict(tool="pdf-rotate", src="pdf-rotate.html", script="pdf-rotate.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Rotate PDF Pages Free, Without Uploading | ToolNest by Vintayz",
         description="Rotate one page or every page of a PDF by 90 or 180 degrees and save it. Free, with no quality loss, and it all happens in your browser.",
         intro="Turn sideways or upside-down PDF pages the right way up. Rotate single pages or the whole document, with no loss of quality.",
         chips=PDF_CHIPS,
         related=["pdf-rearrange", "pdf-delete-pages", "pdf-merge"]),
    dict(tool="pdf-delete-pages", src="pdf-delete-pages.html", script="pdf-delete-pages.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Delete Pages from a PDF, Free and Private | ToolNest by Vintayz",
         description="Remove unwanted pages from a PDF. Tap the pages or type their numbers, then save a new PDF. Free, and your file is never uploaded.",
         intro="Remove blank, extra or private pages from a PDF and save a new copy without them.",
         chips=PDF_CHIPS,
         related=["pdf-extract-pages", "pdf-rearrange", "pdf-split"]),
    dict(tool="pdf-extract-pages", src="pdf-extract-pages.html", script="pdf-extract-pages.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Extract Pages from a PDF, Free Online | ToolNest by Vintayz",
         description="Save selected pages of a PDF as a new file. Tap the pages or type ranges like 2-5. Free, and your PDF never leaves your device.",
         intro="Pick the pages you need from a PDF and save just those pages as a new file.",
         chips=PDF_CHIPS,
         related=["pdf-split", "pdf-delete-pages", "pdf-merge"]),
    dict(tool="pdf-rearrange", src="pdf-rearrange.html", script="pdf-rearrange.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Rearrange PDF Pages: Reorder for Free | ToolNest by Vintayz",
         description="Drag PDF pages into a new order, or reverse them, and save. Bookmarks and links keep working. Free and private: nothing is uploaded.",
         intro="Put the pages of a PDF in a new order by dragging them or using the arrows, then save the PDF.",
         chips=PDF_CHIPS,
         related=["pdf-rotate", "pdf-delete-pages", "pdf-merge"]),
    dict(tool="pdf-jpg-to-pdf", src="pdf-jpg-to-pdf.html", script="pdf-jpg-to-pdf.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="JPG to PDF Converter, Free and Private | ToolNest by Vintayz",
         description="Turn JPG, PNG and other pictures into one PDF, one picture per page. Choose A4 or Letter and margins. Free, and your photos never leave your device.",
         intro="Turn photos, scans and screenshots into a single PDF, one picture per page. JPG, PNG, WebP and GIF all work.",
         chips=PDF_CHIPS,
         related=["pdf-to-jpg", "pdf-merge", "pdf-compress"]),
    dict(tool="pdf-to-jpg", src="pdf-to-jpg.html", script="pdf-to-jpg.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="PDF to JPG Converter, Free and Private | ToolNest by Vintayz",
         description="Save PDF pages as high-quality JPG or PNG pictures, at up to 300 DPI. Free, no sign-up, and your PDF is converted in your browser, not uploaded.",
         intro="Save the pages of a PDF as JPG or PNG pictures, for slides, social posts or anywhere a PDF won't open.",
         chips=PDF_CHIPS,
         related=["pdf-jpg-to-pdf", "pdf-extract-pages", "pdf-compress"]),
    dict(tool="pdf-page-numbers", src="pdf-page-numbers.html", script="pdf-page-numbers.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Add Page Numbers to a PDF, Free Online | ToolNest by Vintayz",
         description="Number the pages of a PDF: choose the corner, the style (like Page 1 of 10) and the first number. Free, and your file never leaves your device.",
         intro="Add page numbers to a PDF in the corner and style you choose, such as “Page 1 of 10”.",
         chips=PDF_CHIPS,
         related=["pdf-watermark", "pdf-merge", "pdf-rearrange"]),
    dict(tool="pdf-watermark", src="pdf-watermark.html", script="pdf-watermark.js", libs=PDF_LIBS, updated=PDF_DAY,
         title="Add a Watermark to a PDF, Free and Private | ToolNest by Vintayz",
         description="Stamp DRAFT, CONFIDENTIAL or your own text across PDF pages. Choose the size, colour and strength. Free, and your file is never uploaded.",
         intro="Stamp a word or phrase such as DRAFT or CONFIDENTIAL across the pages of a PDF.",
         chips=PDF_CHIPS,
         related=["pdf-page-numbers", "pdf-compress", "pdf-merge"]),

    dict(path="resume-maker/", src="resume-maker.html", kind="section", nav="resume", updated=RESUME_DAY,
         title="Free Resume & CV Maker by Country | ToolNest by Vintayz",
         description="Free resume and CV makers for the US, UK, Canada and Australia. Each follows that country's official careers advice. PDF download, no sign-up.",
         h1="Resume and CV Maker",
         intro="Free resume and CV makers built for the country you're applying in. Everything runs in your browser, and you download a ready-to-send PDF.",
         chips=RESUME_CHIPS + ["{{icon:globe}} US · UK · Canada · Australia"]),
    dict(tool="resume-us", src="resume-us.html", script="resume-us.js", libs=RESUME_LIBS, updated=RESUME_DAY,
         title="Free Resume Builder (US Format, PDF) | ToolNest by Vintayz",
         description="Build a US resume that follows CareerOneStop advice: Letter size, 1 to 2 pages, no birthdate. Free PDF download, no sign-up, nothing uploaded.",
         intro="Build a clean, one-column US resume and download it as a PDF. It follows the US Department of Labor's CareerOneStop advice, and nothing you type leaves your device.",
         chips=["{{flag:us}} US format, Letter size"] + RESUME_CHIPS,
         related=["resume-uk", "resume-ca", "resume-au"]),
    dict(tool="resume-uk", src="resume-uk.html", script="resume-uk.js", libs=RESUME_LIBS, updated=RESUME_DAY,
         title="Free CV Maker (UK Format, PDF) | ToolNest by Vintayz",
         description="Make a UK CV on A4 that follows National Careers Service advice: personal profile, no date of birth, references line. Free PDF, nothing uploaded.",
         intro="Write a UK-style CV and download it as a PDF. It follows the National Careers Service's advice, fits on A4, and nothing you type leaves your device.",
         chips=["{{flag:uk}} UK format, A4"] + RESUME_CHIPS,
         related=["resume-us", "resume-au", "resume-ca"]),
    dict(tool="resume-ca", src="resume-ca.html", script="resume-ca.js", libs=RESUME_LIBS, updated=RESUME_DAY,
         title="Free Canadian Resume Builder (PDF) | ToolNest by Vintayz",
         description="Build a Canadian resume that follows Job Bank advice: two pages at most, no photo or SIN, volunteer work included. Free PDF, nothing uploaded.",
         intro="Build a Canadian resume and download it as a PDF. It follows the Government of Canada's Job Bank advice, and nothing you type leaves your device.",
         chips=["{{icon:globe}} Canadian format, Letter size"] + RESUME_CHIPS,
         related=["resume-us", "resume-uk", "resume-au"]),
    dict(tool="resume-au", src="resume-au.html", script="resume-au.js", libs=RESUME_LIBS, updated=RESUME_DAY,
         title="Free Australian Resume Builder (PDF) | ToolNest by Vintayz",
         description="Create an Australian resume on A4 with a personal summary, key skills and referees, following Workforce Australia's template. Free PDF download.",
         intro="Create an Australian resume and download it as a PDF. It follows Workforce Australia's resume template, and nothing you type leaves your device.",
         chips=["{{icon:globe}} Australian format, A4"] + RESUME_CHIPS,
         related=["resume-uk", "resume-us", "resume-ca"]),

    # Hub pages
    dict(path="business/", src="business.html", kind="section", nav="business",
         title="Business & E-Commerce Calculators | ToolNest by Vintayz",
         description="Free business calculators: profit margin, markup, break-even analysis and payment processing fee comparisons. Instant and private.",
         h1="Business & E-Commerce Tools",
         intro="Free financial calculators for small business owners, online stores, and digital agencies to price products and protect margins.",
         chips=TOOL_CHIPS + [CURRENCY_CHIP]),
    dict(path="career/", src="career.html", kind="section", nav="career",
         title="Career & Salary Calculators | ToolNest by Vintayz",
         description="Free salary calculators: convert an annual salary to hourly, daily, weekly and monthly pay, and compare pay across different working hours.",
         h1="Career & Salary Calculators",
         intro="Convert your compensation, compare hourly vs salary, and evaluate your earnings across different working schedules.",
         chips=TOOL_CHIPS + [CURRENCY_CHIP]),
    dict(path="education/", src="education.html", kind="section", nav="education",
         title="Student & Writing Tools | ToolNest by Vintayz",
         description="Free writing and academic tools: word counter, readability analyzer, speaking time and college GPA calculator. Private in your browser.",
         h1="Student & Writing Tools",
         intro="Analyze text metrics, check readability scores, and calculate cumulative college GPA on a 4.0 scale.",
         chips=["{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"]),

    # Invoice Generator
    dict(tool="invoice-generator", src="invoice-generator.html", script="invoice-generator.js", libs=["vendor/pdf-lib/pdf-lib.min.js"],
         title="Freelance Invoice Generator, Free PDF | ToolNest by Vintayz",
         description="Make a professional freelance invoice and download it as a PDF, free. No sign-up and no watermark. Your details never leave your device.",
         intro="Generate clean, professional invoices and download them as PDFs. Runs completely in your browser with zero server uploads.",
         chips=[CURRENCY_CHIP, "{{icon:lock}} Files never leave your device", "{{icon:check}} Free, no watermark"],
         related=["hourly-rate", "late-payment", "project-pricing"]),

    # Business Tools
    dict(tool="profit-margin", src="profit-margin.html", script="profit-margin.js",
         title="Profit Margin & Markup Calculator | ToolNest by Vintayz",
         description="Calculate gross margin, markup percentage, and net profit from your costs and selling price. Free, in USD, GBP, CAD or AUD.",
         intro="Find your gross margin, markup percentage and net profit from your direct costs and selling price.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["break-even", "payment-fee", "project-pricing"]),

    dict(tool="break-even", src="break-even.html", script="break-even.js",
         title="Break-Even Analysis Calculator | ToolNest by Vintayz",
         description="Free break-even calculator: find how many units and how much revenue you need to cover your fixed costs, with a profit and loss table.",
         intro="Work out how many units you need to sell to cover your fixed overheads and start making a profit.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["profit-margin", "payment-fee", "hourly-rate"]),

    dict(tool="payment-fee", src="payment-fee.html", script="payment-fee.js",
         title="Stripe & PayPal Fee Calculator | ToolNest by Vintayz",
         description="Work out Stripe, PayPal and Square card fees on any amount, see your net payout, and find how much to invoice so you still receive the full amount.",
         intro="Calculate payment gateway processing fees, see your net payout, and find the gross-up amount to charge to cover transaction fees.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["profit-margin", "invoice-generator", "project-pricing"]),

    # Career Tools
    dict(tool="salary-to-hourly", src="salary-to-hourly.html", script="salary-to-hourly.js",
         title="Salary to Hourly Calculator | ToolNest by Vintayz",
         description="Convert annual salary to hourly, daily, weekly, bi-weekly and overtime wage equivalents. Customize hours and paid weeks.",
         intro="Convert an annual salary into equivalent hourly, daily, weekly, bi-weekly and overtime rates based on your work schedule.",
         chips=[CURRENCY_CHIP] + TOOL_CHIPS,
         related=["hourly-to-annual", "us-1099-vs-w2", "billable-hours"]),

    # Student & Writing Tools
    dict(tool="word-counter", src="word-counter.html", script="word-counter.js",
         title="Word Counter & Readability Analyzer | ToolNest by Vintayz",
         description="Count words, characters, sentences, paragraphs, reading time, speaking time and Flesch reading ease level. 100% private in browser.",
         intro="Analyze text metrics, character counts, reading time, and reading grade level directly inside your browser.",
         chips=["{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"],
         related=["gpa-calculator", "resume-us", "invoice-generator"]),

    dict(tool="gpa-calculator", src="gpa-calculator.html", script="gpa-calculator.js",
         title="College GPA Calculator (4.0 Scale) | ToolNest by Vintayz",
         description="Calculate your semester or cumulative college GPA on a 4.0 scale, weighted by course credits. Free, private and easy to use on your phone.",
         intro="Calculate your college semester and cumulative grade point average on a standard 4.0 scale with credit weighting.",
         chips=["{{icon:check}} Free, no sign-up", "{{icon:lock}} Runs in your browser"],
         related=["word-counter", "salary-to-hourly"]),

    dict(path="about/", src="about.html", kind="legal", nav="about", updated=PDF_DAY,
         title="About ToolNest by Vintayz", h1="About ToolNest",
         description="ToolNest builds free, accurate calculators for freelancers and self-employed people in the US, UK, Canada and Australia."),
    dict(path="contact/", src="contact.html", kind="legal",
         title="Contact ToolNest by Vintayz", h1="Contact Us",
         description="Get in touch with ToolNest to report a mistake, suggest a new calculator or ask a question."),
    dict(path="privacy-policy/", src="privacy-policy.html", kind="legal", updated="2026-09-30",
         title="Privacy Policy | ToolNest by Vintayz", h1="Privacy Policy",
         description="How ToolNest handles personal information, cookies and analytics, and your privacy rights in the UK, the US and India."),
    dict(path="terms/", src="terms.html", kind="legal", updated=PDF_DAY,
         title="Terms of Use | ToolNest by Vintayz", h1="Terms of Use",
         description="The terms that apply when you use the ToolNest website and calculators."),
    dict(path="disclaimer/", src="disclaimer.html", kind="legal", updated=PDF_DAY,
         title="Disclaimer | ToolNest by Vintayz", h1="Disclaimer",
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
    "chevron": '<path d="M6 9l6 6 6-6"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "formula": '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7.5h8M8.5 12.5l3 3M11.5 12.5l-3 3M14 14h3"/>',
    "refresh": '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    "file": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    "upload": '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    "merge": '<path d="M7 3v4a5 5 0 0 0 5 5 5 5 0 0 1 5-5V3"/><path d="M12 12v9M8.5 17.5L12 21l3.5-3.5"/>',
    "split": '<path d="M12 3v9M8.5 6.5L12 3l3.5 3.5"/><path d="M12 12a5 5 0 0 0-5 5v4M12 12a5 5 0 0 1 5 5v4"/>',
    "compress": '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    "rotate": '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    "trash": '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    "extract": '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/><path d="M15 3h6v6M11 13L21 3"/>',
    "grid": '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    "image": '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    "hash": '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
    "droplet": '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "moon": '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    "resume": '<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="9" r="2.2"/><path d="M8.5 14.5c.8-1.4 2-2 3.5-2s2.7.6 3.5 2M9 18h6"/>',
    "percent": '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    "card": '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    "type-icon": '<polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/>',
    "award": '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>',
}


def icon(name, cls="icon"):
    return (f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{ICONS[name]}</svg>')


# Logo mark (also the favicon): a gold serif "T" whose foot is the open jaw of a wrench,
# in a thin gold frame on navy. Drawn by hand for ToolNest.
LOGO = ('<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">'
        '<rect width="32" height="32" rx="8" fill="#0b1b34"/>'
        '<rect x="2.75" y="2.75" width="26.5" height="26.5" rx="5.5" fill="none" stroke="#d9b26a" stroke-opacity=".5" stroke-width=".8"/>'
        '<path fill="#d9b26a" d="M7.5 7H24.5V11.8C24.1 10.2 23.1 9.2 21.4 9.2H17.5V17.46'
        'A4.4 4.4 0 0 1 15.51 25.97L16.93 22.92A1.4 1.4 0 0 0 14.39 21.73L12.97 24.79A4.4 4.4 0 0 1 14.5 17.46'
        'V9.2H10.6C8.9 9.2 7.9 10.2 7.5 11.8Z"/></svg>')

_flag_count = [0]


def flag(code, decorative=False):
    """Simplified US and UK flags, drawn as SVG (emoji flags don't show on Windows).
    decorative=True hides the flag from screen readers when the country name is written next to it."""
    _flag_count[0] += 1
    n = _flag_count[0]
    if code == "us":
        # 13 stripes on a 26-unit-high canvas: red base with 6 white stripes, blue canton.
        stripes = "".join(f'<rect y="{i * 2}" width="38" height="2" fill="#fff"/>' for i in range(1, 13, 2))
        label = 'aria-hidden="true"' if decorative else 'role="img" aria-label="United States"'
        return (f'<svg class="flag" viewBox="0 0 38 26" {label}>'
                f'<rect width="38" height="26" fill="#b22234"/>{stripes}'
                '<rect width="15.2" height="14" fill="#3c3b6e"/></svg>')
    if code == "uk":
        label = 'aria-hidden="true"' if decorative else 'role="img" aria-label="United Kingdom"'
        return (f'<svg class="flag" viewBox="0 0 60 30" {label}>'
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
    # Words the hub search box matches against (assets/js/tool-search.js).
    words = html.escape(" ".join([t["name"], t["card"], t["short"], t.get("keywords", "")]).lower(), quote=True)
    return f"""<li><a class="card" href="{up}{t['path']}" data-search="{words}">
  <div class="card-top"><span class="card-icon">{icon(t['icon'])}</span><span class="badge">Free</span></div>
  <h3>{t['card']}</h3>
  <p>{t['short']}</p>
  <span class="go">{t.get('go', 'Open calculator')} {icon('arrow')}</span>
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
        if key == "featured":
            return "\n".join(tool_card(s, up) for s, t in TOOLS.items() if t.get("parent") == arg and t.get("featured"))
        if key == "soon":
            return "\n".join(soon_card(*c) for c in SOON[arg])
        raise KeyError(m.group(0))
    return re.sub(r"\{\{(\w+)(?::([\w-]+))?\}\}", sub, text)


# schema.org applicationCategory for tool pages, by tool key or by section. Anything
# not listed is a FinanceApplication (the money calculators).
APP_CATEGORY = {
    "pdf": "UtilitiesApplication",
    "resume": "BusinessApplication",
    "business": "BusinessApplication",
    "education": "EducationalApplication",
    "invoice-generator": "BusinessApplication",
}


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
            "applicationCategory": APP_CATEGORY.get(page["tool"], APP_CATEGORY.get(page["parent"], "FinanceApplication")),
            "operatingSystem": "Any",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        })
    data = json.dumps({"@context": "https://schema.org", "@graph": graph}, indent=2, ensure_ascii=False)
    return f'<script type="application/ld+json">\n{data}\n</script>'


# The header's Country menu: (nav key, name, path). US and UK have drawn flags; the others show a code.
COUNTRIES = [("us", "United States", "us/"), ("uk", "United Kingdom", "uk/"),
             ("ca", "Canada", "ca/"), ("au", "Australia", "au/")]


def header(page, up):
    home = up or "./"
    nav = page.get("nav")

    def cur(name):
        return ' aria-current="page"' if nav == name else ""

    def country(key, name, path):
        mark = flag(key, decorative=True) if key in ("us", "uk") else f'<span class="code" aria-hidden="true">{key.upper()}</span>'
        return f'<li><a href="{up}{path}"{cur(key)}>{mark}{name}</a></li>'

    countries = "\n".join("              " + country(*c) for c in COUNTRIES)
    in_country = " is-current" if nav in [c[0] for c in COUNTRIES] else ""

    # The Country menu is a <details> element, so it opens and closes without JavaScript.
    # common.js only adds closing on Escape and on a click outside.
    return f"""<a class="skip-link" href="#main">Skip to content</a>

<header class="site-header">
  <div class="container">
    <a class="logo" href="{home}">{LOGO}ToolNest<span class="logo-by">by {OWNER}</span></a>
    <nav class="site-nav" aria-label="Main">
      <ul>
        <li class="hide-md"><a href="{home}"{cur('home')}>Home</a></li>
        <li><a href="{up}freelance/"{cur('tools')}>Calc<span class="hide-sm-inline">ulators</span></a></li>
        <li><a href="{up}pdf/"{cur('pdf')}>PDF<span class="hide-sm-inline"> tools</span></a></li>
        <li><a href="{up}resume-maker/"{cur('resume')}>Resume</a></li>
        <li>
          <details class="nav-menu">
            <summary class="nav-menu-button{in_country}">{icon('globe')}<span class="nav-label">Country</span>{icon('chevron', 'icon nav-chevron')}</summary>
            <ul class="nav-menu-list">
{countries}
            </ul>
          </details>
        </li>
        <li class="hide-md"><a href="{up}about/"{cur('about')}>About</a></li>
        <li class="hide-md"><a class="nav-cta" href="{up}{TOOLS['hourly-rate']['path']}">Rate calculator</a></li>
        <li><button type="button" class="theme-switch" id="theme-toggle" role="switch" aria-checked="false" aria-label="Dark mode" hidden><span class="theme-switch-track" aria-hidden="true">{icon('sun', 'icon icon-sun')}{icon('moon', 'icon icon-moon')}<span class="theme-switch-knob"></span></span></button></li>
      </ul>
    </nav>
  </div>
</header>"""


def footer(up):
    home = up or "./"

    def links(group, featured_only=False):
        return "\n".join(f'          <li><a href="{up}{t["path"]}">{t["card"][0].upper() + t["card"][1:]}</a></li>'
                         for t in TOOLS.values()
                         if t["group"] in group and (t.get("featured") or not featured_only))

    return f"""<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="logo" href="{home}">{LOGO}ToolNest<span class="logo-by">by {OWNER}</span></a>
        <p class="about-text">Free, accurate money calculators for freelancers and self-employed people in the US, UK, Canada and Australia, plus PDF tools that never upload your files.</p>
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
          <li><a href="{up}ca/">Canada</a></li>
          <li><a href="{up}au/">Australia</a></li>
        </ul>
      </nav>
      <nav aria-label="PDF tools">
        <h2>PDF tools</h2>
        <ul>
{links(('pdf-organize', 'pdf-convert', 'pdf-edit'), featured_only=True)}
          <li><a href="{up}pdf/">All PDF tools</a></li>
        </ul>
      </nav>
      <nav aria-label="Resume and CV makers">
        <h2>Resume &amp; CV</h2>
        <ul>
{links(('resume',))}
          <li><a href="{up}resume-maker/">All resume makers</a></li>
        </ul>
      </nav>
      <nav aria-label="Business tools">
        <h2>Business</h2>
        <ul>
{links(('business-pricing', 'business-ops'))}
          <li><a href="{up}business/">All business tools</a></li>
        </ul>
      </nav>
      <nav aria-label="Career tools">
        <h2>Career &amp; Salary</h2>
        <ul>
{links(('career-salary',))}
          <li><a href="{up}career/">All career tools</a></li>
        </ul>
      </nav>
      <nav aria-label="Writing and study tools">
        <h2>Writing &amp; Study</h2>
        <ul>
{links(('education-writing', 'education-gpa'))}
          <li><a href="{up}education/">All study tools</a></li>
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
      <p>© <span id="year">{TODAY[:4]}</span> {OWNER}. ToolNest is part of {OWNER}. All rights reserved.</p>
      <p>Estimates only. Not tax, legal or financial advice.</p>
    </div>
  </div>
</footer>"""


def tool_bars(section, up):
    """A scrollable list of bars, one per tool in a section (popular ones first), beside the hub
    search box. Plain links, so they work without JavaScript; tool-search.js filters them and
    turns them into a 3D deck: one bar faces you in the middle, the rest stacked above and below."""
    slugs = sorted((s for s, t in TOOLS.items() if t.get("parent") == section),
                   key=lambda s: not TOOLS[s].get("featured"))
    bars = []
    for s in slugs:
        t = TOOLS[s]
        words = html.escape(" ".join([t["name"], t["card"], t["short"], t.get("keywords", "")]).lower(), quote=True)
        bars.append(f"""        <li><a class="tool-bar" href="{up}{t['path']}" data-search="{words}">
          <span class="tool-bar-icon">{icon(t['icon'])}</span>
          <span class="tool-bar-text"><strong>{t['card']}</strong><span>{t['short']}</span></span>
          <span class="tool-bar-go">{icon('arrow')}</span>
        </a></li>""")
    name = PARENTS[section][0].replace(" Tools", " tools")
    return f"""
    <nav class="tool-bars-wrap" aria-label="All {name}">
      <p class="tool-bars-label" aria-hidden="true">All {len(slugs)} {name}</p>
      <div class="tool-deck-frame">
        <div class="tool-deck-bar">
          <button type="button" class="deck-switch" id="deck-switch" role="switch" aria-checked="true" hidden>
            <span class="deck-switch-text">Animation</span><span class="deck-switch-track" aria-hidden="true"></span>
          </button>
        </div>
        <div class="tool-deck" id="tool-deck">
        <ul class="tool-bars" id="tool-bars">
{chr(10).join(bars)}
        </ul>
        </div>
      </div>
    </nav>"""


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
    search = ""
    if page.get("search"):
        # Filters the cards below as you type (assets/js/tool-search.js). Nothing typed leaves the page.
        label, example, section = page["search"]
        search = f"""
    <div class="hub-search" role="search">
      <label class="visually-hidden" for="tool-search">{label}</label>
      <span class="hub-search-icon">{icon('search')}</span>
      <input id="tool-search" type="search" placeholder="Search, e.g. {example}" autocomplete="off" spellcheck="false" enterkeyhint="go" data-noun="{label.replace('Search ', '')}">
    </div>
    <p class="search-status" id="tool-search-status" role="status" aria-live="polite"></p>"""
        # Two columns on wide screens: words and search on the left, the list of tools on the right.
        return f"""<section class="page-hero">
  <div class="container hub-hero">
    <div class="hub-hero-main">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol>{''.join(crumbs)}</ol></nav>
    <h1>{page['h1']}</h1>{intro}{chips}{search}
    </div>{tool_bars(section, up)}
  </div>
</section>"""
    return f"""<section class="page-hero">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol>{''.join(crumbs)}</ol></nav>
    <h1>{page['h1']}</h1>{intro}{chips}{search}
  </div>
</section>"""


def related(page, up):
    cards = "\n".join(tool_card(s, up) for s in page.get("related", []))
    return f"""<section class="section">
    <div class="section-head"><div><span class="kicker">Keep going</span><h2>Related tools</h2></div>
      <a class="btn btn-sm" href="{up}{PARENTS[page['parent']][1]}">All {PARENTS[page['parent']][0].replace('Freelancer Tools', 'freelancer').replace('PDF Tools', 'PDF').replace('Resume & CV Maker', 'resume and CV')} tools</a></div>
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
    if page["parent"] == "pdf":
        note = ("<strong>Keep your original:</strong> this tool makes a new copy of your file on your own device. "
                "We never see your files, so we can't recover them for you. Check the new PDF before you delete the "
                "original or send it to anyone.")
    elif page["parent"] == "resume":
        note = ("<strong>Please note:</strong> this tool lays out your details; it can't promise interviews or job "
                "offers. The advice on this page is general guidance from official careers services, and employers' "
                "expectations vary, so always follow the instructions in the job advert. Check your PDF before you send it.")
    else:
        note = ("<strong>Disclaimer:</strong> results are estimates for planning only and are not tax, legal or "
                "financial advice. Rules and rates vary by country, state and personal situation. Check with a "
                "qualified accountant before making decisions.")
    return f"""{hero}
<div class="container">
{body}
  {related(page, up)}
  <div class="content">
    <div class="disclaimer">
      <p>{note} <a href="{up}disclaimer/">Read the full disclaimer</a>.</p>
    </div>
    {updated_line(page)}
  </div>
</div>"""


_asset_versions = {}


def asset(rel):
    """Address of a file in public/assets/ with a fingerprint of its contents, e.g.
    assets/js/common.js?v=3fa9c1d2. Browsers keep assets for a week (HEADERS), so the
    fingerprint makes them fetch a file again as soon as it changes."""
    if rel not in _asset_versions:
        with open(os.path.join(OUT, "assets", *rel.split("/")), "rb") as f:
            _asset_versions[rel] = hashlib.sha1(f.read()).hexdigest()[:8]
    return f"assets/{rel}?v={_asset_versions[rel]}"


def render(page):
    up = "../" * depth_of(page["path"])
    with open(os.path.join(SRC, page["src"]), encoding="utf-8") as f:
        body = f.read()
    main_html = expand(main_content(page, up, body), up)
    canonical = f"{DOMAIN}/{page['path']}"
    scripts = [f'<script src="{up}{asset("js/common.js")}"></script>']
    for lib in page.get("libs", []):
        scripts.append(f'<script src="{up}{asset(lib)}"></script>')
    if page.get("script"):
        scripts.append(f'<script src="{up}{asset("js/tools/" + page["script"])}"></script>')
    scripts_html = "\n".join(scripts)

    verify = ""
    if page["kind"] == "home":
        if GOOGLE_SITE_VERIFICATION:
            verify += f'<meta name="google-site-verification" content="{GOOGLE_SITE_VERIFICATION}">\n'
        if BING_SITE_VERIFICATION:
            verify += f'<meta name="msvalidate.01" content="{BING_SITE_VERIFICATION}">\n'
    if ADSENSE_PUBLISHER_ID:  # AdSense asks for this on every page
        verify += f'<meta name="google-adsense-account" content="{ADSENSE_PUBLISHER_ID}">\n'

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
<meta property="og:locale" content="en_US">
<meta property="og:image" content="{DOMAIN}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ToolNest by Vintayz: free calculators and tools for freelancers">
<meta name="twitter:card" content="summary_large_image">
{verify}<link rel="icon" href="{up}favicon.svg" type="image/svg+xml">
<link rel="preload" href="{up}assets/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<script src="{up}{asset("js/theme.js")}"></script>
<link rel="stylesheet" href="{up}{asset("css/style.css")}">
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

# Permanent redirects for Cloudflare Pages. Canada and Australia moved to /ca/ and
# /au/ on 2026-09-29 to match /us/ and /uk/; keep these so old links still work.
REDIRECTS = """/canada /ca/ 301
/canada/ /ca/ 301
/canada/* /ca/:splat 301
/australia /au/ 301
/australia/ /au/ 301
/australia/* /au/:splat 301
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
    if ADSENSE_PUBLISHER_ID:
        pub = ADSENSE_PUBLISHER_ID.replace("ca-", "", 1)
        write("ads.txt", f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n")
    write("favicon.svg", FAVICON + "\n")
    write("_headers", HEADERS)
    write("_redirects", REDIRECTS)
    print(f"Built {len(PAGES)} pages into public/")


if __name__ == "__main__":
    main()
