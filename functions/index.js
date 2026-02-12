const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

// Set global options for all functions
setGlobalOptions({ region: "asia-south1" });

admin.initializeApp();
const db = admin.firestore();

const { Resend } = require("resend");
const resend = new Resend("re_hhcZAqvV_PrA1srdegsuaoqkQEVZoGCNc");

/**
 * Secures the Discount Calculation logic on the server.
 */
exports.calculateDiscount = onCall(async (request) => {
    const { venueId } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const venueDoc = await db.collection("venues").doc(venueId).get();
    if (!venueDoc.exists) {
        throw new HttpsError("not-found", "Venue not found.");
    }
    const venueData = venueDoc.data();
    const tiers = venueData.tiers || [];

    const userDoc = await db.collection("users").doc(uid).get();
    let lastSeen = new Date(0);
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.lastSeen) {
            lastSeen = new Date(userData.lastSeen);
        }
    }

    const now = new Date();
    const diffHours = (now - lastSeen) / (1000 * 60 * 60);

    let discount = 5;
    for (const tier of tiers) {
        if (diffHours <= tier.maxHours) {
            discount = tier.discountPercent;
            break;
        }
    }

    return {
        discount,
        guestName: userDoc.exists ? userDoc.data().name : "Guest",
        diffHours: Math.round(diffHours * 10) / 10
    };
});

/**
 * Background trigger: When Waiter confirms a scan.
 */
exports.onScanConfirmed = onDocumentUpdated("scans/{scanId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData.status === "pending" && afterData.status === "confirmed") {
        const { venueId, guestId, applicableDiscount } = afterData;

        logger.info(`Processing confirmed scan for guest ${guestId} at venue ${venueId}`);

        const batch = db.batch();
        const venueRef = db.collection("venues").doc(venueId);
        batch.update(venueRef, {
            "stats.totalCheckins": admin.firestore.FieldValue.increment(1),
            [`stats.discountDistribution.${applicableDiscount}`]: admin.firestore.FieldValue.increment(1)
        });

        const userRef = db.collection("users").doc(guestId);
        batch.update(userRef, {
            "totalVisits": admin.firestore.FieldValue.increment(1),
            "lastSeen": new Date().toISOString()
        });

        await batch.commit();
    }
});

const { onDocumentCreated } = require("firebase-functions/v2/firestore");

/**
 * Scenario A: Instant Owner Notification (Triggered)
 * Trigger: onDocumentCreated in /visits/{visitId}
 */
