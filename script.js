// ========================================
// SELECT HTML ELEMENTS
// ========================================

const passageElement = document.getElementById("passage");
const typingInput = document.getElementById("typingInput");

const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");

const restartButton = document.getElementById("restartButton");
const againButton = document.getElementById("againButton");

const results = document.getElementById("results");

const ui = {
    wpm: document.getElementById("wpm"),
    accuracy: document.getElementById("accuracy"),
    time: document.getElementById("time"),

    personalBest: document.getElementById("personalBest"),

    finalWpm: document.getElementById("finalWpm"),
    finalAccuracy: document.getElementById("finalAccuracy"),
    finalCharacters: document.getElementById("finalCharacters"),

    resultTitle: document.getElementById("resultTitle"),
    resultMessage: document.getElementById("resultMessage"),
    resultIcon: document.getElementById("resultIcon")
};


// ========================================
// GAME VARIABLES
// ========================================

let passages = {};

let difficulty = "hard";
let mode = "timed";

let passageText = "";
let typedText = "";

let started = false;
let finished = false;

let startTime = 0;
let timerId = null;

let wrongKeystrokes = 0;

let bestWpm = Number(
    localStorage.getItem("typingTestBest") || 0
);

ui.personalBest.textContent = bestWpm;


// ========================================
// LOAD PASSAGES FROM JSON
// ========================================

async function loadPassages() {

    try {

        const response = await fetch("./data.json");

        if (!response.ok) {
            throw new Error("Unable to load passages");
        }

        passages = await response.json();

        loadNewPassage();

    } catch (error) {

        console.error(error);

        passageText =
            "The best way to improve your typing speed is to practice a little every day. Stay focused, keep a steady rhythm, and accuracy will follow.";

        renderPassage();

    }

}


// ========================================
// LOAD A NEW PASSAGE
// ========================================

function loadNewPassage() {

    const list =
        passages[difficulty] || passages.easy || [];

    if (!list.length) return;

    const chosen =
        list[Math.floor(Math.random() * list.length)];

    passageText = chosen.text;

    typedText = "";
    wrongKeystrokes = 0;

    started = false;
    finished = false;

    clearInterval(timerId);

    document.body.classList.remove("testing");

    startOverlay.classList.remove("hidden");
    results.classList.add("hidden");

    typingInput.value = "";

    passageElement.setAttribute(
        "aria-label",
        "Click here and start typing"
    );

    updateStats();
    renderPassage();

}


// ========================================
// DISPLAY PASSAGE
// ========================================

function renderPassage() {

    passageElement.innerHTML = "";

    [...passageText].forEach((character, index) => {

        const span = document.createElement("span");

        span.className = "char";
        span.textContent = character;

        if (index < typedText.length) {

            if (typedText[index] === character) {

                span.classList.add("correct");

            } else {

                span.classList.add("incorrect");

            }

        } else if (
            index === typedText.length &&
            started &&
            !finished
        ) {

            span.classList.add("current");

        }

        passageElement.appendChild(span);

    });

}


// ========================================
// START TEST
// ========================================

function beginTest() {

    if (started || finished) return;

    started = true;

    startTime = Date.now();

    document.body.classList.add("testing");

    startOverlay.classList.add("hidden");

    typingInput.focus({
        preventScroll: true
    });

    timerId = setInterval(() => {

        updateStats();

        if (
            mode === "timed" &&
            (Date.now() - startTime) >= 60000
        ) {

            endTest();

        }

    }, 200);

    renderPassage();

}


// ========================================
// COUNT CORRECT CHARACTERS
// ========================================

function countCorrectCharacters() {

    let count = 0;

    for (let i = 0; i < typedText.length; i++) {

        if (typedText[i] === passageText[i]) {

            count++;

        }

    }

    return count;

}


// ========================================
// UPDATE LIVE STATISTICS
// ========================================

function updateStats() {

    const elapsed = started
        ? Math.max((Date.now() - startTime) / 1000, 0.1)
        : 0;

    const correctCount = countCorrectCharacters();

    const attempts = correctCount + wrongKeystrokes;

    const wpm = elapsed > 0
        ? Math.round((correctCount / 5) / (elapsed / 60))
        : 0;

    const accuracy = attempts
        ? Math.round((correctCount / attempts) * 100)
        : 100;

    ui.wpm.textContent = wpm;

    ui.accuracy.textContent = accuracy + "%";


    // Timed mode

    if (mode === "timed") {

        const remaining = Math.max(
            0,
            60 - Math.floor(elapsed)
        );

        ui.time.textContent =
            "0:" + String(remaining).padStart(2, "0");

    }

    // Passage mode

    else {

        const seconds = Math.floor(elapsed);

        const minutes = Math.floor(seconds / 60);

        const remainingSeconds = seconds % 60;

        ui.time.textContent =
            minutes + ":" +
            String(remainingSeconds).padStart(2, "0");

    }

}


