const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Setup multer for memory storage to handle file buffer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize the GoogleGenerativeAI with API key from .env
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not set in the environment variables. Please check your .env file and ensure it's loaded correctly at the start of your application.");
    process.exit(1); // Exit the process with an error code
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to convert buffer to base64
function bufferToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

// Route for the home page
router.get('/', (req, res) => {
    res.render('home', { title: 'PrepAI - Home' });
});

// Route to render the doubt solver page
router.get('/doubt', (req, res) => {
    res.render('doubt', { title: 'Snap & Solve Doubt Tutor', solution: null, error: null });
});

// Route to handle the image upload and process with Gemini
router.post('/solve-doubt', upload.single('doubtImage'), async (req, res) => {
    if (!req.file) {
        return res.render('doubt', { title: 'Snap & Solve', solution: null, error: 'Please upload an image of the problem.' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        const prompt = `
            You are an expert AI tutor for competitive exams like JEE and NEET. A student has uploaded an image of a problem they are stuck on. Your task is to provide a comprehensive solution.

            1.  **Analyze the Problem:** Carefully read the text, interpret any diagrams, and identify the core concepts being tested.
            2.  **Step-by-Step Solution:** Provide a clear, detailed, step-by-step solution. Explain the logic and the formulas used at each step.
            3.  **Common Pitfalls:** After the solution, add a section called "Common Pitfalls" and mention 1-2 common mistakes students make when solving this type of problem.
            4.  **Practice Problems:** After the pitfalls, add a section called "Practice Problems" and generate 2 similar problems (without solutions) to help the student practice the concept.

            Structure your entire response in Markdown format.
        `;

        const imagePart = bufferToGenerativePart(req.file.buffer, req.file.mimetype);

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        res.render('doubt', { title: 'Snap & Solve - Solution', solution: text, error: null });

    } catch (error) {
        console.error(error);
        res.render('doubt', { title: 'Snap & Solve', solution: null, error: 'An error occurred while processing your request. Please try again.' });
    }
});

// --- NEW ROUTE ---
// Route to render the Infinite Question Generator page
router.get('/generator', (req, res) => {
    res.render('generator', { title: 'Infinite Question Generator' });
});

// --- NEW ROUTE ---
// Route to render the AI Revision Tool page
router.get('/revision', (req, res) => {
    res.render('revision', { title: 'AI Revision & Mnemonics Tool' });
});

// --- NEW ROUTE ---
// Route to render the AI Mock Test page
router.get('/test', (req, res) => {
    // Tell EJS to use the new layout file for this route ONLY
    res.render('test', { 
        title: 'AI-Powered Mock Test', 
        layout: 'layout/test-layout' // Fixed path - relative to views directory
    });
});

// Add a route to provide the API key to the client
router.get('/api/config', (req, res) => {
    res.json({
        geminiApiKey: process.env.GEMINI_API_KEY
    });
});

module.exports = router;
