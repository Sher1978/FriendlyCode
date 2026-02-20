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

// SuperAdmin Chat ID
const SUPER_ADMIN_CHAT_ID = "YOUR_SUPER_ADMIN_CHAT_ID"; // Replace with actual ID or logic to fetch

/**
 * Helper: Fetch Global Email Control Settings
 * Defaults all features to TRUE if document doesn't exist
 */
async function getEmailControls() {
    try {
        const doc = await db.collection("system_settings").doc("email_controls").get();
        if (doc.exists) {
            return doc.data();
        }
    } catch (e) {
        logger.error("Error fetching email_controls:", e);
    }
    return {
        enableWelcomeEmails: true,
        enableOwnerNotifications: true,
        enableDiscountReminders: true,
        enableBulkMarketing: true,
        enableLeadNotifications: true,
        enableDailyReports: true
    };
}

/**
 * 1. Generate Telegram Auth Link
 */
exports.generateTelegramLink = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    await db.collection("telegram_codes").doc(code).set({
        uid,
        expiresAt
    });

    return { url: `https://t.me/FriendIycode_bot?start=auth_${code}` };
});

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
        let ownerEmail = venueData.ownerEmail;
        const venueName = venueData.name || "Default Venue";

        // Fallback: Try to get email from the Owner's User Profile
        if (!ownerEmail && venueData.ownerId) {
            const ownerUserDoc = await db.collection("users").doc(venueData.ownerId).get();
            if (ownerUserDoc.exists && ownerUserDoc.data().email) {
                ownerEmail = ownerUserDoc.data().email;
                logger.info(`Found owner email in user profile: ${ownerEmail}`);
            }
        }

        // 2. Get Guest Info
        let guestName = visitGuestName || "A guest";
        let guestStatus = "Level 1";

        if (uid && uid !== 'anonymous') {
            const guestDoc = await db.collection("users").doc(uid).get();
            if (guestDoc.exists) {
                const guestData = guestDoc.data();
                guestName = guestData.displayName || guestData.name || guestName;
                const totalVisits = guestData.totalVisits || 0;
                if (totalVisits > 10) guestStatus = "Super VIP";
                else if (totalVisits > 3) guestStatus = "Regular";
            }
        }

        // ==========================================
        // 3. IN-APP NOTIFICATION (Prioritized)
        // ==========================================
        await db.collection("notifications").add({
            type: "new_visit",
            venueId: venueId,
            title: "New Guest Checked In",
            message: `${guestName} has arrived. Discount: ${discountValue}%`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
            data: {
                visitId: event.params.visitId,
                uid: uid,
                discount: discountValue
            }
        });

        // ==========================================
        // 4. EMAIL NOTIFICATIONS (Welcome & Owner)
        // ==========================================
        const emailControls = await getEmailControls();

        // 4a. Guest Welcome Email (First Visit)
        if (visitGuestEmail && emailControls.enableWelcomeEmails !== false) {
            try {
                const previousVisits = await db.collection("visits")
                    .where("guestEmail", "==", visitGuestEmail)
                    .where("venueId", "==", venueId)
                    .limit(2)
                    .get();

                if (previousVisits.size === 1) { // Current visit is the only one = First Visit
                    const maxTier = venueData.tiers && venueData.tiers.length > 0
                        ? Math.max(...venueData.tiers.map(t => t.discountPercent))
                        : 20;

                    const { data: welcomeData, error: welcomeError } = await resend.emails.send({
                        from: "Friendly Code <no-reply@friendlycode.fun>",
                        to: [visitGuestEmail],
                        subject: `Welcome to ${venueName}! 🎉`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #FFF8E1; border-radius: 24px; color: #4E342E; text-align: center;">
                                <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 20px; color: #E68A00;">Thank you for your visit!</h1>
                                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                    We were thrilled to see you at <strong>${venueName}</strong>!
                                </p>
                                <div style="background: #ffffff; padding: 24px; border-radius: 20px; border: 1px solid rgba(78, 52, 46, 0.1); margin-bottom: 30px;">
                                    <p style="font-size: 16px; margin-bottom: 10px;">We are happy to let you know that tomorrow all day you have a discount of:</p>
                                    <span style="font-size: 48px; font-weight: 900; color: #2E7D32;">${maxTier}%</span>
                                </div>
                                <p style="font-size: 16px; font-weight: bold; color: #4E342E;">We look forward to seeing you again! ☕✨</p>
                            </div>
                        `
                    });

                    if (welcomeError) {
                        logger.error("Resend Welcome Email error:", welcomeError);
                    } else {
                        logger.info(`Welcome email sent to ${visitGuestEmail} for venue ${venueId}`);
                    }
                }
            } catch (err) {
                logger.error("Error sending welcome email:", err);
            }
        }

        // 4b. Owner Notification Email
        if (ownerEmail && emailControls.enableOwnerNotifications !== false) {
            const { data, error } = await resend.emails.send({
                from: "Friendly Code <no-reply@friendlycode.fun>",
                to: [ownerEmail],
                reply_to: "support@friendlycode.fun",
                subject: `🚀 New scan at ${venueName}!`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #4E342E; max-width: 600px; margin: auto; padding: 40px; background-color: #FFF8E1; border-radius: 24px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <span style="font-size: 12px; font-weight: 900; letter-spacing: 2px; color: #E68A00; text-transform: uppercase;">Friendly Code</span>
                        </div>
                        <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 20px; color: #4E342E; text-align: center;">You have a new guest!</h1>
                        <p style="font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                            A new scan was just recorded at <strong>${venueName}</strong>.
                        </p>
                        <div style="background: #ffffff; padding: 24px; border-radius: 20px; border: 1px solid rgba(78, 52, 46, 0.1); margin-bottom: 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-bottom: 15px;">
                                        <span style="font-size: 12px; font-weight: 700; color: #795548; text-transform: uppercase;">Guest Name</span><br/>
                                        <span style="font-size: 18px; font-weight: 900; color: #4E342E;">${guestName}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-bottom: 15px;">
                                        <span style="font-size: 12px; font-weight: 700; color: #795548; text-transform: uppercase;">Status</span><br/>
                                        <span style="font-size: 18px; font-weight: 900; color: #4CAF50;">${guestStatus}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <span style="font-size: 12px; font-weight: 700; color: #795548; text-transform: uppercase;">Applied Discount</span><br/>
                                        <span style="font-size: 24px; font-weight: 900; color: #E68A00;">${discountValue}%</span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        <div style="text-align: center;">
                            <a href="https://friendlycode.fun/admin" style="display: inline-block; background: #E68A00; color: #FFF8E1; padding: 18px 36px; border-radius: 18px; text-decoration: none; font-weight: 900; font-size: 16px; box-shadow: 0 8px 20px rgba(230, 138, 0, 0.2);">View Analytics</a>
                        </div>
                        <p style="margin-top: 50px; text-align: center; font-size: 12px; color: #795548; font-weight: 500;">
                            Friendly Code — we help your guests love you back.
                        </p>
                    </div>
                `
            });

            if (error) {
                logger.error("Resend Owner Email error:", error);
            } else {
                logger.info(`Owner email sent to ${ownerEmail} for visit ${event.params.visitId}`);
            }
        } else {
            logger.warn(`No owner email found for venue ${venueId}. Skipping owner email notification.`);
        }

        // ==========================================
        // 5. FCM PUSH NOTIFICATIONS
        // ==========================================
        const staffSnapshot = await db.collection("users").where("venueId", "==", venueId).get();
        const tokens = [];
        staffSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmToken) tokens.push(userData.fcmToken);
        });

        if (venueData.ownerId) {
            const ownerDoc = await db.collection("users").doc(venueData.ownerId).get();
            if (ownerDoc.exists && ownerDoc.data().fcmToken && !tokens.includes(ownerDoc.data().fcmToken)) {
                tokens.push(ownerDoc.data().fcmToken);
            }
        }

        if (tokens.length > 0) {
            try {
                await admin.messaging().sendEachForMulticast({
                    tokens: tokens,
                    notification: {
                        title: `🚀 New Guest in ${venueName}!`,
                        body: `${guestName} just checked in. Discount: ${discountValue}%`,
                    },
                    data: { visitId: event.params.visitId, venueId: venueId, type: "new_visit" }
                });
            } catch (fcmErr) {
                logger.error("FCM multicast error", fcmErr);
            }
        }

        // ==========================================
        // 6. TELEGRAM NOTIFICATIONS
        // ==========================================
        const telegramUsers = [];

        // 6a. Check Staff profiles for Telegram IDs
        staffSnapshot.forEach(doc => {
            const d = doc.data();
            if (d.telegramChatId) telegramUsers.push(d.telegramChatId);
        });

        // 6b. Check Owner profile for Telegram ID
        if (venueData.ownerId) {
            const ownerDoc = await db.collection("users").doc(venueData.ownerId).get();
            if (ownerDoc.exists && ownerDoc.data().telegramChatId && !telegramUsers.includes(ownerDoc.data().telegramChatId)) {
                telegramUsers.push(ownerDoc.data().telegramChatId);
            }
        }

        // 6c. Check Venue configuration for Group Telegram ID
        if (venueData.telegramGroupId && !telegramUsers.includes(venueData.telegramGroupId)) {
            telegramUsers.push(venueData.telegramGroupId);
        }

        if (telegramUsers.length > 0) {
            const message = `🔔 <b>New Visit!</b>\n\n👤 <b>Guest:</b> ${guestName}\n🎁 <b>Discount:</b> ${discountValue}%\n🕓 <b>Time:</b> ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai' })}`;
            for (const chatId of telegramUsers) {
                await sendTelegramMessage(chatId, message);
            }
        }
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

        // COMMAND: /start <uid> OR /start auth_{code}
        // Example: /start 7u4h5j3k2... OR /start auth_123456
        if (text.startsWith("/start")) {
            const parts = text.split(" ");
            if (parts.length > 1) {
                const param = parts[1].trim();

                if (param.startsWith("auth_")) {
                    // LINKING FLOW
                    const code = param.split("_")[1];
                    const codeDoc = await db.collection("telegram_codes").doc(code).get();

                    if (codeDoc.exists) {
                        const { uid, expiresAt } = codeDoc.data();
                        if (Date.now() > expiresAt) {
                            await sendTelegramMessage(chatId, "❌ Code expired. Please generate a new one.");
                        } else {
                            // Link User
                            await db.collection("users").doc(uid).set({
                                telegramChatId: chatId,
                                telegramUsername: update.message.chat.username || "Unknown",
                                messenger: "telegram",
                                lastSeen: new Date().toISOString()
                            }, { merge: true });

                            // Cleanup
                            await db.collection("telegram_codes").doc(code).delete();
                            await sendTelegramMessage(chatId, "✅ Account Linked! You will now receive notifications here.");
                            logger.info(`Linked telegram chat ${chatId} to user ${uid} via auth code.`);
                        }
                    } else {
                        await sendTelegramMessage(chatId, "❌ Invalid code.");
                    }
                } else {
                    // LEGACY UID CONNECTION (Keep for backward compatibility if needed)
                    const uid = param;
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
                }
            } else {
                await sendTelegramMessage(chatId, "👋 Hello! Please connect via the FriendlyCode app.");
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

    const emailControls = await getEmailControls();
    if (emailControls.enableDailyReports === false) {
        logger.info("Daily reports disabled by global settings.");
        return;
    }

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

    const emailControls = await getEmailControls();
    if (emailControls.enableBulkMarketing === false) {
        throw new HttpsError("permission-denied", "Извините, сейчас массовые рассылки временно отключены.");
    }

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
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
    });
}

