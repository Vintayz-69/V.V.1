/* Australian Resume Builder: A4, usually 1 to 3 pages, personal summary, key skills,
 * qualifications and certificates, achievements, and at least two referees.
 * Guidance: Workforce Australia resume template and job application tips (Australian
 * Government), checked 29 September 2026. The site blocks automated reading, so the template
 * PDF was read directly and the rest confirmed through official search results.
 * The example person, employers and college are made up. The 0491 570 xxx numbers are
 * reserved by ACMA for fiction, and example.com addresses can't belong to anyone.
 */
(function () {
  "use strict";

  var WA_DOB = "Workforce Australia advises never giving your date of birth when you apply for a job.";

  var CONFIG = {
    country: "au",
    lang: "en-AU",
    docWord: "resume",
    fileWord: "Resume",
    paper: "a4",
    paperName: "A4",
    maxPages: 3,
    pageAdvice: "Workforce Australia says a resume is usually 1 to 3 pages, depending on your experience.",
    bodySize: { normal: 11, compact: 10 },
    roleSummary: true, // the Workforce Australia template has a short overview under each job
    location: { label: "Suburb, state and postcode", hint: "Optional" },
    advice: {
      dob: WA_DOB,
      age: WA_DOB,
      bank: "Workforce Australia advises never giving your bank or credit card details when you apply for a job."
    },
    sections: [
      { key: "summary", type: "text", heading: "Personal Summary", label: "Personal summary",
        help: "Your elevator pitch: why you're a good fit for the job and how you'll help the business. Change it for each job.",
        placeholder: "Retail supervisor with five years' experience in busy fashion stores…" },
      { key: "skills", type: "tags", heading: "Key Skills", rows: 3,
        help: "Technical, workplace and people skills that are relevant to this job.",
        placeholder: "Team leadership, Rostering, Customer service, Stock control" },
      { key: "experience", type: "jobs", heading: "Work Experience", noun: "Job", add: "Add a job",
        help: "Paid and unpaid experience that's relevant to the job, most recent first.",
        labels: { summary: "Overview of the role", bullets: "Key responsibilities and achievements" },
        placeholders: { title: "Store Supervisor", org: "Coastline Apparel", location: "Parramatta NSW", start: "Feb 2022" } },
      { key: "education", type: "education", heading: "Education", noun: "Course", add: "Add education",
        help: "Your highest (or current) year of school or training, and any study that's relevant to this job.",
        labels: { qualification: "Course or certificate", school: "School, TAFE, college or university" },
        placeholders: { qualification: "Certificate IV in Retail Management", school: "Western Sydney Training College", location: "Parramatta NSW" } },
      { key: "certifications", type: "list", heading: "Qualifications and Certificates", rows: 3,
        help: "Optional. For example: driver licence, first aid certificate, RSA or White Card.",
        placeholder: "Current first aid certificate\nNSW driver licence (C class)" },
      { key: "achievements", type: "list", heading: "Achievements", rows: 2,
        help: "Optional. Awards or recognition from work or study that are relevant to this job." },
      { key: "references", type: "references", heading: "Referees", noun: "Referee", add: "Add a referee",
        people: "referees", mode: "list", onRequest: "Referees available on request.",
        help: "Workforce Australia's template suggests at least two referees who can support your application. Always ask them before you include their details.",
        placeholders: { name: "Sarah Mitchell", title: "Store Manager", org: "Coastline Apparel", relationship: "My manager, 2022 to now", phone: "0491 570 157", email: "sarah.mitchell@example.com" } }
    ],
    example: {
      name: "Chloe Walker",
      headline: "Retail Store Supervisor",
      location: "Parramatta NSW 2150",
      phone: "0491 570 156",
      email: "chloe.walker@example.com",
      summary: "Retail supervisor with five years' experience in busy fashion stores. I lead teams of up to 10, train new staff and keep the store running smoothly through peak trade. I'm now looking for an assistant store manager role where I can grow sales and develop my team.",
      skills: "Team leadership, Rostering, Customer service, Visual merchandising, Stock control, Cash handling, Point-of-sale systems",
      experience: [
        { title: "Store Supervisor", org: "Coastline Apparel", location: "Parramatta NSW", start: "Feb 2022", end: "Present",
          summary: "Supervise a team of 8 in a high-volume fashion store.",
          bullets: "Open and close the store, including cash reconciliation and banking\nTrain new team members; 6 of my trainees have since been promoted\nPlan the roster each week to match expected customer traffic" },
        { title: "Retail Assistant", org: "Harbourside Books", location: "Sydney NSW", start: "Mar 2019", end: "Jan 2022",
          summary: "Served customers in an independent bookshop.",
          bullets: "Helped customers find books and ran the store's children's reading events\nReceived and checked stock deliveries against orders" }
      ],
      education: [
        { qualification: "Certificate IV in Retail Management", school: "Western Sydney Training College", location: "Parramatta NSW", start: "2023", end: "2024" },
        { qualification: "Higher School Certificate (HSC)", school: "Riverside High School", location: "Sydney NSW", end: "2018" }
      ],
      certifications: "Current first aid certificate\nResponsible Service of Alcohol (RSA)\nNSW driver licence (C class)",
      achievements: "Coastline Apparel regional Team Leader of the Year, 2024",
      references: {
        mode: "list",
        people: [
          { name: "Sarah Mitchell", title: "Store Manager", org: "Coastline Apparel", relationship: "My manager, 2022 to now", phone: "0491 570 157", email: "sarah.mitchell@example.com" },
          { name: "David Lee", title: "Owner", org: "Harbourside Books", relationship: "My manager, 2019 to 2022", phone: "0491 570 158", email: "david.lee@example.com" }
        ]
      }
    }
  };

  window.ToolNestCalc = window.ToolNestResume.forCountry(CONFIG);
  window.ToolNestResume.start(CONFIG);
})();
