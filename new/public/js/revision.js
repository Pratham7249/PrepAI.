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
        const userInput = document.getElementById('user-input');
        const tabs = document.querySelectorAll('.tab-btn');
        let activeTool = 'mnemonic'; // Default tool

        // --- Tab switching logic ---
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                activeTool = tab.getAttribute('data-tool');
            });
        });

        // --- Helper function to build the prompt based on the active tool ---
        function getPrompt(text) {
            switch (activeTool) {
                case 'mnemonic':
                    // --- THIS IS THE UPDATED PROMPT ---
                    return `
                        You are a creative AI assistant for Indian students. Your task is to create a clever, funny, and memorable mnemonic for the following list of items.

                        **CRITICAL INSTRUCTIONS:**
                        1.  The mnemonic MUST be highly relatable to an Indian audience.
                        2.  Use references to things like **Bollywood movies or actors, popular Indian food, cricket, common Hinglish phrases, or Indian historical figures.**
                        3.  Make it catchy and easy to remember for someone studying for exams like JEE or NEET.

                        **List of items to create a mnemonic for:**
                        ${text}
                    `;
                case 'flashcards':
                    return `Analyze the following text and generate a set of digital flashcards. For each flashcard, provide a key term or question, followed by a separator "---", and then the definition or answer. Format them clearly. Text: ${text}`;
                case 'summary':
                    return `Summarize the key concepts from the following text into a concise, easy-to-understand mind map or bulleted list. Focus on the most important information for exam revision. Text: ${text}`;
                default:
                    return text;
            }
        }

        // --- Helper function to render the output ---
        function renderOutput(text) {
            if (activeTool === 'flashcards') {
                resultText.innerHTML = '';
                const cards = text.split('\n').filter(line => line.includes('---'));
                cards.forEach(cardData => {
                    const [term, definition] = cardData.split('---');
                    const card = document.createElement('div');
                    card.className = 'flashcard';
                    card.innerHTML = `<div class="card-inner"><div class="card-front">${term.trim()}</div><div class="card-back">${definition.trim()}</div></div>`;
                    card.addEventListener('click', () => card.classList.toggle('flipped'));
                    resultText.appendChild(card);
                });
            } else {
                resultText.innerHTML = text.replace(/\n/g, '<br>');
            }
        }
        // this is the new one
//         // --- Helper function to render the output ---
// function renderOutput(text) {
//     if (activeTool === 'flashcards') {
//         resultText.innerHTML = ''; // Clear previous results
//         const cards = text.split('\n').filter(line => line.includes('---'));
//         cards.forEach(cardData => {
//             const [term, definition] = cardData.split('---');
//             const card = document.createElement('div');
//             card.className = 'flashcard';
//             card.innerHTML = `<div class="card-inner"><div class="card-front">${term.trim()}</div><div class="card-back">${definition.trim()}</div></div>`;
//             card.addEventListener('click', () => card.classList.toggle('flipped'));
//             resultText.appendChild(card);
//         });
//     } else {
//         // --- THIS IS THE UPDATED PART ---
//         // Wrap the text output in a styled container
//         const resultClass = activeTool === 'mnemonic' ? 'mnemonic-result' : 'summary-result';
//         resultText.innerHTML = `
//             <div class="text-result-container ${resultClass}">
//                 ${text.replace(/\n/g, '<br>')}
//             </div>
//         `;
//     }
// }


        // --- Main Event Listener ---
        generateBtn.addEventListener('click', async () => {
            const inputText = userInput.value;
            if (!inputText.trim()) {
                errorContainer.textContent = 'Please enter some text or a list of items.';
                errorContainer.classList.remove('hidden');
                return;
            }

            loader.classList.remove('hidden');
            resultContainer.classList.add('hidden');
            errorContainer.classList.add('hidden');
            generateBtn.disabled = true;

            try {
                const prompt = getPrompt(inputText);
                const payload = { contents: [{ parts: [{ text: prompt }] }] };
                const apiKey = CONFIG.API_KEY;

                if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
                    throw new Error("API Key is missing in revision.js.");
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
                    renderOutput(rawText);
                    resultContainer.classList.remove('hidden');
                } else {
                    throw new Error('No content received from API.');
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