/**
 * SuperAdmin Notification: New User Registration
 */
exports.onUserCreated = onDocumentCreated("users/{uid}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const data = snapshot.data();

    // Notify Super Admin
    if (SUPER_ADMIN_CHAT_ID === "YOUR_SUPER_ADMIN_CHAT_ID") return; // Skip if not configured

    const message = `🚀 <b>Новый пользователь!</b>\n\n👤 ${data.name || "No Name"}\n📧 ${data.email || "No Email"}`;
    await sendTelegramMessage(SUPER_ADMIN_CHAT_ID, message);
});

/**
 * SuperAdmin Notification: Role Promotion (New Owner)
 */
exports.onUserUpdated = onDocumentUpdated("users/{uid}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Check if role changed to 'owner'
    if (before.role !== 'owner' && after.role === 'owner') {
        if (SUPER_ADMIN_CHAT_ID === "YOUR_SUPER_ADMIN_CHAT_ID") return;

        const message = `👑 <b>Новый Владелец!</b>\n\nПользователь <b>${after.name}</b> теперь управляет заведением.\n📧 ${after.email}`;
        await sendTelegramMessage(SUPER_ADMIN_CHAT_ID, message);
    }
});

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

    const emailControls = await getEmailControls();
    if (emailControls.enableLeadNotifications === false) {
        logger.info("Lead notifications disabled by global settings.");
        return;
    }

    const leadData = snapshot.data();
    const { email, phone, city, source } = leadData;

    try {
        const { data, error } = await resend.emails.send({
            from: "Friendly Code <no-reply@friendlycode.fun>",
            to: ["friiendlycode@gmail.com"],
            reply_to: email,
            subject: `🔥 New Lead (B2B): ${email}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h1>New Connection Request!</h1>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || "Not specified"}</p>
                    <p><strong>City:</strong> ${city || "Not specified"}</p>
                    <p><strong>Source:</strong> ${source || "Unknown"}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' })}</p>
                </div>
            `
        });

        if (error) {
            logger.error(`Failed to send lead notification for ${event.params.leadId}:`, error);
        } else {
            logger.info(`Lead notification sent for ${event.params.leadId}, Resend ID: ${data.id}`);
        }
    } catch (err) {
        logger.error("Fatal error during lead notification:", err);
    }
});

