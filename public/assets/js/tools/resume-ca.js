/* Canadian Resume Builder: Letter size, two pages at most, no photo, never the SIN, volunteer
 * work included, references on a separate sheet (not on the resume).
 * Guidance: Job Bank "Write a good resume" (Government of Canada), checked 29 September 2026.
 * The example person, employers and college are made up. 555-01xx phone numbers are reserved
 * for fiction, and example.com addresses can't belong to anyone.
 */
(function () {
  "use strict";

  var JOB_BANK = "Job Bank advises leaving personal details such as your age and marital status off your resume.";

  var CONFIG = {
    country: "ca",
    lang: "en-CA",
    docWord: "resume",
    fileWord: "Resume",
    paper: "letter",
    paperName: "Letter",
    maxPages: 2,
    pageAdvice: "Job Bank advises limiting your resume to two pages.",
    bodySize: { normal: 11, compact: 10 },
    location: { label: "Address or city and province", hint: "At the top, with your email and phone" },
    advice: {
      dob: JOB_BANK,
      age: JOB_BANK,
      marital: JOB_BANK,
      id: "This looks like an ID number. Job Bank says never to include your Social Insurance Number on your resume."
    },
    sections: [
      { key: "summary", type: "list", heading: "Summary of Qualifications", rows: 4,
        help: "Three to five short points that match the job: your experience, main strengths, languages or certifications.",
        placeholder: "5 years of bookkeeping for small businesses" },
      { key: "skills", type: "tags", heading: "Skills", rows: 3,
        help: "Put the skills the job posting asks for first, if you honestly have them.",
        placeholder: "QuickBooks Online, Accounts payable, Bank reconciliation, Payroll" },
      { key: "experience", type: "jobs", heading: "Work Experience", noun: "Job", add: "Add a job",
        help: "Newest job first. Job Bank advises putting the emphasis on your most recent experience.",
        placeholders: { title: "Bookkeeper", org: "Lakeshore Accounting Services", location: "Mississauga, ON", start: "Apr 2021" } },
      { key: "volunteer", type: "jobs", heading: "Volunteer Experience", noun: "Volunteer role", add: "Add volunteer work",
        help: "Optional. Job Bank recommends including relevant volunteer work, especially with a well-known organization or cause.",
        labels: { title: "Volunteer role", org: "Organization" },
        placeholders: { title: "Volunteer Treasurer", org: "Riverside Community Food Bank", location: "Mississauga, ON", start: "Jan 2020" } },
      { key: "education", type: "education", heading: "Education", noun: "School", add: "Add education",
        help: "Highest level first. If you studied outside Canada, give the city and country.",
        placeholders: { qualification: "Diploma in Accounting", school: "Northbrook College", location: "Toronto, ON" } },
      { key: "certifications", type: "list", heading: "Certifications", legend: "Certifications and licences", rows: 2,
        help: "Optional. Professional certificates or licences that matter for the job." },
      { key: "languages", type: "list", heading: "Languages", rows: 3,
        help: "Optional. One per line, with your level.",
        placeholder: "English (fluent)\nFrench (intermediate)" }
    ],
    example: {
      name: "Maya Chen",
      headline: "Bookkeeper",
      location: "Mississauga, ON",
      phone: "(905) 555-0187",
      email: "maya.chen@example.com",
      summary: "5 years of full-cycle bookkeeping for small and medium-sized businesses\nConfident with GST/HST returns, payroll and month-end reconciliations\nClear communicator who explains the numbers to business owners in plain language\nFluent in English and Mandarin; intermediate French",
      skills: "QuickBooks Online, Sage 50, Accounts payable and receivable, Bank reconciliation, Payroll, GST/HST returns, Excel",
      experience: [
        { title: "Bookkeeper", org: "Lakeshore Accounting Services", location: "Mississauga, ON", start: "Apr 2021", end: "Present",
          bullets: "Keep the books for 25 small-business clients, from invoices to month-end reports\nPrepare quarterly GST/HST returns and have filed every one on time\nMoved 10 clients from spreadsheets to cloud accounting software" },
        { title: "Accounts Clerk", org: "Northern Pine Supply Co.", location: "Brampton, ON", start: "Aug 2018", end: "Mar 2021",
          bullets: "Processed about 400 supplier invoices a month and matched them to purchase orders\nReconciled three bank accounts each month and followed up on differences" }
      ],
      volunteer: [
        { title: "Volunteer Treasurer", org: "Riverside Community Food Bank", location: "Mississauga, ON", start: "Jan 2020", end: "Present",
          bullets: "Prepare monthly financial reports for the board\nSet up a simple donation tracking system used by 30 volunteers" }
      ],
      education: [
        { qualification: "Diploma in Accounting", school: "Northbrook College", location: "Toronto, ON", start: "2016", end: "2018" }
      ],
      certifications: "Certificate in Payroll Fundamentals (2022)",
      languages: "English (fluent)\nMandarin (fluent)\nFrench (intermediate)"
    }
  };

  window.ToolNestCalc = window.ToolNestResume.forCountry(CONFIG);
  window.ToolNestResume.start(CONFIG);
})();
