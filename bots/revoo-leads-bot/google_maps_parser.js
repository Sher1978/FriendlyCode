/**
 * Google Maps & Business Link Parser
 * Extracts venue metadata (Name, Niche, City, Address, Rating, Reviews, Working Hours, Phone, Photos)
 */

async function parseGooglePlace(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  const rawUrl = inputUrl.trim();

  // Validate URL format
  if (!/^https?:\/\//i.test(rawUrl)) {
    return null;
  }

  let finalUrl = rawUrl;
  let html = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    finalUrl = response.url || rawUrl;
    html = await response.text();
  } catch (e) {
    console.warn('Google Place fetch error:', e.message);
  }

  const result = {
    name: null,
    niche: null,
    city: null,
    address: null,
    rating: null,
    reviewsCount: null,
    workingHours: null,
    phone: null,
    photoUrl: null,
    canonicalUrl: finalUrl,
  };

  // Helper to validate name
  const isValidName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const n = name.trim().toLowerCase();
    const invalidList = [
      'google maps', 'карты google', 'google search', 'google поиск',
      'before you continue to google maps', 'перед тем как перейти',
      'dynamic link not found', '404 not found', 'error 404', 'sign in - google accounts',
      'найдите местные компании', 'find local businesses', 'google'
    ];
    if (invalidList.some(inv => n.includes(inv) || n === inv)) return false;
    return n.length >= 2;
  };

  const isGenericText = (text) => {
    if (!text || typeof text !== 'string') return true;
    const t = text.toLowerCase();
    return t.includes('find local businesses') ||
           t.includes('найти информацию о местных') ||
           t.includes('view maps and get driving') ||
           t.includes('посмотреть карты и получить') ||
           t.includes('google maps') ||
           t.includes('карты google');
  };

  // Helper for meta content extraction
  const getMetaContent = (htmlStr, propName) => {
    const r1 = new RegExp(`<meta[^>]+property=["']${propName}["'][^>]+content=["']([^"']+)["']`, 'i');
    const m1 = htmlStr.match(r1);
    if (m1 && m1[1]) return m1[1];

    const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${propName}["']`, 'i');
    const m2 = htmlStr.match(r2);
    if (m2 && m2[1]) return m2[1];

    const r3 = new RegExp(`<meta[^>]+name=["']${propName}["'][^>]+content=["']([^"']+)["']`, 'i');
    const m3 = htmlStr.match(r3);
    if (m3 && m3[1]) return m3[1];

    const r4 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${propName}["']`, 'i');
    const m4 = htmlStr.match(r4);
    if (m4 && m4[1]) return m4[1];

    return null;
  };

  // 1. Try URL pathname parsing for Name
  try {
    const parsedUrl = new URL(finalUrl);
    const placeMatch = parsedUrl.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch && placeMatch[1]) {
      const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      if (isValidName(decoded)) {
        result.name = decoded;
      }
    }
    const searchMatch = parsedUrl.pathname.match(/\/maps\/search\/([^/@]+)/) || parsedUrl.searchParams.get('q');
    if (!result.name && searchMatch) {
      const searchVal = typeof searchMatch === 'string' ? searchMatch : searchMatch[1];
      const decoded = decodeURIComponent(searchVal.replace(/\+/g, ' '));
      if (isValidName(decoded)) {
        result.name = decoded;
      }
    }
  } catch (e) {}

  // 2. Parse HTML
  if (html) {
    const ogTitle = getMetaContent(html, 'og:title');
    const ogDesc = getMetaContent(html, 'og:description') || getMetaContent(html, 'description');
    const ogImage = getMetaContent(html, 'og:image');
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

    if (ogImage && !ogImage.includes('google_maps_logo') && !isGenericText(ogImage)) {
      result.photoUrl = ogImage;
    }

    // Name Extraction from Meta
    let rawTitle = ogTitle || (titleMatch ? titleMatch[1] : '');
    if (rawTitle) {
      rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      rawTitle = rawTitle.replace(/\s*[-–—·|]\s*(Google Maps|Карты Google|Google Поиск|Search).*$/i, '').trim();
      if (!result.name && isValidName(rawTitle)) {
        result.name = rawTitle;
      }
    }

    // Description Parsing
    if (ogDesc && !isGenericText(ogDesc)) {
      let desc = ogDesc.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
      
      // Star rating
      const starRatingMatch = desc.match(/([0-5][.,]\d)\s*(?:★|⭐|stars|\(|$)/i);
      if (starRatingMatch && /^[0-5][.,]\d$/.test(starRatingMatch[1])) {
        result.rating = starRatingMatch[1].replace(',', '.') + ' ⭐';
      }

      // Reviews Count
      const reviewsMatch = desc.match(/\(([\d\s,.]+)\s*(?:отзыв|review|оценок)?\)/i) ||
                           desc.match(/([\d\s,.]+)\s*(?:отзыв|reviews|голосов)/i);
      if (reviewsMatch) {
        result.reviewsCount = reviewsMatch[1].trim() + ' отзывов';
      }

      // Split description parts
      const parts = desc.split(/\s*[·•|–]\s*/);
      for (const part of parts) {
        const p = part.trim();
        if (/^[★☆\s\d.,()]+$/.test(p) || p.includes('отзыв') || p.includes('review') || p.includes('⭐')) {
          continue;
        }
        // Check if niche/category
        if (!result.niche && p.length < 40 && !/\d{2,}/.test(p) && !p.includes(',') && !p.includes('Street') && !p.includes('ул.') && !p.includes('Road') && !p.includes('Ward')) {
          result.niche = p;
        } else if (!result.address && !isGenericText(p) && (p.includes(',') || /\d+/.test(p) || p.length > 10)) {
          result.address = p;
        }
      }
    }

    // Check JSON-LD Schema
    const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["']>([^<]+)<\/script>/gis);
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        if (data) {
          if (data.name && (!result.name || !isValidName(result.name))) {
            if (isValidName(data.name)) result.name = data.name;
          }
          if (data.telephone && !result.phone) result.phone = data.telephone;
          if (data.aggregateRating) {
            if (data.aggregateRating.ratingValue && !result.rating) {
              result.rating = data.aggregateRating.ratingValue + ' ⭐';
            }
            if (data.aggregateRating.reviewCount && !result.reviewsCount) {
              result.reviewsCount = data.aggregateRating.reviewCount + ' отзывов';
            }
          }
          if (data.address) {
            if (typeof data.address === 'string' && !result.address && !isGenericText(data.address)) {
              result.address = data.address;
            } else if (typeof data.address === 'object') {
              const fullAddr = [data.address.streetAddress, data.address.addressLocality, data.address.addressCountry].filter(Boolean).join(', ');
              if (fullAddr && !result.address && !isGenericText(fullAddr)) result.address = fullAddr;
              if (data.address.addressLocality && !result.city && !isGenericText(data.address.addressLocality)) {
                result.city = data.address.addressLocality;
              }
            }
          }
          if (data.openingHours && !result.workingHours) {
            result.workingHours = Array.isArray(data.openingHours) ? data.openingHours.join(', ') : String(data.openingHours);
          }
        }
      } catch (e) {}
    }

    // Deep JS Blob Regex extraction (Google Maps Internal Array Data)
    if (!result.phone) {
      const intlPhoneMatch = html.match(/(?:\+84|\+7|\+971|\+1|\+44|\+33|\+49|\+66|\+62|\+60|\+998|\+77|\+996)[\s\d\-().]{7,16}/);
      if (intlPhoneMatch) {
        result.phone = intlPhoneMatch[0].trim();
      }
    }

    if (!result.workingHours) {
      const hoursMatch = html.match(/(?:Открыто|Закрыто|Open|Closed)[^<"']{0,40}(?:до|closes|at)\s*(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:AM|PM|am|pm))/i) ||
                         html.match(/(\d{1,2}[:.]\d{2}\s*[-–—]\s*\d{1,2}[:.]\d{2})/);
      if (hoursMatch) {
        result.workingHours = hoursMatch[0].trim();
      }
    }

    // City extraction from address
    if (result.address && !result.city && !isGenericText(result.address)) {
      const addrParts = result.address.split(',').map(s => s.trim()).filter(Boolean);
      if (addrParts.length >= 2) {
        result.city = addrParts[addrParts.length - 2] || addrParts[addrParts.length - 1];
      } else if (addrParts.length === 1) {
        result.city = addrParts[0];
      }
    }
  }

  // Return parsed object if at least something meaningful was found, or null
  const hasMeaningfulData = Boolean(result.name || result.address || result.city);
  return {
    success: hasMeaningfulData,
    ...result,
  };
}

module.exports = { parseGooglePlace };
