# ToolNest 🧮

> **Working name.** Replace it everywhere once you choose and buy your final domain.

Free, fast, and accurate calculators and tools. We start with money tools for **freelancers and self-employed people in the United States, United Kingdom, Canada, and Australia**, then grow into a one-stop tool site for every field, all on **one domain**.

**Project started:** 28 September 2026. Day 1 of a new era. 🚀

---

## 1. Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Target countries | 🇺🇸 United States, 🇬🇧 United Kingdom, 🇨🇦 Canada, 🇦🇺 Australia | Four high-paying, English-speaking markets |
| Country rollout | Global tools serve all four from day one. Tax tools launch one country at a time: US → UK → Canada → Australia | Every country has its own tax system, so tax tools are 4x the work and must be built carefully |
| Currency | Selector on global tools: USD, GBP, CAD, AUD | One page serves every country |
| First audience | Freelancers and self-employed people | Real money questions, high advertiser value, less crowded than mortgage/loan tools |
| Domain | One `.com`, each topic as a subfolder | A `.com` works for all four countries (a `.co.uk` would tie you to one), trust is shared across sections, and there's only one yearly cost |
| Tech stack | Plain HTML, CSS, and JavaScript | Fast pages, free hosting, easy to build with AI help |
| Hosting | Cloudflare Pages, GitHub Pages, or Netlify (free) | Calculators run in the browser, so no server is needed |
| Income | Display ads + affiliate links, premium ad networks later | Ads pay per visit, affiliates pay per signup |

---

## 2. Roadmap

We build **one section at a time**. The next stage starts only after the current one is live and getting traffic.

| Stage | Section | URL | Status |
|---|---|---|---|
| 1 | Freelancer money tools | `/freelance/`, `/us/`, `/uk/`, `/canada/`, `/australia/` | 🟢 Built (30 tools), waiting to launch |
| 2 | Salary and career calculators | `/career/` | ⚪ Planned |
| 3 | Resume maker and cover letter tools | `/resume-maker/` | ⚪ Planned |
| 4 | Business tools (invoices, margins, sales tax) | `/business/` | ⚪ Planned |
| 5 | Health, education, unit converters, and more | `/health/`, `/education/`, etc. | ⚪ Planned |

---

## 3. Stage 1 Checklist: Freelancer Money Tools

### Phase A: Global evergreen tools (pure math, serve all 4 countries, currency selector)
- [x] Freelance hourly rate calculator ⭐ **build this first**
- [x] Contractor day rate calculator (UK contractors often price by the day)
- [x] Project pricing calculator
- [x] Hourly to annual income calculator
- [x] Billable hours calculator
- [x] Late payment interest calculator

### Phase B: Money planning tools
- [x] Emergency fund calculator for freelancers
- [x] Retirement savings calculator (global compound-growth planner; SEP IRA / Solo 401(k) limits could be a later US tool)
- [x] Income smoothing calculator for irregular pay

### Phase C: Country tax tools (high value, verify every number, see Section 7)

Build one country completely before starting the next.

#### C1: 🇺🇸 United States → `/us/` (tax year 2026)
- [x] Self-employment tax calculator
- [x] Quarterly estimated tax calculator
- [x] 1099 vs W-2 comparison calculator
- [x] Freelancer take-home pay calculator
- [x] Business mileage deduction calculator
- [x] Home office deduction calculator

#### C2: 🇬🇧 United Kingdom → `/uk/` (tax year 2026 to 2027)
- [x] Self-employed tax and National Insurance calculator
- [x] Self Assessment payments on account calculator
- [x] Sole trader vs limited company calculator
- [x] Business mileage allowance calculator
- [x] Working from home expenses calculator

#### C3: 🇨🇦 Canada → `/canada/` (tax year 2026; federal + CPP exact, provincial is the visitor's estimate)
- [x] Self-employed tax calculator (including CPP contributions)
- [x] Quarterly tax instalments calculator
- [x] Employee vs contractor comparison calculator
- [x] GST/HST calculator (simple and popular, can be built early)

#### C4: 🇦🇺 Australia → `/australia/` (income year 2026–27)
- [x] Sole trader tax calculator (including Medicare levy)
- [x] GST calculator (simple and popular, can be built early)
- [x] Employee vs contractor comparison calculator
- [x] Voluntary super contribution calculator

### Phase D: Bridge to Stage 4
- [ ] Freelance invoice generator

