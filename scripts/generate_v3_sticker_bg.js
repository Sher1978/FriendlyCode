import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureV3Poster() {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 450,
    height: 800,
    deviceScaleFactor: 3.0 // Crisp 3x Retina resolution
  });

  console.log('Navigating to https://bot-lab-21910.web.app/poster-v3?id=demo ...');
  await page.goto('https://bot-lab-21910.web.app/poster-v3?id=demo', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Give 3s extra for 3D graphics & fonts to render in full glory
  await new Promise(r => setTimeout(r, 3000));

  const cardElement = await page.$('#v3-poster-card');
  const target = cardElement || page;

  const outputPathPng = path.join(__dirname, '../admin/assets/images/pos_sticker_v3.png');
  const outputPathJpg = path.join(__dirname, '../admin/assets/images/pos_sticker_v3.jpg');

  console.log('Capturing high-res screenshot...');
  await target.screenshot({
    path: outputPathPng,
    omitBackground: true
  });

  await target.screenshot({
    path: outputPathJpg,
    type: 'jpeg',
    quality: 95
  });

  console.log('Successfully saved pos_sticker_v3.png and pos_sticker_v3.jpg to admin/assets/images/!');
  await browser.close();
}

captureV3Poster().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