exports.onVisitCreated = onDocumentCreated("visits/{visitId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const visitData = snapshot.data();
    const { venueId, uid, discountValue, guestName: visitGuestName, guestEmail: visitGuestEmail } = visitData;

    try {
        // 1. Get Venue Info (Owner Email, Name)
        const venueDoc = await db.collection("venues").doc(venueId).get();
        if (!venueDoc.exists) return;
        const venueData = venueDoc.data();
        const ownerEmail = venueData.ownerEmail;
        const venueName = venueData.name || "Default Venue";

        if (!ownerEmail) {
            logger.warn(`No owner email found for venue ${venueId}`);
            return;
        }

        // 2. Get Guest Info (Fallback to visit data if user doc missing)
        let guestName = visitGuestName || "A guest";
        let guestStatus = "Level 1";

        if (uid && uid !== 'anonymous') {
            const guestDoc = await db.collection("users").doc(uid).get();
            if (guestDoc.exists) {
                const guestData = guestDoc.data();
                guestName = guestData.displayName || guestData.name || guestName;
                // Simple status logic for now
                const totalVisits = guestData.totalVisits || 0;
                if (totalVisits > 10) guestStatus = "Super VIP";
                else if (totalVisits > 3) guestStatus = "Regular";
            }
        }

        // 3. Send Email via Resend
        const { data, error } = await resend.emails.send({
            from: "Friendly Code <no-reply@friendlycode.fun>",
            to: [ownerEmail],
            reply_to: "support@friendlycode.fun",
            subject: `🚀 Новое сканирование в ${venueName}!`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #4E342E; max-width: 600px; margin: auto; padding: 40px; background-color: #FFF8E1; border-radius: 24px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 12px; font-weight: 900; letter-spacing: 2px; color: #E68A00; text-transform: uppercase;">Friendly Code</span>
                    </div>
                    
                    <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 20px; color: #4E342E; text-align: center;">У вас новый гость!</h1>
                    
                    <p style="font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                        Только что в <strong>${venueName}</strong> было зафиксировано новое сканирование.
                    </p>
                    
                    <div style="background: #ffffff; padding: 24px; border-radius: 20px; border: 1px solid rgba(78, 52, 46, 0.1); margin-bottom: 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding-bottom: 15px;">
                                    <span style="font-size: 12px; font-weight: 700; color: #795548; text-transform: uppercase;">Имя гостя</span><br/>
                                    <span style="font-size: 18px; font-weight: 900; color: #4E342E;">${guestName}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-bottom: 15px;">
                                    <span style="font-size: 12px; font-weight: 700; color: #795548; text-transform: uppercase;">Статус</span><br/>
                                    <span style="font-size: 18px; font-weight: 900; color: #4CAF50;">${guestStatus}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span style="font-size: 12px; font-weight: 700; color: #795548; text-transform: uppercase;">Примененная скидка</span><br/>
                                    <span style="font-size: 24px; font-weight: 900; color: #E68A00;">${discountValue}%</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="https://friendlycode.fun/admin" style="display: inline-block; background: #E68A00; color: #FFF8E1; padding: 18px 36px; border-radius: 18px; text-decoration: none; font-weight: 900; font-size: 16px; box-shadow: 0 8px 20px rgba(230, 138, 0, 0.2);">Посмотреть аналитику</a>
                    </div>
                    
                    <p style="margin-top: 50px; text-align: center; font-size: 12px; color: #795548; font-weight: 500;">
                        Friendly Code — мы помогаем вашим гостям любить вас в ответ.
                    </p>
                </div>
            `
        });

        if (error) throw error;
        logger.info(`Email sent to ${ownerEmail} for visit ${event.params.visitId}`);
    } catch (err) {
        logger.error("Failed to send instant notification", err);
        await db.collection("email_logs").add({
            type: "instant_notification",
            visitId: event.params.visitId,
            error: err.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});

const { onRequest } = require("firebase-functions/v2/https");

/**
 * TELEGRAM BOT LOGIC
 */
const TELEGRAM_TOKEN = "8222060761:AAFkRFuWhsW-SEKYr_eZjgtMK1PBzC4Fgfk";

/**
 * Webhook for Telegram. Set this URL with the Telegram API:
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_FUNCTION_URL>
 */
exports.telegramWebhook = onRequest(async (req, res) => {
    try {
        const update = req.body;

        // Ensure we have a message
        if (!update.message || !update.message.text) {
            res.sendStatus(200); // Just acknowledge
            return;
        }

        const text = update.message.text;
        const chatId = update.message.chat.id;

        // COMMAND: /start <uid>
        // Example: /start 7u4h5j3k2...
        if (text.startsWith("/start")) {
            const parts = text.split(" ");
            if (parts.length > 1) {
                const uid = parts[1].trim();

                // 1. Link Chat ID to User in Firestore
                const userRef = db.collection("users").doc(uid);
                await userRef.set({
                    telegramChatId: chatId,
                    messenger: "telegram",
                    lastSeen: new Date().toISOString()
                }, { merge: true });

                // 2. Send Welcome Message
                await sendTelegramMessage(chatId, "✅ You are now connected! I'll send your discounts here.");
                logger.info(`Linked telegram chat ${chatId} to user ${uid}`);
            } else {
                await sendTelegramMessage(chatId, "👋 Hello! Please use the 'Telegram' button in the FriendlyCode app to connect.");
            }
        }

        // COMMAND: /register_venue <venue_id>
        // Used by Business Owners to link a Group Chat to their Venue
        if (text.startsWith("/register_venue")) {
            const parts = text.split(" ");
            if (parts.length > 1) {
                const venueId = parts[1].trim();
                const venueRef = db.collection("venues").doc(venueId);
                const venueDoc = await venueRef.get();

                if (venueDoc.exists) {
                    await venueRef.update({ telegramGroupId: chatId });
                    await sendTelegramMessage(chatId, `✅ **Success!**\n\nThis group is now linked to **${venueDoc.data().name}**.\nWe will notify you here when new guests scan.`);
                    logger.info(`Linked Telegram Group ${chatId} to Venue ${venueId}`);
                } else {
                    await sendTelegramMessage(chatId, `❌ **Error:** Venue ID not found.\nPlease check the ID and try again.`);
                }
            } else {
                await sendTelegramMessage(chatId, "⚠️ Usage: `/register_venue <VENUE_ID>`");
            }
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error("Telegram Webhook Error", error);
        res.sendStatus(500);
    }
});

const { onSchedule } = require("firebase-functions/v2/scheduler");

/**
 * Scenario B: Daily Statistics Report (Scheduled, 21:00)
 * Trigger: onSchedule("0 21 * * *")
 * Note: Defaulting to Asia/Dubai timezone as per requirement.
 */
exports.dailyStatsReport = onSchedule({
    schedule: "0 21 * * *",
    timeZone: "Asia/Dubai",
    region: "asia-south1"
}, async (event) => {
    logger.info("Starting daily statistics report generation.");
    const venuesSnapshot = await db.collection("venues").get();

    for (const venueDoc of venuesSnapshot.docs) {
        const venueData = venueDoc.data();
        const venueId = venueDoc.id;
        const ownerEmail = venueData.ownerEmail;
        const venueName = venueData.name || "Default Venue";

        if (!ownerEmail) continue;

        // Get visits for the last 24 hours
        const todayEnd = new Date();
        const todayStart = new Date(todayEnd);
        todayStart.setHours(0, 0, 0, 0);

        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(todayStart.getDate() - 1);
        const yesterdayEnd = new Date(todayStart);

        // Current Day Visits
        const todayVisits = await db.collection("visits")
            .where("venueId", "==", venueId)
            .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(todayStart))
            .where("timestamp", "<", admin.firestore.Timestamp.fromDate(todayEnd))
            .get();

        // Previous Day Visits (for growth calculation)
        const yesterdayVisits = await db.collection("visits")
            .where("venueId", "==", venueId)
            .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(yesterdayStart))
            .where("timestamp", "<", admin.firestore.Timestamp.fromDate(yesterdayEnd))
            .get();

        const totalScans = todayVisits.size;
        const previousScans = yesterdayVisits.size;

        const activatedDiscounts = todayVisits.docs.filter(doc => doc.data().status === "activated").length;
        const conversionRate = totalScans > 0 ? Math.round((activatedDiscounts / totalScans) * 100) : 0;

        // Growth Calculation
        let growth = 0;
        if (previousScans > 0) {
            growth = Math.round(((totalScans - previousScans) / previousScans) * 100);
        } else if (totalScans > 0) {
            growth = 100;
        }

        // Super VIP logic: Counting users who reached a visit threshold today
        // Assuming Super VIP is defined as > 10 visits for now, or check tier logic
        const newSuperVips = todayVisits.docs.filter(doc => {
            const data = doc.data();
            // This is a bit complex as we need user data. In a real scenario, we'd check if the scan triggered a status change.
            // For now, let's check if the guest's total visits in the 'users' collection is exactly the VIP threshold.
            return false; // Placeholder until we have a better way to check this without N queries
        }).length;

        try {
            const dateStr = todayEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            await resend.emails.send({
                from: "Friendly Code <no-reply@friendlycode.fun>",
                to: [ownerEmail],
                reply_to: "support@friendlycode.fun",
                subject: `📊 Итоги дня: ${venueName} — ${dateStr}`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #4E342E; max-width: 600px; margin: auto; padding: 40px; background-color: #FFF8E1; border-radius: 24px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <span style="font-size: 12px; font-weight: 900; letter-spacing: 2px; color: #E68A00; text-transform: uppercase;">Friendly Code</span>
                        </div>
                        
                        <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 10px; color: #4E342E; text-align: center;">Ваш отчет за сегодня</h1>
                        <p style="text-align: center; color: #795548; margin-bottom: 40px;">${dateStr}</p>
                        
                        <div style="display: flex; gap: 15px; margin-bottom: 30px;">
                            <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                                <div style="font-size: 28px; font-weight: 900; color: #4E342E;">${totalScans}</div>
                                <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Всего касаний</div>
                            </div>
                            <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                                <div style="font-size: 28px; font-weight: 900; color: #E68A00;">${activatedDiscounts}</div>
                                <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Активировано</div>
                            </div>
                            <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                                <div style="font-size: 28px; font-weight: 900; color: #4CAF50;">${conversionRate}%</div>
                                <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Конверсия</div>
                            </div>
                        </div>
                        
                        <div style="background: rgba(230, 138, 0, 0.05); padding: 24px; border-radius: 20px; margin-bottom: 40px;">
                            <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5;">
                                📈 Сегодня к вам зашло на <b>${growth}%</b> ${growth >= 0 ? 'больше' : 'меньше'} гостей, чем вчера.
                            </p>
                            <p style="margin: 0; font-size: 15px; line-height: 1.5;">
                                ✨ Новых Super VIP статусов выдано: <b>${newSuperVips}</b>.
                            </p>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="https://friendlycode.fun/admin" style="display: inline-block; background: #4E342E; color: #FFF8E1; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-weight: 700; font-size: 14px;">Открыть панель управления</a>
                        </div>
                        
                        <p style="margin-top: 50px; text-align: center; font-size: 11px; color: #795548; font-weight: 500; border-top: 1px solid rgba(78, 52, 46, 0.1); padding-top: 30px;">
                            Friendly Code — мы помогаем вашим гостям любить вас в ответ.
                        </p>
                    </div>
                `
            });
            logger.info(`Daily report sent to ${ownerEmail} for venue ${venueId}`);
        } catch (err) {
            logger.error(`Failed to send daily report to ${ownerEmail}`, err);
        }
    }
});

