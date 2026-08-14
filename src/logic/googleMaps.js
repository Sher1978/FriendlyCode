/**
 * Transforms a standard Google Maps URL into a direct reviews/write-review URL.
 * Supports various Google Maps link patterns.
 */
export function convertToGoogleReviewUrl(url) {
    if (!url) return 'https://maps.google.com';
    url = url.trim();

    // 1. If it's already a direct review link, return as is
    if (url.includes('/review') || url.includes('writereview') || url.includes('action=write_review')) {
        return url;
    }

    // 2. Handle g.page/r/XYZ format -> append /review
    if (url.includes('g.page/r/')) {
        const parts = url.split('?');
        let path = parts[0];
        if (!path.endsWith('/')) {
            path += '/';
        }
        path += 'review';
        return parts[1] ? `${path}?${parts[1]}` : path;
    }

    // 3. Handle cid queries, e.g. maps.google.com/?cid=12345
    if (url.includes('cid=')) {
        try {
            const parsedUrl = new URL(url);
            const cid = parsedUrl.searchParams.get('cid');
            if (cid) {
                const decimalCid = BigInt(cid);
                const hexCid = decimalCid.toString(16);
                return `https://search.google.com/local/writereview?fid=0x0:0x${hexCid}`;
            }
        } catch (e) {
            console.warn("Failed parsing CID URL:", e);
        }
    }

    // 4. Handle placeid queries, e.g. maps.google.com/?placeid=12345
    if (url.includes('placeid=')) {
        try {
            const parsedUrl = new URL(url);
            const pid = parsedUrl.searchParams.get('placeid');
            if (pid) {
                return `https://search.google.com/local/writereview?placeid=${pid}`;
            }
        } catch (e) {
            console.warn("Failed parsing placeid URL:", e);
        }
    }

    // 5. Handle standard google.com/maps/place/BusinessName/...
    const placeRegex = /^(https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/place\/)([^\/]+)(.*)$/i;
    const match = url.match(placeRegex);
    if (match) {
        const base = match[1]; // e.g. "https://www.google.com/maps/place/"
        const businessName = match[2]; // e.g. "Restaurant+Name"
        const rest = match[3]; // e.g. "/@21.028,105.80,17z/data=..."
        
        return `${base}${businessName}/review${rest}`;
    }

    // 6. Generic Google Maps fallback: append action=write_review or /review
    if (url.includes('google.') && url.includes('/maps')) {
        if (url.includes('?')) {
            return `${url}&action=write_review`;
        } else {
            return url.endsWith('/') ? `${url}review` : `${url}/review`;
        }
    }

    return url;
}