---

## 4. Folder Structure and How to Build

Only the `public/` folder is published. Everything else (plans, legal notes, source files) stays private.

```
toolnest/
├── README.md                  # This file
├── LEGAL.md                   # Legal rulebook: read before any change
├── CLAUDE.md                  # Instructions Claude Code reads automatically
├── AGENTS.md                  # Instructions for other AI tools
├── build.py                   # Page builder: shared header, footer, icons, page list
├── src/pages/                 # Page content (edit these, not public/**/index.html)
│   ├── home.html
│   ├── freelance.html
│   ├── hourly-rate.html ...   # One file per tool
│   └── privacy-policy.html ...
├── tests/run-tests.js         # Checks every calculator against hand-worked examples
└── public/                    # THE WEBSITE: deploy this folder
    ├── index.html, about/, contact/, privacy-policy/, terms/, disclaimer/
    ├── freelance/<tool-name>/index.html
    ├── sitemap.xml, robots.txt, favicon.svg   # generated by build.py
    ├── _headers                               # security headers for Cloudflare Pages
    └── assets/
        ├── css/style.css      # One stylesheet for the whole site
        ├── fonts/             # Self-hosted Inter font + its licence (OFL.txt)
        ├── js/common.js       # Shared helpers, calculator wiring, animations
        ├── js/tools/*.js      # One script per calculator (the formulas live here)
        ├── js/us-tax.js, uk-tax.js, ca-tax.js, au-tax.js   # Shared tax engines per country
        └── data/              # ALL official figures, one file per country (with sources)
            ├── tax-us.js, tax-uk.js, tax-ca.js, tax-au.js
            └── rates-uk.js    # UK late payment interest + Bank Rate history
```

**To change the site:**
1. Edit the page in `src/pages/`, a tool script in `public/assets/js/tools/`, or the layout in `build.py`.
2. Run `python build.py` to regenerate every page, the sitemap and robots.txt.
3. Run `node tests/run-tests.js`. All tests must pass before publishing.

**To add a new tool:** add it to `TOOLS` and `PAGES` in `build.py`, create `src/pages/<name>.html` and `public/assets/js/tools/<name>.js`, add 3+ test examples to `tests/run-tests.js`, then build and test.

**Cloudflare Pages settings:** build command: *(none)*, build output directory: `public`.

**URL structure (decided 2026-09-28: hybrid):**
- **Global tools** (same maths everywhere) have **one page each** in `/freelance/`, with a currency selector. Never copy them into country folders: near-identical pages count as duplicate content.
- **Country hubs** `/us/` and `/uk/` are live. Each links to the global tools and explains what's different in that country, with official IRS or GOV.UK sources.
- **Country tax tools** go inside their hub, e.g. `/us/self-employment-tax-calculator/` or `/uk/self-employed-tax-calculator/`. Their content is genuinely different, so no hreflang is needed.

---

## 5. Tool Page Template

Every tool page follows the same structure. This helps users, helps Google understand the page, and keeps quality consistent.

1. **H1 title** that matches what people search, e.g. "Freelance Hourly Rate Calculator"
2. **One-line intro** explaining what the tool does
3. **The calculator itself**, near the top of the page
4. **How to use it**, in 3 to 4 short steps
5. **How it's calculated**, showing the formula in plain words
6. **Worked example** with real numbers
7. **FAQ** with 3 to 5 questions people actually ask
8. **Related tools** linking to other calculators on the site
9. **Disclaimer and "Last updated" date**

Per-page SEO checklist:
- [ ] Unique `<title>` under ~60 characters
- [ ] Meta description under ~155 characters
- [ ] One H1 only
- [ ] Page works well on mobile
- [ ] Links to at least 2 related tools
- [ ] Added to `sitemap.xml`

---

## 6. First Tool Spec: Freelance Hourly Rate Calculator

**Inputs**

| Field | Example |
|---|---|
| Currency | USD (options: USD, GBP, CAD, AUD) |
| Desired yearly take-home income | $60,000 |
| Yearly business expenses (software, equipment, insurance) | $6,000 |
| Estimated total tax rate | 25% |
| Weeks off per year (vacation, holidays, sick days) | 4 |
| Hours worked per week | 40 |
| Billable percentage (time actually paid by clients) | 70% |

**Formula**

