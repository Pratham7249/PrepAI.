document.addEventListener('DOMContentLoaded', async () => {
    // Check if we are on the doubt page before running the script
    if (document.getElementById('image-input')) {
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
        const imageInput = document.getElementById('image-input');
        const imagePreview = document.getElementById('image-preview');
        const fileNameDisplay = document.getElementById('file-name');
        const analyzeBtn = document.getElementById('analyze-btn');
        const loader = document.getElementById('loader');
        const resultContainer = document.getElementById('result-container');
        const resultText = document.getElementById('result-text');
        const errorContainer = document.getElementById('error-container');
        const placeholder = document.getElementById('placeholder');
        const imageDropArea = document.getElementById('image-drop-area');
        const fileInputLabel = document.querySelector('.file-input-label');
        let file = null;

        // --- Event Listeners and Functions ---
        fileInputLabel.addEventListener('click', () => imageInput.click());

        function handleFileSelect(selectedFile) {
            if (selectedFile && selectedFile.type.startsWith('image/')) {
                file = selectedFile;
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                };
                reader.readAsDataURL(file);
                fileNameDisplay.textContent = file.name;
                analyzeBtn.disabled = false;
                errorContainer.classList.add('hidden');
            } else {
                file = null;
                fileNameDisplay.textContent = 'Please select a valid image file.';
                analyzeBtn.disabled = true;
            }
        }

        imageInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
        imageDropArea.addEventListener('dragover', (e) => { e.preventDefault(); imageDropArea.classList.add('dragover'); });
        imageDropArea.addEventListener('dragleave', (e) => { e.preventDefault(); imageDropArea.classList.remove('dragover'); });
        imageDropArea.addEventListener('drop', (e) => { e.preventDefault(); imageDropArea.classList.remove('dragover'); handleFileSelect(e.dataTransfer.files[0]); });

        const fileToGenerativePart = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ inlineData: { mimeType: file.type, data: reader.result.split(',')[1] } });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        function simpleMarkdownToHtml(text) {
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/^### (.*$)/gim, '<h4>$1</h4>');
            text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>');
            text = text.replace(/^\* (.*$)/gim, '<li>$1</li>');
            text = text.replace(/\n/g, '<br>');
            return text;
        }

        analyzeBtn.addEventListener('click', async () => {
            if (!file) return;

            loader.classList.remove('hidden');
            resultContainer.classList.add('hidden');
            errorContainer.classList.add('hidden');
            analyzeBtn.disabled = true;

            try {
                const imagePart = await fileToGenerativePart(file);
                const prompt = `You are an expert AI tutor for competitive exams like JEE and NEET. A student has uploaded an image of a problem. Provide a comprehensive solution including: 1. Step-by-step solution. 2. Common pitfalls. 3. Two similar practice problems. Format the response in Markdown.`;
                const payload = { contents: [{ parts: [{ text: prompt }, imagePart] }] };
                const apiKey = CONFIG.API_KEY;

                if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") throw new Error("API Key is missing in script.js.");

                const apiUrl = `${CONFIG.API_URL}/${CONFIG.MODEL_NAME}:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

                if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error.message || `API request failed`); }

                const result = await response.json();
                if (result.candidates && result.candidates[0].content.parts[0].text) {
                    resultText.innerHTML = simpleMarkdownToHtml(result.candidates[0].content.parts[0].text);
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
                analyzeBtn.disabled = false;
            }
        });
    }
});