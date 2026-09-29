/* UK CV Maker: A4, no more than two sides, size 11 text, personal profile, references line.
 * Guidance: National Careers Service "How to write a CV" and DWP JobHelp "Preparing your CV"
 * (GOV.UK), checked 29 September 2026.
 * The example person, employers and schools are made up. 07700 900xxx numbers are reserved by
 * Ofcom for drama, and example.com addresses can't belong to anyone.
 */
(function () {
  "use strict";

  var NCS = "The National Careers Service says not to include your age, date of birth, marital status or nationality on your CV.";

  var CONFIG = {
    country: "uk",
    lang: "en-GB",
    docWord: "CV",
    fileWord: "CV",
    paper: "a4",
    paperName: "A4",
    maxPages: 2,
    pageAdvice: "The government's JobHelp service suggests no more than two sides of A4.",
    bodySize: { normal: 11, compact: 11 }, // National Careers Service: size 11 or bigger
    location: { label: "Town or city", hint: "Optional" },
    advice: { dob: NCS, age: NCS, marital: NCS, nationality: NCS },
    sections: [
      { key: "summary", type: "text", heading: "Personal Profile", label: "Personal profile",
        help: "A short introduction: who you are, what you're good at and what you're looking for. Change it for each job.",
        placeholder: "Marketing executive with four years' experience planning email, social and events campaigns…" },
      { key: "skills", type: "tags", heading: "Key Skills", rows: 3,
        help: "The skills the job advert asks for that you can back up with examples.",
        placeholder: "Campaign planning, Copywriting, Email marketing, Web analytics" },
      { key: "experience", type: "jobs", heading: "Employment History", legend: "Work history", noun: "Job", add: "Add a job",
        help: "Most recent job first. Under each one, list what you did and achieved, one point per line.",
        placeholders: { title: "Marketing Executive", org: "Northgate Software Ltd", location: "Leeds", start: "Sep 2022" } },
      { key: "education", type: "education", heading: "Education and Qualifications", noun: "Qualification", add: "Add a qualification",
        help: "Most recent first. Include degrees, A levels, GCSEs, apprenticeships and training courses.",
        placeholders: { qualification: "BA (Hons) Marketing", school: "University of Northbridge", location: "Leeds", details: "2:1" } },
      { key: "interests", type: "text", heading: "Interests", rows: 3,
        help: "Optional. Interests that show useful skills. For example, captaining a sports team shows leadership and organisation.",
        placeholder: "Captain of a local netball team: I organise fixtures and training for 14 players." },
      { key: "additional", type: "list", heading: "Additional Information", rows: 2,
        help: "Optional. For example, a driving licence if the job needs one.",
        placeholder: "Full UK driving licence" },
      { key: "references", type: "references", heading: "References", noun: "Referee", add: "Add a referee",
        people: "referees", mode: "request", onRequest: "References are available on request.",
        help: "You can say references are available on request. Only list someone who has agreed to give you a reference." }
    ],
    example: {
      name: "Hannah Clarke",
      headline: "Marketing Executive",
      location: "Leeds",
      phone: "07700 900123",
      email: "hannah.clarke@example.com",
      summary: "Marketing executive with four years' experience planning email, social media and events campaigns for business-to-business clients. Organised, creative and comfortable with data. I'm looking for a senior role where I can lead campaigns from brief to results.",
      skills: "Campaign planning, Email marketing, Social media, Copywriting, Web analytics, Event organisation, Budget tracking",
      experience: [
        { title: "Marketing Executive", org: "Northgate Software Ltd", location: "Leeds", start: "Sep 2022", end: "Present",
          bullets: "Plan and run monthly email campaigns to 18,000 customers, raising open rates from 21% to 29%\nOrganise two trade events a year, managing a budget of £40,000\nWrite blog posts, case studies and social media content with the sales team" },
        { title: "Marketing Assistant", org: "Aire Valley Events", location: "Bradford", start: "Jul 2020", end: "Aug 2022",
          bullets: "Supported the marketing of 30 local events a year, from posters to social media\nKept the customer database up to date and produced weekly ticket sales reports" }
      ],
      education: [
        { qualification: "BA (Hons) Marketing", school: "University of Northbridge", location: "Leeds", start: "2017", end: "2020", details: "2:1" },
        { qualification: "A levels", school: "Riverside Sixth Form College", location: "Leeds", start: "2015", end: "2017", details: "English Literature (A), Business (B), Psychology (B)" }
      ],
      interests: "Captain of a local netball team: I organise fixtures and training sessions for 14 players.",
      additional: "Full UK driving licence",
      references: { mode: "request", people: [] }
    }
  };

  window.ToolNestCalc = window.ToolNestResume.forCountry(CONFIG);
  window.ToolNestResume.start(CONFIG);
})();
