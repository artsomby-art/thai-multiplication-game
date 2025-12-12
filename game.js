import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization failed:", error);
    console.log("Fallback to local storage mode");
}

// =====================================================
// Game State
// =====================================================
const GameState = {
    difficulty: null, // 'easy' or 'hard'
    currentQuestion: 0,
    totalQuestions: 10,
    score: 0,
    correctAnswer: null,
    questions: [],
    timer: null,
    questionTimeLimit: 15, // seconds
    previewTimer: null,
    questionStartTime: null,
    playerName: '' // Store player name
};

// Make GameState globally accessible for debugging if needed
window.GameState = GameState;

// =====================================================
// Start Screen Logic
// =====================================================
window.validateAndStart = function () {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();

    if (name.length === 0) {
        // Shake animation for error
        nameInput.classList.add('error');
        SoundManager.playWrong();
        setTimeout(() => nameInput.classList.remove('error'), 500);
        return;
    }

    // Save name and proceed
    GameState.playerName = name;
    showScreen('level-screen');
}

// =====================================================
// Screen Navigation
// =====================================================
window.showScreen = function (screenId) {
    // Play click sound
    if (window.SoundManager) SoundManager.playClick();

    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    // Show selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// =====================================================
// Level Selection
// =====================================================
window.selectLevel = function (level) {
    if (window.SoundManager) SoundManager.playClick();

    GameState.difficulty = level;

    // Update button states
    document.getElementById('easy-btn').classList.remove('selected');
    document.getElementById('hard-btn').classList.remove('selected');

    if (level === 'easy') {
        document.getElementById('easy-btn').classList.add('selected');
        GameState.questionTimeLimit = 15;
    } else {
        document.getElementById('hard-btn').classList.add('selected');
        GameState.questionTimeLimit = 10;
    }

    // Enable Ready button
    document.getElementById('ready-btn').disabled = false;
}

// =====================================================
// Preview Screen (Multiplication Tables)
// =====================================================
window.showPreview = function () {
    if (window.SoundManager) SoundManager.playClick();
    showScreen('preview-screen');

    // Generate multiplication tables display
    generateTablesDisplay();

    // Start 10-second countdown
    startPreviewCountdown();
}

function generateTablesDisplay() {
    const container = document.getElementById('tables-container');
    container.innerHTML = '';

    const maxTable = GameState.difficulty === 'easy' ? 6 : 12;

    for (let i = 1; i <= maxTable; i++) {
        const section = document.createElement('div');
        section.className = 'table-section';

        const title = document.createElement('div');
        title.className = 'table-title';
        title.textContent = `แม่ ${i}`;
        section.appendChild(title);

        const items = document.createElement('div');
        items.className = 'table-items';

        for (let j = 1; j <= 12; j++) {
            const item = document.createElement('div');
            item.className = 'table-item';
            item.textContent = `${i} × ${j} = ${i * j}`;
            items.appendChild(item);
        }

        section.appendChild(items);
        container.appendChild(section);
    }
}

function startPreviewCountdown() {
    let timeLeft = 10;
    const timerDisplay = document.getElementById('preview-timer');

    timerDisplay.textContent = timeLeft;

    GameState.previewTimer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        if (window.SoundManager) SoundManager.playTick();

        if (timeLeft <= 0) {
            clearInterval(GameState.previewTimer);
            startGame();
        }
    }, 1000);
}

window.skipPreview = function () {
    if (window.SoundManager) SoundManager.playClick();
    clearInterval(GameState.previewTimer);
    startGame();
}

// =====================================================
// Game Logic
// =====================================================
function startGame() {
    if (window.SoundManager) SoundManager.playStart();

    // Start background music after a short delay
    setTimeout(() => {
        if (window.SoundManager) SoundManager.playBackgroundMusic();
    }, 1000);

    // Reset game state
    GameState.currentQuestion = 0;
    GameState.score = 0;
    GameState.questions = generateQuestions();

    // Update UI
    document.getElementById('score').textContent = '0';

    // Show game screen
    showScreen('game-screen');

    // Display first question
    displayQuestion();
}

