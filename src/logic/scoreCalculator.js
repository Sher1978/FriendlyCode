export function calculateProfileScore(metrics) {
    let score = 100;
    const deductions = [];

    // 1. Google Rating Deduction (Max -30)
    const r = metrics.rating;
    if (r < 4.0) {
        const pts = 30;
        score -= pts;
        deductions.push({ labelRu: `Критически низкий рейтинг (${r}★)`, labelEn: `Critically low rating (${r}★)`, points: pts });
    } else if (r < 4.3) {
        const pts = 22;
        score -= pts;
        deductions.push({ labelRu: `Низкий рейтинг (${r}★)`, labelEn: `Low rating (${r}★)`, points: pts });
    } else if (r < 4.6) {
        const pts = 14;
        score -= pts;
        deductions.push({ labelRu: `Средний рейтинг (${r}★)`, labelEn: `Average rating (${r}★)`, points: pts });
    } else if (r < 4.8) {
        const pts = 6;
        score -= pts;
        deductions.push({ labelRu: `Субоптимальный рейтинг (${r}★)`, labelEn: `Suboptimal rating (${r}★)`, points: pts });
    }

    // 2. Review Volume Deduction (Max -25)
    const count = metrics.reviewsTotal;
    if (count < 20) {
        const pts = 25;
        score -= pts;
        deductions.push({ labelRu: `Критический дефицит отзывов (${count} шт)`, labelEn: `Critical review deficit (${count} total)`, points: pts });
    } else if (count < 50) {
        const pts = 18;
        score -= pts;
        deductions.push({ labelRu: `Недостаточно отзывов (${count} шт)`, labelEn: `Low review count (${count} total)`, points: pts });
    } else if (count < 100) {
        const pts = 10;
        score -= pts;
        deductions.push({ labelRu: `Умеренное число отзывов (${count} шт)`, labelEn: `Moderate review count (${count} total)`, points: pts });
    } else if (count < 250) {
        const pts = 5;
        score -= pts;
        deductions.push({ labelRu: `Хорошее число отзывов, но уступает топ-3 (${count} шт)`, labelEn: `Good review count, below top-3 (${count} total)`, points: pts });
    }

    // 3. Website Link (Max -15)
    if (!metrics.hasWebsite) {
        const pts = 15;
        score -= pts;
        deductions.push({ labelRu: 'Отсутствует официальный сайт в карточке', labelEn: 'Missing official website link', points: pts });
    }

    // 4. Owner Responses (Max -15)
    if (!metrics.ownerResponseOk) {
        const pts = 15;
        score -= pts;
        deductions.push({ labelRu: 'Отсутствуют ответы владельца на отзывы клиентов', labelEn: 'Unanswered client reviews', points: pts });
    }

    // 5. Schema.org GEO & AI Indexing (Max -15)
    if (metrics.hasGeoMeta === false || metrics.hasGeoMeta === undefined) {
        const pts = 15;
        score -= pts;
        deductions.push({ labelRu: 'Отсутствует GEO-микроразметка Schema.org и ИИ-видимость', labelEn: 'Missing Schema.org GEO markup & AI indexing', points: pts });
    }

    const finalScore = Math.max(15, Math.min(88, score));
    return { score: finalScore, deductions };
}
