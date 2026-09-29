/* US Resume Builder: US Letter, 1–2 pages, city and state only, no birthdate or age.
 * Guidance: CareerOneStop resume guide (US Department of Labor), checked 29 September 2026.
 * The example person, employers and school are made up. 555-01xx phone numbers are reserved
 * for fiction, and example.com addresses can't belong to anyone.
 */
(function () {
  "use strict";

  var CONFIG = {
    country: "us",
    lang: "en-US",
    docWord: "resume",
    fileWord: "Resume",
    paper: "letter",
    paperName: "US Letter",
    maxPages: 2,
    pageAdvice: "CareerOneStop suggests 1 page, or 2 if you have a lot of relevant experience.",
    bodySize: { normal: 11, compact: 10 },
    location: { label: "City and state", hint: "No street address needed" },
    advice: {
      dob: "CareerOneStop (US Department of Labor) advises leaving your birthdate and age off your resume.",
      age: "CareerOneStop (US Department of Labor) advises leaving your birthdate and age off your resume."
    },
    sections: [
      { key: "summary", type: "text", heading: "Professional Summary", label: "Summary",
        help: "Two to four lines on who you are, your strongest skills and the kind of role you want.",
        placeholder: "Graphic designer with 6 years of experience in brand identity and packaging…" },
      { key: "skills", type: "tags", heading: "Skills", rows: 3,
        help: "Put the skills the job posting asks for first, if you honestly have them.",
        placeholder: "Figma, Adobe Illustrator, Brand identity, Print production" },
      { key: "experience", type: "jobs", heading: "Work Experience", noun: "Job", add: "Add a job",
        help: "Newest job first. Under each one, list what you achieved, one point per line.",
        labels: { org: "Company or organization" },
        placeholders: { title: "Senior Graphic Designer", org: "Harbor & Pine Creative", location: "Austin, TX" } },
      { key: "education", type: "education", heading: "Education", noun: "School", add: "Add education",
        help: "Your highest degree or diploma first. Add GPA or honors only if they help.",
        labels: { qualification: "Degree or diploma" },
        placeholders: { qualification: "B.F.A. in Graphic Design", school: "Lakeview State University", location: "Dallas, TX", details: "Magna cum laude" } },
      { key: "certifications", type: "list", heading: "Certifications", legend: "Certifications and licenses", rows: 3,
        help: "Optional. Professional certificates or licenses that matter for the job." }
    ],
    example: {
      name: "Jordan Rivera",
      headline: "Graphic Designer",
      location: "Austin, TX",
      phone: "(512) 555-0142",
      email: "jordan.rivera@example.com",
      website: "portfolio.example.com/jordan",
      summary: "Graphic designer with 6 years of experience creating brand identities, packaging and digital campaigns for consumer brands. Known for turning rough briefs into clear, on-brand work on tight deadlines.",
      skills: "Adobe Illustrator, Photoshop, InDesign, Figma, Brand identity, Packaging design, Print production, Art direction",
      experience: [
        { title: "Senior Graphic Designer", org: "Harbor & Pine Creative", location: "Austin, TX", start: "Mar 2022", end: "Present",
          bullets: "Lead designer on 12 brand identity projects for regional food and drink companies\nRedesigned packaging for a snack line, helping the client win shelf space in 40 new grocery stores\nMentor two junior designers and review all work before it goes to clients" },
        { title: "Graphic Designer", org: "Bluebonnet Marketing Group", location: "San Antonio, TX", start: "Jun 2019", end: "Feb 2022",
          bullets: "Designed social media, email and print campaigns for 15 small-business clients\nBuilt a shared template library that cut production time on repeat campaigns by about a third\nPrepared print-ready files and worked with printers on color proofs" }
      ],
      education: [
        { qualification: "B.F.A. in Graphic Design", school: "Lakeview State University", location: "Dallas, TX", start: "2015", end: "2019" }
      ],
      certifications: "Certificate in UX Design (online course, 2023)"
    }
  };

  window.ToolNestCalc = window.ToolNestResume.forCountry(CONFIG);
  window.ToolNestResume.start(CONFIG);
})();
