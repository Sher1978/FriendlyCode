const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

// Set global options for all functions
setGlobalOptions({ region: "asia-south1" });

admin.initializeApp();
const db = admin.firestore();

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
exports.calculateRetentionCron = onCall(async (request) => {
    return { status: "success" };
});