function generateQuestions() {
    const questions = [];
    const maxTable = GameState.difficulty === 'easy' ? 6 : 12;

    for (let i = 0; i < GameState.totalQuestions; i++) {
        const num1 = Math.floor(Math.random() * maxTable) + 1;
        const num2 = Math.floor(Math.random() * 12) + 1;
        const answer = num1 * num2;

        questions.push({
            num1,
            num2,
            answer,
            options: generateOptions(answer, num1, num2)
        });
    }

    return questions;
}

function generateOptions(correctAnswer, num1, num2) {
    const options = [correctAnswer];

    // Generate 3 incorrect answers
    while (options.length < 4) {
        // Create plausible wrong answers
        let wrongAnswer;
        const randomType = Math.random();

        if (randomType < 0.3) {
            // Off by one multiplication
            wrongAnswer = num1 * (num2 + 1);
        } else if (randomType < 0.6) {
            // Off by one multiplication (other direction)
            wrongAnswer = num1 * (num2 - 1);
        } else {
            // Random nearby value
            const offset = Math.floor(Math.random() * 20) - 10;
            wrongAnswer = correctAnswer + offset;
        }

        // Make sure it's positive and not duplicate
        if (wrongAnswer > 0 && !options.includes(wrongAnswer)) {
            options.push(wrongAnswer);
        }
    }

    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
}

function displayQuestion() {
    const question = GameState.questions[GameState.currentQuestion];

    // Update question text
    document.getElementById('question-text').textContent =
        `${question.num1} × ${question.num2} = ?`;

    // Update progress
    document.getElementById('current-question').textContent = GameState.currentQuestion + 1;
    document.getElementById('total-questions').textContent = GameState.totalQuestions;

    const progress = ((GameState.currentQuestion + 1) / GameState.totalQuestions) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // Create answer buttons
    const answersGrid = document.getElementById('answers-grid');
    answersGrid.innerHTML = '';

    question.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = option;
        // Need to wrap click for window scope isn't needed here as it's generated code
        btn.onclick = () => checkAnswer(option, question.answer, btn);
        answersGrid.appendChild(btn);
    });

    // Start question timer
    startQuestionTimer();
}

function startQuestionTimer() {
    let timeLeft = GameState.questionTimeLimit;
    const timerDisplay = document.getElementById('question-timer');
    timerDisplay.textContent = timeLeft;

    GameState.questionStartTime = Date.now();

    clearInterval(GameState.timer);
    GameState.timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 3 && timeLeft > 0) {
            if (window.SoundManager) SoundManager.playTick();
        }

        if (timeLeft <= 0) {
            clearInterval(GameState.timer);
            // Time's up - treat as wrong answer
            handleWrongAnswer();
        }
    }, 1000);
}

function checkAnswer(selectedAnswer, correctAnswer, buttonElement) {
    if (window.SoundManager) SoundManager.playClick();
    clearInterval(GameState.timer);

    // Disable all answer buttons
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => btn.disabled = true);

    if (selectedAnswer === correctAnswer) {
        handleCorrectAnswer(buttonElement);
    } else {
        handleWrongAnswer(buttonElement, correctAnswer);
    }
}

function handleCorrectAnswer(buttonElement) {
    if (window.SoundManager) SoundManager.playCorrect();

    // Scoring: 1 point base + remaining seconds
    const timeLeft = parseInt(document.getElementById('question-timer').textContent);
    const points = 1 + (timeLeft > 0 ? timeLeft : 0);

    GameState.score += points;
    document.getElementById('score').textContent = GameState.score;

    // Visual feedback
    buttonElement.classList.add('correct');

    // Create confetti
    createConfetti();

    // Move to next question after delay
    setTimeout(() => {
        nextQuestion();
    }, 1500);
}