```
Working weeks        = 52 − weeks off
Billable hours/year  = working weeks × hours per week × billable %
Pre-tax profit       = desired take-home ÷ (1 − tax rate)
Revenue needed       = pre-tax profit + business expenses
Hourly rate          = revenue needed ÷ billable hours/year
```

Expenses are added *after* the tax step because business expenses are generally deductible, so tax applies to profit rather than total revenue.

**Worked example (use this to test the tool)**

```
Working weeks        = 52 − 4             = 48
Billable hours/year  = 48 × 40 × 0.70     = 1,344
Pre-tax profit       = 60,000 ÷ 0.75      = 80,000
Revenue needed       = 80,000 + 6,000     = 86,000
Hourly rate          = 86,000 ÷ 1,344     ≈ $63.99/hour
```

**Outputs to show:** hourly rate, day rate (8 hours), and monthly revenue target (revenue needed ÷ 12 ≈ $7,166.67).

---

## 7. Accuracy Rules (Non-Negotiable)

Money and tax tools are "Your Money or Your Life" content. Mistakes can hurt real people and damage the site's reputation with Google.

1. **Every tax figure comes from the country's official tax authority**, and the tool page links to it:

   | Country | Official source | Tax year | Update data file before |
   |---|---|---|---|
   | 🇺🇸 US | IRS (irs.gov) | 1 January – 31 December | January |
   | 🇬🇧 UK | HMRC (gov.uk) | 6 April – 5 April | 6 April |
   | 🇨🇦 Canada | CRA (canada.ca) | 1 January – 31 December | January |
   | 🇦🇺 Australia | ATO (ato.gov.au) | 1 July – 30 June | 1 July |

   Useful US resources include the IRS Self-Employment Tax page, Form 1040-ES (estimated tax), the standard mileage rates page, and Publication 587 (Business Use of Your Home).
2. **Each country's yearly figures live in its own data file** (`tax-us.js`, `tax-uk.js`, etc.), with the tax year clearly labelled. Never hard-code tax numbers inside individual tools.
3. **Yearly update:** new figures are usually announced a few months before each tax year starts (for example in government budgets or official announcements). Update the data file and every "Last updated" date before the dates in the table above.
4. **Test before publishing:** check every calculator against at least 3 examples worked out by hand or with an official IRS worksheet.
5. **Always show a disclaimer:** results are estimates, not tax or financial advice.

---

## 8. Content Rules

- AI helps write code and first drafts. **A human reviews, tests, and improves everything** before it goes live.
- No mass-produced or thin pages. Every page must be genuinely useful on its own.
- Add something original to each page: a clear worked example, a helpful tip, or a comparison people can't easily find elsewhere.
- Quality over quantity. Ten excellent tools beat fifty mediocre ones.

---

## 9. Legal Rules

All legal rules live in **[LEGAL.md](LEGAL.md)**, the single rulebook for the owner and for AI assistants. Read it before adding any page, tool, script, affiliate link or ad.

AI assistants get the rules automatically: Claude Code reads [CLAUDE.md](CLAUDE.md), and other AI tools read [AGENTS.md](AGENTS.md). Both point to LEGAL.md.

**Still to do before launch** (details in LEGAL.md):
- [ ] Replace `[Your full name]` on the About, Contact, Terms and Privacy Policy pages (edit the files in `src/pages/`, then run `python build.py`)
- [ ] Create the real contact email and replace `hello@toolnest.com` everywhere
- [ ] Turn on Cloudflare Web Analytics (cookie-free). Anything else means following LEGAL.md section 4 first.
- [ ] Trademark-search the final brand name before buying the domain (LEGAL.md section 10)

---

## 10. Launch Checklist

