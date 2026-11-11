/*
 * Browser tests — open every page in Chrome and use it like a visitor. Run after
 * `python build.py`:   node tests/browser-tests.js          (every page, about 2 minutes)
 *                      node tests/browser-tests.js mileage  (only pages whose address has "mileage")
 *
 * Needs Playwright (already in Claude Code cloud sessions). Without it, says so and stops.
 * Serves public/ itself with the headers from public/_headers, the way Cloudflare does, so
 * the real Content-Security-Policy and framing rules apply. Checks:
 *   1. every page loads with no script errors and nothing wider than a 390px phone
 *   2. every calculator's results change when a number is changed (the mileage tools failed
 *      this from 30 September to 5 November 2026 without anyone noticing)
 *   3. "Copy link to these numbers" opens the same results
 *   4. every embedded calculator works inside another website's page, and normal pages
 *      can't be put in a frame
 */
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const PUBLIC = path.join(__dirname, "..", "public");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".txt": "text/plain",
  ".xml": "application/xml", ".mjs": "text/javascript", ".pdf": "application/pdf", ".ico": "image/x-icon"
};

// public/_headers, applied like Cloudflare: rules in order, "! Name" removes a header an earlier
// rule set, and a header set twice is joined with ", ".
function headerRules() {
  const rules = [];
  let current = null;
  for (const line of fs.readFileSync(path.join(PUBLIC, "_headers"), "utf8").split("\n")) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) rules.push(current = { pattern: line.trim(), lines: [] });
    else current.lines.push(line.trim());
  }
  return rules;
}