function handleWrongAnswer(buttonElement = null, correctAnswer = null) {
    if (window.SoundManager) SoundManager.playWrong();

    // Visual feedback
    if (buttonElement) {
        buttonElement.classList.add('wrong');
    }

    // Highlight correct answer
    if (correctAnswer !== null) {
        const buttons = document.querySelectorAll('.answer-btn');
        buttons.forEach(btn => {
            if (parseInt(btn.textContent) === correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    // Move to next question after delay
    setTimeout(() => {
        nextQuestion();
    }, 2000);
}

function nextQuestion() {
    GameState.currentQuestion++;

    if (GameState.currentQuestion < GameState.totalQuestions) {
        displayQuestion();
    } else {
        showResults();
    }
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#FF6B9D', '#FFD700', '#9B59B6', '#FF9F40', '#90EE90'];

    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.3 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';

        container.appendChild(confetti);

        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// =====================================================
// Results Screen
// =====================================================
function showResults() {
    // Stop background music
    if (window.SoundManager) SoundManager.stopBackgroundMusic();

    if (window.SoundManager) SoundManager.playCelebration();

    showScreen('results-screen');

    saveScore(GameState.playerName, GameState.score, GameState.difficulty);
    displayLeaderboard(GameState.difficulty);

    // Max score is roughly 16 per question (1 base + 15 time) * 10 = 160
    // But let's keep the denominator as reference or remove it if confusing
    // For now, let's just show the raw score
    const maxPossibleScore = (1 + GameState.questionTimeLimit) * GameState.totalQuestions;

    // Display score
    document.getElementById('final-score').textContent = GameState.score;
    document.getElementById('final-total').textContent = maxPossibleScore;

    // Calculate percentage based on max possible score
    const percentage = (GameState.score / maxPossibleScore) * 100;

    // Display performance message
    let message = '';
    if (percentage >= 90) {
        message = '🌟 ยอดเยี่ยมมาก! เก่งสุดๆ!';
    } else if (percentage >= 75) {
        message = '🎉 เก่งมาก! ทำได้ดีเลย!';
    } else if (percentage >= 60) {
        message = '👍 ดีมาก! พยายามต่อไปนะ';
    } else if (percentage >= 40) {
        message = '💪 ดีแล้ว! ฝึกฝนต่อไปนะ';
    } else {
        message = '🌈 เริ่มต้นได้ดีแล้ว! ลองอีกครั้งสิ';
    }

    document.getElementById('performance-message').textContent = message;

    // Display stars rating
    const starsContainer = document.getElementById('stars-rating');
    starsContainer.innerHTML = '';

    const starCount = percentage >= 90 ? 3 : percentage >= 60 ? 2 : 1;

    for (let i = 0; i < 3; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.textContent = i < starCount ? '⭐' : '☆';
        star.style.animationDelay = (i * 0.2) + 's';
        starsContainer.appendChild(star);
    }
}

window.playAgain = function () {
    if (window.SoundManager) SoundManager.playClick();

    // Reset game state
    GameState.currentQuestion = 0;
    GameState.score = 0;

    // Clear timers
    clearInterval(GameState.timer);
    clearInterval(GameState.previewTimer);

    // Go back to level selection
    showScreen('level-screen');
}

// =====================================================
// Leaderboard Logic (Hybrid: Firestore + LocalStorage)
// =====================================================
async function saveScore(name, score, difficulty) {
    // 1. Always save to LocalStorage (Backup/Offline support)
    const key = `math_game_leaderboard_${difficulty}`;
    let leaderboard = JSON.parse(localStorage.getItem(key) || '[]');
    leaderboard.push({ name, score, date: new Date().toISOString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(leaderboard));

    // 2. Try saving to Firestore if available
    if (db) {
        try {
            await addDoc(collection(db, "scores"), {
                name: name,
                score: score,
                difficulty: difficulty,
                timestamp: new Date()
            });
            console.log("Score saved to Firestore");
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    }
}

async function displayLeaderboard(difficulty, tableId = 'leaderboard-table') {
    const table = document.getElementById(tableId);
    if (!table) return;

    table.innerHTML = '<tr><td colspan="3" style="text-align:center;">กำลังโหลดข้อมูล... ⌛</td></tr>';

    let leaderboard = [];

    // Try fetching from Firestore first
    if (db) {
        try {
            const q = query(
                collection(db, "scores"),
                where("difficulty", "==", difficulty),
                orderBy("score", "desc"),
                limit(10)
            );

            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                leaderboard.push(doc.data());
            });
        } catch (e) {
            console.error("Error fetching documents: ", e);
            // Fallback to local storage if fetch fails
            const key = `math_game_leaderboard_${difficulty}`;
            leaderboard = JSON.parse(localStorage.getItem(key) || '[]');
        }
    } else {
        // Fallback to local storage if db not initialized
        const key = `math_game_leaderboard_${difficulty}`;
        leaderboard = JSON.parse(localStorage.getItem(key) || '[]');
    }

    renderTable(table, leaderboard);
}

function renderTable(table, leaderboard) {
    if (leaderboard.length === 0) {
        table.innerHTML = '<tr><td colspan="3" style="text-align:center;">ยังไม่มีผู้เล่น</td></tr>';
        return;
    }

    table.innerHTML = ''; // Clear loading

    leaderboard.forEach((entry, index) => {
        const row = document.createElement('tr');

        // Highlight logic (only works if exact name/score match found)
        if (entry.name === GameState.playerName && entry.score === GameState.score) {
            row.className = 'current-player-row';
        }

        let rankSymbol = index + 1;
        if (index === 0) rankSymbol = '🥇';
        if (index === 1) rankSymbol = '🥈';
        if (index === 2) rankSymbol = '🥉';

        row.innerHTML = `
            <td class="rank-col">${rankSymbol}</td>
            <td class="name-col">${entry.name}</td>
            <td class="score-col">${entry.score}</td>
        `;

        table.appendChild(row);
    });
}

// =====================================================
// Main Menu Leaderboard Logic
// =====================================================
window.openLeaderboard = function () {
    if (window.SoundManager) SoundManager.playClick();
    showScreen('global-leaderboard-screen');
    // Default to easy tab
    switchLeaderboardTab('easy');
}

window.switchLeaderboardTab = function (difficulty) {
    if (window.SoundManager) SoundManager.playClick();

    // Update tabs
    const easyTab = document.getElementById('tab-easy');
    const hardTab = document.getElementById('tab-hard');

    easyTab.classList.remove('selected');
    hardTab.classList.remove('selected');

    if (difficulty === 'easy') {
        easyTab.classList.add('selected');
    } else {
        hardTab.classList.add('selected');
    }

    // Render table
    displayLeaderboard(difficulty, 'global-leaderboard-table');
}

// =====================================================
// Initialize
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    // Show start screen
    showScreen('start-screen');

    // Initialize sound system (if not already initialized)
    if (window.SoundManager && !SoundManager.context) {
        SoundManager.init();
    }
});

// =====================================================
// Start Screen Logic
// =====================================================
window.validateAndStart = function () {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();

    if (name.length === 0) {
        // Shake animation for error
        nameInput.classList.add('error');
        SoundManager.playWrong();
        setTimeout(() => nameInput.classList.remove('error'), 500);
        return;
    }

    // Save name and proceed
    GameState.playerName = name;
    showScreen('level-screen');
}

// =====================================================
// Screen Navigation
// =====================================================
window.showScreen = function (screenId) {
    // Play click sound
    SoundManager.playClick();

    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    // Show selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// =====================================================
// Level Selection
// =====================================================
window.selectLevel = function (level) {
    SoundManager.playClick();

    GameState.difficulty = level;

    // Update button states
    document.getElementById('easy-btn').classList.remove('selected');
    document.getElementById('hard-btn').classList.remove('selected');

    if (level === 'easy') {
        document.getElementById('easy-btn').classList.add('selected');
        GameState.questionTimeLimit = 15;
    } else {
        document.getElementById('hard-btn').classList.add('selected');
        GameState.questionTimeLimit = 10;
    }

    // Enable Ready button
    document.getElementById('ready-btn').disabled = false;
}

// =====================================================
// Preview Screen (Multiplication Tables)
// =====================================================
window.showPreview = function () {
    SoundManager.playClick();
    showScreen('preview-screen');

    // Generate multiplication tables display
    generateTablesDisplay();

    // Start 10-second countdown
    startPreviewCountdown();
}

function generateTablesDisplay() {
    const container = document.getElementById('tables-container');
    container.innerHTML = '';

    const maxTable = GameState.difficulty === 'easy' ? 6 : 12;

    for (let i = 1; i <= maxTable; i++) {
        const section = document.createElement('div');
        section.className = 'table-section';

        const title = document.createElement('div');
        title.className = 'table-title';
        title.textContent = `แม่ ${i}`;
        section.appendChild(title);

        const items = document.createElement('div');
        items.className = 'table-items';

        for (let j = 1; j <= 12; j++) {
            const item = document.createElement('div');
            item.className = 'table-item';
            item.textContent = `${i} × ${j} = ${i * j}`;
            items.appendChild(item);
        }

        section.appendChild(items);
        container.appendChild(section);
    }
}

function startPreviewCountdown() {
    let timeLeft = 10;
    const timerDisplay = document.getElementById('preview-timer');

    timerDisplay.textContent = timeLeft;

    GameState.previewTimer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        SoundManager.playTick();

        if (timeLeft <= 0) {
            clearInterval(GameState.previewTimer);
            startGame();
        }
    }, 1000);
}

window.skipPreview = function () {
    SoundManager.playClick();
    clearInterval(GameState.previewTimer);
    startGame();
}

// =====================================================
// Game Logic
// =====================================================
function startGame() {
    SoundManager.playStart();

    // Start background music after a short delay
    setTimeout(() => {
        SoundManager.playBackgroundMusic();
    }, 1000);

    // Reset game state
    GameState.currentQuestion = 0;
    GameState.score = 0;
    GameState.questions = generateQuestions();

    // Update UI
    document.getElementById('score').textContent = '0';

    // Show game screen
    showScreen('game-screen');

    // Display first question
    displayQuestion();
}

function generateQuestions() {
    const questions = [];
    const maxTable = GameState.difficulty === 'easy' ? 6 : 12;

    for (let i = 0; i < GameState.totalQuestions; i++) {
        const num1 = Math.floor(Math.random() * maxTable) + 1;
        const num2 = Math.floor(Math.random() * 12) + 1;
        const answer = num1 * num2;

        questions.push({
            num1,
            num2,
            answer,
            options: generateOptions(answer, num1, num2)
        });
    }

    return questions;
}

function generateOptions(correctAnswer, num1, num2) {
    const options = [correctAnswer];

    // Generate 3 incorrect answers
    while (options.length < 4) {
        // Create plausible wrong answers
        let wrongAnswer;
        const randomType = Math.random();

        if (randomType < 0.3) {
            // Off by one multiplication
            wrongAnswer = num1 * (num2 + 1);
        } else if (randomType < 0.6) {
            // Off by one multiplication (other direction)
            wrongAnswer = num1 * (num2 - 1);
        } else {
            // Random nearby value
            const offset = Math.floor(Math.random() * 20) - 10;
            wrongAnswer = correctAnswer + offset;
        }

        // Make sure it's positive and not duplicate
        if (wrongAnswer > 0 && !options.includes(wrongAnswer)) {
            options.push(wrongAnswer);
        }
    }

    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
}

function displayQuestion() {
    const question = GameState.questions[GameState.currentQuestion];

    // Update question text
    document.getElementById('question-text').textContent =
        `${question.num1} × ${question.num2} = ?`;

    // Update progress
    document.getElementById('current-question').textContent = GameState.currentQuestion + 1;
    document.getElementById('total-questions').textContent = GameState.totalQuestions;

    const progress = ((GameState.currentQuestion + 1) / GameState.totalQuestions) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // Create answer buttons
    const answersGrid = document.getElementById('answers-grid');
    answersGrid.innerHTML = '';

    question.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = option;
        btn.onclick = () => checkAnswer(option, question.answer, btn);
        answersGrid.appendChild(btn);
    });

    // Start question timer
    startQuestionTimer();
}

