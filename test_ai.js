require('dotenv').config();
const { analyzeGbpProfileDeep, analyzeYandexProfileDeep } = require('./functions/gbp.js');

async function test() {
  const profileData = { name: "Svoi", city: "Dubai", category: "Coffee Shop" };
  const apiKey = process.env.GEMINI_API_KEY; // Make sure it exists, or just pass a mock if needed

  console.log("Starting analysis...");
  try {
    const res = await analyzeGbpProfileDeep({ profileData, apiKey });
    console.log("Result:", res);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
