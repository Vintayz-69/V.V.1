/* Word Counter & Readability Analyzer */
(function () {
  "use strict";

  var T = window.ToolNest;

  function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!word) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]|ed|es|e)$/, "");
    word = word.replace(/^y/, "");
    var matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  function calculate(v) {
    var text = String(v.text || "").trim();
    if (!text) {
      return {
        words: 0,
        chars: 0,
        charsNoSpaces: 0,
        sentences: 0,
        paragraphs: 0,
        readingTimeMin: 0,
        speakingTimeMin: 0,
        readingEase: 100,
        gradeLevel: "Early / Basic"
      };
    }

    var wordsArr = text.split(/\s+/).filter(Boolean);
    var words = wordsArr.length;
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, "").length;

    var sentencesArr = text.split(/[.!?]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var sentences = Math.max(1, sentencesArr.length);

    var paragraphsArr = text.split(/\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
    var paragraphs = Math.max(1, paragraphsArr.length);

    var totalSyllables = 0;
    for (var i = 0; i < wordsArr.length; i++) {
      totalSyllables += countSyllables(wordsArr[i]);
    }
    totalSyllables = Math.max(1, totalSyllables);

    // Flesch Reading Ease Formula: 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words))
    var wordsPerSentence = words / sentences;
    var syllablesPerWord = totalSyllables / words;
    var ease = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
    var score = Math.round(Math.min(100, Math.max(0, ease)) * 10) / 10;

    var grade = "College / Advanced";
    if (score >= 90) grade = "5th Grade (Very Easy)";
    else if (score >= 80) grade = "6th Grade (Easy)";
    else if (score >= 70) grade = "7th Grade (Fairly Easy)";
    else if (score >= 60) grade = "8th–9th Grade (Standard)";
    else if (score >= 50) grade = "10th–12th Grade (Fairly Difficult)";
    else if (score >= 30) grade = "College (Difficult)";

    var readingTimeMin = Math.round((words / 200) * 100) / 100;
    var speakingTimeMin = Math.round((words / 130) * 100) / 100;

    return {
      words: words,
      chars: chars,
      charsNoSpaces: charsNoSpaces,
      sentences: sentences,
      paragraphs: paragraphs,
      readingTimeMin: readingTimeMin,
      speakingTimeMin: speakingTimeMin,
      readingEase: score,
      gradeLevel: grade
    };
  }

  window.ToolNestCalc = calculate;

  var textArea = document.getElementById("text-input");
  if (!textArea) return;

  function formatDuration(min) {
    if (min < 1) {
      var sec = Math.round(min * 60);
      return sec + " sec";
    }
    var total = Math.round(min * 60);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return s > 0 ? (m + "m " + s + "s") : (m + " min");
  }

  function render() {
    var text = textArea.value;
    var r = calculate({ text: text });

    document.getElementById("out-words").textContent = T.formatNumber(r.words);
    document.getElementById("out-chars").textContent = T.formatNumber(r.chars);
    document.getElementById("out-chars-no-spaces").textContent = T.formatNumber(r.charsNoSpaces);
    document.getElementById("out-sentences").textContent = T.formatNumber(r.sentences);
    document.getElementById("out-paragraphs").textContent = T.formatNumber(r.paragraphs);
    document.getElementById("out-read-time").textContent = formatDuration(r.readingTimeMin);
    document.getElementById("out-speak-time").textContent = formatDuration(r.speakingTimeMin);
    document.getElementById("out-ease").textContent = r.readingEase + " / 100";
    document.getElementById("out-grade").textContent = r.gradeLevel;
  }

  textArea.addEventListener("input", render);

  var btnClear = document.getElementById("btn-clear-text");
  if (btnClear) {
    btnClear.addEventListener("click", function () {
      textArea.value = "";
      render();
    });
  }

  var btnSample = document.getElementById("btn-sample-text");
  if (btnSample) {
    btnSample.addEventListener("click", function () {
      textArea.value = "ToolNest makes free, private calculators that help freelancers and self-employed professionals get paid on time and price their work with confidence. Every tool runs directly inside your web browser, which means your files and numbers are never uploaded to any remote server.";
      render();
    });
  }

  render();
})();