function startQuestionTimer() {
    let timeLeft = GameState.questionTimeLimit;
    const timerDisplay = document.getElementById('question-timer');
    timerDisplay.textContent = timeLeft;

    GameState.questionStartTime = Date.now();

    clearInterval(GameState.timer);
    GameState.timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 3 && timeLeft > 0) {
            SoundManager.playTick();
        }

        if (timeLeft <= 0) {
            clearInterval(GameState.timer);
            // Time's up - treat as wrong answer
            handleWrongAnswer();
        }
    }, 1000);
}

function checkAnswer(selectedAnswer, correctAnswer, buttonElement) {
    SoundManager.playClick();
    clearInterval(GameState.timer);

    // Disable all answer buttons
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => btn.disabled = true);

    if (selectedAnswer === correctAnswer) {
        handleCorrectAnswer(buttonElement);
    } else {
        handleWrongAnswer(buttonElement, correctAnswer);
    }
}

function handleCorrectAnswer(buttonElement) {
    SoundManager.playCorrect();

    // Scoring: 1 point base + remaining seconds
    const timeLeft = parseInt(document.getElementById('question-timer').textContent);
    const points = 1 + (timeLeft > 0 ? timeLeft : 0);

    GameState.score += points;
    document.getElementById('score').textContent = GameState.score;

    // Visual feedback
    buttonElement.classList.add('correct');

    // Create confetti
    createConfetti();

    // Move to next question after delay
    setTimeout(() => {
        nextQuestion();
    }, 1500);
}

