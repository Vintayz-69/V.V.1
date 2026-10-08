# LEGAL.md: Rules We Never Break

**For:** the site owner and every AI assistant working on this project.
**Last reviewed:** 28 September 2026

> These rules are based on the main published US, UK and Indian laws and on Google's policies. They are not legal advice. Laws change, and an AI's knowledge can be out of date. If a rule matters for a real decision, check the official source or ask a professional.

---

## 0. How to use this file

1. **Before any change**, find the matching section below (new page, new tool, new script, affiliate link, ads, email…).
2. **If a change would break a rule, stop.** Don't publish it. Fix it first.
3. **If you're not sure, don't publish.** Ask, check the official source, or leave it out.
4. **After any change that affects visitors' data, money claims or legal pages**, add a line to the [Legal Change Log](#12-legal-change-log) at the bottom.

**Rule for AI assistants:** if the owner asks for something that breaks a rule here, don't do it silently. Say which rule it breaks and why, and suggest a legal way to get the same result. Never guess tax figures or legal facts. If you can't verify something, say so.

---

## 1. Our situation (the facts every rule depends on)

| Fact | Value |
|---|---|
| Who runs the site | One individual (solo), based in **India** |
| Visitors | Mainly **United States** and **United Kingdom** (later Canada and Australia) |
| Laws that apply | **UK:** UK GDPR, Data Protection Act 2018, PECR (cookies), Consumer Rights Act 2015, CAP Code, DMCC Act 2024, FCA rules. **US:** FTC Act and Endorsement Guides, California CalOPPA and CCPA, other state privacy laws, COPPA, CAN-SPAM, ADA. **India:** DPDP Act 2023, Income Tax Act, GST, FEMA |
| Terms governed by | Laws of India (visitors keep their own country's consumer protections) |
| Income | Google AdSense (later) + affiliate links (later) |
| Data we collect today | None from calculators, PDF tools (including signatures drawn in Sign PDF), resume, cover letter and resignation letter makers, the invoice and quote generators, the word counter, the citation generator or the games (they run in the browser; PDF and picture files are never uploaded). Hosting logs + cookie-free analytics (Cloudflare). Emails people send us. |
| Cookies / browser storage today | **None.** This is why we need no cookie banner. |

**If any fact in this table changes, the legal pages must change too.** Check sections 3 and 4.

---

## 2. Hard stops: never do these

### Privacy and data
- ❌ **Never add cookies, `localStorage`, `sessionStorage`, IndexedDB, tracking pixels or fingerprinting** without first following [section 4](#4-adding-any-third-party-service-or-storage). In the UK, anything stored on a visitor's device that isn't strictly necessary needs consent *before* it is set (PECR).
- ❌ **Never load anything from another company's server**, including Google Fonts, YouTube embeds, social share buttons, chat widgets, CDN scripts and external images, without following section 4. Each one sends the visitor's IP address to that company. (We use system fonts on purpose. If we ever want a custom font, host the font file ourselves.)
- ❌ **Never send calculator inputs anywhere.** No server, no analytics events, no query strings (`?income=60000` ends up in server logs). If we add "share your result" links, put the values after `#` (the hash is never sent to the server) and review the privacy policy first.
- ❌ **Never ask for identifying or sensitive information in a tool**, such as name, address, SSN, UK National Insurance number, UTR, bank details, date of birth or health information. Tools only need numbers.
- ❌ **Never add a form, newsletter, comment box or account system** without a privacy review (section 4) and, for email marketing, [section 8](#8-email-and-newsletters-future).

### Money, tax and advice
- ❌ **Never give personal advice.** Tools give *estimates*. Don't write "you should…" about someone's own financial decisions. Write "many freelancers…" or "an accountant can help you decide…".
- ❌ **Never promote loans, credit cards, buy-now-pay-later, investments, pensions, crypto or insurance to UK visitors** (not in ads you control, not through affiliate links, not in content) without checking FCA rules first. Credit broking and "financial promotions" can require FCA authorisation. It's a criminal offence to breach the financial promotion rules.
- ❌ **Never hard-code a tax figure inside a tool.** All figures live in `public/assets/data/` (one file per country), come from the official source, and show the tax year. See [section 6](#6-every-tax-tool).
- ❌ **Never guess a tax number.** If it can't be verified on IRS, HMRC, CRA or ATO websites, it doesn't go live.
- ❌ **Never claim or suggest a link with a government body** (IRS, HMRC, CRA, ATO). Don't use their logos, don't use "official" in our tool names, and don't design pages to look like government sites.

### Honesty (FTC, UK CAP Code, DMCC Act 2024)
- ❌ **No fake reviews, testimonials, ratings or user counts.** No "Trusted by 10,000 freelancers" unless it's true and we can prove it. No "As seen on" unless it happened.
- ❌ **No unlabelled affiliate links or sponsored content.** See [section 7](#7-affiliate-links).
- ❌ **No fake urgency or scarcity** ("Only 3 spots left!").
- ❌ **No misleading claims** about accuracy ("100% accurate", "IRS-approved").

### Copyright and trademarks
- ❌ **Never copy text, images, code or data** from other websites. Write our own. For code, only use libraries with a licence that allows it (MIT, Apache 2.0, BSD) and keep their licence notice.
- ❌ **Images:** only use images we made, AI images without real people or brands, or images with a clear licence (e.g. CC0, Unsplash licence). Record the source.
- ❌ **Never use another company's trademark to look like them**, e.g. naming a tool "TurboTax Calculator" or putting a brand in our domain name. Honest comparisons ("X vs Y") are fine if every claim is true and current.

### Children
- ❌ **Never target children** or design content for under-13s (COPPA, UK Children's Code).

### Google rules (not law, but breaking them loses our income)
- ❌ **Never click our own ads**, or ask anyone to click them ("support us by clicking ads").
- ❌ **Never buy traffic**, use bots, or pay for clicks or visits.
- ❌ **Never put ads where people click them by accident**, like right next to a calculator's input fields or buttons, or disguised as navigation or download buttons.
- ❌ **Never mass-produce thin pages with AI.** Google treats this as "scaled content abuse". Every page must be reviewed by a human and be genuinely useful (README section 8).

---

## 3. Every new page: checklist

- [ ] Footer links present: About, Contact, Privacy Policy, Terms, Disclaimer (California requires a visible "Privacy" link on the homepage; we put it on every page)
- [ ] Money or tax page? Show the disclaimer box and "Last updated" date
- [ ] No third-party requests (open the browser DevTools → Network tab: every request should go to our own domain, apart from services already listed in the privacy policy)
- [ ] No cookies or storage (DevTools → Application tab should be empty)
- [ ] No personal-data fields
- [ ] Accessibility: every input has a `<label>`, text contrast is at least 4.5:1, the page works with keyboard only, images have `alt` text (US ADA lawsuits, UK Equality Act)
- [ ] Claims are true and can be backed up
- [ ] Written or reviewed by a human; nothing copied
- [ ] Added to `sitemap.xml`

---

## 4. Adding any third-party service or storage

Examples: analytics, fonts, video embeds, ad code, affiliate widgets, forms, newsletter tools, comment systems, chat, error tracking, and any `localStorage` or cookie.

**Before adding it, answer these:**

| Question | If yes… |
|---|---|
| Does it store anything on the visitor's device (cookie, storage, pixel)? | UK visitors must **opt in first** unless it's strictly necessary for something they asked for. Needs a consent tool. |
| Does it receive visitors' IP address or other personal data? | Add it to the privacy policy (who, what, why, legal basis, how long). |
| Does it track people across websites or show personalised ads? | Update the US state rights and California sections; add a "Privacy choices" link; honour Global Privacy Control. |
| Is the company outside the UK? | Check it offers UK transfer safeguards (UK IDTA/Addendum or UK–US data bridge). Big providers usually do. |

**Then:**
1. Update `src/pages/privacy-policy.html` (section 2 table, section 3 cookies, section 4 sharing, and the summary box), then run `python build.py`.
2. Change the **Effective date** and **Last updated** date.
3. Update the **Content-Security-Policy** in `build.py` (`HEADERS`) to allow the new service's domains. It blocks every outside script by default, and that is on purpose.
4. Update the facts table in section 1 of this file.
5. Add a line to the Legal Change Log.

**The privacy policy must always describe what the site actually does, no more and no less.**

---

## 5. Before turning on Google AdSense

- [ ] AdSense → **Privacy & messaging** → turn on the **European regulations** message (Google-certified consent tool, required by Google for UK, EEA and Swiss visitors)
- [ ] Same place: turn on the **US state regulations** message
- [ ] Add a **"Privacy choices"** link to the footer of every page (lets visitors change consent)
- [ ] Add the ready-made advertising section to the privacy policy (hidden comment at the bottom of `src/pages/privacy-policy.html`) and update the summary box and sections 3, 5 and 9
- [ ] Add an `ads.txt` file in `public/` with the line AdSense gives you
- [ ] Update the Content-Security-Policy in `build.py` to allow Google's ad and consent domains (otherwise ads are blocked)
- [ ] Ads must be clearly recognisable as ads, and not placed next to calculator inputs or buttons, or inside or right next to a game board or its controls (people tap fast while playing, so ads there would get accidental clicks)
- [ ] **UK representative check:** ad cookies count as "monitoring" UK visitors, so UK GDPR Article 27 may require a UK representative. Small, occasional, low-risk processing is exempt. Decide and record the decision in the change log.
- [ ] Update section 1 of this file: "Cookies today" is no longer "None"

---

## 6. Every tax tool

- [ ] Every figure comes from the official source for that country: **IRS** (irs.gov), **HMRC** (gov.uk), **CRA** (canada.ca), **ATO** (ato.gov.au)
- [ ] Figures live only in `public/assets/data/<file>.js`, labelled with the tax year (or date checked) and the source URL
- [ ] The page links to the official source
- [ ] The page states what the tool **does not** cover (e.g. "does not include state income tax", "assumes no other income")
- [ ] Tested against **at least 3 examples** worked out by hand or with an official worksheet. Record the test results.
- [ ] Wording says "estimate", never "your tax is"
- [ ] Yearly update done **before** the new tax year:

| Country | Tax year starts | Update data file before |
|---|---|---|
| US | 1 January | January |
| UK | 6 April | 6 April |
| Canada | 1 January | January |
| Australia | 1 July | 1 July |

If a figure can't be updated in time, **show a clear notice on the page** ("figures are for tax year 2026; 2027 update coming soon") rather than showing wrong numbers silently.

---

## 7. Affiliate links

- [ ] Label **right next to every link**: `<span class="affiliate-label">(affiliate link)</span>`
- [ ] One short, plain note near the **top** of any page with affiliate links, e.g. "Some links on this page are affiliate links. We may earn a commission at no extra cost to you."
- [ ] Add `rel="sponsored noopener"` to every affiliate link (Google requires paid links to be marked)
- [ ] Only recommend things we'd honestly recommend; all claims about the product are true and current
- [ ] **UK visitors: no credit, loans, investments, pensions or insurance** without an FCA check (see section 2)
- [ ] Read each affiliate programme's own rules (many ban certain wording, paid ads, or use in emails)
- [ ] Commissions never change calculator results or rankings

---

## 8. Email and newsletters (future)

Not allowed until all of this is in place:
- [ ] **UK:** marketing emails only to people who **actively opted in** (unticked box, clear wording). PECR.
- [ ] **US (CAN-SPAM):** every marketing email has an honest subject line, identifies us, has a working unsubscribe link, and includes a **valid postal address** (a PO box or virtual address is allowed; don't publish a home address without thinking about safety). Unsubscribes honoured within 10 business days.
- [ ] Privacy policy updated (section 4 of this file)
- [ ] Email provider added to the privacy policy

---

## 9. Tools that handle personal information (Resume maker, Invoice generator, PDF tools)

These tools (README Stage 3 and Phase D) involve names, addresses and work history. Before building one:
- [ ] Everything must be processed **in the browser only**: no uploads, no server storage
- [ ] Downloads (PDF etc.) generated on the visitor's own device
- [ ] If saving drafts is wanted, it's `localStorage`, so check section 4 (it may count as strictly necessary if the visitor clicks "Save", but the privacy policy must explain it)
- [ ] Privacy policy updated before launch

---

## 10. The owner's own legal duties (India)

The site earns foreign income, so the owner has their own duties:
- [ ] **Income tax:** declare AdSense and affiliate income in your Indian income tax return (ITR)
- [ ] **GST:** registration may be required once turnover crosses the GST threshold. Services to foreign companies are usually treated as exports (zero-rated), which has its own paperwork (e.g. LUT)
- [ ] **Foreign payments:** receive payments into your bank account and keep the bank's foreign inward remittance records (FIRC/e-FIRA)
- [ ] **AdSense tax info:** fill in the tax forms AdSense asks for honestly
- [ ] **Domain and brand:** before buying the final domain, search the name in the **USPTO** (US), **UK IPO** and **Indian trademark** databases to avoid using someone else's trademark

➡️ **Talk to an Indian Chartered Accountant (CA)** once money starts coming in. Rules and thresholds change, so don't rely on this list for amounts.

---

## 11. Yearly legal calendar

| When | Task |
|---|---|
| January | Update `tax-us.js` and `tax-ca.js` (IRS Rev. Proc., SSA wage base, IRS mileage; CRA brackets, CPP, EI). Review this whole file. |
| Watch all year | The IRS can change the mileage rate mid-year (it did on 1 July 2026). |
| Before 6 April | Update `tax-uk.js` (Income Tax incl. Scotland, NI, dividends, Corporation Tax, mileage, working from home) |
| After 30 June and 31 December | Check the Bank of England Bank Rate page and update `public/assets/data/rates-uk.js` (late payment interest) |
| Before 1 July | Update `tax-au.js` (rates: 15% → 14% from 1 July 2027, Medicare levy, LITO, super caps). Also confirm the Medicare low-income thresholds and add them if published. |
| Every September | Re-read the privacy policy, terms and disclaimer. Do they still match what the site does? |
| 2027 | Recheck India's DPDP Rules (obligations phase in through 2027) |
| When traffic reaches ~100,000 visitors a year from one US state | Recheck US state privacy laws (CCPA etc. may start to apply) |
| Before domain renewal | Renew on time; check the name hasn't become a trademark problem |

---

## 12. Legal Change Log

Add one line every time something legal changes: new service, new data collected, legal page edits, decisions made.

| Date | Change | Pages updated |
|---|---|---|
| 2026-09-28 | Initial legal setup: no cookies/storage, cookie-free analytics planned (Cloudflare), Privacy Policy, Terms (Indian law, consumer protections kept), Disclaimer (not FCA, not US adviser), Contact with DPDP grievance contact | privacy-policy, terms, disclaimer, contact, about |
| 2026-09-28 | Created LEGAL.md, CLAUDE.md and AGENTS.md so humans and AI follow the same rules | — |
| 2026-09-28 | Self-hosted the Inter font (SIL Open Font License; licence kept in `public/assets/fonts/OFL.txt`). No outside font servers. | — |
| 2026-09-28 | Added security headers and a strict Content-Security-Policy (`public/_headers`, set in `build.py`). Only our own files and Cloudflare Web Analytics may load. | — |
| 2026-09-28 | Late payment calculator: UK statutory interest rule (8% + Bank Rate on 30 June / 31 December) checked on legislation.gov.uk (SI 2002/1675) and GOV.UK; compensation £40/£70/£100 checked on GOV.UK; Bank Rate history checked on bankofengland.co.uk. Stored in `rates-uk.js` with sources. | late-payment-interest-calculator |
| 2026-09-28 | Country tax tools launched with official figures stored only in `public/assets/data/tax-us.js`, `tax-uk.js`, `tax-ca.js`, `tax-au.js`, each listing its sources and date checked. Known limits stated on each page (e.g. Canada provincial tax is the visitor's estimate; Australia applies the full 2% Medicare levy; Quebec QST not pre-filled). ATO and SSA sites block automated reading, so those figures were confirmed via official search results and a second official source where possible. | us/, uk/, canada/, australia/ |
| 2026-09-28 | Domain set to vintayz.com. Site is now "ToolNest by Vintayz": legal pages say ToolNest is part of Vintayz, run by the same individual in India (no change to who the controller is or what data we handle). Hosting chosen: Cloudflare Pages, matching the privacy policy. | privacy-policy, terms, disclaimer, about, contact |
| 2026-09-29 | AdSense site verification done with the meta tag (every page) and `ads.txt`, not the AdSense script. Neither loads anything from Google or sets cookies, so the privacy policy is unchanged. The AdSense script stays off until section 5 is complete. | — |
| 2026-09-29 | Resume and CV makers for the US, UK, Canada and Australia (`/resume-maker/`), following section 9: everything is processed in the browser, the PDF is made on the device with self-hosted pdf-lib (MIT), no cookies or storage (drafts are only files the visitor downloads), no photo, date of birth or ID fields, and a warning if someone types a date of birth, ID number or bank details. Country advice checked on CareerOneStop (US Dept. of Labor), National Careers Service and JobHelp (GOV.UK), Job Bank (Canada) and Workforce Australia; Workforce Australia blocks automated reading, so its template PDF was read directly and the rest confirmed via official search results. Privacy policy section 2 and summary updated. | privacy-policy, resume-maker (5 pages) |
| 2026-09-29 | PDF tools (`/pdf/`: merge, split, compress, rotate, delete/extract/rearrange pages, JPG to PDF, PDF to JPG, page numbers, watermark), following section 9: files are opened and changed in the browser only, never uploaded; no cookies or storage. Libraries self-hosted with licences kept: pdf-lib 1.17.1 (MIT, `assets/vendor/pdf-lib/LICENSE.txt`, includes pako, UPNG, standard-fonts, tslib notices) and pdf.js 6.3.289 (Apache 2.0, `assets/vendor/pdfjs/`, with Foxit, Liberation, Adobe CMap, OpenJPEG and JBIG2 licences). pdf.js runs with WebAssembly off, so the Content-Security-Policy is unchanged. Deleted/extracted/split pages are left out of new files completely (tested). Privacy policy (section 2 table, section 7, summary, effective date), terms (section 1, liability), disclaimer (new PDF section) and about updated. | privacy-policy, terms, disclaimer, about, home, pdf (12 pages) |
| 2026-09-30 | Decided not to add Google Analytics (GA4) or Microsoft Clarity: both set cookies needing UK consent and send visitor data to another company, and Clarity's session recordings could capture calculator inputs (section 2). Analytics stays cookie-free: Cloudflare Web Analytics plus Google Search Console (no script on pages). Revisit only together with the AdSense consent setup (section 5). | — |
| 2026-09-30 | Expanded tool suite: Freelance Invoice Generator (runs in browser, PDF made on device with self-hosted pdf-lib, local draft download/open, no cookies/storage, following section 9), Business tools (/business/: profit margin, break-even, payment fee), Career tools (/career/: salary to hourly), and Student tools (/education/: word counter, 4.0 GPA calculator). All run 100% client-side with no remote tracking or external requests. | invoice-generator, business/, career/, education/ |
| 2026-09-30 | Review of the new tools. Privacy policy now covers the invoice generator and word counter (section 9 had been missed before launch). Payment fee calculator: Stripe (2.9% + 30¢) and PayPal Checkout (3.49% + 49¢) US rates confirmed on the providers' own sites; Square corrected from 2.6% + 10¢ to its current US online rate of 3.3% + 30¢; presets labelled as US rates with the date checked; the claim that passing card fees to clients is "widely accepted" in all four countries removed (surcharge rules differ by country and US state). Unsourced claims removed: industry margin averages, reading-speed "studies", and GPA Latin-honors cut-offs (they differ by college). Invoice PDF no longer adds a ToolNest footer, so the "no watermark" claim is true. | privacy-policy, payment-fee, profit-margin, word-counter, gpa-calculator, invoice-generator |
| 2026-09-30 | 15 new tools. Figures checked on official sources and stored only in `public/assets/data/`: VAT rates and £90,000 threshold, student and postgraduate loan thresholds 2026 to 2027 (`tax-uk.js`, GOV.UK); holiday entitlement (5.6 weeks, 28-day cap, 12.07%) and statutory redundancy pay (£751 weekly cap from 6 April 2026, England, Scotland and Wales only) (`employment-uk.js`, GOV.UK); UK bank holidays 2026 to 2028 (GOV.UK) and US federal holidays 2026 to 2027 (OPM) (`holidays.js`). Cover letter maker, quote generator, citation generator and Sign PDF follow section 9: all in the browser, nothing uploaded, no cookies or storage; the cover letter maker warns about dates of birth, ID numbers and bank details. The redundancy tool asks for age in years only (needed for the legal formula), never date of birth. Sign PDF says clearly it adds a picture of a signature, not a certified digital signature. Privacy policy (summary and section 2) and disclaimer (Sign PDF) updated. | privacy-policy, disclaimer, 15 new tool pages |
| 2026-09-30 | Expansion: Part 1 (Developer Tools: JSON Formatter & WCAG Color Contrast; Personal Finance: Compound Interest & Mortgage Payment; Health & Fitness: TDEE & BMI; Everyday Utilities: Tip & Bill Split, Universal Unit Converter), Part 2 (US Salaried Take-Home Pay 2026 with official IRS/FICA brackets, E-Commerce ROAS & Break-Even), and One-Click Print Summary for all calculators (@media print). All calculations 100% client-side, zero cookies or tracking, no credit broking or affiliate promotions (mortgage is pure math). 1,052 automated unit tests passing. | dev/, finance/, health/, tools/, career/, business/ |
| 2026-09-30 | International SEO Architecture: built localized country pages under `/us/`, `/uk/`, `/ca/`, `/au/`, and `/global/` for 22 core multi-currency calculators (110 regional pages + `/global/` hub = 206 total pages). All regional pages feature bidirectional `hreflang` tags (`en-US`, `en-GB`, `en-CA`, `en-AU`, `x-default`), self-canonicals, pre-rendered localized currency symbols/options, and breadcrumbs. All processing remains 100% client-side with zero cookies or tracking. | /us/*, /uk/*, /ca/*, /au/*, /global/* |

| 2026-10-01 | Review before publishing. BMI and TDEE calculators switched off (`HEALTH_TOOLS = False` in `build.py`): they ask for weight, height, age and sex, and section 2 says tools never ask for health information. The 110 country copies and `/global/` switched off (`REGIONAL_COPIES = False`): they were near-identical pages, a "scaled content abuse" risk (section 2), and main tool pages go back to their own canonical URLs. Source files kept for later. US take-home pay tool no longer has tax figures written inside it; it reads only `tax-us.js`. Privacy policy now covers text pasted into the JSON formatter. | privacy-policy, home, 92 pages rebuilt |
| 2026-10-05 | Add Text to PDF tool (`/pdf/add-text-to-pdf/`), following section 9: text is typed and added to the PDF in the browser only, the PDF is never uploaded, no cookies or storage. Uses the PDF standard fonts built into pdf-lib (Helvetica, Times, Courier), so no font files or outside requests; Content-Security-Policy unchanged. The page says clearly that it adds text on top and does not delete text already in the PDF (covering text does not remove it). Privacy policy summary and section 2 updated. | privacy-policy, pdf, add-text-to-pdf |
| 2026-10-05 | Brain games section (`/games/`): Typing Speed Test, Reaction Time Test, Sudoku, Number Merge Puzzle and Memory Match. All run in the browser only; moves, typing and scores are never sent or stored (no cookies or storage, so best scores last only until the page is closed). Designed for adults taking a work break, not for children (section 2, privacy policy section 11): no cartoon styling, no chat, no accounts. Trademarks (section 2): the 2048-style game is called "Number Merge Puzzle" because we couldn't confirm whether "2048" is a protected name (the official app is published by Solebon LLC); the page only mentions 2048 to describe the rules and says we are not connected with it. Practice passages and card pictures are our own work. No claims about "average" typing speeds or reaction times, because we have no official source for them. Section 5 now also says no ads inside or right next to game boards. Privacy policy (summary, section 2 table, effective date) and disclaimer (new Games section) updated. | privacy-policy, disclaimer, home, games (6 pages) |
| 2026-10-05 | One new tool in each section: retainer calculator, customer lifetime value, job offer comparison, weighted grade, savings goal, Unix timestamp converter, percentage calculator, Edit PDF Properties, resignation letter maker, US federal tax bracket calculator (2026), UK dividend tax calculator (2026 to 2027), Canada CPP and EI calculator (2026) and Australia take-home pay calculator (2026–27). No new official figures: the four country tools read only figures already checked and stored in `tax-us.js`, `tax-uk.js`, `tax-ca.js` and `tax-au.js`, and each links to its official sources and lists what it doesn't cover (the Australian tool says it applies the full 2% Medicare levy). All run in the browser with no cookies, storage or outside requests. The resignation letter maker follows section 9 (nothing uploaded, PDF made on the device, warns about dates of birth, ID numbers and bank details) and its page doesn't state any legal notice period. Edit PDF Properties removes the XMP copy of the properties too, so old author names can't stay hidden in the file (tested). Privacy policy summary and section 2 updated for the resignation letter maker. | privacy-policy, 13 new tool pages |
| 2026-10-05 | Monthly expenses calculator (`/finance/monthly-expenses-calculator/`): adds up amounts the visitor types, in the browser only; no cookies, storage or outside requests, no personal-data fields, and no official figures or claims about "average" spending. Mortgage calculator now shows principal and interest year by year, rounded to the cent each month like a lender statement (total interest on the $320,000 example moves by $1.72 to $408,140.64, tested); the page says lenders' figures can differ slightly. No privacy policy change: both are calculators that collect nothing. | monthly-expenses, mortgage |
| 2026-10-06 | Five more games in `/games/`: Klondike Solitaire, Mine Finder, Word Search, Mental Math Test and Number Memory Test. Same rules as the first five: browser only, nothing sent or stored, no cookies or storage, made for adults. Trademarks (section 2): the minesweeper-style game is called "Mine Finder" because we couldn't confirm whether "Minesweeper" is a protected name; the page uses the word only to describe the rules and says it isn't connected with any other company's game. "Klondike" and "Solitaire" are general names for the card game. Word lists, card designs and all text are our own. The memory and maths tests say clearly they are games, not medical or job tests, and make no claims about "average" scores. No change to the privacy policy needed: it already covers moves, typing and scores in our games. | games (6 pages), home |
| 2026-10-06 | AdSense publisher ID changed from ca-pub-3325212569816736 to ca-pub-2792326360609634 (owner's chosen account), in the verification meta tag on every page and in `ads.txt`. Still verification only: no AdSense script, nothing loaded from Google, no cookies, so the privacy policy is unchanged. | — |
| 2026-10-09 | Five more games in `/games/` (15 in all): Sliding Puzzle (15 puzzle), Four in a Row, Nonogram, Sequence Memory Test and Snake. Same rules: browser only, nothing sent or stored, no cookies or storage, made for adults. Trademarks (section 2): generic names used instead of brand names ("Four in a Row", not "Connect 4"; "Nonogram", not "Picross" or "Griddlers"; "Sequence Memory Test", not "Simon"); the Four in a Row and Nonogram pages say they aren't connected with any other company's game. No unverified history claims (the 15 puzzle's date of origin was left out). The memory test says it's a game, not a medical test. No privacy policy change needed: it already covers moves and scores in our games. | games (6 pages) |
