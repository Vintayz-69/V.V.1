/*
 * PDF tool tests. Every tool is checked against at least 3 examples, and every number in a PDF
 * page's worked example is checked here. Test PDFs are made on the fly with pdf-lib: page n of
 * a test PDF is (200 + n) points wide, so we can tell which page ended up where.
 * Run through tests/run-tests.js.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const ASSETS = path.join(__dirname, "..", "public", "assets");

// The PDF scripts expect a browser; this is just enough of one. They run in this same realm so
// pdf-lib's instanceof checks work on the bytes we pass in.
global.window = global;
global.document = { currentScript: null, getElementById: () => null };

function run(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ASSETS, file), "utf8"), { filename: file });
}

function tool(name) {
  run(`js/tools/${name}.js`);
  return window.ToolNestCalc;
}

module.exports = async function pdfTests(check, expectAll) {
  run("vendor/pdf-lib/pdf-lib.min.js");
  run("js/pdf-common.js");
  const L = window.PDFLib;
  const P = window.ToolNestPDF;
  const N = L.PDFName;

  // ---------------- helpers

  async function makePdf(count, opts = {}) {
    const doc = await L.PDFDocument.create();
    const font = await doc.embedFont(L.StandardFonts.Helvetica);
    for (let n = 1; n <= count; n++) {
      const page = doc.addPage([200 + n, 300]);
      const secret = (opts.secret || []).includes(n);
      page.drawText(secret ? `SECRET-${n}` : `PAGE ${n}`, { x: 20, y: 150, size: 12, font });
      if (opts.rotate && opts.rotate[n - 1]) page.setRotation(L.degrees(opts.rotate[n - 1]));
    }
    if (opts.links) {
      const pages = doc.getPages();
      opts.links.forEach(([from, to]) => {
        const annot = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [0, 0, 50, 50], Dest: [pages[to - 1].ref, "Fit"] });
        pages[from - 1].node.addAnnot(doc.context.register(annot));
      });
    }
    if (opts.edit) opts.edit(doc);
    return doc.save();
  }

  const load = (bytes) => L.PDFDocument.load(bytes);
  const ids = (doc) => doc.getPages().map((p) => Math.round(p.getWidth()) - 200).join(",");

  // Every stream in a PDF, decoded, as one lowercase string.
  function streamText(doc) {
    let out = "";
    doc.context.enumerateIndirectObjects().forEach(([, obj]) => {
      if (!(obj instanceof L.PDFRawStream)) return;
      let bytes;
      try { bytes = L.decodePDFRawStream(obj).decode(); } catch (e) { bytes = obj.contents; }
      out += Buffer.from(bytes).toString("latin1").toLowerCase() + "\n";
    });
    return out;
  }
  const hex = (text) => Buffer.from(text, "latin1").toString("hex");
  const countType = (doc, type) => doc.context.enumerateIndirectObjects()
    .filter(([, o]) => o instanceof L.PDFDict && o.lookup(N.of("Type")) === N.of(type)).length;
  const round = (n) => Math.round(n * 100) / 100;
  // Every "a b c d e f cm" (or tm) in some content, as numbers rounded to 2 decimals.
  const NUM = "(-?[0-9.e-]+)";
  const matrices = (text, op) => [...text.matchAll(new RegExp(`${Array(6).fill(NUM).join(" ")} ${op}\\b`, "g"))]
    .map((m) => m.slice(1, 7).map((v) => round(Number(v)) + 0).join(","));

  // A JPEG header (no picture data) of the given size, with an EXIF orientation. pdf-lib only
  // reads the header when embedding, which is all these tests need.
  function fakeJpeg(width, height, orientation, bigEndian, pad) {
    const exif = [];
    if (orientation) {
      const w16 = (v) => (bigEndian ? [v >> 8, v & 255] : [v & 255, v >> 8]);
      const w32 = (v) => (bigEndian ? [0, 0, v >> 8, v & 255] : [v & 255, v >> 8, 0, 0]);
      const tiff = [...(bigEndian ? [0x4d, 0x4d] : [0x49, 0x49]), ...w16(42), ...w32(8), ...w16(1),
        ...w16(0x0112), ...w16(3), ...w32(1), ...w16(orientation), 0, 0, ...w32(0)];
      const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
      exif.push(0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 255, ...body);
    }
    const sof = [0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
    return new Uint8Array([0xff, 0xd8, ...exif, ...sof, ...new Array(pad || 0).fill(0), 0xff, 0xd9]);
  }

  // A real PNG, grey, w × h.
  function makePng(w, h, extraChunks) {
    const crcTable = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
    const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
      const td = Buffer.concat([Buffer.from(type), data]);
      const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
      return Buffer.concat([len, td, c]);
    };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
    const raw = Buffer.alloc((w + 1) * h, 128); for (let y = 0; y < h; y++) raw[y * (w + 1)] = 0;
    return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), ...(extraChunks || []).map(([t, d]) => chunk(t, d)), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
  }

  // ---------------- Shared helpers (pdf-common.js)

  const r = P.parseRanges("1-3, 5, 8-", 10);
  check("ranges 1-3, 5, 8-", JSON.stringify(r.ranges), "[[1,3],[5,5],[8,10]]");
  check("ranges -4", JSON.stringify(P.parseRanges("-4", 10).ranges), "[[1,4]]");
  check("ranges en dash", JSON.stringify(P.parseRanges("2–3", 10).ranges), "[[2,3]]");
  check("ranges past the end", P.parseRanges("12", 10).error, "This PDF has only 10 pages.");
  check("ranges backwards", P.parseRanges("5-3", 10).error, "Write ranges from low to high, like 3-5.");
  check("ranges page 0", P.parseRanges("0", 10).error, "Page numbers start at 1.");
  check("ranges missing comma", !!P.parseRanges("3 5", 10).error, true);
  check("ranges empty", P.parseRanges(" , ", 10).error, "Enter at least one page number.");
  check("rangesToPages", P.rangesToPages([[3, 5], [1, 2], [4, 6]]).join(","), "1,2,3,4,5,6");
  check("describePages", P.describePages([9, 1, 2, 3, 5, 8]), "1-3, 5, 8-9");
  check("crc32 check value", P.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  check("formatBytes bytes", P.formatBytes(500), "500 bytes");
  check("formatBytes KB", P.formatBytes(2048), "2.0 KB");
  check("formatBytes MB", P.formatBytes(5 * 1048576), "5.0 MB");
  check("formatBytes big MB", P.formatBytes(20 * 1048576), "20 MB");
  check("baseName", P.baseName("Report (final).PDF"), "Report (final)");
  check("baseName unsafe characters", P.baseName("a/b:c.pdf"), "a-b-c");
  check("pagesWord", P.pagesWord(1) + "|" + P.pagesWord(3), "1 page|3 pages");

  // ZIP: read it back the way an unzip program would, from the central directory.
  {
    const files = [{ name: "a.pdf", bytes: new Uint8Array([1, 2, 3]) }, { name: "café.jpg", bytes: new Uint8Array(1000).fill(7) }];
    const zip = Buffer.from(P.makeZip(files, new Date(2026, 8, 29, 12, 30, 0)));
    const eocd = zip.length - 22;
    check("zip end record", zip.readUInt32LE(eocd), 0x06054b50);
    check("zip entry count", zip.readUInt16LE(eocd + 10), 2);
    let at = zip.readUInt32LE(eocd + 16);
    const got = [];
    for (let i = 0; i < 2; i++) {
      const nameLen = zip.readUInt16LE(at + 28);
      const name = zip.slice(at + 46, at + 46 + nameLen).toString("utf8");
      const local = zip.readUInt32LE(at + 42);
      const size = zip.readUInt32LE(at + 20);
      const data = zip.slice(local + 30 + zip.readUInt16LE(local + 26), local + 30 + zip.readUInt16LE(local + 26) + size);
      got.push(`${name}:${size}:${P.crc32(data) === zip.readUInt32LE(at + 16)}`);
      at += 46 + nameLen;
    }
    check("zip entries read back", got.join(" "), "a.pdf:3:true café.jpg:1000:true");
  }

  // JPEG headers and EXIF orientation
  expectAll("jpegInfo little-endian EXIF", P.jpegInfo(fakeJpeg(4032, 3024, 6, false)), { width: 4032, height: 3024, components: 3, orientation: 6 });
  expectAll("jpegInfo big-endian EXIF", P.jpegInfo(fakeJpeg(800, 600, 8, true)), { width: 800, height: 600, orientation: 8 });
  expectAll("jpegInfo no EXIF", P.jpegInfo(fakeJpeg(10, 20, 0)), { width: 10, height: 20, orientation: 1 });
  check("jpegInfo not a JPEG", P.jpegInfo(new Uint8Array([1, 2, 3, 4])), null);
  expectAll("stripExif keeps size, drops rotation", P.jpegInfo(P.stripExif(fakeJpeg(4032, 3024, 6, false))), { width: 4032, height: 3024, orientation: 1 });

  // Page view: a US Letter page turned 90° reads as 792 × 612.
  {
    const doc = await L.PDFDocument.create();
    const page = doc.addPage([612, 792]);
    page.setRotation(L.degrees(90));
    const v = P.pageView(page);
    const pt = v.toPdf(393.22, 30);
    check("pageView rotated size", `${v.width}x${v.height}@${v.rotation}`, "792x612@90");
    check("pageView rotated point", `${round(pt.x)},${round(pt.y)}`, "582,393.22");
    page.setRotation(L.degrees(180));
    const p180 = P.pageView(page).toPdf(10, 20);
    check("pageView 180", `${p180.x},${p180.y}`, "602,772");
    page.setRotation(L.degrees(270));
    const p270 = P.pageView(page).toPdf(10, 20);
    check("pageView 270", `${p270.x},${p270.y}`, "20,782");
  }

  check("looksLikePdf", P.looksLikePdf(await makePdf(1)) && !P.looksLikePdf(new Uint8Array(20)), true);
  check("openPdf rejects non-PDF", await P.openPdf(new Uint8Array(20)).then(() => "opened", (e) => e.message), "This file isn't a PDF.");

  // ---------------- Hub search box (assets/js/tool-search.js), using the cards on the built /pdf/ page
  {
    run("js/tool-search.js");
    const S = window.ToolNestSearch;
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "pdf", "index.html"), "utf8");
    const read = (cls) => [...html.matchAll(new RegExp(`class="${cls}" href="([^"]+)" data-search="([^"]*)"`, "g"))]
      .map((m) => ({ slug: m[1].split("/").slice(-2, -1)[0], words: m[2] }));
    const cards = read("card");
    const bars = read("tool-bar");
    check("search: a bar for every tool", bars.length, 13);
    check("search: bars list popular tools first", bars.slice(0, 6).map((b) => b.slug).join(","), "merge-pdf,split-pdf,rotate-pdf,jpg-to-pdf,pdf-to-jpg,compress-pdf");
    check("search: bars and cards find the same tools", bars.filter((b) => S.matches(b.words, "photo")).length, cards.filter((c) => S.matches(c.words, "photo")).length);
    const find = (q) => cards.filter((c) => S.matches(c.words, q)).map((c) => c.slug).join(",");
    check("search: every tool has search words", cards.length, 13);
    check("search: empty shows everything", cards.filter((c) => S.matches(c.words, "")).length, 13);
    check("search: combine", find("combine"), "merge-pdf");
    check("search: shrink", find("shrink"), "compress-pdf");
    check("search: start of a word", find("comp"), "compress-pdf");
    check("search: photo", find("photo"), "jpg-to-pdf,pdf-to-jpg");
    check("search: reorder", find("reorder"), "rearrange-pdf-pages");
    check("search: a question", find("How to compress my PDFs"), "compress-pdf");
    check("search: two words", find("jpeg export"), "pdf-to-jpg");
    check("search: nothing", find("spreadsheet"), "");
    check("search: filler and plurals", S.queryWords("how to merge my files").join(","), "merge,file");
    // 3D deck: middle bar flat; neighbours 72px away tilted 25°; further bars 18px apart, 12° more
    // tilt and 5% smaller per place (tilt capped at 60°), fading out between 4 and 5.5 places away.
    const D = (k) => { const p = S.deckPlace(k); return [p.y, p.tilt, Math.round(p.scale * 100) / 100, Math.round(p.opacity * 100) / 100, p.z].join(","); };
    check("deck: middle", D(0), "0,0,1,1,100");
    check("deck: next one down", D(1), "72,-25,0.95,1,90");
    check("deck: two up (72 + 18 above)", D(-2), "-90,37,0.9,1,80");
    check("deck: three down (72 + 2 × 18)", D(3), "108,-49,0.85,1,70");
    check("deck: tilt stops at 60°", D(-6).split(",")[1], "60");
    check("deck: faded out far away", D(5.5).split(",")[3], "0");
    check("deck: halfway between two bars", D(0.5), "36,-12.5,0.98,1,95");
  }

  // ---------------- Merge (page example: 2 + 3 + 1 pages)
  {
    const merge = tool("pdf-merge");
    const timesheet = await makePdf(2);
    const invoice = await makePdf(3, { links: [[1, 3]] });
    const receipt = await makePdf(1);
    const out = await load(await merge([timesheet, invoice, receipt]));
    check("merge page count", out.getPageCount(), 6);
    check("merge order", ids(out), "1,2,1,2,3,1");
    const annot = out.getPages()[2].node.lookup(N.of("Annots")).lookup(0);
    check("merge keeps link inside a file", annot.lookup(N.of("Dest")).get(0) === out.getPages()[4].ref, true);
    check("merge makes no extra pages", countType(out, "Page"), 6);
    check("merge two files", (await load(await merge([invoice, invoice]))).getPageCount(), 6);
  }

  // ---------------- Split (page example: 10 pages)
  {
    const S = tool("pdf-split");
    check("split plan ranges", JSON.stringify(S.planSplit("ranges", "1-3, 4-6, 7-", 10).ranges), "[[1,3],[4,6],[7,10]]");
    check("split plan equal parts", JSON.stringify(S.planSplit("every", "4", 10).ranges), "[[1,4],[5,8],[9,10]]");
    check("split plan every page", S.planSplit("each", "", 10).ranges.length, 10);
    check("split plan part too big", S.planSplit("every", "10", 10).error, "This PDF has only 10 pages, so use a number smaller than 10.");
    check("split plan not a number", S.planSplit("every", "2.5", 10).error, "Enter a whole number of pages, like 2.");
    const parts = await S.splitPdf(await makePdf(10), [[1, 3], [4, 6], [7, 10]]);
    const docs = await Promise.all(parts.map((p) => load(p.bytes)));
    check("split files", docs.map(ids).join(" | "), "1,2,3 | 4,5,6 | 7,8,9,10");
    check("split overlapping ranges", (await S.splitPdf(await makePdf(8), [[1, 5], [3, 8]])).length, 2);
    check("split names", S.partName("report", [7, 10]) + " " + S.partName("report", [5, 5]), "report-pages-7-10.pdf report-page-5.pdf");
  }

  // ---------------- Delete pages (page example: 12 pages, delete 5 and 11)
  {
    const del = tool("pdf-delete-pages");
    const src = await makePdf(12, { secret: [5, 11], links: [[1, 5], [1, 6]] });
    const out = await load(await del(src, [5, 11]));
    check("delete page count", out.getPageCount(), 10);
    check("delete order", ids(out), "1,2,3,4,6,7,8,9,10,12");
    const text = streamText(out);
    check("delete leaves no trace of removed pages", text.includes(hex("SECRET")) || text.includes("secret"), false);
    check("delete keeps only kept Page objects", countType(out, "Page"), 10);
    const annots = out.getPages()[0].node.lookup(N.of("Annots"));
    check("delete drops link to a removed page", annots.lookup(0).get(N.of("Dest")), undefined);
    check("delete keeps link to a kept page", annots.lookup(1).lookup(N.of("Dest")).get(0) === out.getPages()[4].ref, true);
    check("delete every page", await del(await makePdf(2), [1, 2]).then(() => "ok", (e) => e.message), "You can't delete every page. Leave at least one.");
  }

  // ---------------- Extract pages (page example: pages 2-4 and 9 of 20)
  {
    const extract = tool("pdf-extract-pages");
    const src = await makePdf(20);
    const out = await load(await extract(src, [2, 3, 4, 9]));
    check("extract page count", out.getPageCount(), 4);
    check("extract pages", ids(out), "2,3,4,9");
    check("extract keeps page order", ids(await load(await extract(src, [9, 2]))), "2,9");
    check("extract nothing", await extract(src, []).then(() => "ok", (e) => e.message), "Pick at least one page.");
  }

  // ---------------- Rotate (page example: page 2 → 180°, page 3 → 90°; 270° + 90° → 0°)
  {
    const rotate = tool("pdf-rotate");
    const src = await makePdf(4, { rotate: [0, 0, 0, 270] });
    const out = await load(await rotate(src, [0, 180, 90, 90]));
    check("rotate angles", out.getPages().map((p) => p.getRotation().angle).join(","), "0,180,90,0");
    const left = await load(await rotate(src, [-90]));
    check("rotate left from 0", left.getPages()[0].getRotation().angle, 270);
    check("rotate keeps pages", ids(out), "1,2,3,4");
  }

  // ---------------- Rearrange (page example: 4, 3, 2, 1 → reversed)
  {
    const rearrange = tool("pdf-rearrange");
    const src = await makePdf(4, {
      edit(doc) {
        const pages = doc.getPages();
        const ctx = doc.context;
        const item = ctx.register(ctx.obj({ Title: L.PDFString.of("Chapter"), Dest: [pages[2].ref, "Fit"] }));
        doc.catalog.set(N.of("Outlines"), ctx.register(ctx.obj({ Type: "Outlines", First: item, Last: item, Count: 1 })));
        // Rotation set on the page tree (inherited by every page) must survive the move.
        doc.catalog.Pages().set(N.of("Rotate"), ctx.obj(90));
      }
    });
    const out = await load(await rearrange(src, [3, 2, 1, 0]));
    check("rearrange reverse", ids(out), "4,3,2,1");
    const outline = out.catalog.lookup(N.of("Outlines")).lookup(N.of("First"));
    check("rearrange bookmark follows its page", outline.lookup(N.of("Dest")).get(0) === out.getPages()[1].ref, true);
    check("rearrange keeps inherited rotation", out.getPages().map((p) => p.getRotation().angle).join(","), "90,90,90,90");
    check("rearrange move one", ids(await load(await rearrange(await makePdf(3), [1, 0, 2]))), "2,1,3");
    check("rearrange bad order", await rearrange(src, [0, 0, 1, 2]).then(() => "ok", (e) => e.message), "The new order must list every page once.");
  }

  // ---------------- JPG to PDF (page example: 4,032 × 3,024 photo on A4, small margins)
  {
    const J = tool("pdf-jpg-to-pdf");
    const a = J.layoutImage(4032, 3024, { size: "a4", orientation: "auto", margin: "small" });
    expectAll("JPG to PDF phone photo on A4", {
      pageWidth: a.pageWidth, pageHeight: a.pageHeight, width: round(a.width), height: round(a.height), x: round(a.x), y: round(a.y)
    }, { pageWidth: 841.89, pageHeight: 595.28, width: 745.71, height: 559.28, x: 48.09, y: 18 });
    check("JPG to PDF scale", (559.28 / 3024).toFixed(5), "0.18495");
    // Tall picture on Letter, no margin: 792 ÷ 2,000 = 0.396 → 396 × 792, 108 points each side.
    expectAll("JPG to PDF tall picture on Letter", J.layoutImage(1000, 2000, { size: "letter", orientation: "auto", margin: "none" }),
      { pageWidth: 612, pageHeight: 792, width: 396, height: 792, x: 108, y: 0 });
    // Same size as picture: 800 × 0.75 + 2 × 18 = 636 by 600 × 0.75 + 36 = 486.
    expectAll("JPG to PDF page the size of the picture", J.layoutImage(800, 600, { size: "fit", orientation: "auto", margin: "small" }),
      { pageWidth: 636, pageHeight: 486, width: 600, height: 450, x: 18, y: 18 });
    check("JPG to PDF forced portrait", J.layoutImage(800, 600, { size: "a4", orientation: "portrait", margin: "none" }).pageWidth, 595.28);
    check("orientation 6 matrix", J.orientMatrix(6, 10, 20, 100, 200).join(","), "0,-200,100,0,10,220");
    check("orientation 3 matrix", J.orientMatrix(3, 10, 20, 100, 200).join(","), "-100,0,0,-200,110,220");
    check("orientation 1 matrix", J.orientMatrix(1, 10, 20, 100, 200).join(","), "100,0,0,200,10,20");

    const pdf = await load(await J.imagesToPdf([
      { kind: "jpg", bytes: fakeJpeg(4032, 3024, 6, false) },
      { kind: "png", bytes: makePng(30, 20) }
    ], { size: "a4", orientation: "auto", margin: "none" }));
    const [p1, p2] = pdf.getPages();
    check("JPG to PDF pages", pdf.getPageCount(), 2);
    // Turned photo shows as 3,024 wide × 4,032 tall, so the page is portrait.
    check("JPG to PDF turned photo page", `${p1.getWidth()}x${p1.getHeight()}`, "595.28x841.89");
    check("JPG to PDF PNG page is landscape", `${p2.getWidth()}x${p2.getHeight()}`, "841.89x595.28");
    // 595.28 ÷ 3,024 < 841.89 ÷ 4,032, so the photo is 595.28 wide and 793.71 tall, 24.09 from the bottom.
    const content = streamText(pdf);
    check("JPG to PDF draws turned photo", matrices(content, "cm").includes("0,-793.71,595.28,0,0,817.8"), true);

    // Colour profiles. A pretend ICC profile: 300 bytes, "acsp" at byte 36, colour space at byte 16.
    const profile = (space, fill) => {
      const icc = Buffer.alloc(300, fill);
      icc.write(space, 16, "latin1");
      icc.write("acsp", 36, "latin1");
      icc.writeUInt32BE(icc.length, 0);
      return icc;
    };
    const rgbIcc = profile("RGB ", 1);
    // Split over two APP2 blocks, stored out of order: "ICC_PROFILE\0", block number, block count, data.
    const app2 = (seq, data) => {
      const body = Buffer.concat([Buffer.from("ICC_PROFILE\0", "latin1"), Buffer.from([seq, 2]), data]);
      return Buffer.concat([Buffer.from([0xff, 0xe2, (body.length + 2) >> 8, (body.length + 2) & 255]), body]);
    };
    const plain = Buffer.from(fakeJpeg(800, 600, 0));
    const withIcc = new Uint8Array(Buffer.concat([plain.subarray(0, 2), app2(2, rgbIcc.subarray(100)), app2(1, rgbIcc.subarray(0, 100)), plain.subarray(2)]));
    check("JPEG profile joined in order", Buffer.compare(Buffer.from(J.jpegProfile(withIcc)), rgbIcc), 0);
    check("JPEG without a profile", J.jpegProfile(plain), null);
    const second = profile("RGB ", 9);
    const twoProfiles = new Uint8Array(Buffer.concat([plain.subarray(0, 2), app2(1, rgbIcc.subarray(0, 100)), app2(2, rgbIcc.subarray(100)),
      app2(1, second).fill(1, 17, 18), plain.subarray(2)]));
    check("JPEG with two profiles uses the first", Buffer.compare(Buffer.from(J.jpegProfile(twoProfiles)), rgbIcc), 0);
    check("JPEG profile with a block missing", J.jpegProfile(new Uint8Array(Buffer.concat([plain.subarray(0, 2), app2(2, rgbIcc.subarray(100)), plain.subarray(2)]))), null);
    const badSize = profile("RGB ", 5); badSize.writeUInt32BE(999, 0);
    check("profile with a wrong size is ignored", J.profileChannels(badSize), 0);
    check("profile channels", `${J.profileChannels(rgbIcc)} ${J.profileChannels(profile("GRAY", 2))} ${J.profileChannels(profile("CMYK", 3))}`, "3 1 0");

    const iccp = Buffer.concat([Buffer.from("Display P3\0\0", "latin1"), zlib.deflateSync(rgbIcc)]);
    check("PNG profile read", Buffer.compare(Buffer.from(await J.pngProfile(makePng(4, 4, [["iCCP", iccp]]))), rgbIcc), 0);

    const withGray = new Uint8Array(Buffer.concat([plain.subarray(0, 2), app2(1, profile("GRAY", 4)).fill(1, 17, 18), plain.subarray(2)]));
    const colours = await load(await J.imagesToPdf([
      { kind: "jpg", bytes: withIcc },
      { kind: "jpg", bytes: withIcc },
      { kind: "jpg", bytes: withGray }, // grey profile on a colour picture: must be ignored
      { kind: "jpg", bytes: plain }
    ], { size: "a4", orientation: "auto", margin: "none" }));
    const pics = colours.context.enumerateIndirectObjects().map(([, o]) => o)
      .filter((o) => o instanceof L.PDFRawStream && o.dict.lookup(N.of("Subtype")) === N.of("Image"));
    const spaces = pics.map((o) => o.dict.lookup(N.of("ColorSpace")));
    check("JPG to PDF keeps colour profiles", spaces.map((cs) => cs instanceof L.PDFArray ? "ICC" : String(cs)).join(","), "ICC,ICC,/DeviceRGB,/DeviceRGB");
    check("JPG to PDF stores a shared profile once", spaces[0].get(1) === spaces[1].get(1), true);
    const stored = spaces[0].lookup(1);
    check("JPG to PDF profile bytes and channels", Buffer.compare(Buffer.from(L.decodePDFRawStream(stored).decode()), rgbIcc) === 0 && stored.dict.lookup(N.of("N")).asNumber() === 3, true);
    check("JPG to PDF photo pixels untouched", Buffer.compare(Buffer.from(pics[0].contents), Buffer.from(withIcc)), 0);
  }

  // ---------------- PDF to JPG (page example numbers)
  {
    const T = tool("pdf-to-jpg");
    expectAll("A4 at 150 DPI", T.renderSize(595.28, 841.89, 150), { width: 1240, height: 1754 });
    expectAll("A4 at 300 DPI", T.renderSize(595.28, 841.89, 300), { width: 2480, height: 3508 });
    expectAll("Letter at 300 DPI", T.renderSize(612, 792, 300), { width: 2550, height: 3300 });
    // A0 at 300 DPI would be 9,933 × 14,043 pixels; capped to 16 million pixels: scale √(16,000,000 ÷ (2,383.94 × 3,370.39)) = 1.41115
    const big = T.renderSize(2383.94, 3370.39, 300);
    check("A0 capped scale", big.scale.toFixed(5), "1.41115");
    check("A0 capped pixels", big.width * big.height <= 16000000 + big.width + big.height, true);
    check("image names", T.imageName("report", 7, 120, "jpg") + " " + T.imageName("a", 3, 9, "png"), "report-page-007.jpg a-page-3.png");
  }

  // ---------------- Page numbers (page example: 10 pages, cover skipped)
  {
    const PN = tool("pdf-page-numbers");
    check("number style plain", PN.numberText("plain", 3, 10), "3");
    check("number style page", PN.numberText("page", 3, 10), "Page 3");
    check("number style page of", PN.numberText("page-of", 3, 10), "Page 3 of 10");
    check("number style slash", PN.numberText("slash", 3, 10), "3 / 10");
    check("margin is 30 points", PN.MARGIN, 30);
    // "1" in Helvetica is 556/1000 wide → 5.56 at 10 points.
    expectAll("number bottom middle on Letter", PN.numberPosition(612, 792, 5.56, 10, "bottom-center"), { x: 303.22, y: 30 });
    expectAll("number top right on Letter", PN.numberPosition(612, 792, 5.56, 10, "top-right"), { x: 576.44, y: 754.82 });
    expectAll("number bottom left", PN.numberPosition(612, 792, 5.56, 10, "bottom-left"), { x: 30, y: 30 });
    const out = await load(await PN.addPageNumbers(await makePdf(10), { position: "bottom-center", format: "page-of", start: 1, skipFirst: true, size: 11 }));
    const pageText = (i) => {
      const contents = out.getPages()[i].node.lookup(N.of("Contents"));
      const list = contents instanceof L.PDFArray ? contents.asArray().map((ref) => out.context.lookup(ref)) : [contents];
      return list.map((s) => Buffer.from(L.decodePDFRawStream(s).decode()).toString("latin1").toLowerCase()).join("\n");
    };
    check("cover page not numbered", pageText(0).includes(hex("Page")), false);
    check("page 2 says Page 1 of 9", pageText(1).includes(hex("Page 1 of 9")), true);
    check("page 10 says Page 9 of 9", pageText(9).includes(hex("Page 9 of 9")), true);
    const rotated = await load(await PN.addPageNumbers(await makePdf(1, { rotate: [90] }), { position: "bottom-center", format: "plain", start: 5, skipFirst: false, size: 10 }));
    check("number on a turned page is drawn turned", matrices(streamText(rotated), "tm").some((m) => m.startsWith("0,1,-1,0,")), true);
  }

  // ---------------- Watermark (page example: DRAFT on Letter)
  {
    const W = tool("pdf-watermark");
    const doc = await L.PDFDocument.create();
    const bold = await doc.embedFont(L.StandardFonts.HelveticaBold);
    check("DRAFT width at size 1", bold.widthOfTextAtSize("DRAFT", 1).toFixed(3), "3.388");
    const flat = W.watermarkLayout(612, 792, 3.388, "medium", false);
    expectAll("watermark DRAFT straight on Letter", { size: round(flat.size), angle: flat.angle, x: round(flat.x), y: round(flat.y) },
      { size: 90.32, angle: 0, x: 153, y: 363.58 });
    // Diagonal: corner to corner = √(612² + 792²) = 1,000.90; half of that ÷ 3.388 = 147.71; angle atan(792 ÷ 612) = 52.31°
    const diag = W.watermarkLayout(612, 792, 3.388, "medium", true);
    check("watermark diagonal size", round(diag.size), 147.71);
    check("watermark diagonal angle", round(diag.angle), 52.31);
    // A short word is capped at 30% of the page's short side: 612 × 0.3 = 183.6.
    check("watermark size cap", round(W.watermarkLayout(612, 792, 1, "large", false).size), 183.6);

    const src = await makePdf(3);
    const out = await load(await W.addWatermark(src, { text: "DRAFT", size: "medium", diagonal: true, colour: "red", opacity: "medium", behind: false, pages: [2] }));
    const gs = streamText(out);
    const streams = (d) => d.getPages().map((pg) => {
      const c = pg.node.lookup(N.of("Contents"));
      return c instanceof L.PDFArray ? c.size() : 1;
    });
    const before = streams(await load(src));
    check("watermark on page 2 only", streams(out).map((n, i) => n > before[i]).join(","), "false,true,false");
    check("watermark text drawn", gs.includes(hex("DRAFT")), true);
    const ext = out.getPages()[1].node.lookup(N.of("Resources")).lookup(N.of("ExtGState"));
    check("watermark 30% see-through", ext.values().some((g) => (g.lookup ? g : out.context.lookup(g)).lookup(N.of("ca")).asNumber() === 0.3), true);
    const behind = await load(await W.addWatermark(src, { text: "COPY", size: "small", diagonal: false, colour: "grey", opacity: "light", behind: true, pages: null }));
    const first = behind.getPages()[0].node.lookup(N.of("Contents")).lookup(0);
    check("watermark behind is drawn first", Buffer.from(L.decodePDFRawStream(first).decode()).toString("latin1").toLowerCase().includes(hex("COPY")), true);
    check("watermark emoji", await W.addWatermark(src, { text: "OK 😀" }).then(() => "ok", (e) => e.message),
      "Some characters in your watermark can't be used. Stick to letters A to Z, numbers and common symbols.");
    check("watermark empty", await W.addWatermark(src, { text: "  " }).then(() => "ok", (e) => e.message), "Type the text for your watermark.");
  }

  // ---------------- Sign PDF (page example: a 3:1 signature at 30% of a Letter page)
  {
    const S = tool("pdf-sign");
    expectAll("sign placement Letter example", S.placement(612, 792, 0.72, 0.85, 0.3, 3), { width: 183.6, height: 61.2, x: 348.84, y: 88.2 });
    // Kept inside the page: centred on the right edge, it's pushed back in.
    expectAll("sign placement kept on the page", S.placement(612, 792, 1, 0, 0.3, 3), { x: 428.4, y: 730.8 });
    // A very tall signature is limited to the page height.
    expectAll("sign placement tall picture", S.placement(200, 100, 0.5, 0.5, 1, 0.5), { width: 50, height: 100, x: 75, y: 0 });
    expectAll("sign date under the signature", S.dateSpot({ x: 10, y: 100, width: 60, height: 20 }, 300), { size: 8, y: 88.8 });
    check("sign date moves above near the bottom", S.dateSpot({ x: 10, y: 2, width: 60, height: 20 }, 300).y, 26.8);

    const src = await makePdf(3);
    const png = makePng(30, 10);
    const out = await load(await S.signPdf(src, { png, aspect: 3, page: 2, cx: 0.5, cy: 0.5, widthShare: 0.3, dateText: "30 September 2026" }));
    const images = out.getPages().map((pg) => {
      const x = pg.node.lookup(N.of("Resources")).lookup(N.of("XObject"));
      return x ? x.keys().length : 0;
    });
    check("sign picture on page 2 only", images.join(","), "0,1,0");
    // Page 2 is 202 × 300: width 60.6, height 20.2, left 101 − 30.3 = 70.7, bottom 300 − 139.9 − 20.2 = 139.9
    // Everything drawn on one page (pdf-lib adds a new content stream next to the page's own).
    const pageText = (d, i) => {
      const c = d.getPages()[i].node.lookup(N.of("Contents"));
      const list = c instanceof L.PDFArray ? c.asArray().map((r) => d.context.lookup(r)) : [c];
      return list.map((st) => Buffer.from(L.decodePDFRawStream(st).decode()).toString("latin1")).join("\n");
    };
    const cms = matrices(pageText(out, 1), "cm");
    check("sign picture position", cms.includes("1,0,0,1,70.7,139.9"), true);
    check("sign picture size", cms.includes("60.6,0,0,20.2,0,0"), true);
    check("sign date written", streamText(out).includes(hex("30 September 2026").toLowerCase()), true);

    // A sideways page (rotated 90°): the signature is placed on the page as the reader sees it.
    const turned = await load(await S.signPdf(await makePdf(1, { rotate: [90] }), { png, aspect: 3, page: 1, cx: 0.5, cy: 0.5, widthShare: 0.2 }));
    const tcms = matrices(pageText(turned, 0), "cm");
    check("sign on a rotated page: position", tcms.includes("1,0,0,1,110.5,120"), true);
    check("sign on a rotated page: turned with the page", tcms.includes("0,1,-1,0,0,0"), true);

    check("sign without a signature", await S.signPdf(src, { png: null, page: 1 }).then(() => "ok", (e) => e.message), "Draw or type your signature first.");
    check("sign page out of range", await S.signPdf(src, { png, aspect: 3, page: 5, cx: 0.5, cy: 0.5, widthShare: 0.3 }).then(() => "ok", (e) => e.message), "Choose a page from 1 to 3.");
  }

  // ---------------- PDF to text (page example: "Invoice" and "total" 3 points apart, 12-point text)
  {
    const X = tool("pdf-to-text");
    const item = (str, x, y, width, extra) => ({ str, transform: [12, 0, 0, 12, x, y], width, height: 12, ...extra });
    const text = X.itemsToText([
      item("Invoice", 50, 700, 50), item("total", 103, 700, 30),
      item("Line two", 50, 686, 60),
      item("New para", 50, 650, 60),
      item("Hel", 50, 636, 20), item("lo", 70, 636, 10)
    ]);
    check("pdf text: space, new line, paragraph, joined word", text, "Invoice total\nLine two\n\nNew para\nHello");
    check("pdf text: end-of-line marks", X.itemsToText([item("One", 50, 700, 20, { hasEOL: true }), item("Two", 50, 700, 20)]), "One\nTwo");
    check("pdf text: empty page", X.itemsToText([]), "");
    check("pdf text: page headings", X.joinPages([{ number: 1, text: "A" }, { number: 3, text: "B" }], true), "--- Page 1 ---\nA\n\n--- Page 3 ---\nB\n");
    check("pdf text: no headings", X.joinPages([{ number: 1, text: "A" }, { number: 2, text: "B" }], false), "A\n\nB\n");
  }

  // ---------------- Compress (page example: a 2,550 × 3,300 scan)
  {
    const C = tool("pdf-compress");
    expectAll("compress light", C.targetSize(2550, 3300, 3000), { width: 2318, height: 3000 });
    expectAll("compress recommended", C.targetSize(2550, 3300, 2000), { width: 1545, height: 2000 });
    expectAll("compress strong", C.targetSize(2550, 3300, 1400), { width: 1082, height: 1400 });
    check("compress levels", ["light", "recommended", "strong"].map((k) => `${C.LEVELS[k].maxSide}/${C.LEVELS[k].quality}`).join(" "), "3000/0.82 2000/0.7 1400/0.5");
    check("small pictures keep their size", JSON.stringify(C.targetSize(800, 600, 2000)), '{"width":800,"height":600}');

    // PNG row filters: Sub then Up. Row 1: 10, 10+5, 15+5. Row 2: each byte + the one above.
    check("unfilter Sub and Up", Array.from(C.unfilterPng(new Uint8Array([1, 10, 5, 5, 2, 1, 1, 1]), 3, 1, 2)).join(","), "10,15,20,11,16,21");
    // Paeth on row 2: first byte uses the one above (10) → 11; next picks nearest of left 11, above 15, corner 10 → 15 + 1.
    check("unfilter Paeth", Array.from(C.unfilterPng(new Uint8Array([0, 10, 15, 4, 1, 1]), 2, 1, 2)).join(","), "10,15,11,16");

    let seed = 7;
    const pixels = new Uint8Array(3000 * 20 * 3).map(() => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 24); // noise: barely compresses
    const src = await makePdf(1, {
      edit(doc) {
        const ctx = doc.context;
        const page = doc.getPages()[0];
        const photo = fakeJpeg(3300, 2550, 0, false, 60000);
        const mask = ctx.register(L.PDFRawStream.of(ctx.obj({ Type: "XObject", Subtype: "Image", Width: 3300, Height: 2550, ColorSpace: "DeviceGray", BitsPerComponent: 8, Filter: "DCTDecode", Length: 1 }), fakeJpeg(3300, 2550, 0, false, 30000)));
        const img = ctx.register(L.PDFRawStream.of(ctx.obj({ Type: "XObject", Subtype: "Image", Width: 3300, Height: 2550, ColorSpace: "DeviceRGB", BitsPerComponent: 8, Filter: "DCTDecode", Length: photo.length }), photo));
        const masked = ctx.register(L.PDFRawStream.of(ctx.obj({ Type: "XObject", Subtype: "Image", Width: 3300, Height: 2550, ColorSpace: "DeviceRGB", BitsPerComponent: 8, Filter: "DCTDecode", SMask: mask }), photo));
        const packed = zlib.deflateSync(Buffer.from(pixels));
        const flat = ctx.register(L.PDFRawStream.of(ctx.obj({ Type: "XObject", Subtype: "Image", Width: 3000, Height: 20, ColorSpace: "DeviceRGB", BitsPerComponent: 8, Filter: "FlateDecode" }), new Uint8Array(packed)));
        [img, masked, flat].forEach((ref) => page.node.newXObject("Im", ref));
        const loose = ctx.register(L.PDFRawStream.of(ctx.obj({}), new TextEncoder().encode("0 0 m 10 10 l S\n".repeat(400))));
        page.node.addContentStream(loose);
        ctx.register(ctx.obj({ Junk: "Leftover" })); // nothing points here
      }
    });
    const seen = [];
    const fakeEncoder = (job) => {
      seen.push(`${job.kind}:${job.targetWidth}x${job.targetHeight}`);
      if (job.kind === "raw") check("compress raw pixels decoded", job.pixels().length, pixels.length);
      return Promise.resolve({ bytes: new Uint8Array(500).fill(1), width: job.targetWidth, height: job.targetHeight, components: 3 });
    };
    const res = await C.compressPdf(src, "recommended", fakeEncoder);
    check("compress looks at the right pictures", seen.sort().join(" "), "jpeg:2000x1545 jpeg:3300x2550 raw:2000x13");
    check("compress replaced pictures", res.images, 3);
    const out = await load(res.bytes);
    const images = out.context.enumerateIndirectObjects().map(([, o]) => o)
      .filter((o) => o instanceof L.PDFRawStream && o.dict.lookup(N.of("Subtype")) === N.of("Image"));
    check("compress new picture sizes", images.map((o) => `${o.dict.lookup(N.of("Width")).asNumber()}x${o.dict.lookup(N.of("Height")).asNumber()}`).sort().join(" "),
      "2000x13 2000x1545 3300x2550 3300x2550");
    check("compress leaves the mask alone", images.filter((o) => o.dict.lookup(N.of("ColorSpace")) === N.of("DeviceGray")).length, 1);
    check("compress deflates loose data", out.context.enumerateIndirectObjects().some(([, o]) => o instanceof L.PDFRawStream && !o.dict.get(N.of("Subtype")) &&
      o.dict.lookup(N.of("Filter")) === N.of("FlateDecode") && Buffer.from(L.decodePDFRawStream(o).decode()).toString("latin1").startsWith("0 0 m 10 10 l S")), true);
    check("compress removes leftovers", out.context.enumerateIndirectObjects().some(([, o]) => o instanceof L.PDFDict && o.get(N.of("Junk"))), false);
    check("compress smaller file", res.bytes.length < src.length / 3, true);
    const light = await C.compressPdf(src, "light", (job) => { seen.push("light " + job.kind); return null; });
    check("compress light leaves lossless pictures alone", seen.filter((s) => s === "light raw").length, 0);
    check("compress light still opens", (await load(light.bytes)).getPageCount(), 1);
  }
};
