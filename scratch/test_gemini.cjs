const { analyzeGbpProfileDeep } = require('../functions/gbp');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../functions/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GEMINI_API_KEY="?([^"\r\n]+)"?/);
process.env.GEMINI_API_KEY = match ? match[1] : '';

async function testDeepAudit() {
  const profileData = {
    businessName: "Svoi",
    category: "coffe place",
    city: "Дубай",
    googleMapsUrl: "https://maps.google.com/?cid=123456789",
    description: "Уютная кофейня в дубае",
    story: "Мы открылись в 2024 году, варим отличный спешелти кофе"
  };

  console.log("Running analyzeGbpProfileDeep...");
  const res = await analyzeGbpProfileDeep({ profileData });
  console.log("RESULT:\n", JSON.stringify(res, null, 2));
}

testDeepAudit();
