const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

// Make sure this is at the top of your file
require('dotenv').config();

// Now you can use the environment variable anywhere in your code
const apiKey = process.env.GEMINI_API_KEY;

console.log(apiKey); // This will print your API key to the console

// Example of using it to initialize the Gemini client
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const genAI = new GoogleGenerativeAI(apiKey);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout/boilerplate');

app.use('/', require('./routes/appRoutes'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
