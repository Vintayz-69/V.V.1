# CLAUDE.md

ToolNest by Vintayz (vintayz.com): free calculators for freelancers, for US and UK visitors (later Canada and Australia), earning from AdSense and affiliate links. Plain HTML, CSS and JavaScript. Run by one person based in India. Project plan: `README.md`.

## Legal rules come first

@LEGAL.md

Before making any change, check the matching section of LEGAL.md. In particular:

- **Stop and warn** if a request would break a rule in LEGAL.md. Name the rule, explain it simply, and offer a legal way to get the same result. Don't make the change silently.
- **Never add** cookies, browser storage, third-party scripts, fonts, embeds or forms without doing LEGAL.md section 4 in the same change.
- **Never invent tax figures or legal facts.** Official figures come only from IRS, HMRC, CRA, ATO, GOV.UK, legislation.gov.uk or the Bank of England, and live only in `public/assets/data/`. If you can't verify something, say so. Your knowledge may be out of date.
- **Keep legal pages true.** If a change affects what data the site handles, update `src/pages/privacy-policy.html` and add a line to the Legal Change Log in LEGAL.md.

## How to work here

- **Never edit `public/**/index.html` by hand.** Page content lives in `src/pages/`, the shared layout and the page list in `build.py`. Run `python build.py` after any change.
- Calculator formulas live in `public/assets/js/tools/<tool>.js`. Each exposes `window.ToolNestCalc` for the tests.
- PDF tools share `public/assets/js/pdf-common.js` and are tested in `tests/pdf-tests.js`. Files must never leave the visitor's device. Keep pdf-lib and pdf.js self-hosted in `public/assets/vendor/` with their licences.
- Run `node tests/run-tests.js` after any change. Every calculator needs at least 3 hand-worked examples in the tests, and every number quoted in a page's worked example must match a test.
- Every tool follows the page template in README section 5 and the tax-tool checklist in LEGAL.md section 6.
- The Content-Security-Policy in `build.py` blocks inline scripts, inline `style=""` attributes and outside domains. Put scripts in files and styles in `style.css`.
- Check every page at phone width (390px) as well as desktop. Most visitors are on phones.
- The owner's English is simple and direct. Explain things in plain words.
