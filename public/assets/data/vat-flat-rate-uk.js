/*
 * UK VAT Flat Rate Scheme figures — the ONLY place these numbers live (LEGAL.md §2, §6).
 * Checked 2026-10-27 against:
 *   Flat rates by business type, 16.5% limited cost rate, 2% and £1,000 test, 1% first-year discount,
 *   flat rate × VAT-inclusive turnover (GOV.UK photographer example: 11% of £1,200 = £132):
 *     https://www.gov.uk/vat-flat-rate-scheme/how-much-you-pay
 *   £150,000 joining limit (taxable turnover excluding VAT, next 12 months):
 *     https://www.gov.uk/vat-flat-rate-scheme/who-can-join
 *   VAT Notice 733 (updated 18 December 2025): relevant goods and what they exclude, £1,000 a year
 *   or "the relevant proportion" for shorter returns (£250 a quarter), the 1% discount also applies
 *   to the 16.5% rate (15.5%), £230,000 leaving limit (VAT-inclusive income), one sector only
 *   (the one with most turnover), capital goods of £2,000 or more including VAT reclaimed outside the scheme:
 *     https://www.gov.uk/government/publications/vat-notice-733-flat-rate-scheme-for-small-businesses/vat-notice-733-flat-rate-scheme-for-small-businesses
 * The 20% standard rate charged on sales comes from tax-uk.js.
 *
 * TO UPDATE: check the GOV.UK pages each year before 6 April (the rates rarely change, but check),
 * change the figures and `checked`, then run `node tests/run-tests.js` and fix the worked examples.
 */
window.ToolNestVatFlatRateUK = {
  checked: "2026-10-27",

  limitedCostRate: 0.165,
  limitedCostShare: 0.02,       // relevant goods under 2% of flat rate turnover...
  limitedCostYearly: 1000,      // ...or under £1,000 a year (a proportion for shorter returns)
  firstYearDiscount: 0.01,      // until the day before the first anniversary of VAT registration
  joinLimit: 150000,            // taxable turnover excluding VAT, next 12 months
  leaveLimit: 230000,           // income including VAT, year to the joining anniversary
  capitalGoodsReclaim: 2000,    // single purchase including VAT

  // [key, business type as GOV.UK names it, rate]. Catering, hotel and pub rates are those from 1 April 2022.
  sectors: [
    ["accountancy", "Accountancy or book-keeping", 0.145],
    ["advertising", "Advertising", 0.11],
    ["agricultural-services", "Agricultural services", 0.11],
    ["other", "Any other activity not listed elsewhere", 0.12],
    ["architect", "Architect, civil and structural engineer or surveyor", 0.145],
    ["animals", "Boarding or care of animals", 0.12],
    ["business-services", "Business services not listed elsewhere", 0.12],
    ["catering", "Catering services including restaurants and takeaways", 0.125],
    ["computer-it", "Computer and IT consultancy or data processing", 0.145],
    ["computer-repair", "Computer repair services", 0.105],
    ["entertainment", "Entertainment or journalism", 0.125],
    ["estate-agency", "Estate agency or property management services", 0.12],
    ["farming", "Farming or agriculture not listed elsewhere", 0.065],
    ["film", "Film, radio, television or video production", 0.13],
    ["financial", "Financial services", 0.135],
    ["forestry", "Forestry or fishing", 0.105],
    ["building", "General building or construction services", 0.095],
    ["hairdressing", "Hairdressing or other beauty treatment services", 0.13],
    ["hiring", "Hiring or renting goods", 0.095],
    ["hotel", "Hotel or accommodation", 0.105],
    ["investigation", "Investigation or security", 0.12],
    ["labour-only", "Labour-only building or construction services", 0.145],
    ["laundry", "Laundry or dry-cleaning services", 0.12],
    ["legal", "Lawyer or legal services", 0.145],
    ["library", "Library, archive, museum or other cultural activity", 0.095],
    ["management", "Management consultancy", 0.14],
    ["metal", "Manufacturing fabricated metal products", 0.105],
    ["food-manufacturing", "Manufacturing food", 0.09],
    ["manufacturing", "Manufacturing not listed elsewhere", 0.095],
    ["textiles", "Manufacturing yarn, textiles or clothing", 0.09],
    ["membership", "Membership organisation", 0.08],
    ["mining", "Mining or quarrying", 0.10],
    ["packaging", "Packaging", 0.09],
    ["photography", "Photography", 0.11],
    ["post-office", "Post offices", 0.05],
    ["printing", "Printing", 0.085],
    ["pubs", "Pubs", 0.065],
    ["publishing", "Publishing", 0.11],
    ["real-estate", "Real estate activity not listed elsewhere", 0.14],
    ["repair-goods", "Repairing personal or household goods", 0.10],
    ["repair-vehicles", "Repairing vehicles", 0.085],
    ["retail-food", "Retailing food, confectionery, tobacco, newspapers or children's clothing", 0.04],
    ["retail-pharma", "Retailing pharmaceuticals, medical goods, cosmetics or toiletries", 0.08],
    ["retail", "Retailing not listed elsewhere", 0.075],
    ["retail-vehicles", "Retailing vehicles or fuel", 0.065],
    ["secretarial", "Secretarial services", 0.13],
    ["social-work", "Social work", 0.11],
    ["sport", "Sport or recreation", 0.085],
    ["transport", "Transport or storage, including couriers, freight, removals and taxis", 0.10],
    ["travel", "Travel agency", 0.105],
    ["veterinary", "Veterinary medicine", 0.11],
    ["wholesale-agri", "Wholesaling agricultural products", 0.08],
    ["wholesale-food", "Wholesaling food", 0.075],
    ["wholesale", "Wholesaling not listed elsewhere", 0.085]
  ]
};
