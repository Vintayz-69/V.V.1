/* Freelance Invoice Generator — 100% browser-based invoice and PDF maker (LEGAL.md §9). */
(function () {
  "use strict";

  var T = window.ToolNest;

  function calculate(v) {
    var items = v.items || [];
    var subtotal = 0;
    for (var i = 0; i < items.length; i++) {
      var q = Number(items[i].qty) || 0;
      var r = Number(items[i].rate) || 0;
      subtotal += q * r;
    }
    var discountPct = Number(v.discountPct) || 0;
    var taxPct = Number(v.taxPct) || 0;
    var discount = subtotal * (discountPct / 100);
    var taxable = Math.max(0, subtotal - discount);
    var tax = taxable * (taxPct / 100);
    var total = taxable + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      taxable: Math.round(taxable * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  window.ToolNestCalc = calculate;

  // If running in Node test sandbox without full DOM, exit early.
  if (!document.getElementById("invoice-app")) return;

  var CURRENCIES = {
    USD: "$",
    GBP: "£",
    CAD: "C$",
    AUD: "A$"
  };

  var defaultInvoice = {
    currency: "USD",
    senderName: "Sarah Chen Design",
    senderEmail: "sarah@chencreative.com",
    senderAddress: "Seattle, WA, United States",
    clientName: "Acme Digital Studio",
    clientEmail: "accounts@acmedigital.com",
    clientAddress: "San Francisco, CA",
    invoiceNumber: "INV-2026-001",
    invoiceDate: "2026-09-28",
    dueDate: "2026-10-12",
    items: [
      { desc: "Brand Identity & Logo Suite", qty: 1, rate: 2500 },
      { desc: "Website UI Design (Figma)", qty: 25, rate: 85 },
      { desc: "Design System Guidelines", qty: 1, rate: 750 }
    ],
    discountPct: 5,
    taxPct: 0,
    notes: "Payment is appreciated within 14 days.\nDirect deposit / Wire details:\nBank: First National Bank\nAccount: 9876543210\nRouting / Swift: 123456789"
  };

  var state = JSON.parse(JSON.stringify(defaultInvoice));

  function getCurrencySymbol() {
    return CURRENCIES[state.currency] || "$";
  }

  // Invoices show "C$" and "A$" so a client can't mistake Canadian or Australian dollars for US dollars.
  function formatMoney(amount) {
    return getCurrencySymbol() + new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(Number(amount) || 0);
  }

  function readFromForm() {
    state.currency = document.getElementById("inv-currency").value;
    state.senderName = document.getElementById("inv-from-name").value;
    state.senderEmail = document.getElementById("inv-from-email").value;
    state.senderAddress = document.getElementById("inv-from-address").value;
    state.clientName = document.getElementById("inv-to-name").value;
    state.clientEmail = document.getElementById("inv-to-email").value;
    state.clientAddress = document.getElementById("inv-to-address").value;
    state.invoiceNumber = document.getElementById("inv-number").value;
    state.invoiceDate = document.getElementById("inv-date").value;
    state.dueDate = document.getElementById("inv-due").value;
    state.discountPct = Number(document.getElementById("inv-discount").value) || 0;
    state.taxPct = Number(document.getElementById("inv-tax").value) || 0;
    state.notes = document.getElementById("inv-notes").value;

    var rows = document.querySelectorAll(".inv-item-row");
    var items = [];
    rows.forEach(function (row) {
      var desc = row.querySelector(".item-desc").value;
      var qty = Number(row.querySelector(".item-qty").value) || 0;
      var rate = Number(row.querySelector(".item-rate").value) || 0;
      items.push({ desc: desc, qty: qty, rate: rate });
    });
    state.items = items;
  }

  function populateForm() {
    document.getElementById("inv-currency").value = state.currency;
    document.getElementById("inv-from-name").value = state.senderName || "";
    document.getElementById("inv-from-email").value = state.senderEmail || "";
    document.getElementById("inv-from-address").value = state.senderAddress || "";
    document.getElementById("inv-to-name").value = state.clientName || "";
    document.getElementById("inv-to-email").value = state.clientEmail || "";
    document.getElementById("inv-to-address").value = state.clientAddress || "";
    document.getElementById("inv-number").value = state.invoiceNumber || "";
    document.getElementById("inv-date").value = state.invoiceDate || "";
    document.getElementById("inv-due").value = state.dueDate || "";
    document.getElementById("inv-discount").value = state.discountPct || 0;
    document.getElementById("inv-tax").value = state.taxPct || 0;
    document.getElementById("inv-notes").value = state.notes || "";

    var tbody = document.getElementById("inv-items-body");
    tbody.innerHTML = "";
    (state.items || []).forEach(function (item) {
      addItemRow(item.desc, item.qty, item.rate);
    });
  }

  function addItemRow(desc, qty, rate) {
    var tbody = document.getElementById("inv-items-body");
    var tr = document.createElement("tr");
    tr.className = "inv-item-row";
    tr.innerHTML = [
      '<td><input type="text" class="item-desc" aria-label="Description" placeholder="Work description" autocomplete="off"></td>',
      '<td><input type="text" inputmode="decimal" class="item-qty num" aria-label="Quantity or hours" placeholder="1" autocomplete="off"></td>',
      '<td><input type="text" inputmode="decimal" class="item-rate num" aria-label="Rate" placeholder="0.00" autocomplete="off"></td>',
      '<td class="item-total num"></td>',
      '<td><button type="button" class="btn-del-item" aria-label="Remove item" title="Remove">&times;</button></td>'
    ].join("");

    tr.querySelector(".item-desc").value = desc || "";
    tr.querySelector(".item-qty").value = qty != null ? qty : 1;
    tr.querySelector(".item-rate").value = rate != null ? rate : 0;
    tr.querySelector(".item-total").textContent = formatMoney((Number(qty) || 0) * (Number(rate) || 0));
    tbody.appendChild(tr);

    tr.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var q = Number(tr.querySelector(".item-qty").value) || 0;
        var r = Number(tr.querySelector(".item-rate").value) || 0;
        tr.querySelector(".item-total").textContent = formatMoney(q * r);
        update();
      });
    });

    tr.querySelector(".btn-del-item").addEventListener("click", function () {
      if (document.querySelectorAll(".inv-item-row").length > 1) {
        tr.remove();
        update();
      }
    });
  }

  function update() {
    readFromForm();
    var r = calculate(state);

    // Update symbols in form
    document.querySelectorAll(".inv-cur-sym").forEach(function (el) {
      el.textContent = getCurrencySymbol();
    });

    // Update preview
    document.getElementById("prev-sender-name").textContent = state.senderName || "Your Name / Business";
    document.getElementById("prev-sender-email").textContent = state.senderEmail || "";
    document.getElementById("prev-sender-address").textContent = state.senderAddress || "";

    document.getElementById("prev-client-name").textContent = state.clientName || "Client Name / Business";
    document.getElementById("prev-client-email").textContent = state.clientEmail || "";
    document.getElementById("prev-client-address").textContent = state.clientAddress || "";

    document.getElementById("prev-inv-num").textContent = state.invoiceNumber || "INV-001";
    document.getElementById("prev-inv-date").textContent = state.invoiceDate || "—";
    document.getElementById("prev-inv-due").textContent = state.dueDate || "—";

    var prevItems = document.getElementById("prev-items-list");
    prevItems.innerHTML = "";
    (state.items || []).forEach(function (it) {
      var row = document.createElement("tr");
      var q = Number(it.qty) || 0;
      var rate = Number(it.rate) || 0;
      // textContent, not innerHTML, so typed text (or an opened draft) can never add HTML to the page.
      [it.desc || "Item", String(q), formatMoney(rate), formatMoney(q * rate)].forEach(function (val, k) {
        var td = document.createElement("td");
        if (k > 0) td.className = "num";
        td.textContent = val;
        row.appendChild(td);
      });
      prevItems.appendChild(row);
    });

    document.getElementById("prev-subtotal").textContent = formatMoney(r.subtotal);

    var discRow = document.getElementById("prev-discount-row");
    if (r.discount > 0) {
      discRow.style.display = "";
      document.getElementById("prev-discount").textContent = "- " + formatMoney(r.discount);
      document.getElementById("prev-discount-label").textContent = "Discount (" + state.discountPct + "%)";
    } else {
      discRow.style.display = "none";
    }

    var taxRow = document.getElementById("prev-tax-row");
    if (r.tax > 0) {
      taxRow.style.display = "";
      document.getElementById("prev-tax").textContent = formatMoney(r.tax);
      document.getElementById("prev-tax-label").textContent = "Tax (" + state.taxPct + "%)";
    } else {
      taxRow.style.display = "none";
    }

    document.getElementById("prev-total").textContent = formatMoney(r.total);

    var prevNotes = document.getElementById("prev-notes");
    if (state.notes && state.notes.trim()) {
      prevNotes.textContent = state.notes;
      document.getElementById("prev-notes-box").style.display = "";
    } else {
      document.getElementById("prev-notes-box").style.display = "none";
    }
  }

  // --- PDF Export with pdf-lib ---
  var A4 = [595.28, 841.89]; // A4 in points (width x height)

  async function downloadPdf() {
    var btn = document.getElementById("btn-download-pdf");
    var origText = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "Generating PDF...";

    try {
      if (!window.PDFLib) {
        alert("PDF library is loading. Please try again in a few moments.");
        return;
      }
      readFromForm();
      var PDFDocument = window.PDFLib.PDFDocument;
      var StandardFonts = window.PDFLib.StandardFonts;
      var rgb = window.PDFLib.rgb;

      var pdfDoc = await PDFDocument.create();
      pdfDoc.setTitle("Invoice " + (state.invoiceNumber || ""));
      var page = pdfDoc.addPage(A4);
      var font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      var fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      var navy = rgb(0.04, 0.11, 0.20);
      var subtle = rgb(0.39, 0.45, 0.55);
      var textDark = rgb(0.06, 0.09, 0.16);
      var borderGray = rgb(0.88, 0.91, 0.94);
      var bgLight = rgb(0.96, 0.97, 0.98);

      var margin = 45;
      var width = A4[0] - margin * 2;
      var right = margin + width;
      var top = 800;
      var bottom = 50;
      var y = top;

      // The built-in PDF fonts only cover Western European letters. Anything else
      // (for example emoji or non-Latin scripts) is swapped for "?" and the visitor is told.
      var replaced = false;
      var okChar = {};
      function safe(str) {
        return Array.from(String(str == null ? "" : str).replace(/\t/g, " ")).map(function (ch) {
          if (ch === "\n") return ch;
          if (!(ch in okChar)) {
            try { font.encodeText(ch); fontBold.encodeText(ch); okChar[ch] = true; } catch (e) { okChar[ch] = false; }
          }
          if (okChar[ch]) return ch;
          replaced = true;
          return "?";
        }).join("");
      }

      // Split text into lines that fit maxWidth; very long words are broken up.
      function wrap(str, f, size, maxWidth) {
        var lines = [];
        safe(str).split("\n").forEach(function (para) {
          var line = "";
          para.split(" ").forEach(function (word) {
            var test = line ? line + " " + word : word;
            if (f.widthOfTextAtSize(test, size) <= maxWidth) { line = test; return; }
            if (line) lines.push(line);
            line = word;
            while (line.length > 1 && f.widthOfTextAtSize(line, size) > maxWidth) {
              var cut = line.length - 1;
              while (cut > 1 && f.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut--;
              lines.push(line.slice(0, cut));
              line = line.slice(cut);
            }
          });
          lines.push(line);
        });
        return lines;
      }

      function text(str, x, size, f, color) {
        page.drawText(safe(str), { x: x, y: y, size: size, font: f, color: color });
      }
      function textRight(str, xRight, size, f, color) {
        str = safe(str);
        page.drawText(str, { x: xRight - f.widthOfTextAtSize(str, size), y: y, size: size, font: f, color: color });
      }
      // Start a new page when the next block would not fit.
      function room(needed) {
        if (y - needed < bottom) {
          page = pdfDoc.addPage(A4);
          y = top;
        }
      }

      // Header
      y -= 20;
      text("INVOICE", margin, 24, fontBold, navy);
      textRight("Date: " + (state.invoiceDate || ""), right, 10, font, textDark);
      y -= 16;
      text(state.invoiceNumber || "INV-001", margin, 11, font, subtle);
      textRight("Due date: " + (state.dueDate || ""), right, 10, fontBold, navy);
      y -= 34;
      page.drawLine({ start: { x: margin, y: y }, end: { x: right, y: y }, thickness: 1, color: borderGray });
      y -= 25;

      // From and Billed to, side by side
      var colW = 240;
      var toX = margin + 260;
      text("FROM:", margin, 9, fontBold, subtle);
      text("BILLED TO:", toX, 9, fontBold, subtle);
      y -= 16;
      var fromLines = wrap(state.senderName || "Your Business", fontBold, 12, colW);
      var toLines = wrap(state.clientName || "Client Business", fontBold, 12, colW);
      var fromSmall = wrap([state.senderEmail, state.senderAddress].filter(Boolean).join("\n"), font, 10, colW);
      var toSmall = wrap([state.clientEmail, state.clientAddress].filter(Boolean).join("\n"), font, 10, colW);
      var i;
      for (i = 0; i < Math.max(fromLines.length, toLines.length); i++) {
        if (fromLines[i]) text(fromLines[i], margin, 12, fontBold, textDark);
        if (toLines[i]) text(toLines[i], toX, 12, fontBold, textDark);
        y -= 15;
      }
      for (i = 0; i < Math.max(fromSmall.length, toSmall.length); i++) {
        if (fromSmall[i]) text(fromSmall[i], margin, 10, font, subtle);
        if (toSmall[i]) text(toSmall[i], toX, 10, font, subtle);
        y -= 13;
      }
      y -= 22;

      // Line items table: the description wraps, the numbers are right-aligned.
      var descW = 250;
      var qtyRight = margin + 320;
      var rateRight = margin + 410;
      var amountRight = right - 10;
      function tableHeader() {
        page.drawRectangle({ x: margin, y: y - 7, width: width, height: 24, color: bgLight });
        text("Description", margin + 10, 10, fontBold, navy);
        textRight("Qty", qtyRight, 10, fontBold, navy);
        textRight("Rate", rateRight, 10, fontBold, navy);
        textRight("Amount", amountRight, 10, fontBold, navy);
        y -= 24;
      }
      tableHeader();

      (state.items || []).forEach(function (it) {
        var q = Number(it.qty) || 0;
        var r = Number(it.rate) || 0;
        var lines = wrap(it.desc || "Item", font, 9.5, descW);
        var needed = lines.length * 12 + 12;
        if (y - needed < bottom) {
          room(needed + 40);
          tableHeader();
        }
        textRight(String(q), qtyRight, 9.5, font, textDark);
        textRight(formatMoney(r), rateRight, 9.5, font, textDark);
        textRight(formatMoney(q * r), amountRight, 9.5, font, textDark);
        lines.forEach(function (ln, k) {
          text(ln, margin + 10, 9.5, font, textDark);
          if (k < lines.length - 1) y -= 12;
        });
        y -= 8;
        page.drawLine({ start: { x: margin, y: y }, end: { x: right, y: y }, thickness: 0.5, color: borderGray });
        y -= 14;
      });

      // Totals, right-aligned
      var calcRes = calculate(state);
      room(90);
      y -= 6;
      var totX = margin + 300;
      text("Subtotal:", totX, 10, font, subtle);
      textRight(formatMoney(calcRes.subtotal), amountRight, 10, font, textDark);
      y -= 16;
      if (calcRes.discount > 0) {
        text("Discount (" + state.discountPct + "%):", totX, 10, font, subtle);
        textRight("- " + formatMoney(calcRes.discount), amountRight, 10, font, textDark);
        y -= 16;
      }
      if (calcRes.tax > 0) {
        text("Tax (" + state.taxPct + "%):", totX, 10, font, subtle);
        textRight(formatMoney(calcRes.tax), amountRight, 10, font, textDark);
        y -= 16;
      }
      page.drawLine({ start: { x: totX, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 1, color: borderGray });
      y -= 12;
      text("Total Due:", totX, 12, fontBold, navy);
      textRight(formatMoney(calcRes.total), amountRight, 13, fontBold, navy);
      y -= 35;

      // Payment instructions and notes (wrapped, continuing on a new page if needed)
      if (state.notes && state.notes.trim()) {
        room(40);
        text("PAYMENT INSTRUCTIONS & NOTES", margin, 9, fontBold, subtle);
        y -= 14;
        wrap(state.notes, font, 9, width).forEach(function (ln) {
          room(12);
          text(ln, margin, 9, font, textDark);
          y -= 12;
        });
      }

      var pdfBytes = await pdfDoc.save();
      var blob = new Blob([pdfBytes], { type: "application/pdf" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = (state.invoiceNumber || "Invoice").replace(/[\\/:*?"<>|]+/g, "-") + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      if (replaced) {
        alert("Your PDF is ready. Some characters (such as emoji or non-Latin letters) can't be shown in the PDF font, so they appear as \"?\". Please check the PDF before you send it.");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating PDF: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  }

  // --- Draft Save and Open (Local file only, LEGAL.md §9) ---
  function saveDraft() {
    readFromForm();
    var data = JSON.stringify(state, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (state.invoiceNumber || "invoice-draft") + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function openDraft(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== "object") throw new Error("this is not an invoice draft");
        // Start from the example's shape so a partial or older draft still opens.
        var next = JSON.parse(JSON.stringify(defaultInvoice));
        Object.keys(next).forEach(function (k) {
          if (k in parsed) next[k] = parsed[k];
        });
        if (!Array.isArray(next.items) || !next.items.length) next.items = [{ desc: "", qty: 1, rate: 0 }];
        if (!CURRENCIES[next.currency]) next.currency = "USD";
        state = next;
        populateForm();
        update();
      } catch (err) {
        alert("Could not read draft file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  // Bind Events
  document.getElementById("btn-add-item").addEventListener("click", function () {
    addItemRow("", 1, 0);
    update();
  });

  document.querySelectorAll("#inv-currency, #inv-from-name, #inv-from-email, #inv-from-address, #inv-to-name, #inv-to-email, #inv-to-address, #inv-number, #inv-date, #inv-due, #inv-discount, #inv-tax, #inv-notes").forEach(function (inp) {
    inp.addEventListener("input", update);
  });

  document.getElementById("btn-download-pdf").addEventListener("click", downloadPdf);
  document.getElementById("btn-save-draft").addEventListener("click", saveDraft);
  document.getElementById("btn-reset-example").addEventListener("click", function () {
    state = JSON.parse(JSON.stringify(defaultInvoice));
    populateForm();
    update();
  });

  var fileInput = document.getElementById("inv-file-draft");
  fileInput.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) {
      openDraft(e.target.files[0]);
    }
  });

  // Initial load
  populateForm();
  update();
})();