// ========================================
// HANDLE TYPING
// ========================================

function handleTyping() {

    if (finished) return;

    const nextText =
        typingInput.value.slice(0, passageText.length);

    if (!started && nextText.length > 0) {

        beginTest();

    }

    // Count incorrect characters as they are entered

    if (nextText.length > typedText.length) {

        for (
            let i = typedText.length;
            i < nextText.length;
            i++
        ) {

            if (nextText[i] !== passageText[i]) {

                wrongKeystrokes++;

            }

        }

    }

    typedText = nextText;

    renderPassage();

    updateStats();

    // Finish when passage is completed

    if (typedText.length === passageText.length) {

        endTest();

    }

}


// ========================================
// END TEST
// ========================================

function endTest() {

    if (finished) return;

    finished = true;
    started = false;

    clearInterval(timerId);

    document.body.classList.remove("testing");

    const elapsed = Math.max(
        (Date.now() - startTime) / 1000,
        1
    );

    const correct = countCorrectCharacters();

    const attempts = correct + wrongKeystrokes;

    const accuracy = attempts
        ? Math.round((correct / attempts) * 100)
        : 100;

    const wpm = Math.round(
        (correct / 5) / (elapsed / 60)
    );

    // Display results

    ui.finalWpm.textContent = wpm;

    ui.finalAccuracy.textContent = accuracy + "%";

    ui.finalCharacters.textContent =
        correct + "/" + wrongKeystrokes;

    ui.resultIcon.innerHTML =
        '<img src="./assets/images/icon-completed.svg" alt="Completed">';


    // Personal best comparison

    if (bestWpm === 0) {

        ui.resultTitle.textContent =
            "Baseline Established!";

        ui.resultMessage.textContent =
            "Your first score is in. Keep practicing to build your speed!";

        bestWpm = wpm;

        saveBest();

    }

    else if (wpm > bestWpm) {

        ui.resultTitle.textContent =
            "High Score Smashed!";

        ui.resultMessage.textContent =
            "You beat your personal best. Amazing work!";

        ui.resultIcon.innerHTML =
            '<img src="./assets/images/icon-new-pb.svg" alt="New personal best">';

        bestWpm = wpm;

        saveBest();

    }

    else {

        ui.resultTitle.textContent =
            "Test Complete!";

        ui.resultMessage.textContent =
            "Solid run. Keep pushing to beat your high score.";

    }

    ui.personalBest.textContent = bestWpm;

    updateStats();

    results.classList.remove("hidden");

    startOverlay.classList.add("hidden");

    passageElement.setAttribute(
        "aria-label",
        "Test completed"
    );

}


// ========================================
// SAVE PERSONAL BEST
// ========================================

function saveBest() {

    localStorage.setItem(
        "typingTestBest",
        String(bestWpm)
    );

}


// ========================================
// RESTART TEST
// ========================================

function restartTest() {

    loadNewPassage();

    typingInput.blur();

}


// ========================================
// BUTTON EVENTS
// ========================================

// Start button

startButton.addEventListener(
    "click",
    beginTest
);


// Restart button

restartButton.addEventListener(
    "click",
    restartTest
);


// Go Again button

againButton.addEventListener(
    "click",
    restartTest
);


// Passage click

passageElement.addEventListener(
    "click",
    () => {

        if (!finished) {

            if (!started) {

                beginTest();

            }

            typingInput.focus({
                preventScroll: true
            });

        }

    }
);


// Typing input

typingInput.addEventListener(
    "input",
    handleTyping
);


// Keyboard events

typingInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Tab") {

            event.preventDefault();

            typingInput.focus();

        }

        if (event.key === "Enter") {

            event.preventDefault();

        }

    }
);


// ========================================
// DIFFICULTY SELECTION
// ========================================

document.querySelectorAll("[data-difficulty]")
    .forEach(button => {

        button.addEventListener("click", () => {

            difficulty = button.dataset.difficulty;

            document.querySelectorAll("[data-difficulty]")
                .forEach(item => {

                    item.classList.toggle(
                        "active",
                        item === button
                    );

                });

            loadNewPassage();

        });

    });


// ========================================
// MODE SELECTION
// ========================================

document.querySelectorAll("[data-mode]")
    .forEach(button => {

        button.addEventListener("click", () => {

            mode = button.dataset.mode;

            document.querySelectorAll("[data-mode]")
                .forEach(item => {

                    item.classList.toggle(
                        "active",
                        item === button
                    );

                });

            loadNewPassage();

            ui.time.textContent =
                mode === "timed" ? "0:60" : "0:00";

        });

    });


// ========================================
// INITIALIZE APPLICATION
// ========================================

loadPassages();