function handleWrongAnswer(buttonElement = null, correctAnswer = null) {
    SoundManager.playWrong();

    // Visual feedback
    if (buttonElement) {
        buttonElement.classList.add('wrong');
    }

    // Highlight correct answer
    if (correctAnswer !== null) {
        const buttons = document.querySelectorAll('.answer-btn');
        buttons.forEach(btn => {
            if (parseInt(btn.textContent) === correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    // Move to next question after delay
    setTimeout(() => {
        nextQuestion();
    }, 2000);
}

function nextQuestion() {
    GameState.currentQuestion++;

    if (GameState.currentQuestion < GameState.totalQuestions) {
        displayQuestion();
    } else {
        showResults();
    }
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#FF6B9D', '#FFD700', '#9B59B6', '#FF9F40', '#90EE90'];

    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.3 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';

        container.appendChild(confetti);

        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// =====================================================
// Results Screen
// =====================================================
function showResults() {
    // Stop background music
    SoundManager.stopBackgroundMusic();

    SoundManager.playCelebration();

    showScreen('results-screen');

    saveScore(GameState.playerName, GameState.score, GameState.difficulty);
    displayLeaderboard(GameState.difficulty);

    // Max score is roughly 16 per question (1 base + 15 time) * 10 = 160
    // But let's keep the denominator as reference or remove it if confusing
    // For now, let's just show the raw score
    const maxPossibleScore = (1 + GameState.questionTimeLimit) * GameState.totalQuestions;

    // Display score
    document.getElementById('final-score').textContent = GameState.score;
    document.getElementById('final-total').textContent = maxPossibleScore;

    // Calculate percentage based on max possible score
    const percentage = (GameState.score / maxPossibleScore) * 100;

    // Display performance message
    let message = '';
    if (percentage >= 90) {
        message = '🌟 ยอดเยี่ยมมาก! เก่งสุดๆ!';
    } else if (percentage >= 75) {
        message = '🎉 เก่งมาก! ทำได้ดีเลย!';
    } else if (percentage >= 60) {
        message = '👍 ดีมาก! พยายามต่อไปนะ';
    } else if (percentage >= 40) {
        message = '💪 ดีแล้ว! ฝึกฝนต่อไปนะ';
    } else {
        message = '🌈 เริ่มต้นได้ดีแล้ว! ลองอีกครั้งสิ';
    }

    document.getElementById('performance-message').textContent = message;

    // Display stars rating
    const starsContainer = document.getElementById('stars-rating');
    starsContainer.innerHTML = '';

    const starCount = percentage >= 90 ? 3 : percentage >= 60 ? 2 : 1;

    for (let i = 0; i < 3; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.textContent = i < starCount ? '⭐' : '☆';
        star.style.animationDelay = (i * 0.2) + 's';
        starsContainer.appendChild(star);
    }
}

window.playAgain = function () {
    SoundManager.playClick();

    // Reset game state
    GameState.currentQuestion = 0;
    GameState.score = 0;

    // Clear timers
    clearInterval(GameState.timer);
    clearInterval(GameState.previewTimer);

    // Go back to level selection
    showScreen('level-screen');
}

// =====================================================
// Leaderboard Logic
// =====================================================
function saveScore(name, score, difficulty) {
    const key = `math_game_leaderboard_${difficulty}`;
    let leaderboard = JSON.parse(localStorage.getItem(key) || '[]');

    // Add new score
    leaderboard.push({ name, score, date: new Date().toISOString() });

    // Sort by score (descending)
    leaderboard.sort((a, b) => b.score - a.score);

    // Keep top 10
    leaderboard = leaderboard.slice(0, 10);

    // Save back
    localStorage.setItem(key, JSON.stringify(leaderboard));
}

function displayLeaderboard(difficulty, tableId = 'leaderboard-table') {
    const key = `math_game_leaderboard_${difficulty}`;
    const leaderboard = JSON.parse(localStorage.getItem(key) || '[]');
    const table = document.getElementById(tableId);

    if (!table) return;

    table.innerHTML = ''; // Clear current

    if (leaderboard.length === 0) {
        table.innerHTML = '<tr><td colspan="3" style="text-align:center;">ยังไม่มีผู้เล่น</td></tr>';
        return;
    }

    leaderboard.forEach((entry, index) => {
        const row = document.createElement('tr');

        // Highlight current player if this is their just-achieved score
        // Only valid for the results screen table, not global view
        if (tableId === 'leaderboard-table' &&
            entry.name === GameState.playerName &&
            entry.score === GameState.score) {
            row.className = 'current-player-row';
        }

        let rankSymbol = index + 1;
        if (index === 0) rankSymbol = '🥇';
        if (index === 1) rankSymbol = '🥈';
        if (index === 2) rankSymbol = '🥉';

        row.innerHTML = `
            <td class="rank-col">${rankSymbol}</td>
            <td class="name-col">${entry.name}</td>
            <td class="score-col">${entry.score}</td>
        `;

        table.appendChild(row);
    });
}

// =====================================================
// Main Menu Leaderboard Logic
// =====================================================
window.openLeaderboard = function () {
    SoundManager.playClick();
    showScreen('global-leaderboard-screen');
    // Default to easy tab
    switchLeaderboardTab('easy');
}

window.switchLeaderboardTab = function (difficulty) {
    SoundManager.playClick();

    // Update tabs
    const easyTab = document.getElementById('tab-easy');
    const hardTab = document.getElementById('tab-hard');

    easyTab.classList.remove('selected');
    hardTab.classList.remove('selected');

    if (difficulty === 'easy') {
        easyTab.classList.add('selected');
    } else {
        hardTab.classList.add('selected');
    }

    // Render table
    displayLeaderboard(difficulty, 'global-leaderboard-table');
}

// =====================================================
// Initialize
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    // Show start screen
    showScreen('start-screen');

    // Initialize sound system (if not already initialized)
    if (!SoundManager.context) {
        SoundManager.init();
    }
});
