/*
 * Canada GST/HST Quick Method remittance rates — the ONLY place these figures live (LEGAL.md §2, §6).
 * Checked 2026-10-27 against CRA guide RC4058, Quick Method of Accounting for GST/HST
 * (page modified 2025-07-21):
 *   https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4058/quick-method-accounting-gst-hst.html
 * Remittance rate × revenue from eligible supplies INCLUDING GST/HST; 1% credit on the first $30,000
 * of eligible supplies (including GST/HST) each fiscal year, not carried forward; annual worldwide
 * taxable supplies (including GST/HST and associates) of $400,000 or less; ITCs still allowed on
 * capital property and real property; legal, accounting, actuarial, bookkeeping, financial consulting,
 * tax consulting and tax return preparation businesses can't use it. The "goods for resale" rates
 * apply when goods bought for resale (including GST/HST) were at least 40% of annual taxable supplies.
 * The GST/HST rate in each province comes from tax-ca.js.
 *
 * Tables: rates[businessType][rate charged on the supply][rate in the province of the business's
 * permanent establishment]. A negative number is the credit on 5% supplies made by a business in an
 * HST province (remittance rate 0%).
 *
 * TO UPDATE: check RC4058 each January (and whenever a province changes its HST rate), change the
 * figures and `checked`, then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestQuickMethodCA = {
  checked: "2026-10-27",
  firstSalesCredit: 0.01,
  firstSalesLimit: 30000,
  maxSupplies: 400000,
  goodsShare: 0.40,

  rates: {
    services: {
      "0.05": { "0.05": 0.036, "0.13": 0.018, "0.14": 0.016, "0.15": 0.014 },
      "0.13": { "0.05": 0.105, "0.13": 0.088, "0.14": 0.086, "0.15": 0.084 },
      "0.14": { "0.05": 0.113, "0.13": 0.096, "0.14": 0.094, "0.15": 0.092 },
      "0.15": { "0.05": 0.120, "0.13": 0.104, "0.14": 0.102, "0.15": 0.100 }
    },
    goods: {
      "0.05": { "0.05": 0.018, "0.13": -0.028, "0.14": -0.034, "0.15": -0.040 },
      "0.13": { "0.05": 0.088, "0.13": 0.044, "0.14": 0.039, "0.15": 0.033 },
      "0.14": { "0.05": 0.096, "0.13": 0.053, "0.14": 0.047, "0.15": 0.042 },
      "0.15": { "0.05": 0.104, "0.13": 0.061, "0.14": 0.056, "0.15": 0.050 }
    }
  }
};
