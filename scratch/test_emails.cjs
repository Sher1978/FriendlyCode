const https = require('https');

const baseUrl = 'https://asia-south1-bot-lab-21910.cloudfunctions.net';
// Since I did not specify region for tests, it defaults to us-central1 usually, or I'll try asia-south1 if it fails.
const email = '0451611@gmail.com';

const testUrls = [
    `https://testwelcomeemail-5fq7nyjxza-el.a.run.app?email=${email}`,
    `https://testmissyouemail-5fq7nyjxza-el.a.run.app?email=${email}`,
    `https://testdailyreportemail-5fq7nyjxza-el.a.run.app?email=${email}`
];

testUrls.forEach(url => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log(`Response from ${url.split('/').pop().split('?')[0]}: ${data}`));
    }).on('error', err => {
        console.error(`Error requesting ${url}:`, err.message);
    });
});
