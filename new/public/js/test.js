document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements ---
    const setupScreen = document.getElementById('setup-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const testScreen = document.getElementById('test-screen');
    const resultsScreen = document.getElementById('results-screen');
    const startBtn = document.getElementById('start-btn');
    const durationInput = document.getElementById('duration');
    const subjectSelect = document.getElementById('subject');
    const topicInput = document.getElementById('topic');
    const difficultySelector = document.getElementById('difficulty-selector');
    const timerEl = document.getElementById('timer');
    const questionCounterEl = document.getElementById('question-counter');
    const questionSubjectEl = document.getElementById('question-subject');
    const questionTextEl = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');
    const scoreEl = document.getElementById('score');
    const aiFeedbackEl = document.getElementById('ai-feedback');
    const feedbackLoader = document.getElementById('feedback-loader');
    const restartBtn = document.getElementById('restart-btn');

    // --- App State ---
    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let timerInterval;
    let selectedDifficulty = 'Medium';
    let API_KEY = null;
    let API_URL = null;

    // Fetch API key from server
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        API_KEY = config.geminiApiKey;
        
        if (!API_KEY || API_KEY === "your_gemini_api_key_here") {
            throw new Error("API Key is not configured. Please check your .env file.");
        }
        
        API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
    } catch (error) {
        console.error('Error fetching API key:', error);
        alert('Failed to load API configuration. Please check the console for details.');
        return;
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', startTest);
    nextBtn.addEventListener('click', nextQuestion);
    prevBtn.addEventListener('click', prevQuestion);
    submitBtn.addEventListener('click', submitTest);
    restartBtn.addEventListener('click', () => location.reload());
    difficultySelector.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedDifficulty = e.target.dataset.difficulty;
        }
    });

    // --- Core Functions ---
    function switchScreen(hide, show) {
        hide.style.opacity = '0';
        setTimeout(() => {
            hide.classList.add('hidden');
            show.classList.remove('hidden');
            setTimeout(() => show.style.opacity = '1', 50);
        }, 500);
    }

    async function startTest() {
        const duration = parseInt(durationInput.value);
        const subject = subjectSelect.value;
        const topic = topicInput.value.trim();

        if (!subject || !topic || isNaN(duration) || duration < 5) {
            alert("Please fill in all fields and set a duration of at least 5 minutes.");
            return;
        }

        const numQuestions = Math.max(1, Math.floor(duration / 2.4));
        switchScreen(setupScreen, loadingScreen);

        try {
            const generatedQuestions = await fetchQuestions(numQuestions, subject, topic, selectedDifficulty);
            questions = generatedQuestions;
            userAnswers = new Array(questions.length).fill(null);
            
            switchScreen(loadingScreen, testScreen);
            
            displayQuestion();
            startTimer(duration * 60);
        } catch (error) {
            console.error("Error fetching questions:", error);
            alert("Failed to generate the test. Please check the topic and try again.");
            switchScreen(loadingScreen, setupScreen);
        }
    }

    async function fetchQuestions(totalQuestions, subject, topic, difficulty) {
        const prompt = `Generate a set of ${totalQuestions} JEE Main style multiple-choice questions. Subject: "${subject}", Topic: "${topic}", Difficulty: "${difficulty}". Format as a valid JSON array of objects with keys: "subject", "question", "options" (array of 4 strings), "correctAnswer" (letter A-D).`;
        const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API request failed`);
        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
    }

    function displayQuestion() {
        if (currentQuestionIndex >= questions.length) return;
        const q = questions[currentQuestionIndex];
        questionSubjectEl.textContent = `${q.subject} - ${topicInput.value}`;
        questionTextEl.textContent = q.question;
        questionCounterEl.textContent = `Question ${currentQuestionIndex + 1} / ${questions.length}`;
        optionsContainer.innerHTML = '';

        q.options.forEach(optionText => {
            const optionElement = document.createElement('div');
            const optionLetter = optionText.charAt(0);
            const isSelected = userAnswers[currentQuestionIndex] === optionLetter;
            
            optionElement.className = `p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-300 hover:bg-gray-100 hover:border-gray-400'}`;
            optionElement.textContent = optionText;
            optionElement.addEventListener('click', () => selectOption(optionLetter));
            optionsContainer.appendChild(optionElement);
        });
        
        updateNavigationButtons();
    }

    function selectOption(optionLetter) {
        userAnswers[currentQuestionIndex] = optionLetter;
        displayQuestion();
    }

    function updateNavigationButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;
        prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
        nextBtn.classList.toggle('hidden', currentQuestionIndex === questions.length - 1);
        submitBtn.classList.toggle('hidden', currentQuestionIndex !== questions.length - 1);
    }
    
    function nextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
        }
    }

    function prevQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion();
        }
    }

    function startTimer(seconds) {
        let remainingTime = seconds;
        timerInterval = setInterval(() => {
            remainingTime--;
            const minutes = Math.floor(remainingTime / 60);
            const secs = remainingTime % 60;
            timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            if (remainingTime <= 60) timerEl.parentElement.classList.add('animate-pulse');
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                submitTest();
            }
        }, 1000);
    }

    function submitTest() {
        clearInterval(timerInterval);
        switchScreen(testScreen, resultsScreen);

        let score = 0, correctCount = 0, incorrectCount = 0;
        questions.forEach((q, index) => {
            if (userAnswers[index] === q.correctAnswer) {
                score += 4;
                correctCount++;
            } else if (userAnswers[index] !== null) {
                score -= 1;
                incorrectCount++;
            }
        });

        const totalMarks = questions.length * 4;
        scoreEl.textContent = `${score} / ${totalMarks}`;
        getAIFeedback(score, totalMarks, correctCount, incorrectCount);
    }

    async function getAIFeedback(score, totalMarks, correct, incorrect) {
        const performanceData = questions.map((q, i) => ({ question: q.question, userAnswer: userAnswers[i] || "Not Answered", correctAnswer: q.correctAnswer }));
        const prompt = `A student completed a test on "${topicInput.value}" (${subjectSelect.value}). Score: ${score}/${totalMarks}. Correct: ${correct}, Incorrect: ${incorrect}. Performance Data: ${JSON.stringify(performanceData)}. Provide constructive feedback in HTML format: 1. Overall summary. 2. Detailed analysis of incorrect answers. 3. Key concepts to revise.`;
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        
        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API request failed`);
            const result = await response.json();
            aiFeedbackEl.innerHTML = result.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Error fetching feedback:", error);
            aiFeedbackEl.innerHTML = "<p class='text-red-500'>Sorry, we couldn't generate feedback at this time.</p>";
        } finally {
            feedbackLoader.classList.add('hidden');
            aiFeedbackEl.classList.remove('hidden');
        }
    }
});