- [ ] Choose final brand name and buy a `.com` (check the **renewal** price, not just the first-year price)
- [ ] Create a GitHub repository and push this README
- [ ] Connect the repo to free hosting (Cloudflare Pages: no build command, output directory `public`)
- [ ] Point the domain to the hosting
- [x] Build the shared layout: header, footer, `style.css`
- [x] Build and test the Freelance Hourly Rate Calculator
- [x] Build and test all Phase A tools (101 automated checks pass)
- [x] Premium design, mobile layout and minimal animation
- [x] Create About, Contact, Privacy Policy, Terms, and Disclaimer pages (drafts: review before launch, replace the contact email)
- [x] Add `sitemap.xml` and `robots.txt` (update the domain once bought)
- [ ] **Cloudflare Web Analytics:** Cloudflare dashboard → your Pages project → Metrics → enable Web Analytics (cookie-free, already allowed by the security headers and named in the privacy policy)
- [ ] **Google Search Console:** add a "Domain" property and verify with the DNS record in Cloudflare (no code needed). Or use a "URL prefix" property and paste the HTML-tag code into `GOOGLE_SITE_VERIFICATION` in `build.py`, then rebuild and deploy
- [ ] In Search Console, submit `https://<your-domain>/sitemap.xml`
- [ ] **Bing Webmaster Tools:** sign in and choose "Import from Google Search Console" (or paste the code into `BING_SITE_VERIFICATION`). Bing also feeds ChatGPT search.
- [ ] After 2–4 weeks: Search Console → Performance → filter **Country = United States / United Kingdom** to see which searches bring each audience, then adjust page titles
- [ ] No Google Analytics unless you first add a cookie consent banner (LEGAL.md section 4)
- [ ] Share tools genuinely where freelancers ask pricing and tax questions (answer the question first, link only when it truly helps)

---

## 11. Monetization Plan

| When | What |
|---|---|
| Now | No ads. Focus fully on building great tools. |
| ~10–15 quality tools + steady search traffic | Apply for Google AdSense. If you get EU/UK visitors, AdSense requires a Google-certified cookie consent banner. |
| Alongside ads | Affiliate links for tools freelancers need (accounting, invoicing, business banking). Always disclose affiliate links clearly. |
| When traffic qualifies | Move to a premium ad network (e.g. Mediavine, Raptive) for higher earnings per visit. |

---

## 12. Budget

| Item | Yearly cost |
|---|---|
| Domain (.com) | ~₹800–1,200 first year (renewal may be higher) |
| Hosting | ₹0 |
| Code and tools | ₹0 |
| **Total** | **About the price of one domain** |

---

## 13. Milestones

| Month | Goal |
|---|---|
| 1 | Domain, hosting, layout, and all Phase A global tools live (with currency selector) |
| 2 | Phase B tools, essential pages, Search Console set up, simple GST calculators for Canada and Australia |
| 3 | 🇺🇸 US tax tools, each verified against IRS sources |
| 4–5 | 🇬🇧 UK tax tools, promotion, first backlinks, AdSense application |
| 6+ | 🇨🇦 Canada and 🇦🇺 Australia tax tools, start planning Stage 2 |

**Realistic expectation:** most new sites earn very little for the first 6–12 months. Consistency is what wins.

---

## 14. Progress Log

| Date | Update |
|---|---|
| 2026-09-28 | Project started. README created. First tool chosen: Freelance Hourly Rate Calculator. |
| 2026-09-28 | Target countries set: US, UK, Canada, Australia. Global tools first, tax tools one country at a time. |
| 2026-09-28 | Built shared layout, homepage, freelancer section page, Freelance Hourly Rate Calculator (tested against 3 examples), legal pages, sitemap and robots.txt. |
| 2026-09-28 | Legal pass for US + UK (solo operator in India): removed browser storage (no cookie banner needed), rewrote Privacy Policy, Terms, Disclaimer, Contact and About. Added Legal Compliance checklist. |
| 2026-09-28 | Created LEGAL.md (legal rulebook), CLAUDE.md and AGENTS.md so the owner and every AI follow the same rules. |
| 2026-09-28 | Premium redesign (navy fintech style, self-hosted Inter font, dark hero, results panel, mobile result bar, minimal animation). Added page builder (build.py), moved the site into public/, added security headers. Built all Phase A tools: contractor day rate, project pricing, hourly to annual, billable hours, late payment interest (UK figures verified on GOV.UK, legislation.gov.uk and the Bank of England). 101 automated checks pass. |
| 2026-09-28 | Added `/us/` and `/uk/` country hubs (hybrid structure: global tools stay single, country tax tools go in hubs). US/UK links with flags in header, footer and homepage. Official links and holiday counts checked on IRS, OPM and GOV.UK. |
| 2026-09-28 | Built Phase B (emergency fund, retirement savings, income smoothing) and all Phase C country tax tools: US (6), UK (5), Canada (4), Australia (4), plus /canada/ and /australia/ hubs. Every figure checked on IRS, SSA/IRS, GOV.UK/HMRC, CRA and ATO/Treasury sources. 30 tools, 39 pages, 383 automated checks pass. |