function headersFor(urlPath, rules) {
  const out = new Map();
  for (const rule of rules) {
    const re = new RegExp("^" + rule.pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    if (!re.test(urlPath)) continue;
    for (const line of rule.lines) {
      if (line.startsWith("! ")) { out.delete(line.slice(2).trim().toLowerCase()); continue; }
      const i = line.indexOf(":");
      const name = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim();
      const old = out.get(name.toLowerCase());
      out.set(name.toLowerCase(), [name, old ? old[1] + ", " + value : value]);
    }
  }
  return [...out.values()];
}

function startSite() {
  const rules = headerRules();
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split(/[?#]/)[0]);
    let file = path.join(PUBLIC, urlPath);
    if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404); res.end("Not found"); return; }
    for (const [name, value] of headersFor(urlPath, rules)) res.setHeader(name, value);
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Another website (a different port is a different origin) with one of our pages in a frame.
function startHost(site) {
  const server = http.createServer((req, res) => {
    const src = new URL(req.url, "http://x").searchParams.get("src") || "/";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><h1>Someone's blog</h1>
<iframe id="f" src="${site}${src}" style="width:100%;max-width:760px;height:1100px"></iframe>`);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function allPages() {
  const pages = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (name === "assets") continue;
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name === "index.html") pages.push("/" + path.relative(PUBLIC, dir).split(path.sep).join("/") + (dir === PUBLIC ? "" : "/"));
    }
  })(PUBLIC);
  return pages.sort();
}

let passed = 0;
let failed = 0;
function check(label, ok, detail) {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL  ${label}${detail ? ": " + detail : ""}`);
  }
}

// Changes the calculator's boxes one at a time until the results panel changes: number boxes
// (halved, then doubled, or 7 if empty), then drop-downs (another choice), then dates (40 days
// later). Small changes can rightly leave a result alone (a flat rate, a cap), so it tries big ones.
// Returns true if any change showed in the results.
async function resultsReact(frame) {
  const results = () => frame.$eval(".calc-results", (e) => e.innerText).catch(() => "");
  const start = await results();
  const changed = async () => {
    await frame.waitForTimeout(60);
    return (await results()) !== start;
  };
  for (const box of await frame.$$(".calculator input[inputmode]")) {
    if (!(await box.isVisible())) continue;
    const value = await box.inputValue();
    const n = Number(value.replace(/,/g, ""));
    const tries = value && isFinite(n) && n > 0 ? [n * 0.5, n * 2].map((x) => String(Math.round(x * 100) / 100)) : ["7"];
    for (const next of tries) {
      await box.fill(next, { timeout: 2000 }).catch(() => {});
      if (await changed()) return true;
    }
  }
  for (const select of await frame.$$(".calculator select")) {
    if (!(await select.isVisible())) continue;
    const other = await select.evaluate((e) => [...e.options].map((o) => o.value).find((v) => v !== e.value));
    if (other === undefined) continue;
    await select.selectOption(other);
    if (await changed()) return true;
  }
  for (const date of await frame.$$(".calculator input[type=date]")) {
    if (!(await date.isVisible())) continue;
    await date.evaluate((e) => {
      const d = new Date((e.value || "2026-01-01") + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 40);
      e.value = d.toISOString().slice(0, 10);
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
    });
    if (await changed()) return true;
  }
  return false;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (e) {
    console.log("Playwright isn't installed here, so the browser tests didn't run.");
    return;
  }
  const site = await startSite();
  const host = await startHost(`http://127.0.0.1:${site.address().port}`);
  const SITE = `http://127.0.0.1:${site.address().port}`;
  const HOST = `http://127.0.0.1:${host.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
  const only = process.argv[2] || "";
  const pages = allPages().filter((p) => p.includes(only));
  const embeds = pages.filter((p) => p.startsWith("/embed/"));
  const normal = pages.filter((p) => !p.startsWith("/embed/"));
  let calculators = 0;
  let shared = 0;

  for (const url of normal) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    // The Dusk Ridge "join" page opens the Android app; don't follow it.
    await page.route(/^intent:|play\.google\.com/, (route) => route.abort());
    await page.goto(SITE + url);
    await page.waitForTimeout(80);

    if (await page.$("#calc-form .result-main, #calc-form ~ .calc-results")) {
      calculators++;
      check(`${url} results change when a number changes`, await resultsReact(page.mainFrame()));
      if (await page.$("#share-link")) {
        shared++;
        const before = await page.$eval(".calc-results", (e) => e.innerText);
        await page.click("#share-link");
        await page.waitForTimeout(80);
        const link = await page.evaluate(() => navigator.clipboard.readText());
        const copy = await context.newPage();
        copy.on("pageerror", (e) => errors.push("shared link: " + e.message));
        await copy.goto(link);
        await copy.waitForTimeout(250);
        check(`${url} share link opens the same results`, (await copy.$eval(".calc-results", (e) => e.innerText)) === before, link);
        check(`${url} share link fills every box`, !(await copy.$eval(".share-status", (e) => e.textContent).catch(() => "")), link);
        await copy.close();
      }
    }
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    check(`${url} fits a 390px phone`, width <= 390, `${width}px wide`);
    check(`${url} has no script errors`, errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // Embedded calculators inside another website's page.
  for (const url of embeds) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${HOST}/?src=${encodeURIComponent(url)}`);
    await page.waitForTimeout(150);
    const frame = page.frames().find((f) => f.url().startsWith(SITE));
    const loaded = !!frame && !!(await frame.$("#calc-form").catch(() => null));
    check(`${url} loads inside another website`, loaded);
    if (loaded) {
      check(`${url} works inside another website`, await resultsReact(frame));
      const shown = await frame.evaluate(() => [...document.querySelectorAll(".embed-main > *")].filter((e) => getComputedStyle(e).display !== "none").length);
      check(`${url} shows only the calculator`, shown === 1, `${shown} sections shown`);
    }
    check(`${url} has no script errors`, errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // Normal pages must not load inside another website's frame (X-Frame-Options: DENY).
  for (const url of only ? [] : ["/", "/uk/self-employed-tax-calculator/", "/privacy-policy/"]) {
    const page = await context.newPage();
    await page.goto(`${HOST}/?src=${encodeURIComponent(url)}`);
    await page.waitForTimeout(150);
    const frame = page.frames().find((f) => f.url().startsWith(SITE));
    const body = frame ? await frame.evaluate(() => document.body ? document.body.innerText.length : 0).catch(() => 0) : 0;
    check(`${url} can't be framed by another website`, body === 0);
    await page.close();
  }

  await browser.close();
  site.close();
  host.close();
  console.log(`\nBrowser tests: ${normal.length} pages, ${calculators} calculators (${shared} with share links), ${embeds.length} embedded calculators`);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
