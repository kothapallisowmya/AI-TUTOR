const fetch = require('node-fetch'); // or native fetch if Node 18+
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  if (data.models) {
    console.log("Models:", data.models.map(m => m.name));
  } else {
    console.log(data);
  }
}
listModels();