/**
 * Scenario C: Marketing Campaign (Bulk Send)
 * Logic: 100 emails per batch, checks isUnsubscribed.
 */
exports.sendBulkCampaign = onCall(async (request) => {
    const { title, text, imageUrl, actionLink } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    // Check if user is admin or superadmin
    const userDoc = await db.collection("users").doc(uid).get();
    const role = userDoc.exists ? userDoc.data().role : "";
    if (role !== "admin" && role !== "superadmin" && role !== "owner") {
        throw new HttpsError("permission-denied", "Unauthorized to send campaigns.");
    }

    try {
        const usersSnapshot = await db.collection("users")
            .where("isUnsubscribed", "!=", true)
            .get();

        const recipients = usersSnapshot.docs
            .map(doc => ({
                email: doc.data().email,
                name: doc.data().name || "Guest"
            }))
            .filter(r => r.email);

        const batchSize = 100;
        let sentCount = 0;

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            // Map each recipient to an individual email for Resend Batch
            const emailRequests = batch.map(r => ({
                from: "Friendly Code <no-reply@friendlycode.fun>",
                to: [r.email],
                subject: title,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #4E342E; max-width: 600px; margin: auto; padding: 0; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #eee;">
                        ${imageUrl ? `<img src="${imageUrl}" style="width: 100%; object-fit: cover; max-height: 300px;" />` : ""}
                        
                        <div style="padding: 40px;">
                            <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 20px; color: #4E342E;">${title}</h1>
                            <p style="font-size: 16px; line-height: 1.6; color: #795548; margin-bottom: 30px;">
                                ${text}
                            </p>
                            
                            ${actionLink ? `
                                <div style="text-align: center; margin-top: 40px;">
                                    <a href="${actionLink}" style="display: inline-block; background: #E68A00; color: #ffffff; padding: 18px 36px; border-radius: 18px; text-decoration: none; font-weight: 900; font-size: 16px;">Узнать больше</a>
                                </div>
                            ` : ""}
                        </div>
                        
                        <div style="background-color: #FFF8E1; padding: 30px; text-align: center;">
                            <p style="font-size: 11px; color: #795548; line-height: 1.5; margin: 0;">
                                Вы получили это письмо, так как пользуетесь программой лояльности Friendly Code.<br>
                                <a href="https://friendlycode.fun/unsubscribe?email=${encodeURIComponent(r.email)}" style="color: #E68A00; text-decoration: underline;">Отписаться от рассылки</a>
                            </p>
                        </div>
                    </div>
                `
            }));

            const { data, error } = await resend.batch.send(emailRequests);
            if (error) {
                logger.error("Batch send error", error);
                // Log partial failure
                await db.collection("email_logs").add({
                    type: "bulk_campaign_error",
                    error: error.message,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                sentCount += batch.length;
            }
        }

        // Save campaign record with results
        await db.collection("campaigns").add({
            title,
            text,
            imageUrl,
            actionLink,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            recipientsCount: recipients.length,
            successCount: sentCount
        });

        return { status: "success", count: sentCount };
    } catch (err) {
        logger.error("Bulk campaign failed", err);
        await db.collection("email_logs").add({
            type: "bulk_campaign_fatal",
            error: err.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new HttpsError("internal", err.message);
    }
});

/**
 * Helper to send Telegram Messages
 */
async function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    // Node.js 18+ has native fetch
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text })
    });
}

/**
 * Scheduled Job placeholder (v2).
 */
/**
 * Scenario D: New B2B Lead Notification
 * Trigger: onDocumentCreated("leads/{leadId}")
 */
exports.onLeadCreated = onDocumentCreated("leads/{leadId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const leadData = snapshot.data();
    const { email, phone, city, source } = leadData;

    try {
        await resend.emails.send({
            from: "Friendly Code <no-reply@friendlycode.fun>",
            to: ["friiendlycode@gmail.com"],
            subject: `🔥 Новый лид (B2B): ${email}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h1>Новая заявка на подключение!</h1>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Телефон:</strong> ${phone || "Не указан"}</p>
                    <p><strong>Город:</strong> ${city || "Не указан"}</p>
                    <p><strong>Источник:</strong> ${source || "Неизвестно"}</p>
                    <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Dubai' })}</p>
                </div>
            `
        });
        logger.info(`Lead notification sent for ${event.params.leadId}`);
    } catch (err) {
        logger.error("Failed to send lead notification", err);
    }
});

/**
 * Scenario E: Discount Expiry Reminder (Hourly)
 * Logic: Checks specific window (expiry - 6h)
 */
exports.checkExpiringDiscounts = onSchedule({
    schedule: "0 * * * *", // Every hour
    timeZone: "Asia/Dubai",
    region: "asia-south1"
}, async (event) => {
    logger.info("Starting discount expiry check...");
    const venuesSnapshot = await db.collection("venues").where("isActive", "==", true).get();

    const now = new Date();

    for (const venueDoc of venuesSnapshot.docs) {
        const venueData = venueDoc.data();
        const venueId = venueDoc.id;
        const tiers = venueData.tiers || []; // [{ maxHours: 12, ... }, { maxHours: 24, ... }]

        if (tiers.length === 0) continue;

        // Find the absolute maximum duration of the discount (usually the last tier)
        // Assuming sorted or we just take max
        const maxDurationHours = Math.max(...tiers.map(t => t.maxHours));

        if (maxDurationHours <= 6) continue; // Logic doesn't apply if total duration is short

        // We want to notify 6 hours BEFORE expiry
        // So User has been here for (maxDuration - 6) hours
        const targetDuration = maxDurationHours - 6;

        // Calculate the timestamp window:
        // Visit time = Now - targetDuration hours
        // Window = [TargetTime - 30min, TargetTime + 30min] to catch them in this hourly run

        const targetTime = new Date(now.getTime() - (targetDuration * 60 * 60 * 1000));
        const windowStart = new Date(targetTime.getTime() - (30 * 60 * 1000));
        const windowEnd = new Date(targetTime.getTime() + (30 * 60 * 1000));

        // Query visits created in this window
        // Note: This relies on 'timestamp' being the creation of the visit/scan
        const visitsSnapshot = await db.collection("visits")
            .where("venueId", "==", venueId)
            .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(windowStart))
            .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(windowEnd))
            .get();

        for (const visitDoc of visitsSnapshot.docs) {
            const visitData = visitDoc.data();

            if (visitData.reminderSent) continue;

            // Get Guest Email
            const guestId = visitData.guestId;
            const guestDoc = await db.collection("users").doc(guestId).get();
            if (!guestDoc.exists || !guestDoc.data().email) continue;

            const guestEmail = guestDoc.data().email;
            const guestName = guestDoc.data().name || "Гость";

            // Get Current Discount (approximated or max)
            // Just say "Your discount" or calculate based on tiers?
            // Let's use generic copy as requested.

            try {
                await resend.emails.send({
                    from: "Friendly Code <no-reply@friendlycode.fun>",
                    to: [guestEmail],
                    subject: `⏳ Ваша скидка в ${venueData.name} скоро сгорит!`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; background-color: #FFF8E1; border-radius: 16px;">
                            <h2 style="color: #4E342E;">Привет, ${guestName}!</h2>
                            <p style="font-size: 16px; color: #5D4037;">
                                Ваша суперскидка в <strong>${venueData.name}</strong> действует еще <strong>6 часов</strong>.
                            </p>
                            <p style="font-size: 16px; color: #5D4037;">
                                Мы приглашаем вас воспользоваться ей, пока она не исчезла!
                            </p>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://friendlycode.fun" style="background-color: #E68A00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Мой QR-код</a>
                            </div>
                        </div>
                    `
                });

                await visitDoc.ref.update({ reminderSent: true });
                logger.info(`Reminder sent to ${guestEmail} for visit ${visitDoc.id}`);

            } catch (err) {
                logger.error(`Failed to send reminder for visit ${visitDoc.id}`, err);
            }
        }
    }
});
