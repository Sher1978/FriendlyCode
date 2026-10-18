const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

// Ensure db and storage are accessible
function getDb() {
  return admin.firestore();
}

function getStorageBucket() {
  return admin.storage().bucket();
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured in functions/.env");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  if (!url) return 'generic';
  const lower = url.toLowerCase();
  if (lower.includes('food.grab.com') || lower.includes('grab.com')) return 'grab';
  if (lower.includes('zomato.com')) return 'zomato';
  if (lower.includes('glovoapp.com') || lower.includes('glovo.com')) return 'glovo';
  if (lower.includes('talabat.com')) return 'talabat';
  if (lower.includes('swiggy.com')) return 'swiggy';
  return 'generic';
}

/**
 * Fetch raw page content using Jina Reader or Apify
 */
async function fetchRawMenuContent(targetUrl, apifyToken) {
  const platform = detectPlatform(targetUrl);
  console.log(`[MenuScraper] Fetching for ${platform} from URL: ${targetUrl}`);

  // Approach 1: Try Jina Reader as fastest high-signal text extractor
  try {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const jinaRes = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (jinaRes.ok) {
      const content = await jinaRes.text();
      if (content && content.length > 500) {
        console.log(`[MenuScraper] Jina Reader successfully fetched ${content.length} characters.`);
        return { content, method: 'jina', platform };
      }
    }
  } catch (err) {
    console.warn(`[MenuScraper] Jina Reader error: ${err.message}. Falling back to Apify / direct.`);
  }

  // Approach 2: If Apify token available, run Apify Actor
  const token = apifyToken || process.env.APIFY_API_TOKEN;
  if (token) {
    try {
      console.log(`[MenuScraper] Attempting Apify crawler for ${targetUrl}...`);
      // Use apify/single-page-scraper or website-content-crawler
      const actorId = "apify~website-content-crawler";
      const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=60`;
      
      const apifyRes = await fetch(runUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: targetUrl }],
          maxCrawlPages: 1,
          crawlerType: "playwright:adaptive"
        })
      });

      if (apifyRes.ok) {
        const dataset = await apifyRes.json();
        if (Array.isArray(dataset) && dataset.length > 0) {
          const page = dataset[0];
          const content = page.markdown || page.text || page.html || '';
          if (content.length > 300) {
            console.log(`[MenuScraper] Apify fetched ${content.length} characters.`);
            return { content, method: 'apify', platform };
          }
        }
      }
    } catch (apifyErr) {
      console.warn(`[MenuScraper] Apify run error: ${apifyErr.message}`);
    }
  }

  // Approach 3: Direct fetch fallback
  try {
    const directRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8,ru;q=0.7'
      }
    });
    if (directRes.ok) {
      const html = await directRes.text();
      return { content: html.substring(0, 150000), method: 'direct', platform };
    }
  } catch (directErr) {
    console.error(`[MenuScraper] Direct fetch failed: ${directErr.message}`);
  }

  throw new Error("Could not retrieve menu content from URL through available scrapers.");
}

/**
 * Parse raw text/HTML with Gemini into structured GmMenuItem array
 */
async function parseMenuWithGemini(rawContent, platform, venueCountry = 'VN') {
  const model = getGeminiModel();
  
  const prompt = `
You are an expert food delivery aggregator menu extraction system.
Extract all menu items from this raw dump from ${platform.toUpperCase()} (Country context: ${venueCountry}).

Extract each item into this JSON schema:
[
  {
    "id": "item_1",
    "category": "Category name (e.g. Starters, Main, Soups, Drinks)",
    "name": "Exact item name",
    "description": "Item description or ingredients if available, else empty string",
    "aggregatorPrice": "Raw price in aggregator, e.g. 120000 or 45 AED or 350 INR",
    "price": "Clean numeric price or formatted string for the venue",
    "currency": "VND, AED, INR, USD, EUR based on context",
    "imageUrl": "Direct URL of the food photo if present in the text, else empty string",
    "isPublished": true,
    "isAvailable": true
  }
]

RULES:
1. Extract ALL real food/drink menu items found. Do not invent items.
2. If image URLs exist (cdn urls, jpg, png, webp), include them in imageUrl.
3. Keep descriptions concise and clear.
4. Output STRICTLY VALID JSON inside a single \`\`\`json ... \`\`\` block. No conversational text.

RAW MENU CONTENT:
${rawContent.substring(0, 70000)}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let cleaned = text.trim();
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error("Parsed output is not an array");
    return parsed.map((item, idx) => ({
      id: item.id || `scraped_${Date.now()}_${idx}`,
      category: item.category || 'General',
      name: item.name || `Item ${idx + 1}`,
      description: item.description || '',
      aggregatorPrice: item.aggregatorPrice || item.price || '',
      price: item.price || item.aggregatorPrice || '',
      currency: item.currency || (venueCountry === 'VN' ? 'VND' : venueCountry === 'AE' ? 'AED' : 'INR'),
      imageUrl: item.imageUrl || '',
      isPublished: true,
      isAvailable: true
    }));
  } catch (jsonErr) {
    console.error("[MenuScraper] Failed to parse JSON from Gemini response:", text);
    throw new Error(`Gemini menu parsing JSON syntax error: ${jsonErr.message}`);
  }
}

/**
 * Mirror an image from external URL to Firebase Storage
 */
async function mirrorImageToStorage(imageUrl, venueId, itemId) {
  if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl;
  
  try {
    const bucket = getStorageBucket();
    const destPath = `venues/menus/${venueId}/items/${itemId}.webp`;
    const file = bucket.file(destPath);

    // Check if already exists
    const [exists] = await file.exists();
    if (exists) {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2035'
      });
      return url;
    }

    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) return imageUrl;

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    await file.save(buffer, {
      metadata: { contentType, cacheControl: 'public, max-age=31536000' },
      public: true
    });

    return `https://storage.googleapis.com/${bucket.name}/${destPath}`;
  } catch (e) {
    console.warn(`[MenuScraper] Failed to mirror image ${imageUrl}: ${e.message}`);
    return imageUrl; // Fallback to original URL
  }
}

/**
 * Main execute scrape job function
 */
async function executeScrapeJob(venueId, url, options = {}) {
  const db = getDb();
  const platform = detectPlatform(url);
  const jobId = `job_${Date.now()}`;

  const jobRef = db.collection('venues').doc(venueId).collection('scrape_jobs').doc(jobId);
  await jobRef.set({
    jobId,
    venueId,
    url,
    platform,
    status: 'running',
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    itemsCount: 0,
    items: [],
    error: null
  });

  try {
    // 1. Fetch raw content
    const { content, method } = await fetchRawMenuContent(url, options.apifyToken);
    
    // 2. Parse with Gemini
    const venueDoc = await db.collection('venues').doc(venueId).get();
    const venueData = venueDoc.exists ? venueDoc.data() : {};
    const country = venueData.countryCode || (venueData.address && venueData.address.toLowerCase().includes('dubai') ? 'AE' : 'VN');

    const items = await parseMenuWithGemini(content, platform, country);

    // 3. Optional batch mirror images
    if (options.mirrorImages && items.length > 0) {
      console.log(`[MenuScraper] Mirroring images for ${items.length} items...`);
      for (let i = 0; i < Math.min(items.length, 30); i++) {
        if (items[i].imageUrl) {
          items[i].imageUrl = await mirrorImageToStorage(items[i].imageUrl, venueId, items[i].id);
        }
      }
    }

    // 4. Save to Staging Job
    await jobRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      itemsCount: items.length,
      items,
      fetchMethod: method
    });

    // 5. If autoPublish is requested, commit directly to venue gmConfig
    if (options.autoPublish) {
      await db.collection('venues').doc(venueId).set({
        gmConfig: {
          businessType: 'horeca',
          menuItems: items
        }
      }, { merge: true });
    }

    return { success: true, jobId, itemsCount: items.length, items };
  } catch (err) {
    console.error(`[MenuScraper] Error in job ${jobId}:`, err);
    await jobRef.update({
      status: 'failed',
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: err.message
    });
    throw err;
  }
}

module.exports = {
  detectPlatform,
  fetchRawMenuContent,
  parseMenuWithGemini,
  mirrorImageToStorage,
  executeScrapeJob
};
