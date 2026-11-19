/*
 * Social share pictures: one 1200 × 630 card per page, showing the page's own title, so a link
 * shared on Reddit, LinkedIn, WhatsApp, X or Facebook says which tool it is.
 *
 *   python build.py         (makes the pages)
 *   node og-images.js       (makes any missing cards in public/assets/og/)
 *   python build.py         (points each page at its card)
 *
 * Each card's file name ends in a short code made from its title (og_card_name in build.py does
 * the same), so when a title changes the page goes back to the general picture until this is run
 * again. Old cards are deleted. Needs Playwright (already in Claude Code cloud sessions).
 * Uses only our own Inter font and logo; nothing is loaded from anywhere else.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "assets", "og");
const DESIGN = "1"; // change to remake every card after a design change (and in build.py)
const SKIP = new Set(["", "privacy-policy/", "terms/", "disclaimer/", "contact/"]); // keep the general card

function cardName(pagePath, title) {
  const slug = pagePath.replace(/\/$/, "").replace(/\//g, "-");
  const code = crypto.createHash("sha1").update(DESIGN + "|" + title, "utf8").digest("hex").slice(0, 8);
  return `${slug}-${code}.png`;
}

function decode(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pagesFromSitemap() {
  const xml = fs.readFileSync(path.join(PUBLIC, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>https:\/\/[^/]+\/([^<]*)<\/loc>/g)].map((m) => m[1]).filter((p) => !SKIP.has(p)).map((p) => {
    const html = fs.readFileSync(path.join(PUBLIC, p, "index.html"), "utf8");
    const title = /<meta property="og:title" content="([^"]*)">/.exec(html)[1];
    // The section from the breadcrumb (Home › Section › Tool); hub pages have none.
    const crumbs = [...html.matchAll(/"@type": "ListItem",\s*"position": \d+,\s*"name": "([^"]*)"/g)].map((m) => m[1]);
    const section = crumbs.length === 3 ? JSON.parse(`"${crumbs[1]}"`) : ""; // undo JSON escapes such as \u2013
    return { path: p, title, section, file: cardName(p, title) };
  });
}

function cardHtml(page, logo, fontUrl) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url("${fontUrl}") format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; background: #0b1b34; font-family: Inter, sans-serif; color: #fff; }
.card { position: relative; height: 630px; padding: 64px 88px 0; display: flex; flex-direction: column; }
.card::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 14px; background: #d9b26a; }
.top { display: flex; align-items: center; gap: 22px; }
.top svg { width: 76px; height: 76px; }
.brand { font-size: 38px; font-weight: 800; letter-spacing: -0.5px; }
.brand span { font-size: 26px; font-weight: 500; color: #d9b26a; }
.domain { margin-left: auto; font-size: 26px; font-weight: 600; color: #d9b26a; }
.middle { flex: 1; display: flex; flex-direction: column; justify-content: center; padding-bottom: 20px; }
.section { font-size: 26px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #d9b26a; margin-bottom: 18px; }
h1 { font-size: 76px; line-height: 1.08; font-weight: 800; letter-spacing: -1.5px; }
.chips { display: flex; gap: 14px; padding-bottom: 58px; }
.chips span { font-size: 25px; font-weight: 600; color: #cfe0ff; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; padding: 10px 22px; }
</style></head><body><div class="card">
<div class="top">${logo}<div class="brand">ToolNest <span>by Vintayz</span></div><div class="domain">vintayz.com</div></div>
<div class="middle">${page.section ? `<div class="section">${page.section}</div>` : ""}<h1>${page.title}</h1></div>
<div class="chips"><span>✓ Free</span><span>✓ No sign-up</span><span>✓ Runs in your browser</span></div>
</div></body></html>`;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (e) {
    console.log("Playwright isn't installed here, so no cards were made. Pages keep the general picture.");
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const pages = pagesFromSitemap();
  const wanted = new Set(pages.map((p) => p.file));
  const logo = fs.readFileSync(path.join(PUBLIC, "favicon.svg"), "utf8");
  const fontUrl = "file://" + path.join(PUBLIC, "assets", "fonts", "inter-latin-var.woff2");

  let removed = 0;
  for (const f of fs.readdirSync(OUT)) {
    if (/\.(png|jpg)$/.test(f) && !wanted.has(f)) {
      fs.unlinkSync(path.join(OUT, f));
      removed++;
    }
  }
  const todo = pages.filter((p) => !fs.existsSync(path.join(OUT, p.file)));

  if (todo.length) {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    for (const p of todo) {
      const tmp = path.join(OUT, ".card.html");
      fs.writeFileSync(tmp, cardHtml({ title: escapeHtml(decode(p.title)), section: escapeHtml(decode(p.section)) }, logo, fontUrl));
      await page.goto("file://" + tmp);
      await page.evaluate(() => document.fonts.ready);
      // Long titles get smaller until they fit in three lines.
      await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        let size = 76;
        while (size > 44 && h1.getBoundingClientRect().height > size * 1.08 * 3 + 2) {
          size -= 2;
          h1.style.fontSize = size + "px";
        }
      });
      await page.screenshot({ path: path.join(OUT, p.file) });
      fs.unlinkSync(tmp);
    }
    await browser.close();
  }
  console.log(`Social cards: ${todo.length} made, ${removed} old ones removed, ${pages.length} in all. Now run python build.py again.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
