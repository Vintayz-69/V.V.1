# GROWTH.md: Why the site isn't growing yet, and the plan

**Written:** 5 November 2026 (site age: 38 days). Re-read this every Monday.

> Follow LEGAL.md in everything below. Nothing here is worth breaking a rule for: one fake review, bought link or spam post can cost more than it brings.

---

## 1. The short answer

The website itself is in good shape. The problem is that **the rest of the internet doesn't know it exists yet.**

### What I checked (5 November 2026)

| Check | Result |
|---|---|
| All 183 sitemap pages load on the live site | ✅ All return 200 |
| Speed on a phone (largest content shown) | ✅ 0.3 to 0.9 seconds, no jumping layout |
| Pages wider than a 390px phone | ✅ None |
| Script errors on all 186 pages | ✅ None (after today's fix, see section 2) |
| Duplicate titles, wrong canonical links, missing sitemap pages | ✅ None |
| Search engines blocked by robots.txt | ✅ No |
| Mentions of "vintayz" anywhere else on the web | ❌ **None found** |

### The four real reasons

1. **The site is very new.** It started on 28 September 2026. Google usually takes several months to trust a new website, and longer for money and tax pages, which it calls "Your Money or Your Life" topics and checks more strictly. Ups and downs in the first months are normal: Google often tests new pages higher, then drops them while it learns more. The fall in impressions on 26 October fits this pattern. (The 20 October menu change is not the likely cause: the pages that were near page 1 gained homepage links that day.)

2. **No other website links to us.** For tax and money searches, Google mostly ranks sites that other trusted sites point to. Our competitors for "UK self-employed tax calculator" are GOV.UK, HMRC and big calculator sites with thousands of links. With zero links, even a better page can't beat them yet. **This is the main problem, and only you can fix it** (section 3).

3. **Too many pages, too fast, on too many topics.** 0 → 183 pages in 5 weeks, across 17 sections (tax, PDF, games, images, developer tools…). On 27 October, 18 new pages went up in about 90 minutes. To Google, a brand-new site doing this can look like "scaled content", and AdSense has already said "low-value content". The README said on 14 October "no new tools for now"; 30 more were added after that.

4. **Some visitors met broken calculators.** The UK and US mileage calculators had not worked since 30 September, and the Making Tax Digital checker's year list was empty since 27 October (fixed today). A visitor who types a number and sees nothing change leaves at once.

---

## 2. What changed in the code today

| Change | Why it helps growth |
|---|---|
| **Fixed the mileage and Making Tax Digital tools.** The footer's year (`id="year"`) had the same id as the tools' year drop-down, so the footer script emptied the drop-down. The footer now uses `id="footer-year"`, and `build.py` stops the build if any page repeats an id. | Visitors get working tools. |
| **"Copy link to these numbers"** on 83 calculators (on phones: "Share these numbers"). The numbers go after `#` in the link, which browsers never send to any server. Opening the link fills the calculator in. | You can answer a question on Reddit or a forum with a link that already has *their* numbers in it. That's genuinely helpful, so people click, share and link to it. |
| **A social share picture for every page** (`public/assets/og/`, made by `node og-images.js`). | Links shared on Reddit, LinkedIn, WhatsApp, X and Facebook now show the tool's name instead of one general picture. |
| **Tax figures in five tools' notes now come from the data files** (Class 2 NI, payments on account, VAT Flat Rate limits, US estimated tax). | Next tax year's update can't leave old figures in the text (LEGAL.md section 2). |

---

## 3. Your plan for the next 8 weeks

### This week (about 1 hour, once)

- [ ] **Publish today's changes** (merge this branch so Cloudflare deploys it).
- [ ] **Bing Webmaster Tools:** sign in → "Import from Google Search Console" → submit `https://vintayz.com/sitemap.xml`. Bing is quicker to trust new sites, and it also feeds DuckDuckGo, Yahoo and ChatGPT search.
- [ ] Then run `python indexnow.py` (no date) to tell Bing about every page. It sends page addresses only.
- [ ] **Search Console → Sitemaps:** check `sitemap.xml` is submitted and read without errors (the README launch checklist still shows this unticked).
- [ ] **Search Console → Indexing → Pages:** write down how many pages are *Indexed*, *Crawled – currently not indexed* and *Discovered – currently not indexed*. If most are "not indexed", it confirms reasons 1 to 3 above: Google has found the pages but doesn't trust the site enough yet.
- [ ] **Send the data to Claude:** Search Console → Performance → last 3 months → Export (Queries and Pages). With that, the next session can improve the exact pages people already see in Google, instead of guessing.

### The rule for 8 weeks: no new tools

Until **6 January 2027**, don't add tools or sections. Spend the time on links and visitors instead. The only exceptions are fixing mistakes and the yearly figure updates in LEGAL.md section 11.

### Every day (about 30 minutes): be useful where freelancers ask questions

This is the most important job. It brings visitors today and links that help Google trust the site.

1. Find a real question someone asked, e.g. "I'm a UK sole trader on £48,000, how much tax will I pay?"
2. **Answer it fully in your reply**, in plain words, using our tools to work out the numbers.
3. Add the "Copy link to these numbers" link, so they can see the breakdown and change it.
4. **Say it's your site**, e.g. "I made this free calculator". Hiding it is dishonest and breaks the rules of most communities (and the honesty rules in LEGAL.md).

Places to start (read each community's self-promotion rules first; some ban links completely):

| Audience | Where |
|---|---|
| UK sole traders and contractors | r/UKPersonalFinance, r/smallbusinessuk, r/ContractorUK, r/freelanceuk, MoneySavingExpert forum, Contractor UK forum |
| US 1099 freelancers | r/freelance, r/tax, r/smallbusiness, r/personalfinance |
| Canada | r/PersonalFinanceCanada, r/smallbusiness |
| Australia | r/AusFinance, r/smallbusiness |
| Everyone | Quora answers, Indie Hackers, LinkedIn posts |

Rules: never paste the same message in many places, never post only a link, and stop if a community says no.

### Once each (good chances to get real links)

- [ ] **Hacker News "Show HN"**: the PDF and image tools work entirely in the browser and never upload files. That privacy angle is exactly what this audience likes. One honest post with a clear title, e.g. "Show HN: Free PDF tools that never upload your file".
- [ ] **AlternativeTo.net**: list the PDF tools as an alternative to the big online PDF sites. Only make true comparisons; don't use their logos or names in our tool names (LEGAL.md section 2).
- [ ] **Product Hunt**: launch once, on a weekday, when you can answer comments all day.
- [ ] **Ask people who would genuinely want to link to us**: UK accountants' and bookkeepers' blogs, freelance coaches, coworking spaces, university careers pages (salary to hourly, CV maker) and student unions (UK degree classification). A short, personal email: what the tool does, that it's free, no sign-up, nothing uploaded.
- [ ] **LinkedIn**: 1 to 2 posts a week with one useful fact and one tool, e.g. "Since 6 April 2026, sole traders and landlords with qualifying income over £50,000 must use Making Tax Digital. Here's a 30-second checker." The new share pictures make these posts look professional.

**Never:** buy links, buy traffic, pay for reviews, swap links in bulk or join "link networks". Google penalises it and LEGAL.md section 2 bans it.

### Use the calendar: people search when deadlines are close

Dates from our data files (`deadlines-uk.js`, `tax-us.js`):

| Date | Deadline | Pages to share in the weeks before |
|---|---|---|
| 7 Nov 2026 | Making Tax Digital update (6 April to 5 October) | MTD checker, tax deadlines |
| 30 Dec 2026 | UK online return, to pay through your tax code (owe under £3,000) | Self-employed tax, tax deadlines |
| 15 Jan 2027 | US 4th quarter estimated tax payment | US quarterly tax, self-employment tax |
| 31 Jan 2027 | UK Self Assessment return and payment, first payment on account | Self-employed tax, payments on account, trading allowance, tax deadlines |
| 7 Feb 2027 | Making Tax Digital update (6 April to 5 January) | MTD checker |

Also for January: 1099 forms arrive, and many US freelancers will search for the new $2,000 1099-NEC threshold ("Will I get a 1099?" checker). And when the IRS publishes the 2027 tax figures (not yet confirmed as published on 5 November 2026), adding them quickly is one of the few ways a new site can beat old ones: the big sites are slow to update. Check irs.gov first; never use "projected" figures from other sites.

---

## 4. Decisions for you

1. **The two guides** (`/guides/`) are hidden from Google until you've read them (`GUIDES_REVIEWED = False` in `build.py`). Read them, fix anything you disagree with, then set it to `True`. Helpful articles are what other sites link to.
2. **The off-topic sections** (games, PDF, image, text, time, everyday and developer tools: 67 pages). My advice: keep them for now, add nothing, and decide in January with Search Console data. If a section has had almost no impressions by then, hiding it from Google (`noindex`) makes the site more clearly "the freelancer money site", which helps both Google and the AdSense review.
3. **AdSense:** don't ask for another review until Search Console shows steady visitors from search for a few weeks (README section 11).

---

## 5. What to measure (every Monday, 10 minutes)

Write one line in the README progress log:

- Search Console: indexed pages, impressions and clicks for the last 7 days, top 5 searches
- Cloudflare Web Analytics: visitors, and which websites sent them (shows which communities work)
- How many answers or posts you wrote, and any new links you know of

**What to expect:** months 2 to 3 are usually slow. Growth tends to come after real links and a few months of age, not before. If clicks are still near zero in January *and* the Pages report shows most pages "not indexed", the next step is to cut down to the strongest pages, not to add more.