/**
 * Scenario E: Discount Expiry Reminder (Daily at 19:00)
 * Logic: Checks if the calendar day VIP window is ending tonight at midnight.
 */
exports.discountDecayReminder = onSchedule({
    schedule: "0 19 * * *",
    timeZone: "Europe/Moscow"
}, async (event) => {
    logger.info("Running daily discount decay reminder...");

    const emailControls = await getEmailControls();
    if (emailControls.enableDiscountReminders === false) {
        logger.info("Discount reminders disabled by global settings.");
        return;
    }

    // We want to find users whose last visit at a venue was exactly *yesterday*.
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const yesterdayTimestamp = admin.firestore.Timestamp.fromDate(startOfYesterday);
    const todayTimestamp = admin.firestore.Timestamp.fromDate(startOfToday);

    // Query all visits from yesterday
    const yesterdayVisitsSnapshot = await db.collection("visits")
        .where("timestamp", ">=", yesterdayTimestamp)
        .where("timestamp", "<", todayTimestamp)
        .get();

    // Group by guestEmail and venueId
    const candidates = {}; // "email_venueId" -> { email, venueId, guestName }

    yesterdayVisitsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.guestEmail) {
            const key = `${data.guestEmail}_${data.venueId}`;
            candidates[key] = {
                email: data.guestEmail,
                venueId: data.venueId,
                guestName: data.guestName || "Гость"
            };
        }
    });

    // For each candidate, check if they visited TODAY
    for (const key of Object.keys(candidates)) {
        const candidate = candidates[key];

        const todayVisits = await db.collection("visits")
            .where("guestEmail", "==", candidate.email)
            .where("venueId", "==", candidate.venueId)
            .where("timestamp", ">=", todayTimestamp)
            .limit(1)
            .get();

        if (todayVisits.empty) {
            // No visits today! Their VIP will drop at midnight.
            const venueDoc = await db.collection("venues").doc(candidate.venueId).get();
            if (venueDoc.exists) {
                const venueData = venueDoc.data();
                const venueName = venueData.name || "your favorite venue";
                const tiers = venueData.tiers || [];
                const maxTier = tiers.length > 0 ? Math.max(...tiers.map(t => t.discountPercent)) : 20;

                // Assuming tier1 is the next one down. e.g. 15%
                const sortedTiers = tiers.map(t => t.discountPercent).sort((a, b) => b - a);
                const nextTier = sortedTiers.length > 1 ? sortedTiers[1] : 15;

                // Send Reminder Email
                const html = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #FFF8E1; border-radius: 24px; color: #4E342E; text-align: center;">
                        <span style="font-size: 40px; display: block; margin-bottom: 10px;">⏳</span>
                        <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 20px; color: #D32F2F;">Your maximum discount is expiring soon!</h1>
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                            Dear <strong>${candidate.guestName}</strong>,<br/>
                            Your <strong>${maxTier}%</strong> discount at <strong>${venueName}</strong> is only valid until the end of today!
                        </p>
                        <div style="background: #ffffff; padding: 30px; border-radius: 20px; border: 1px solid rgba(78, 52, 46, 0.1); margin-bottom: 30px;">
                            <p style="font-size: 16px; margin-bottom: 15px; color: #795548; font-weight: bold;">Exactly at midnight, it will drop to:</p>
                            <span style="font-size: 56px; font-weight: 900; color: #E68A00; line-height: 1;">${nextTier}%</span>
                        </div>
                        <p style="font-size: 16px; font-weight: 600; color: #4E342E; background-color: rgba(230, 138, 0, 0.1); padding: 20px; border-radius: 12px;">
                            🏃‍♂️ Make sure to visit us today to reset your timer and keep your maximum discount! 😉✨
                        </p>
                    </div>
                `;

                const { error } = await resend.emails.send({
                    from: "Friendly Code <no-reply@friendlycode.fun>",
                    to: [candidate.email],
                    subject: `⚠️ Your ${maxTier}% discount at ${venueName} expires today!`,
                    html: html
                });

                if (error) {
                    logger.error("Resend reminder error:", error);
                } else {
                    logger.info(`Sent discount drop reminder to ${candidate.email} for venue ${candidate.venueId}`);
                }
            }
        }
    }
});
