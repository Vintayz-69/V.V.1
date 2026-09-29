/* College GPA Calculator (4.0 Scale) */
(function () {
  "use strict";

  var T = window.ToolNest;

  var GRADE_POINTS = {
    "A+": 4.0, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "F": 0.0
  };

  function calculate(v) {
    var courses = v.courses || [];
    var totalCredits = 0;
    var totalPoints = 0;

    for (var i = 0; i < courses.length; i++) {
      var c = courses[i];
      var credits = Number(c.credits) || 0;
      var grade = String(c.grade || "A").toUpperCase();
      var pts = GRADE_POINTS.hasOwnProperty(grade) ? GRADE_POINTS[grade] : 0;

      if (credits > 0) {
        totalCredits += credits;
        totalPoints += credits * pts;
      }
    }

    var gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    var roundedGpa = Math.round(gpa * 100) / 100;

    // The nearest letter grade on the scale above (halfway points between grades).
    // Honors and Dean's List cut-offs differ by college, so we don't guess them.
    var standing = "About F";
    var BANDS = [[3.85, "A"], [3.5, "A-"], [3.15, "B+"], [2.85, "B"], [2.5, "B-"], [2.15, "C+"],
                 [1.85, "C"], [1.5, "C-"], [1.15, "D+"], [0.5, "D"]];
    for (var b = 0; b < BANDS.length; b++) {
      if (roundedGpa >= BANDS[b][0]) { standing = "About " + BANDS[b][1]; break; }
    }
    if (totalCredits === 0) standing = "—";

    return {
      gpa: roundedGpa,
      totalCredits: totalCredits,
      totalPoints: Math.round(totalPoints * 100) / 100,
      standing: standing
    };
  }

  window.ToolNestCalc = calculate;

  var tbody = document.getElementById("gpa-courses-body");
  if (!tbody) return;

  var defaultCourses = [
    { name: "Economics 101", grade: "A", credits: 3 },
    { name: "Calculus I", grade: "B+", credits: 4 },
    { name: "Computer Science", grade: "A-", credits: 4 },
    { name: "Academic Writing", grade: "A", credits: 3 }
  ];

  function addCourseRow(name, grade, credits) {
    var tr = document.createElement("tr");
    tr.className = "gpa-course-row";
    var options = Object.keys(GRADE_POINTS).map(function (g) {
      return '<option value="' + g + '"' + (g === grade ? ' selected' : '') + '>' + g + ' (' + GRADE_POINTS[g].toFixed(1) + ')</option>';
    }).join("");

    tr.innerHTML = [
      '<td><input type="text" class="course-name" aria-label="Course name" placeholder="Course name" autocomplete="off"></td>',
      '<td><select class="course-grade" aria-label="Grade">' + options + '</select></td>',
      '<td><input type="text" inputmode="decimal" class="course-credits num" aria-label="Credits" placeholder="3" autocomplete="off"></td>',
      '<td><button type="button" class="btn-del-course" aria-label="Remove course" title="Remove">&times;</button></td>'
    ].join("");

    tr.querySelector(".course-name").value = name || "";
    tr.querySelector(".course-credits").value = credits != null ? credits : 3;
    tbody.appendChild(tr);

    tr.querySelectorAll("input, select").forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });

    tr.querySelector(".btn-del-course").addEventListener("click", function () {
      if (document.querySelectorAll(".gpa-course-row").length > 1) {
        tr.remove();
        update();
      }
    });
  }

  function readCourses() {
    var rows = document.querySelectorAll(".gpa-course-row");
    var list = [];
    rows.forEach(function (r) {
      var name = r.querySelector(".course-name").value;
      var grade = r.querySelector(".course-grade").value;
      var credits = Number(r.querySelector(".course-credits").value) || 0;
      list.push({ name: name, grade: grade, credits: credits });
    });
    return list;
  }

  function update() {
    var courses = readCourses();
    var r = calculate({ courses: courses });

    document.getElementById("out-gpa").textContent = r.gpa.toFixed(2);
    document.getElementById("out-credits").textContent = T.formatNumber(r.totalCredits);
    document.getElementById("out-points").textContent = T.formatNumber(r.totalPoints);
    document.getElementById("out-standing").textContent = r.standing;
  }

  document.getElementById("btn-add-course").addEventListener("click", function () {
    addCourseRow("", "A", 3);
    update();
  });

  document.getElementById("btn-reset-gpa").addEventListener("click", function () {
    tbody.innerHTML = "";
    defaultCourses.forEach(function (c) {
      addCourseRow(c.name, c.grade, c.credits);
    });
    update();
  });

  defaultCourses.forEach(function (c) {
    addCourseRow(c.name, c.grade, c.credits);
  });
  update();
})();
