/*
 * Public holidays for the business days calculator — the ONLY place these dates live.
 * Checked 2026-09-30 against:
 *   UK bank holidays (all three regions): https://www.gov.uk/bank-holidays  (GOV.UK's own data file,
 *     https://www.gov.uk/bank-holidays.json, which lists 2026 to 2028)
 *   US federal holidays (as observed by federal offices): https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
 *     (OPM lists 2026 and 2027)
 *
 * TO UPDATE: once GOV.UK or OPM publish a new year, add its dates and change `to`.
 * Dates outside `from`–`to` are counted with weekends only, and the page says so.
 */
window.ToolNestHolidays = {
  checked: "2026-09-30",

  regions: {
    us: {
      name: "US federal holidays",
      from: "2026-01-01", to: "2027-12-31",
      dates: {
        "2026-01-01": "New Year's Day",
        "2026-01-19": "Birthday of Martin Luther King, Jr.",
        "2026-02-16": "Washington's Birthday",
        "2026-05-25": "Memorial Day",
        "2026-06-19": "Juneteenth National Independence Day",
        "2026-07-03": "Independence Day (observed)",
        "2026-09-07": "Labor Day",
        "2026-10-12": "Columbus Day",
        "2026-11-11": "Veterans Day",
        "2026-11-26": "Thanksgiving Day",
        "2026-12-25": "Christmas Day",
        "2027-01-01": "New Year's Day",
        "2027-01-18": "Birthday of Martin Luther King, Jr.",
        "2027-02-15": "Washington's Birthday",
        "2027-05-31": "Memorial Day",
        "2027-06-18": "Juneteenth National Independence Day (observed)",
        "2027-07-05": "Independence Day (observed)",
        "2027-09-06": "Labor Day",
        "2027-10-11": "Columbus Day",
        "2027-11-11": "Veterans Day",
        "2027-11-25": "Thanksgiving Day",
        "2027-12-24": "Christmas Day (observed)"
      }
    },
    "england-and-wales": {
      name: "England and Wales bank holidays",
      from: "2026-01-01", to: "2028-12-31",
      dates: {
        "2026-01-01": "New Year's Day",
        "2026-04-03": "Good Friday",
        "2026-04-06": "Easter Monday",
        "2026-05-04": "Early May bank holiday",
        "2026-05-25": "Spring bank holiday",
        "2026-08-31": "Summer bank holiday",
        "2026-12-25": "Christmas Day",
        "2026-12-28": "Boxing Day (substitute day)",
        "2027-01-01": "New Year's Day",
        "2027-03-26": "Good Friday",
        "2027-03-29": "Easter Monday",
        "2027-05-03": "Early May bank holiday",
        "2027-05-31": "Spring bank holiday",
        "2027-08-30": "Summer bank holiday",
        "2027-12-27": "Christmas Day (substitute day)",
        "2027-12-28": "Boxing Day (substitute day)",
        "2028-01-03": "New Year's Day (substitute day)",
        "2028-04-14": "Good Friday",
        "2028-04-17": "Easter Monday",
        "2028-05-01": "Early May bank holiday",
        "2028-05-29": "Spring bank holiday",
        "2028-08-28": "Summer bank holiday",
        "2028-12-25": "Christmas Day",
        "2028-12-26": "Boxing Day"
      }
    },
    scotland: {
      name: "Scotland bank holidays",
      from: "2026-01-01", to: "2028-12-31",
      dates: {
        "2026-01-01": "New Year's Day",
        "2026-01-02": "2nd January",
        "2026-04-03": "Good Friday",
        "2026-05-04": "Early May bank holiday",
        "2026-05-25": "Spring bank holiday",
        "2026-06-15": "World Cup bank holiday",
        "2026-08-03": "Summer bank holiday",
        "2026-11-30": "St Andrew's Day",
        "2026-12-25": "Christmas Day",
        "2026-12-28": "Boxing Day (substitute day)",
        "2027-01-01": "New Year's Day",
        "2027-01-04": "2nd January (substitute day)",
        "2027-03-26": "Good Friday",
        "2027-05-03": "Early May bank holiday",
        "2027-05-31": "Spring bank holiday",
        "2027-08-02": "Summer bank holiday",
        "2027-11-30": "St Andrew's Day",
        "2027-12-27": "Christmas Day (substitute day)",
        "2027-12-28": "Boxing Day (substitute day)",
        "2028-01-03": "New Year's Day (substitute day)",
        "2028-01-04": "2nd January (substitute day)",
        "2028-04-14": "Good Friday",
        "2028-05-01": "Early May bank holiday",
        "2028-05-29": "Spring bank holiday",
        "2028-08-07": "Summer bank holiday",
        "2028-11-30": "St Andrew's Day",
        "2028-12-25": "Christmas Day",
        "2028-12-26": "Boxing Day"
      }
    },
    "northern-ireland": {
      name: "Northern Ireland bank holidays",
      from: "2026-01-01", to: "2028-12-31",
      dates: {
        "2026-01-01": "New Year's Day",
        "2026-03-17": "St Patrick's Day",
        "2026-04-03": "Good Friday",
        "2026-04-06": "Easter Monday",
        "2026-05-04": "Early May bank holiday",
        "2026-05-25": "Spring bank holiday",
        "2026-07-13": "Battle of the Boyne (Orangemen's Day)",
        "2026-08-31": "Summer bank holiday",
        "2026-12-25": "Christmas Day",
        "2026-12-28": "Boxing Day (substitute day)",
        "2027-01-01": "New Year's Day",
        "2027-03-17": "St Patrick's Day",
        "2027-03-26": "Good Friday",
        "2027-03-29": "Easter Monday",
        "2027-05-03": "Early May bank holiday",
        "2027-05-31": "Spring bank holiday",
        "2027-07-12": "Battle of the Boyne (Orangemen's Day)",
        "2027-08-30": "Summer bank holiday",
        "2027-12-27": "Christmas Day (substitute day)",
        "2027-12-28": "Boxing Day (substitute day)",
        "2028-01-03": "New Year's Day (substitute day)",
        "2028-03-17": "St Patrick's Day",
        "2028-04-14": "Good Friday",
        "2028-04-17": "Easter Monday",
        "2028-05-01": "Early May bank holiday",
        "2028-05-29": "Spring bank holiday",
        "2028-07-12": "Battle of the Boyne (Orangemen's Day)",
        "2028-08-28": "Summer bank holiday",
        "2028-12-25": "Christmas Day",
        "2028-12-26": "Boxing Day"
      }
    }
  }
};
