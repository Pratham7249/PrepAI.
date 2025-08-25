document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('generate-btn')) {
        let API_KEY = null;

        // Fetch API key from server
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            API_KEY = config.geminiApiKey;
            
            if (!API_KEY || API_KEY === "your_gemini_api_key_here") {
                throw new Error("API Key is not configured. Please check your .env file.");
            }
        } catch (error) {
            console.error('Error fetching API key:', error);
            alert('Failed to load API configuration. Please check the console for details.');
            return;
        }

        // --- CONFIGURATION ---
        const CONFIG = {
            API_KEY: API_KEY,
            MODEL_NAME: "gemini-1.5-flash-latest",
            API_URL: "https://generativelanguage.googleapis.com/v1beta/models"
        };

        // --- DOM element references ---
        const generateBtn = document.getElementById('generate-btn');
        const loader = document.getElementById('loader');
        const resultContainer = document.getElementById('result-container');
        const resultText = document.getElementById('result-text');
        const errorContainer = document.getElementById('error-container');

        // --- Helper Function to render questions with hidden answers ---
        function renderQuestions(rawText) {
            resultText.innerHTML = ''; // Clear previous results
            const questions = rawText.split('**Question '); // Split the text into individual questions

            questions.forEach((questionText, index) => {
                if (questionText.trim() === '') return;

                const questionNumber = questionText.substring(0, questionText.indexOf(':'));
                const content = questionText.substring(questionText.indexOf(':') + 1);

                // Split the content at our custom separator
                const parts = content.split('[---SOLUTION---]');
                const questionPart = parts[0];
                const solutionPart = parts[1] || '';

                // Create the HTML structure for each question
                const questionBlock = document.createElement('div');
                questionBlock.className = 'question-block';

                questionBlock.innerHTML = `
                    <h4>Question ${questionNumber}</h4>
                    <div class="question-content">${simpleMarkdownToHtml(questionPart)}</div>
                    <button class="btn btn-secondary show-answer-btn" data-target="solution-${index}">
                        <i class="fa-solid fa-eye"></i> Show Answer
                    </button>
                    <div id="solution-${index}" class="solution-block hidden">
                        ${simpleMarkdownToHtml(solutionPart)}
                    </div>
                `;
                resultText.appendChild(questionBlock);
            });

            // Add event listeners to all new buttons
            document.querySelectorAll('.show-answer-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const targetId = button.getAttribute('data-target');
                    const solutionBlock = document.getElementById(targetId);
                    const isHidden = solutionBlock.classList.toggle('hidden');

                    if (isHidden) {
                        button.innerHTML = `<i class="fa-solid fa-eye"></i> Show Answer`;
                    } else {
                        button.innerHTML = `<i class="fa-solid fa-eye-slash"></i> Hide Answer`;
                    }
                });
            });
        }

        function simpleMarkdownToHtml(text) {
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
            text = text.replace(/\n/g, '<br>');
            return text;
        }

        // --- Main Event Listener ---
        generateBtn.addEventListener('click', async () => {
            const subject = document.getElementById('subject').value;
            const topic = document.getElementById('topic').value;
            const difficulty = document.getElementById('difficulty').value;
            const numQuestions = document.getElementById('numQuestions').value;

            if (!topic) {
                errorContainer.textContent = 'Please enter a topic.';
                errorContainer.classList.remove('hidden');
                return;
            }

            loader.classList.remove('hidden');
            resultContainer.classList.add('hidden');
            errorContainer.classList.add('hidden');
            generateBtn.disabled = true;

            try {
                // --- UPDATED PROMPT with a clear separator ---
                const prompt = `
                    You are an expert question paper setter for Indian competitive exams.
                    Your task is to generate ${numQuestions} high-quality, original practice questions on the topic of "${topic}" for the ${difficulty} exam in the subject of ${subject}.

                    **CRITICAL INSTRUCTIONS:**
                    1. For each question, provide the question, options, etc.
                    2. After the question and its options, you MUST insert the separator: [---SOLUTION---]
                    3. After the separator, provide the **Correct Answer** and a detailed **Step-by-Step Solution**.
                    4. Start every question with "**Question X:**" where X is the question number.
                `;

                const payload = { contents: [{ parts: [{ text: prompt }] }] };
                const apiKey = CONFIG.API_KEY;

                if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
                    throw new Error("API Key is missing. Please add it to generator.js.");
                }

                const apiUrl = `${CONFIG.API_URL}/${CONFIG.MODEL_NAME}:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || `API request failed`);
                }

                const result = await response.json();
                if (result.candidates && result.candidates[0].content.parts[0].text) {
                    const rawText = result.candidates[0].content.parts[0].text;
                    renderQuestions(rawText); // Use the new rendering function
                    resultContainer.classList.remove('hidden');
                } else {
                    throw new Error('No content received from API. It may have been blocked.');
                }
            } catch (error) {
                console.error('Error:', error);
                errorContainer.textContent = `An error occurred: ${error.message}`;
                errorContainer.classList.remove('hidden');
            } finally {
                loader.classList.add('hidden');
                generateBtn.disabled = false;
            }
        });
    }
});