const { onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

// Set global options for all functions
setGlobalOptions({ region: "asia-south1" });

admin.initializeApp();
const db = admin.firestore();

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY || "re_fallback_key_for_firebase_analysis");

// SuperAdmin Chat ID
const SUPER_ADMIN_CHAT_ID = process.env.SUPER_ADMIN_CHAT_ID;

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
 * Helper: Calculate user discount tier based on deposit balance
 */
async function calculateUserDiscountTier(userId, venueId) {
    // 1. Fetch user data
    const userDoc = await db.collection("users").doc(userId).get();
    let depositBalance = 0;
    let hasLockedDiscount = false;
    if (userDoc.exists) {
        const userData = userDoc.data();
        depositBalance = Number(userData.deposit_balance ?? 0);
        hasLockedDiscount = userData.hasLockedDiscount === true;
    }

    let discountPercentage = 5; // Default fallback base discount
    let depositThreshold = 1000000;
    let percDeposit = 25;

    // Fetch venue loyalty config
    try {
        const venueDoc = await db.collection("venues").doc(venueId).get();
        if (venueDoc.exists) {
            const venueData = venueDoc.data();
            const config = venueData.loyaltyConfig || {};
            discountPercentage = Number(config.percBase ?? 5);
            percDeposit = Number(config.percDeposit ?? 25);
            depositThreshold = Number(config.depositThreshold ?? 1000000);
        }
    } catch (e) {
        logger.error("Error fetching venue base discount:", e);
    }

    if (hasLockedDiscount || depositBalance >= depositThreshold) {
        return { 
            tier_level: 1, 
            discount_percentage: percDeposit, 
            min_balance_threshold: depositThreshold, 
            tierLevel: 1, 
            discountPercentage: percDeposit, 
            minBalanceThreshold: depositThreshold,
            isLocked: true
        };
    }

    return { 
        tier_level: 4, 
        discount_percentage: discountPercentage, 
        min_balance_threshold: 0, 
        tierLevel: 4, 
        discountPercentage: discountPercentage, 
        minBalanceThreshold: 0,
        isLocked: false
    };
}

/**
 * Cloud Function: Trigger customer check-in and alert Telegram group
 */
exports.triggerCustomerCheckin = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    
    const { venueId } = request.data;
    if (!venueId) {
        throw new HttpsError("invalid-argument", "Missing venueId.");
    }

    try {
        // Fetch user data
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User not found.");
        }
        const userData = userDoc.data();
        const depositBalance = Number(userData.deposit_balance ?? 0);

        // Fetch venue data
        const venueDoc = await db.collection("venues").doc(venueId).get();
        if (!venueDoc.exists) {
            throw new HttpsError("not-found", "Venue not found.");
        }
        const venueData = venueDoc.data();
        const telegramGroupId = venueData.telegram_group_id || venueData.telegramGroupId;
        const currency = venueData.currency || "VND";
        const venueName = venueData.name || "Venue";

        // Calculate dynamic tier
        const tierInfo = await calculateUserDiscountTier(uid, venueId);
        
        // Update user's current discount tier
        await db.collection("users").doc(uid).update({
            current_discount_tier: tierInfo.tierLevel
        });

        if (!telegramGroupId) {
            logger.warn(`No Telegram group linked for venue ${venueId}`);
            return { success: false, reason: "No Telegram group linked." };
        }

        // Generate a unique session ID
        const sessionRef = db.collection("pos_sessions").doc();
        const sessionId = sessionRef.id;

        // Save session state
        await sessionRef.set({
            sessionId,
            userId: uid,
            userName: userData.displayName || userData.name || "Guest",
            userPhone: userData.phone || userData.contactInfo || "No Phone",
            venueId,
            venueName,
            currency,
            depositBalance,
            discountPercentage: tierInfo.discountPercentage,
            tierLevel: tierInfo.tierLevel,
            status: "pending",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // If deposit balance is 0, we suggest standard loyalty checkout
        if (depositBalance <= 0) {
            const message = `🟡 <b>[CHECK-IN (Zero Balance)]</b>\n\n👤 <b>Customer:</b> ${userData.displayName || userData.name || "Guest"} (${userData.phone || userData.contactInfo || "No Phone"})\n💳 <b>Deposit Balance:</b> 0.00 ${currency}\n🔥 <b>Active Discount:</b> ${tierInfo.discountPercentage}%\n📍 Standard loyalty checkout suggested (no deposit balance).`;
            await sendTelegramMessage(telegramGroupId, message);
            return { success: true, sessionId, zeroBalance: true };
        }

        // Send check-in alert to group with transition to Bot DM
        const message = `🟢 <b>[VIP CHECK-IN]</b>\n\n👤 <b>Customer:</b> ${userData.displayName || userData.name || "Guest"} (${userData.phone || userData.contactInfo || "No Phone"})\n💳 <b>Deposit Balance:</b> ${depositBalance.toFixed(2)} ${currency}\n🔥 <b>Active Discount:</b> ${tierInfo.discountPercentage}%\n📍 <i>Нажмите кнопку ниже для ввода суммы чека в личных сообщениях бота:</i>`;
        
        const keyboard = {
            inline_keyboard: [
                [
                    {
                        text: "💵 Ввести сумму чека в боте / Enter Check Amount",
                        url: `https://t.me/FriendIycode_bot?start=debit_${sessionId}`
                    }
                ]
            ]
        };

        await sendTelegramMessageWithKeyboard(telegramGroupId, message, keyboard);
        return { success: true, sessionId };
    } catch (e) {
        logger.error("Error in triggerCustomerCheckin:", e);
        throw new HttpsError("internal", e.message || String(e));
    }
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

        // 4a. Guest Loyalty Perk Reminder Email
        if (visitGuestEmail && emailControls.enableWelcomeEmails !== false) {
            try {
                // Determine Tiers
                let sortedTiers = [];
                if (venueData.tiers && Array.isArray(venueData.tiers)) {
                    sortedTiers = [...venueData.tiers].sort((a, b) => b.discountPercent - a.discountPercent);
                }

                // Default Tiers if none or empty (Safety fallback)
                if (sortedTiers.length === 0) {
                    sortedTiers = [
                        { discountPercent: 20, maxHours: 24 },
                        { discountPercent: 15, maxHours: 72 },
                        { discountPercent: 10, maxHours: 168 }
                    ];
                }

                // Helper to format time (e.g. 24h -> tomorrow)
                const getTimeLabel = (hours) => {
                    const days = Math.round(hours / 24);
                    if (hours === 24 || (hours > 0 && days === 1)) return "tomorrow";
                    return `${days} ${days === 1 ? 'day' : 'days'}`;
                };

                const topTier = sortedTiers[0];
                const secondTier = sortedTiers[1] || { discountPercent: 10, maxHours: 168 }; // Specific fallbacks
                const thirdTier = sortedTiers[2] || { discountPercent: 7, maxHours: 336 };
                const minimalTier = venueData.baseDiscount || 5;

                const { data: loyaltyData, error: loyaltyError } = await resend.emails.send({
                    from: "Friendly Code <no-reply@friendlycode.fun>",
                    to: [visitGuestEmail],
                    subject: `Loyalty Perk Reminder: ${venueName} ☀️`,
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #FFF8E1; border-radius: 24px; color: #4E342E;">
                            <p style="font-size: 18px; font-weight: 500; margin-bottom: 24px;">
                                Hey, great to have you back at <strong>${venueName}</strong>! ☀️
                            </p>
                            
                            <p style="font-size: 16px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; color: #E68A00;">
                                Here’s your loyalty perk reminder:
                            </p>
                            
                            <div style="background: #ffffff; padding: 30px; border-radius: 24px; border: 1px solid rgba(78, 52, 46, 0.05); shadow: 0 10px 30px rgba(0,0,0,0.02);">
                                <div style="margin-bottom: 20px; display: flex; align-items: center; border-bottom: 1px solid #f5f5f5; padding-bottom: 15px;">
                                    <span style="font-size: 24px; margin-right: 15px;">🔥</span>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; font-size: 16px; font-weight: 800; color: #2E7D32;">Visit ${getTimeLabel(topTier.maxHours)}</p>
                                        <p style="margin: 0; font-size: 20px; font-weight: 900; color: #4E342E;">${topTier.discountPercent}% OFF your total bill</p>
                                    </div>
                                </div>

                                <div style="margin-bottom: 20px; display: flex; align-items: center; border-bottom: 1px solid #f5f5f5; padding-bottom: 15px;">
                                    <span style="font-size: 24px; margin-right: 15px;">✨</span>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; font-size: 15px; font-weight: 700; opacity: 0.7;">Visit within ${getTimeLabel(secondTier.maxHours)}</p>
                                        <p style="margin: 0; font-size: 18px; font-weight: 800; color: #4E342E;">${secondTier.discountPercent}% OFF your total bill</p>
                                    </div>
                                </div>

                                <div style="margin-bottom: 20px; display: flex; align-items: center; border-bottom: 1px solid #f5f5f5; padding-bottom: 15px;">
                                    <span style="font-size: 24px; margin-right: 15px;">🌿</span>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; font-size: 15px; font-weight: 700; opacity: 0.7;">Visit in next ${getTimeLabel(thirdTier.maxHours)}</p>
                                        <p style="margin: 0; font-size: 18px; font-weight: 800; color: #4E342E;">${thirdTier.discountPercent}% OFF your total bill</p>
                                    </div>
                                </div>

                                <div style="display: flex; align-items: center;">
                                    <span style="font-size: 24px; margin-right: 15px;">☕</span>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; font-size: 15px; font-weight: 700; opacity: 0.7;">Visit anytime after</p>
                                        <p style="margin: 0; font-size: 18px; font-weight: 800; color: #4E342E;">${minimalTier}% OFF your total bill</p>
                                    </div>
                                </div>
                            </div>

                            <p style="margin-top: 32px; font-size: 16px; font-weight: 600; text-align: center; color: #795548;">
                                Until next time — stay safe, stay happy and have a good life! 😄☕💛
                            </p>
                            
                            <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #4E342E66; font-weight: 700; border-top: 1px solid rgba(78, 52, 46, 0.05); padding-top: 20px;">
                                POWERED BY FRIENDLY CODE
                            </div>
                        </div>
                    `
                });

                if (loyaltyError) {
                    logger.error("Resend Loyalty Email error:", loyaltyError);
                } else {
                    logger.info(`Loyalty perk email sent to ${visitGuestEmail} for venue ${venueId}`);
                }
            } catch (err) {
                logger.error("Error sending loyalty email:", err);
            }
        }

        // 4c. Guest Loyalty Perk Reminder via Telegram Bot
        try {
            let guestChatId = null;
            if (uid && uid !== 'anonymous') {
                const guestDoc = await db.collection("users").doc(uid).get();
                if (guestDoc.exists) {
                    guestChatId = guestDoc.data().telegramChatId || guestDoc.data().telegram_chat_id;
                }
            } else if (visitGuestEmail) {
                const guestSnap = await db.collection("users").where("email", "==", visitGuestEmail.toLowerCase()).limit(1).get();
                if (!guestSnap.empty) {
                    guestChatId = guestSnap.docs[0].data().telegramChatId || guestSnap.docs[0].data().telegram_chat_id;
                }
            }

            if (guestChatId) {
                const sortedTiers = (venueData.tiers && Array.isArray(venueData.tiers) && venueData.tiers.length > 0)
                    ? [...venueData.tiers].sort((a, b) => b.discountPercent - a.discountPercent)
                    : [{ discountPercent: 20, maxHours: 24 }, { discountPercent: 15, maxHours: 72 }, { discountPercent: 10, maxHours: 168 }];
                
                const topTier = sortedTiers[0];
                const tgGuestMsg = `☀️ <b>Спасибо за визит в ${venueName}!</b>\n\n` +
                    `🔥 <b>Ваша скидка при повторном визите завтра:</b> ${topTier.discountPercent}%\n` +
                    `✨ В течение 3 дней: ${sortedTiers[1]?.discountPercent || 15}%\n` +
                    `🌿 В течение недели: ${sortedTiers[2]?.discountPercent || 10}%\n\n` +
                    `Ждем вас снова! 😄☕`;
                await sendTelegramMessage(guestChatId, tgGuestMsg).catch(e => logger.warn("Guest Telegram welcome error:", e));
            }
        } catch (e) {
            logger.warn("Error sending guest Telegram visit notification:", e);
        }

        // 4b. Owner Notification Email
        if (ownerEmail && emailControls.enableOwnerNotifications !== false && venueData.emailReportsActive === true) {
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

/**
 * Instant Report on Deposit Transaction (CREDIT & DEBIT)
 * Trigger: onDocumentCreated in deposit_transactions/{txId}
 */
exports.onDepositTransactionCreated = onDocumentCreated("deposit_transactions/{txId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const txData = snapshot.data();
    const isCredit = txData.transactionType === 'CREDIT' || txData.type === 'CREDIT';
    const isDebit = txData.transactionType === 'DEBIT' || txData.type === 'DEBIT';

    const { venueId, userId, userName, guestName, guestEmail, amount, totalCredit, bonusPercent, bonusAmount, finalAmount, newBalance, balanceAfter, staffTelegramUsername, staffName } = txData;

    try {
        let venueName = "REVOO Venue";
        let currency = "VND";
        let ownerEmail = null;
        let telegramGroupId = null;

        if (venueId) {
            const venueDoc = await db.collection("venues").doc(venueId).get();
            if (venueDoc.exists) {
                const venueData = venueDoc.data();
                venueName = venueData.name || "REVOO Venue";
                currency = venueData.currency || "VND";
                ownerEmail = venueData.ownerEmail;
                telegramGroupId = venueData.telegram_group_id || venueData.telegramGroupId;
            }
        }
        // ── 0. ATOMIC USER DOCUMENT BALANCE SYNC ──────────────────────────────
        const syncedBalance = Number(newBalance ?? balanceAfter ?? 0);
        if (userId || guestEmail) {
            try {
                let userDocRef = userId ? db.collection("users").doc(userId) : null;
                if (!userDocRef && guestEmail) {
                    const uSnap = await db.collection("users").where("email", "==", guestEmail.toLowerCase()).limit(1).get();
                    if (!uSnap.empty) userDocRef = uSnap.docs[0].ref;
                }
                if (userDocRef) {
                    const updatePayload = {
                        deposit_balance: syncedBalance,
                        lastSeen: new Date().toISOString()
                    };
                    if (venueId) {
                        updatePayload[`deposit_balances.${venueId}`] = syncedBalance;
                    }
                    await userDocRef.set(updatePayload, { merge: true });
                    logger.info(`Synced user deposit balance to ${syncedBalance} for venue ${venueId}`);
                }
            } catch (syncErr) {
                logger.error("Error syncing user deposit balance in Firestore:", syncErr);
            }
        }

        // ── 1. HANDLE DEPOSIT CREDIT (TOP-UP) ──────────────────────────────────
        if (isCredit) {
            let targetEmail = guestEmail;
            let targetName = guestName || userName || "Уважаемый гость";
            const creditAmount = Number(amount || totalCredit || 0);
            const currentNewBalance = Number(newBalance || balanceAfter || 0);
            const bPercent = Number(bonusPercent || 0);
            const bAmount = Number(bonusAmount || 0);

            // If guest email is missing, lookup user profile by UID
            if (!targetEmail && userId) {
                const userDoc = await db.collection("users").doc(userId).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    targetEmail = uData.email || uData.guestEmail;
                    if (!targetName || targetName === "Уважаемый гость") {
                        targetName = uData.displayName || uData.name || targetName;
                    }
                }
            }

            // A. Send Telegram Alert to Group
            if (telegramGroupId) {
                const tgMsg = `💳 <b>ПОПОЛНЕНИЕ ДЕПОЗИТА</b>\n\n` +
                    `👤 <b>Клиент:</b> ${targetName}\n` +
                    `💰 <b>Сумма внесения:</b> +${creditAmount.toLocaleString()} ${currency}\n` +
                    (bPercent > 0 ? `🎁 <b>Бонус:</b> +${bPercent}% (+${bAmount.toLocaleString()} ${currency})\n` : '') +
                    `✅ <b>Новый баланс депозита:</b> ${currentNewBalance.toLocaleString()} ${currency}\n` +
                    `👨💼 <b>Сотрудник:</b> ${staffName || staffTelegramUsername || 'Персонал'}`;
                await sendTelegramMessage(telegramGroupId, tgMsg).catch(e => logger.error("Telegram credit report error:", e));
            }

            // B. Send Custom Branded Email to Guest with Web Page & QR Code
            if (targetEmail) {
                const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://bot-lab-21910.web.app/admin/#/deposit?uid=${userId || targetEmail}&action=deduct`)}`;
                const guestWebPageUrl = `https://bot-lab-21910.web.app/`;

                const { data: emailRes, error: emailErr } = await resend.emails.send({
                    from: "REVOO Deposit <no-reply@friendlycode.fun>",
                    to: [targetEmail],
                    subject: `💰 Ваш депозит в ${venueName} пополнен! Ваш баланс и QR-код`,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF; -webkit-font-smoothing: antialiased;">
                            <div style="max-width: 540px; margin: 0 auto; padding: 32px 16px; background-color: #0A0A0C;">
                                
                                {/* Header Badge */}
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <div style="display: inline-block; background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.4); padding: 6px 18px; border-radius: 20px; color: #D4AF37; font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">
                                        ⚡ REVOO WALLET &bull; DEPOSIT CONFIRMATION
                                    </div>
                                </div>

                                {/* Main Container */}
                                <div style="background-color: #1C1C1E; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 28px; padding: 32px 24px; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);">
                                    
                                    <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.2;">
                                        Поздравляем, ${targetName}!
                                    </h1>
                                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 0 0 28px 0; line-height: 1.5;">
                                        Ваш депозитный баланс в заведении <strong style="color: #FFFFFF;">${venueName}</strong> успешно пополнен.
                                    </p>

                                    {/* Balance Display Box */}
                                    <div style="background: linear-gradient(135deg, rgba(0, 255, 65, 0.15) 0%, rgba(0, 204, 51, 0.05) 100%); border: 1px solid rgba(0, 255, 65, 0.3); border-radius: 24px; padding: 24px; margin-bottom: 28px;">
                                        <span style="font-size: 11px; font-weight: 900; color: #00FF41; text-transform: uppercase; letter-spacing: 1px;">Текущий баланс депозита</span>
                                        <div style="font-size: 38px; font-weight: 900; color: #FFFFFF; margin: 8px 0 4px 0; tracking-tight: -1px;">
                                            ${currentNewBalance.toLocaleString()} <span style="font-size: 16px; color: rgba(255, 255, 255, 0.5); font-weight: 600;">${currency}</span>
                                        </div>
                                        <div style="font-size: 12px; color: #00FF41; font-weight: 700;">
                                            🎉 МАКСИМАЛЬНЫЙ VIP-УРОВЕНЬ АКТИВЕН
                                        </div>
                                    </div>

                                    {/* Transaction Details */}
                                    <div style="background-color: rgba(0, 0, 0, 0.4); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 18px 20px; margin-bottom: 28px; text-align: left;">
                                        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px; color: rgba(255, 255, 255, 0.8);">
                                            <tr>
                                                <td style="color: rgba(255, 255, 255, 0.5);">Сумма взноса:</td>
                                                <td style="text-align: right; font-weight: 700; color: #FFFFFF;">+${creditAmount.toLocaleString()} ${currency}</td>
                                            </tr>
                                            ${bPercent > 0 ? `
                                            <tr>
                                                <td style="color: rgba(255, 255, 255, 0.5);">Бонус заведения (+${bPercent}%):</td>
                                                <td style="text-align: right; font-weight: 700; color: #00FF41;">+${bAmount.toLocaleString()} ${currency}</td>
                                            </tr>` : ''}
                                            <tr>
                                                <td style="color: rgba(255, 255, 255, 0.5); border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;">Дата пополнения:</td>
                                                <td style="text-align: right; font-weight: 700; color: #FFFFFF; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;">${new Date().toLocaleDateString('ru-RU')}</td>
                                            </tr>
                                        </table>
                                    </div>

                                    {/* Embedded Personal QR Code */}
                                    <div style="background-color: #FFFFFF; padding: 18px; border-radius: 24px; display: inline-block; margin-bottom: 16px; box-shadow: 0 10px 30px rgba(255, 255, 255, 0.1);">
                                        <img src="${qrCodeUrl}" width="190" height="190" alt="Ваш персональный QR-код депозита" style="display: block; margin: 0 auto; border: 0;" />
                                    </div>

                                    <p style="font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.6); margin: 0 0 28px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                                        Покажите этот QR-код официанту для списания чека
                                    </p>

                                    {/* Action CTA Link */}
                                    <div>
                                        <a href="${guestWebPageUrl}" target="_blank" style="display: block; background: #00FF41; color: #000000; padding: 16px 24px; border-radius: 18px; text-decoration: none; font-weight: 900; font-size: 15px; box-shadow: 0 10px 30px rgba(0, 255, 65, 0.3);">
                                            📱 Открыть мой баланс и QR-код
                                        </a>
                                    </div>

                                </div>

                                {/* Footer */}
                                <div style="text-align: center; margin-top: 32px; font-size: 11px; color: rgba(255, 255, 255, 0.3); font-weight: 600;">
                                    &copy; ${new Date().getFullYear()} REVOO &bull; FRIENDLY CODE SYSTEM
                                </div>

                            </div>
                        </body>
                        </html>
                    `
                });

                if (emailErr) {
                    logger.error("Error sending deposit credit email:", emailErr);
                } else {
                    logger.info(`Deposit credit email sent successfully to ${targetEmail} (MessageId: ${emailRes?.id})`);
                }
            } else {
                logger.warn(`No target email found for deposit credit tx ${event.params.txId}`);
            }

            // C. Send Telegram DM to Guest
            try {
                let guestChatId = null;
                if (userId) {
                    const uDoc = await db.collection("users").doc(userId).get();
                    if (uDoc.exists) {
                        guestChatId = uDoc.data().telegramChatId || uDoc.data().telegram_chat_id;
                    }
                } else if (targetEmail) {
                    const uSnap = await db.collection("users").where("email", "==", targetEmail.toLowerCase()).limit(1).get();
                    if (!uSnap.empty) {
                        guestChatId = uSnap.docs[0].data().telegramChatId || uSnap.docs[0].data().telegram_chat_id;
                    }
                }

                if (guestChatId) {
                    const tgCreditMsg = `💰 <b>ВАШ ДЕПОЗИТ В ${venueName.toUpperCase()} ПОПОЛНЕН!</b>\n\n` +
                        `👤 <b>Гость:</b> ${targetName}\n` +
                        `➕ <b>Пополнение:</b> +${creditAmount.toLocaleString()} ${currency}\n` +
                        (bPercent > 0 ? `🎁 <b>Бонус заведения (+${bPercent}%):</b> +${bAmount.toLocaleString()} ${currency}\n` : '') +
                        `💳 <b>Новый баланс депозита:</b> ${currentNewBalance.toLocaleString()} ${currency}\n` +
                        `🎉 <b>МАКСИМАЛЬНЫЙ VIP-УРОВЕНЬ АКТИВЕН</b>\n\n` +
                        `📱 Ваш QR-код для списания чека: https://bot-lab-21910.web.app/`;
                    await sendTelegramMessage(guestChatId, tgCreditMsg).catch(e => logger.warn("Guest Telegram credit report error:", e));
                }
            } catch (tgErr) {
                logger.warn("Error sending guest Telegram credit report:", tgErr);
            }
        }

        // ── 2. HANDLE DEPOSIT DEBIT (DEDUCTION) ────────────────────────────────
        if (isDebit) {
            const deductedAmount = Number(finalAmount || amount || 0);
            const currentBalanceAfter = Number(balanceAfter ?? newBalance ?? 0);
            const prevBal = Number(previousBalance ?? (currentBalanceAfter + deductedAmount));

            // A. Send report to Telegram Group & Venue Owner
            let ownerChatId = null;
            if (venueId) {
                const venueDoc = await db.collection("venues").doc(venueId).get();
                if (venueDoc.exists && venueDoc.data().ownerId) {
                    const oSnap = await db.collection("users").doc(venueDoc.data().ownerId).get();
                    if (oSnap.exists) {
                        const oData = oSnap.data();
                        ownerChatId = oData.telegramChatId || oData.telegram_chat_id;
                    }
                }
            }

            const tgReport = `💳 <b>ОТЧЕТ О СПИСАНИИ ДЕПОЗИТА</b>\n\n` +
                `🏛 <b>Заведение:</b> ${venueName}\n` +
                `👤 <b>Клиент:</b> ${userName || guestName || 'Гость'}\n` +
                `💰 <b>Депозит до:</b> ${prevBal.toLocaleString()} ${currency}\n` +
                `🧾 <b>Списано по чеку:</b> -${deductedAmount.toLocaleString()} ${currency}\n` +
                `✅ <b>Новый баланс депозита:</b> ${currentBalanceAfter.toLocaleString()} ${currency}\n` +
                `👨💼 <b>Сотрудник:</b> ${staffName || staffTelegramUsername || 'Персонал'}`;

            if (telegramGroupId) {
                await sendTelegramMessage(telegramGroupId, tgReport).catch(e => logger.warn("Telegram debit report error:", e));
            }
            if (ownerChatId && ownerChatId !== telegramGroupId) {
                await sendTelegramMessage(ownerChatId, tgReport).catch(e => logger.warn("Owner Telegram debit report error:", e));
            }

            // B. Send report to Owner Email
            if (ownerEmail) {
                await resend.emails.send({
                    from: "Friendly Code <no-reply@friendlycode.fun>",
                    to: [ownerEmail],
                    subject: `🧾 Deposit Deduction Report - ${venueName}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; background-color: #000; color: #FFF; border-radius: 20px;">
                            <h2 style="color: #D4AF37; margin-bottom: 20px;">🧾 Отчет о списании депозита</h2>
                            <p style="font-size: 16px; margin-bottom: 10px;">Заведение: <strong>${venueName}</strong></p>
                            <hr style="border-color: #333; margin: 20px 0;" />
                            <table width="100%" cellpadding="8" style="font-size: 15px;">
                                <tr><td style="color: #888;">Имя клиента:</td><td style="font-weight: bold;">${userName || guestName || 'Гость'}</td></tr>
                                <tr><td style="color: #888;">Баланс до списания:</td><td style="font-weight: bold;">${prevBal.toLocaleString()} ${currency}</td></tr>
                                <tr><td style="color: #888;">Списано (сумма чека):</td><td style="color: #FF3131; font-weight: bold;">-${deductedAmount.toLocaleString()} ${currency}</td></tr>
                                <tr><td style="color: #888;">Остаток депозита:</td><td style="color: #00FF41; font-weight: bold;">${currentBalanceAfter.toLocaleString()} ${currency}</td></tr>
                                <tr><td style="color: #888;">Сотрудник:</td><td style="font-weight: bold;">${staffName || staffTelegramUsername || 'Персонал'}</td></tr>
                            </table>
                        </div>
                    `
                }).catch(e => logger.warn("Owner email report error:", e));
            }

            // C. Send Email Notification to Guest (Deduction + Low Balance Warning)
            let targetEmail = guestEmail;
            let targetName = guestName || userName || "Уважаемый гость";

            if (!targetEmail && userId) {
                const userDoc = await db.collection("users").doc(userId).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    targetEmail = uData.email || uData.guestEmail;
                    if (!targetName || targetName === "Уважаемый гость") {
                        targetName = uData.displayName || uData.name || targetName;
                    }
                }
            }

            if (targetEmail) {
                // Calculate if remaining balance is 20% or less of previous deposit
                const isLowBalance = currentBalanceAfter <= 0 || (prevBal > 0 && (currentBalanceAfter / prevBal) <= 0.20);
                const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://bot-lab-21910.web.app/admin/#/deposit?uid=${userId || targetEmail}&action=deduct`)}`;
                const guestWebPageUrl = `https://bot-lab-21910.web.app/`;

                const subject = isLowBalance
                    ? `⚠️ Ваш депозит в ${venueName} на исходе (${currentBalanceAfter.toLocaleString()} ${currency})! Пополните, чтобы сохранить VIP-скидку`
                    : `🧾 Списание по чеку в ${venueName}. Остаток депозита: ${currentBalanceAfter.toLocaleString()} ${currency}`;

                await resend.emails.send({
                    from: "REVOO Deposit <no-reply@friendlycode.fun>",
                    to: [targetEmail],
                    subject: subject,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF; -webkit-font-smoothing: antialiased;">
                            <div style="max-width: 540px; margin: 0 auto; padding: 32px 16px; background-color: #0A0A0C;">
                                
                                {/* Header Badge */}
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <div style="display: inline-block; background: ${isLowBalance ? 'rgba(255, 49, 49, 0.15)' : 'rgba(0, 255, 65, 0.15)'}; border: 1px solid ${isLowBalance ? 'rgba(255, 49, 49, 0.4)' : 'rgba(0, 255, 65, 0.4)'}; padding: 6px 18px; border-radius: 20px; color: ${isLowBalance ? '#FF3131' : '#00FF41'}; font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">
                                        ${isLowBalance ? '⚠️ LOW BALANCE WARNING &bull; REVOO WALLET' : '🧾 CHECK DEDUCTION &bull; REVOO WALLET'}
                                    </div>
                                </div>

                                {/* Main Container */}
                                <div style="background-color: #1C1C1E; border: 1px solid ${isLowBalance ? 'rgba(255, 49, 49, 0.3)' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 28px; padding: 32px 24px; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);">
                                    
                                    <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.2;">
                                        Здравствуйте, ${targetName}!
                                    </h1>
                                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 0 0 24px 0; line-height: 1.5;">
                                        С вашего депозита в заведении <strong style="color: #FFFFFF;">${venueName}</strong> успешно произведено списание по чеку.
                                    </p>

                                    {/* Low Balance Warning Banner */}
                                    ${isLowBalance ? `
                                    <div style="background: linear-gradient(135deg, rgba(255, 49, 49, 0.2) 0%, rgba(255, 136, 0, 0.1) 100%); border: 1.5px solid rgba(255, 49, 49, 0.5); border-radius: 22px; padding: 20px; margin-bottom: 24px; text-align: center;">
                                        <div style="font-size: 28px; margin-bottom: 6px;">⚠️</div>
                                        <div style="font-size: 15px; font-weight: 900; color: #FF3131; margin-bottom: 6px;">
                                            Остаток депозита равен или менее 20%!
                                        </div>
                                        <div style="font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.9); line-height: 1.5;">
                                            Пополните депозит при следующем визите в <strong>${venueName}</strong>, чтобы зафиксировать ваш VIP-максимум и не потерять скидку!
                                        </div>
                                    </div>` : ''}

                                    {/* Deduction & Balance Table Box */}
                                    <div style="background-color: rgba(0, 0, 0, 0.5); border-radius: 22px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 20px; margin-bottom: 28px; text-align: left;">
                                        <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; color: rgba(255, 255, 255, 0.9);">
                                            <tr>
                                                <td style="color: rgba(255, 255, 255, 0.5);">Баланс до списания:</td>
                                                <td style="text-align: right; font-weight: 700; color: #FFFFFF;">${prevBal.toLocaleString()} ${currency}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: rgba(255, 255, 255, 0.5);">Списано (сумма чека):</td>
                                                <td style="text-align: right; font-weight: 900; color: #FF3131;">-${deductedAmount.toLocaleString()} ${currency}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: rgba(255, 255, 255, 0.5); border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 10px;">Остаток депозита:</td>
                                                <td style="text-align: right; font-weight: 900; color: ${isLowBalance ? '#FF3131' : '#00FF41'}; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 10px; font-size: 16px;">
                                                    ${currentBalanceAfter.toLocaleString()} ${currency}
                                                </td>
                                            </tr>
                                        </table>
                                    </div>

                                    {/* Embedded Personal QR Code */}
                                    <div style="background-color: #FFFFFF; padding: 18px; border-radius: 24px; display: inline-block; margin-bottom: 16px; box-shadow: 0 10px 30px rgba(255, 255, 255, 0.1);">
                                        <img src="${qrCodeUrl}" width="190" height="190" alt="Ваш персональный QR-код депозита" style="display: block; margin: 0 auto; border: 0;" />
                                    </div>

                                    <p style="font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.6); margin: 0 0 28px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                                        Покажите этот QR-код официанту для списания чека или пополнения
                                    </p>

                                    {/* Action CTA Link */}
                                    <div>
                                        <a href="${guestWebPageUrl}" target="_blank" style="display: block; background: ${isLowBalance ? '#FFD700' : '#00FF41'}; color: #000000; padding: 16px 24px; border-radius: 18px; text-decoration: none; font-weight: 900; font-size: 15px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);">
                                            ${isLowBalance ? '💰 Пополнить депозит в заведении' : '📱 Открыть мой баланс и QR-код'}
                                        </a>
                                    </div>

                                </div>

                                {/* Footer */}
                                <div style="text-align: center; margin-top: 32px; font-size: 11px; color: rgba(255, 255, 255, 0.3); font-weight: 600;">
                                    &copy; ${new Date().getFullYear()} REVOO &bull; FRIENDLY CODE SYSTEM
                                </div>

                            </div>
                        </body>
                        </html>
                    `
                }).catch(e => logger.error("Error sending guest deduction email:", e));
            }

            // D. Send Telegram DM to Guest for Debit / Deduction
            try {
                let guestChatId = null;
                if (userId) {
                    const uDoc = await db.collection("users").doc(userId).get();
                    if (uDoc.exists) {
                        guestChatId = uDoc.data().telegramChatId || uDoc.data().telegram_chat_id;
                    }
                } else if (targetEmail) {
                    const uSnap = await db.collection("users").where("email", "==", targetEmail.toLowerCase()).limit(1).get();
                    if (!uSnap.empty) {
                        guestChatId = uSnap.docs[0].data().telegramChatId || uSnap.docs[0].data().telegram_chat_id;
                    }
                }

                if (guestChatId) {
                    const tgDebitMsg = `🧾 <b>СПИСАНИЕ С ДЕПОЗИТА ПО ЧЕКУ</b>\n\n` +
                        `📍 <b>Заведение:</b> ${venueName}\n` +
                        `💸 <b>Списано по чеку:</b> -${deductedAmount.toLocaleString()} ${currency}\n` +
                        `💳 <b>Остаток депозита:</b> ${currentBalanceAfter.toLocaleString()} ${currency}\n` +
                        (isLowBalance ? `\n⚠️ <b>Внимание: Баланс на исходе (менее 20%)!</b> Пополните депозит, чтобы сохранить VIP-скидку.` : '') +
                        `\n📱 Открыть QR-код и баланс: https://bot-lab-21910.web.app/`;
                    await sendTelegramMessage(guestChatId, tgDebitMsg).catch(e => logger.warn("Guest Telegram debit report error:", e));
                }
            } catch (tgErr) {
                logger.warn("Error sending guest Telegram debit report:", tgErr);
            }
        }
    } catch (e) {
        logger.error("Error in onDepositTransactionCreated handler:", e);
    }
});

const { onRequest } = require("firebase-functions/v2/https");

/**
 * TELEGRAM BOT LOGIC
 */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

/**
 * Webhook for Telegram. Set this URL with the Telegram API:
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_FUNCTION_URL>
 */
exports.telegramWebhook = onRequest(async (req, res) => {
    try {
        const update = req.body;

        // ==========================================
        // 0. TEXT MESSAGE HANDLER (Commands)
        // ==========================================
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();
            const fromUser = update.message.from;
            const username = (fromUser.username || "").toLowerCase();

            if (text.startsWith('/leads') || text.toLowerCase() === 'лиды') {
                // Verify user is admin/superadmin
                const uSnap = await db.collection("users")
                    .where("telegramChatId", "==", String(chatId))
                    .get();
                
                let uSnap2 = await db.collection("users")
                    .where("telegram_chat_id", "==", String(chatId))
                    .get();

                const docs = [...uSnap.docs, ...uSnap2.docs];
                const isAdmin = docs.some(d => d.data().role === 'admin' || d.data().role === 'superAdmin') || String(chatId) === String(SUPER_ADMIN_CHAT_ID);

                if (!isAdmin) {
                    await sendTelegramMessage(chatId, "⛔️ У вас нет прав для просмотра лидов.");
                    res.sendStatus(200);
                    return;
                }

                // Fetch latest 5 leads from leads_b2b_audit
                const leadsSnap = await db.collection("leads_b2b_audit")
                    .orderBy("timestamp", "desc")
                    .limit(5)
                    .get();

                if (leadsSnap.empty) {
                    await sendTelegramMessage(chatId, "📭 Пока нет новых лидов.");
                    res.sendStatus(200);
                    return;
                }

                let responseMsg = "🔥 <b>ПОСЛЕДНИЕ 5 ЛИДОВ</b> 🔥\n\n";
                leadsSnap.forEach((doc, index) => {
                    const data = doc.data();
                    const dDate = data.timestamp ? data.timestamp.toDate().toLocaleString('ru-RU', { timeZone: 'Asia/Dubai', hour12: false }) : 'Неизвестно';
                    responseMsg += `<b>${index + 1}. ${data.placeName}</b>\n`;
                    responseMsg += `📞 ${data.contact}\n`;
                    responseMsg += `🩺 Рейтинг SEO: ${data.healthScore}/100\n`;
                    responseMsg += `🕒 ${dDate}\n\n`;
                });

                await sendTelegramMessage(chatId, responseMsg);
                res.sendStatus(200);
                return;
            }
        }

        // ==========================================
        // 1. CALLBACK QUERY HANDLER
        // ==========================================
        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const callbackQueryId = callbackQuery.id;
            const callbackData = callbackQuery.data;
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
            const fromUser = callbackQuery.from;
            const username = (fromUser.username || "").toLowerCase();

            if (!username) {
                await answerCallbackQuery(callbackQueryId, "⛔️ Access Denied: Telegram Username required.", true);
                res.sendStatus(200);
                return;
            }

            // Identify Venue
            let venueSnap = await db.collection("venues").where("telegram_group_id", "==", String(chatId)).get();
            if (venueSnap.empty) {
                venueSnap = await db.collection("venues").where("telegramGroupId", "==", String(chatId)).get();
            }
            if (venueSnap.empty) {
                venueSnap = await db.collection("venues").where("telegram_group_id", "==", Number(chatId)).get();
            }
            if (venueSnap.empty) {
                venueSnap = await db.collection("venues").where("telegramGroupId", "==", Number(chatId)).get();
            }

            if (venueSnap.empty) {
                await answerCallbackQuery(callbackQueryId, "⛔️ Error: Group chat is not linked to any venue.", true);
                res.sendStatus(200);
                return;
            }

            const venueDoc = venueSnap.docs[0];
            const venueId = venueDoc.id;

            // Security Check: Validate staff
            const staffSnap = await db.collection("users")
                .where("role", "==", "staff")
                .where("venueId", "==", venueId)
                .where("telegram_username", "==", username)
                .get();

            if (staffSnap.empty) {
                await answerCallbackQuery(callbackQueryId, "⛔️ Access Denied: Your Telegram username is not registered in Revoo staff settings.", true);
                res.sendStatus(200);
                return;
            }

            // Handle callback types
            if (callbackData === "POS_SHOW_HELP") {
                const helpMsg = `📋 <b>Справка и команды бота Revoo:</b>\n\n` +
                    `1️⃣ <b>Привязка группы</b> (для владельца):\n` +
                    `<code>/register_venue [ID_заведения]</code>\n\n` +
                    `2️⃣ <b>Пополнение депозита гостя</b> (для сотрудников):\n` +
                    `<code>/deposit [телефон/email/ID] [сумма]</code>\n\n` +
                    `3️⃣ <b>Списание депозита при визите</b>:\n` +
                    `При визите гостя бот присылает сообщение с кнопкой перехода в личку бота для безопасного ввода суммы чека.\n\n` +
                    `💡 <i>Важно: Юзернеймы сотрудников (@username) должны быть внесены в кабинете админа в разделе «Staff Management».</i>`;
                await answerCallbackQuery(callbackQueryId, "Справка по командам", false);
                await sendTelegramMessage(chatId, helpMsg);
                res.sendStatus(200);
                return;
            }
            else if (callbackData.startsWith("POS_ENTER_CHECK_")) {
                const parts = callbackData.replace("POS_ENTER_CHECK_", "").split("_");
                const userId = parts[0];
                const sessionId = parts[1];

                const sessionDoc = await db.collection("pos_sessions").doc(sessionId).get();
                if (!sessionDoc.exists) {
                    await answerCallbackQuery(callbackQueryId, "❌ Session not found.", true);
                    res.sendStatus(200);
                    return;
                }

                const sessionData = sessionDoc.data();
                if (sessionData.status !== "pending") {
                    await answerCallbackQuery(callbackQueryId, "⚠️ Check amount already entered.", true);
                    res.sendStatus(200);
                    return;
                }

                await db.collection("pos_sessions").doc(sessionId).update({
                    status: "awaiting_check_amount",
                    staffUsername: username,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                await answerCallbackQuery(callbackQueryId, "Entering check amount...", false);
                await sendTelegramMessage(chatId, `@${fromUser.username || fromUser.first_name}, please reply with the check amount (numbers only) for customer ${sessionData.userName}:`);
            } 
            else if (callbackData.startsWith("POS_CONFIRM_DEBIT_")) {
                const isMax = callbackData.startsWith("POS_CONFIRM_DEBIT_MAX_");
                const sessionId = callbackData.replace(isMax ? "POS_CONFIRM_DEBIT_MAX_" : "POS_CONFIRM_DEBIT_", "");

                const sessionDoc = await db.collection("pos_sessions").doc(sessionId).get();
                if (!sessionDoc.exists) {
                    await answerCallbackQuery(callbackQueryId, "❌ Session not found.", true);
                    res.sendStatus(200);
                    return;
                }

                const sessionData = sessionDoc.data();
                if (sessionData.status !== "waiting_confirmation") {
                    await answerCallbackQuery(callbackQueryId, "❌ Invalid session status.", true);
                    res.sendStatus(200);
                    return;
                }

                const userRef = db.collection("users").doc(sessionData.userId);
                let finalDebitedAmount = 0;
                let balanceAfter = 0;

                try {
                    await db.runTransaction(async (transaction) => {
                        const userDoc = await transaction.get(userRef);
                        if (!userDoc.exists) throw new Error("Customer profile not found.");

                        const currentBalance = Number(userDoc.data().deposit_balance ?? 0);
                        const debitAmount = isMax ? currentBalance : Number(sessionData.finalDebit);

                        if (!isMax && debitAmount > currentBalance) {
                            throw new Error("Insufficient deposit balance.");
                        }

                        finalDebitedAmount = debitAmount;
                        balanceAfter = currentBalance - debitAmount;

                        transaction.update(userRef, { deposit_balance: balanceAfter });

                        const transactionRef = db.collection("deposit_transactions").doc();
                        transaction.set(transactionRef, {
                            id: transactionRef.id,
                            userId: sessionData.userId,
                            userName: sessionData.userName,
                            venueId: sessionData.venueId,
                            venueName: sessionData.venueName,
                            staffTelegramUsername: username,
                            transactionType: "DEBIT",
                            originalCheckAmount: sessionData.checkAmount,
                            discountPercentageApplied: sessionData.discountPercentage,
                            discountAmountSaved: sessionData.discountAmount,
                            finalAmount: finalDebitedAmount,
                            balanceAfter: balanceAfter,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    });

                    // Recalculate dynamic tier
                    const tierInfo = await calculateUserDiscountTier(sessionData.userId, venueId);
                    await userRef.update({ current_discount_tier: tierInfo.tierLevel });

                    await answerCallbackQuery(callbackQueryId, "✅ Debit Approved!", false);
                    await editTelegramMessage(
                        chatId, 
                        messageId, 
                        `✅ <b>DEBIT APPROVED</b>\n\n👤 <b>Customer:</b> ${sessionData.userName}\n💸 <b>Debited:</b> ${finalDebitedAmount.toFixed(2)} ${sessionData.currency}\n💰 <b>Final Balance:</b> ${balanceAfter.toFixed(2)} ${sessionData.currency}\n🔥 <b>Dynamic Tier:</b> Tier ${tierInfo.tierLevel} (${tierInfo.discountPercentage}% OFF)\n👨💼 <b>Processed by:</b> @${username}`
                    );

                    await db.collection("pos_sessions").doc(sessionId).update({
                        status: "completed",
                        finalDebit: finalDebitedAmount,
                        balanceAfter: balanceAfter,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    // Notify venue group chat if transaction was done in staff DM
                    try {
                        const vDoc = await db.collection("venues").doc(sessionData.venueId).get();
                        if (vDoc.exists) {
                            const groupChatId = vDoc.data().telegram_group_id || vDoc.data().telegramGroupId;
                            if (groupChatId && String(groupChatId) !== String(chatId)) {
                                const groupReport = `✅ <b>[СПИСАНИЕ ДЕПОЗИТА ПРОВЕДЕНО]</b>\n\n👤 <b>Гость:</b> ${sessionData.userName}\n💸 <b>Списано с депозита:</b> ${finalDebitedAmount.toFixed(2)} ${sessionData.currency}\n💰 <b>Остаток депозита:</b> ${balanceAfter.toFixed(2)} ${sessionData.currency}\n👨💼 <b>Сотрудник:</b> @${username}`;
                                await sendTelegramMessage(groupChatId, groupReport);
                            }
                        }
                    } catch (grpErr) {
                        logger.error("Error sending debit report to group chat:", grpErr);
                    }
                } catch (txErr) {
                    logger.error("POS transaction failed", txErr);
                    await answerCallbackQuery(callbackQueryId, `❌ Transaction Failed: ${txErr.message}`, true);
                }
            } 
            else if (callbackData.startsWith("POS_CANCEL_DEBIT_")) {
                const sessionId = callbackData.replace("POS_CANCEL_DEBIT_", "");

                await db.collection("pos_sessions").doc(sessionId).update({
                    status: "cancelled",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                await answerCallbackQuery(callbackQueryId, "Transaction cancelled.", false);
                await editTelegramMessage(chatId, messageId, `❌ <b>TRANSACTION CANCELLED</b>\n\n👨💼 <b>Processed by:</b> @${username}`);
            }

            res.sendStatus(200);
            return;
        }

        // Automatic welcome message when bot is added to a group
        if (update.message && update.message.new_chat_members) {
            const welcomeMsg = `👋 <b>Добро пожаловать в бот лояльности Revoo!</b>\n\n` +
                `Чтобы привязать эту группу к вашему заведению, отправьте команду:\n` +
                `• <code>/register_venue [ID_заведения]</code>\n\n` +
                `<i>ID заведения вы можете скопировать в кабинете администратора.</i>`;
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: "❓ Справка по командам", callback_data: "POS_SHOW_HELP" }
                    ]
                ]
            };
            await sendTelegramMessageWithKeyboard(update.message.chat.id, welcomeMsg, keyboard);
            res.sendStatus(200);
            return;
        }

        if (!update.message || !update.message.text) {
            res.sendStatus(200);
            return;
        }

        const text = update.message.text;
        const chatId = update.message.chat.id;
        const fromUser = update.message.from;
        const username = (fromUser.username || "").toLowerCase();

        // 2a. COMMAND: /start
        if (text.startsWith("/start")) {
            const parts = text.split(" ");
            if (parts.length > 1) {
                const param = parts[1].trim();

                if (param.startsWith("debit_")) {
                    const sessionId = param.replace("debit_", "").trim();
                    const sessionDoc = await db.collection("pos_sessions").doc(sessionId).get();
                    if (!sessionDoc.exists) {
                        await sendTelegramMessage(chatId, "❌ Сессия списания не найдена.");
                        res.sendStatus(200);
                        return;
                    }
                    const sessionData = sessionDoc.data();
                    if (sessionData.status !== "pending" && sessionData.status !== "awaiting_check_amount") {
                        await sendTelegramMessage(chatId, "⚠️ Сумма чека для этой сессии уже введена или обработана.");
                        res.sendStatus(200);
                        return;
                    }

                    await db.collection("pos_sessions").doc(sessionId).update({
                        status: "awaiting_check_amount",
                        staffChatId: chatId,
                        staffUsername: username || "staff",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    const promptMsg = `💰 <b>Списание депозита клиента</b>\n\n👤 <b>Гость:</b> ${sessionData.userName}\n💳 <b>Баланс депозита:</b> ${sessionData.depositBalance.toFixed(2)} ${sessionData.currency}\n🔥 <b>Скидка:</b> ${sessionData.discountPercentage}%\n\nПожалуйста, введите сумму чека (только цифры):`;
                    await sendTelegramMessage(chatId, promptMsg);
                    res.sendStatus(200);
                    return;
                } else if (param.startsWith("auth_") || param.startsWith("gauth_")) {
                    const isGoogle = param.startsWith("gauth_");
                    const code = param.split("_")[1];
                    const codeDoc = await db.collection("telegram_codes").doc(code).get();

                    const baseUrl = "https://www.revoo.win";
                    const targetUrl = isGoogle 
                        ? `${baseUrl}/google-thank-you?venueId=${code}` 
                        : `${baseUrl}/thank-you?venueId=${code}`;
                    const btnText = isGoogle 
                        ? "⭐ Забрать бонус в Google Maps" 
                        : "🎁 Перейти к вашей скидке";

                    if (codeDoc.exists) {
                        const { uid, expiresAt } = codeDoc.data();
                        if (Date.now() > expiresAt) {
                            await sendTelegramMessage(chatId, "❌ Срок действия кода истек. Пожалуйста, сгенерируйте новый.");
                        } else {
                            await db.collection("users").doc(uid).set({
                                telegramChatId: chatId,
                                telegramUsername: update.message.chat.username || "Unknown",
                                messenger: "telegram",
                                lastSeen: new Date().toISOString()
                            }, { merge: true });

                            await db.collection("telegram_codes").doc(code).delete();
                            
                            const successMsg = isGoogle
                                ? "✅ Спасибо, вы авторизованы!\n\nНажмите кнопку ниже, чтобы забрать ваш бонус:"
                                : "✅ Спасибо, вы авторизованы!\n\nНажмите кнопку ниже, чтобы перейти к вашей скидке:";

                            await sendTelegramMessage(chatId, successMsg, {
                                reply_markup: {
                                    inline_keyboard: [[{ text: btnText, url: targetUrl }]]
                                }
                            });
                            
                            logger.info(`Linked telegram chat ${chatId} to user ${uid} via auth code.`);
                        }
                    } else {
                        // Check if it's a venueId instead of a telegram code
                        const venueDoc = await db.collection("venues").doc(code).get();
                        const venueId = venueDoc.exists ? code : (code || 'demo');
                        
                        const targetVenueUrl = isGoogle 
                            ? `${baseUrl}/google-thank-you?venueId=${venueId}` 
                            : `${baseUrl}/thank-you?venueId=${venueId}`;

                        const successMsg = isGoogle
                            ? "✅ Спасибо, вы авторизованы!\n\nНажмите кнопку ниже, чтобы получить бонус в Google Maps:"
                            : "✅ Спасибо, вы авторизованы!\n\nНажмите кнопку ниже, чтобы перейти к персональной скидке:";

                        await sendTelegramMessage(chatId, successMsg, {
                            reply_markup: {
                                inline_keyboard: [[{ text: btnText, url: targetVenueUrl }]]
                            }
                        });
                    }
                } else {
                    const uid = param;
                    const userRef = db.collection("users").doc(uid);
                    await userRef.set({
                        telegramChatId: chatId,
                        messenger: "telegram",
                        lastSeen: new Date().toISOString()
                    }, { merge: true });

                    const successMsg = "✅ Спасибо за регистрацию!\n\nВаша учетная запись успешно привязана к Telegram.\n\n🔙 Пожалуйста, вернитесь обратно в браузер (или закройте это окно), чтобы продолжить работу с приложением.";
                    await sendTelegramMessage(chatId, successMsg);
                    logger.info(`Linked telegram chat ${chatId} to user ${uid}`);
                }
            } else {
                await sendTelegramMessage(chatId, "👋 Здравствуйте! Пожалуйста, подключитесь через приложение FriendlyCode/Revoo.");
            }
            res.sendStatus(200);
            return;
        }

        // 2b. COMMAND: /register_venue
        if (text.startsWith("/register_venue")) {
            const parts = text.split(" ");
            if (parts.length > 1) {
                const venueId = parts[1].trim();
                const venueRef = db.collection("venues").doc(venueId);
                const venueDoc = await venueRef.get();

                if (venueDoc.exists) {
                    await venueRef.update({ 
                        telegramGroupId: String(chatId),
                        telegram_group_id: String(chatId)
                    });
                    
                    const successMessage = `✅ <b>Группа успешно привязана к заведению: ${venueDoc.data().name}</b>!\n\n` +
                        `📋 <b>Доступные команды бота:</b>\n` +
                        `• <code>/deposit [телефон/email/ID] [сумма]</code> — Пополнить баланс депозита гостя.\n` +
                        `• <code>/register_venue [ID_заведения]</code> — Перепривязать группу к другому заведению.\n` +
                        `• <code>/help</code> — Показать список доступных команд.\n\n` +
                        `🔔 Бот будет автоматически присылать уведомления в эту группу при каждом сканировании гостей, предлагая сотрудникам ввести сумму чека для применения скидки.`;
                    
                    await sendTelegramMessage(chatId, successMessage);
                    logger.info(`Linked Telegram Group ${chatId} to Venue ${venueId}`);
                } else {
                    await sendTelegramMessage(chatId, `❌ <b>Error:</b> Venue ID not found.\nPlease check the ID and try again.`);
                }
            } else {
                await sendTelegramMessage(chatId, "⚠️ Usage: `/register_venue <VENUE_ID>`");
            }
            res.sendStatus(200);
            return;
        }

        // 2e. COMMAND: /help
        if (text.startsWith("/help")) {
            const helpMessage = `📋 <b>Доступные команды бота Revoo:</b>\n\n` +
                `• <code>/deposit [телефон/email/ID_гостя] [сумма]</code> — Пополнить баланс депозита гостя (доступно сотрудникам заведения).\n` +
                `• <code>/register_venue [ID_заведения]</code> — Привязать текущую группу к заведению (доступно владельцам).\n` +
                `• <code>/help</code> — Показать эту справку.\n\n` +
                `🔔 При каждом сканировании QR-кода гостем, бот пришлет уведомление с кнопкой для ввода суммы чека сотрудником.`;
            await sendTelegramMessage(chatId, helpMessage);
            res.sendStatus(200);
            return;
        }

        // Identify Venue for this chat
        let venueSnap = await db.collection("venues").where("telegram_group_id", "==", String(chatId)).get();
        if (venueSnap.empty) {
            venueSnap = await db.collection("venues").where("telegramGroupId", "==", String(chatId)).get();
        }
        if (venueSnap.empty) {
            venueSnap = await db.collection("venues").where("telegram_group_id", "==", Number(chatId)).get();
        }
        if (venueSnap.empty) {
            venueSnap = await db.collection("venues").where("telegramGroupId", "==", Number(chatId)).get();
        }

        const isVenueGroup = !venueSnap.empty;
        const venueDoc = isVenueGroup ? venueSnap.docs[0] : null;
        const venueId = venueDoc ? venueDoc.id : null;

        // 2c. COMMAND: /deposit
        if (text.startsWith("/deposit")) {
            if (!isVenueGroup) {
                await sendTelegramMessage(chatId, "⚠️ Error: This group chat is not linked to any venue.");
                res.sendStatus(200);
                return;
            }

            if (!username) {
                await sendTelegramMessage(chatId, "⛔️ Access Denied: Telegram username required.");
                res.sendStatus(200);
                return;
            }

            // Security Check
            const staffSnap = await db.collection("users")
                .where("role", "==", "staff")
                .where("venueId", "==", venueId)
                .where("telegram_username", "==", username)
                .get();

            if (staffSnap.empty) {
                await sendTelegramMessage(chatId, "⛔️ Access Denied: Your Telegram username is not registered in Revoo staff settings.");
                res.sendStatus(200);
                return;
            }

            const parts = text.split(" ");
            if (parts.length < 3) {
                await sendTelegramMessage(chatId, "⚠️ Usage: `/deposit [phone_or_email_or_uid] [amount]`");
                res.sendStatus(200);
                return;
            }

            const target = parts[1].trim();
            const amount = parseFloat(parts[2].trim());

            if (isNaN(amount) || amount <= 0) {
                await sendTelegramMessage(chatId, "⚠️ Invalid amount. Must be a positive number.");
                res.sendStatus(200);
                return;
            }

            // Find User
            let userSnap = await db.collection("users").where("email", "==", target.toLowerCase()).get();
            if (userSnap.empty) {
                userSnap = await db.collection("users").where("phone", "==", target).get();
            }
            if (userSnap.empty) {
                userSnap = await db.collection("users").where("contactInfo", "==", target).get();
            }
            if (userSnap.empty) {
                userSnap = await db.collection("users").where("displayName", "==", target).get();
            }

            let userRef = null;
            let userData = null;

            if (!userSnap.empty) {
                userRef = userSnap.docs[0].ref;
                userData = userSnap.docs[0].data();
            } else {
                // Try direct doc ref
                const directDoc = await db.collection("users").doc(target).get();
                if (directDoc.exists) {
                    userRef = directDoc.ref;
                    userData = directDoc.data();
                }
            }

            if (!userRef) {
                await sendTelegramMessage(chatId, `❌ Customer "${target}" not found. Ensure they have signed in and registered.`);
                res.sendStatus(200);
                return;
            }

            let newBalance = 0;
            await db.runTransaction(async (transaction) => {
                const currentDoc = await transaction.get(userRef);
                const currentBalance = Number(currentDoc.data().deposit_balance ?? 0);
                newBalance = currentBalance + amount;

                transaction.update(userRef, { deposit_balance: newBalance });

                const transactionRef = db.collection("deposit_transactions").doc();
                transaction.set(transactionRef, {
                    id: transactionRef.id,
                    userId: userRef.id,
                    userName: userData.displayName || userData.name || "Guest",
                    venueId,
                    venueName: venueDoc.data().name || "Venue",
                    staffTelegramUsername: username,
                    transactionType: "CREDIT",
                    finalAmount: amount,
                    balanceAfter: newBalance,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });

            // Recalculate dynamic tier
            const tierInfo = await calculateUserDiscountTier(userRef.id, venueId);
            await userRef.update({ current_discount_tier: tierInfo.tierLevel });

            await sendTelegramMessage(
                chatId,
                `💰 <b>[DEPOSIT SUCCESSFUL]</b>\n\n👤 <b>Customer:</b> ${userData.displayName || userData.name || "Guest"}\n📥 <b>Credited:</b> ${amount.toFixed(2)} ${venueDoc.data().currency || "VND"}\n💳 <b>New Balance:</b> ${newBalance.toFixed(2)} ${venueDoc.data().currency || "VND"}\n🔥 <b>Current Tier:</b> Tier ${tierInfo.tierLevel} (${tierInfo.discountPercentage}% OFF)`
            );
            res.sendStatus(200);
            return;
        }

        // 2d. NUMERIC CHECK AMOUNT INPUT REPLIES
        const numericVal = parseFloat(text.trim());
        if (username && !isNaN(numericVal) && numericVal > 0) {
            // Find active session awaiting check amount
            let activeSessionSnap = await db.collection("pos_sessions")
                .where("status", "==", "awaiting_check_amount")
                .where("staffChatId", "==", chatId)
                .orderBy("updatedAt", "desc")
                .limit(1)
                .get();

            if (activeSessionSnap.empty) {
                activeSessionSnap = await db.collection("pos_sessions")
                    .where("status", "==", "awaiting_check_amount")
                    .where("staffUsername", "==", username)
                    .orderBy("updatedAt", "desc")
                    .limit(1)
                    .get();
            }

            if (!activeSessionSnap.empty) {
                const sessionDoc = activeSessionSnap.docs[0];
                const sessionData = sessionDoc.data();
                const checkAmount = numericVal;

                const discountAmount = checkAmount * (sessionData.discountPercentage / 100);
                const finalDebit = checkAmount - discountAmount;

                const roundedDiscountAmount = Math.round(discountAmount * 100) / 100;
                const roundedFinalDebit = Math.round(finalDebit * 100) / 100;

                // Check balance
                const customerDoc = await db.collection("users").doc(sessionData.userId).get();
                const customerBalance = Number(customerDoc.data().deposit_balance ?? 0);

                if (roundedFinalDebit > customerBalance) {
                    const diff = roundedFinalDebit - customerBalance;
                    const warnMessage = `⚠️ <b>Недостаточно депозита!</b>\n\n👤 <b>Гость:</b> ${sessionData.userName}\n• Сумма чека: ${checkAmount.toFixed(2)} ${sessionData.currency}\n• Скидка (${sessionData.discountPercentage}%): -${roundedDiscountAmount.toFixed(2)} ${sessionData.currency}\n• К списанию с депозита: ${roundedFinalDebit.toFixed(2)} ${sessionData.currency}\n💳 Текущий баланс: ${customerBalance.toFixed(2)} ${sessionData.currency}\n❌ Не хватает: ${diff.toFixed(2)} ${sessionData.currency}\n\nСписать максимальный остаток баланса (${customerBalance.toFixed(2)} ${sessionData.currency}) или отменить?`;
                    
                    const keyboard = {
                        inline_keyboard: [
                            [
                                { text: "✅ Списать весь баланс", callback_data: `POS_CONFIRM_DEBIT_MAX_${sessionDoc.id}` },
                                { text: "❌ Отмена", callback_data: `POS_CANCEL_DEBIT_${sessionDoc.id}` }
                            ]
                        ]
                    };

                    await db.collection("pos_sessions").doc(sessionDoc.id).update({
                        status: "waiting_confirmation",
                        checkAmount: checkAmount,
                        discountAmount: customerBalance * (sessionData.discountPercentage / 100),
                        finalDebit: customerBalance,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    await sendTelegramMessageWithKeyboard(chatId, warnMessage, keyboard);
                    res.sendStatus(200);
                    return;
                } else {
                    const confirmMessage = `🧾 <b>ПОДТВЕРЖДЕНИЕ СПИСАНИЯ</b>\n\n👤 <b>Гость:</b> ${sessionData.userName}\n• Сумма чека: ${checkAmount.toFixed(2)} ${sessionData.currency}\n• Скидка (${sessionData.discountPercentage}%): -${roundedDiscountAmount.toFixed(2)} ${sessionData.currency}\n• <b>К СПИСАНИЮ:</b> ${roundedFinalDebit.toFixed(2)} ${sessionData.currency}\n💰 <b>Остаток депозита:</b> ${(customerBalance - roundedFinalDebit).toFixed(2)} ${sessionData.currency}\n👨💼 <b>Сотрудник:</b> @${username}`;
                    
                    const keyboard = {
                        inline_keyboard: [
                            [
                                { text: "✅ Подтвердить списание", callback_data: `POS_CONFIRM_DEBIT_${sessionDoc.id}` },
                                { text: "❌ Отменить", callback_data: `POS_CANCEL_DEBIT_${sessionDoc.id}` }
                            ]
                        ]
                    };

                    await db.collection("pos_sessions").doc(sessionDoc.id).update({
                        status: "waiting_confirmation",
                        checkAmount: checkAmount,
                        discountAmount: roundedDiscountAmount,
                        finalDebit: roundedFinalDebit,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    await sendTelegramMessageWithKeyboard(chatId, confirmMessage, keyboard);
                    res.sendStatus(200);
                    return;
                }
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

    const userDoc = await db.collection("users").doc(uid).get();
    const role = userDoc.exists ? userDoc.data().role : "";
    if (role !== "admin" && role !== "superadmin" && role !== "owner") {
        throw new HttpsError("permission-denied", "Unauthorized to send campaigns.");
    }

    try {
        const usersSnapshot = await db.collection("users")
            .where("isUnsubscribed", "!=", true)
            .get();

        const recipients = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email,
            telegramChatId: doc.data().telegramChatId || doc.data().telegram_chat_id,
            name: doc.data().displayName || doc.data().name || "Guest"
        }));

        let sentEmailCount = 0;
        let sentTelegramCount = 0;

        // 1. Telegram Dual-Channel Broadcast
        const tgRecipients = recipients.filter(r => r.telegramChatId);
        for (const r of tgRecipients) {
            try {
                const tgMsg = `📣 <b>${title}</b>\n\n${text}${actionLink ? `\n\n🔗 <a href="${actionLink}">Подробнее / Learn More</a>` : ''}`;
                await sendTelegramMessage(r.telegramChatId, tgMsg);
                sentTelegramCount++;
            } catch (tgErr) {
                logger.warn(`Telegram bulk broadcast error for chatId ${r.telegramChatId}:`, tgErr);
            }
        }

        // 2. Email Dual-Channel Broadcast
        const emailRecipients = recipients.filter(r => r.email);
        const batchSize = 100;

        for (let i = 0; i < emailRecipients.length; i += batchSize) {
            const batch = emailRecipients.slice(i, i + batchSize);

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
            } else {
                sentEmailCount += batch.length;
            }
        }

        // Save campaign record with dual channel results
        await db.collection("campaigns").add({
            title,
            text,
            imageUrl,
            actionLink,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            recipientsCount: recipients.length,
            successEmailCount: sentEmailCount,
            successTelegramCount: sentTelegramCount,
            totalSuccessCount: sentEmailCount + sentTelegramCount
        });

        return { 
            status: "success", 
            emailCount: sentEmailCount, 
            telegramCount: sentTelegramCount, 
            totalCount: sentEmailCount + sentTelegramCount 
        };
    } catch (err) {
        logger.error("Bulk campaign failed", err);
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
 * Helper to send Telegram Messages with Keyboard
 */
async function sendTelegramMessageWithKeyboard(chatId, text, keyboard) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML', reply_markup: keyboard })
    });
}

/**
 * Helper to edit Telegram Messages
 */
async function editTelegramMessage(chatId, messageId, text, keyboard = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
    const body = { chat_id: chatId, message_id: messageId, text: text, parse_mode: 'HTML' };
    if (keyboard) {
        body.reply_markup = keyboard;
    }
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

/**
 * Helper to answer callback queries
 */
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
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

exports.setupCors = onRequest(async (req, res) => {
    try {
        const bucket = require('firebase-admin').storage().bucket('bot-lab-21910.firebasestorage.app');
        await bucket.setCorsConfiguration([{
            origin: ['*'],
            method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
            maxAgeSeconds: 3600
        }]);
        res.send("CORS updated!");
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

/**
 * Owner Notification: Staff Join Request Submitted
 * Sends Telegram message to Venue Owner with button opening Admin Panel
 */
exports.onStaffRequestCreated = onDocumentCreated("staff_requests/{requestId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const { venueId, name, email, requestedRole } = data;

    try {
        let ownerChatId = null;
        let venueName = "Заведение";

        if (venueId) {
            const venueDoc = await db.collection("venues").doc(venueId).get();
            if (venueDoc.exists) {
                const venueData = venueDoc.data();
                venueName = venueData.name || venueName;
                const ownerEmail = venueData.ownerEmail;
                const ownerId = venueData.ownerId;

                if (ownerId) {
                    const ownerSnap = await db.collection("users").doc(ownerId).get();
                    if (ownerSnap.exists) {
                        const oData = ownerSnap.data();
                        ownerChatId = oData.telegramChatId || oData.telegram_chat_id;
                    }
                }

                if (!ownerChatId && ownerEmail) {
                    const ownerByEmail = await db.collection("users")
                        .where("email", "==", ownerEmail.toLowerCase())
                        .limit(1)
                        .get();
                    if (!ownerByEmail.empty) {
                        const oData = ownerByEmail.docs[0].data();
                        ownerChatId = oData.telegramChatId || oData.telegram_chat_id;
                    }
                }
            }
        }

        const roleLabels = {
            manager: 'Управляющий',
            waiter: 'Официант',
            barista: 'Бариста',
            cashier: 'Кассир',
            staff: 'Сотрудник'
        };
        const roleTitle = roleLabels[requestedRole] || requestedRole || 'Сотрудник';

        const message = `🔔 <b>Новая заявка сотрудника!</b>\n\n` +
            `🏛 <b>Заведение:</b> ${venueName}\n` +
            `👤 <b>Имя:</b> ${name || 'Сотрудник'}\n` +
            `📧 <b>Email:</b> ${email || 'Не указан'}\n` +
            `💼 <b>Должность:</b> ${roleTitle}\n\n` +
            `Нажмите кнопку ниже, чтобы открыть панель управления и подтвердить права сотрудника:`;

        const keyboard = {
            inline_keyboard: [
                [
                    {
                        text: "⚙️ Открыть панель и назначить роли",
                        url: "https://bot-lab-21910.web.app/admin/#/owner"
                    }
                ]
            ]
        };

        if (ownerChatId) {
            await sendTelegramMessageWithKeyboard(ownerChatId, message, keyboard);
            logger.info(`Staff request Telegram notification sent to owner chatId: ${ownerChatId}`);
        } else if (SUPER_ADMIN_CHAT_ID && SUPER_ADMIN_CHAT_ID !== "YOUR_SUPER_ADMIN_CHAT_ID") {
            await sendTelegramMessageWithKeyboard(SUPER_ADMIN_CHAT_ID, message, keyboard);
            logger.info("Staff request Telegram notification sent to super admin");
        }
    } catch (err) {
        logger.error("Error sending staff request Telegram notification:", err);
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
            to: ["friiendlycode@gmail.com"], // Correct address as per user
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
 * Scenario D2: New B2B Audit Lead (Widget)
 * Trigger: onDocumentCreated("leads_b2b_audit/{leadId}")
 */
exports.onB2BLeadAuditCreated = onDocumentCreated("leads_b2b_audit/{leadId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const leadData = snapshot.data();
    const { contact, placeName, placeRating, placeReviews, healthScore } = leadData;

    try {
        const tgMsg = `🔥 <b>НОВЫЙ ЛИД С АУДИТА КАРТ!</b>\n\n` +
            `📞 <b>Контакт:</b> <code>${contact}</code>\n` +
            `🏢 <b>Заведение:</b> ${placeName}\n` +
            `⭐ <b>Рейтинг:</b> ${placeRating} (${placeReviews} отз.)\n` +
            `🩺 <b>Health Score:</b> ${healthScore}/100\n\n` +
            `<i>Свяжитесь с клиентом как можно скорее, чтобы закрыть сделку!</i>`;

        // Send to Super Admin
        if (SUPER_ADMIN_CHAT_ID && SUPER_ADMIN_CHAT_ID !== "YOUR_SUPER_ADMIN_CHAT_ID") {
            await sendTelegramMessage(SUPER_ADMIN_CHAT_ID, tgMsg).catch(e => logger.warn("Telegram alert error (SA):", e));
        }

        // Send to all Admins with Telegram
        const adminsSnap = await db.collection("users").where("role", "in", ["admin", "superAdmin"]).get();
        const sentChatIds = new Set([String(SUPER_ADMIN_CHAT_ID)]);

        for (const doc of adminsSnap.docs) {
            const data = doc.data();
            const chatId = data.telegramChatId || data.telegram_chat_id;
            if (chatId && !sentChatIds.has(String(chatId))) {
                sentChatIds.add(String(chatId));
                await sendTelegramMessage(chatId, tgMsg).catch(e => logger.warn("Telegram alert error (Admin):", e));
            }
        }
    } catch (err) {
        logger.error("Error sending B2B audit lead notification:", err);
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

                // Detect Venue Language (defaulting to venue's setting or English)
                const lang = (venueData.language || venueData.locale || 'ru').toLowerCase();
                
                let subject = `⚠️ Твоя скидка ${maxTier}% в ${venueName} сгорит завтра! ☕✨`;
                let bodyHtml = '';

                if (lang.startsWith('vi')) {
                    subject = `⚠️ Ưu đãi ${maxTier}% tại ${venueName} sẽ giảm vào ngày mai! 🏃‍♂️`;
                    bodyHtml = `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 36px; background-color: #000000; border-radius: 28px; color: #FFFFFF; text-align: center; border: 1px solid #333;">
                            <span style="font-size: 48px; display: block; margin-bottom: 12px;">☕✨</span>
                            <h1 style="font-size: 26px; font-weight: 900; margin-bottom: 16px; color: #FFD700;">Ưu đãi VIP của bạn sắp hết hạn!</h1>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #CCCCCC;">
                                Chào <strong>${candidate.guestName}</strong>! Mức giảm giá <strong>${maxTier}%</strong> tại <strong>${venueName}</strong> sẽ giảm xuống <strong>${nextTier}%</strong> vào ngày mai!
                            </p>
                            <div style="background: rgba(255, 215, 0, 0.1); padding: 24px; border-radius: 20px; border: 1px solid rgba(255, 215, 0, 0.3); margin-bottom: 24px;">
                                <p style="font-size: 14px; margin-bottom: 8px; color: #AAAAAA; text-transform: uppercase; font-weight: bold;">Ngày mai sẽ giảm còn:</p>
                                <span style="font-size: 52px; font-weight: 900; color: #00FF41; line-height: 1;">${nextTier}%</span>
                            </div>
                            <p style="font-size: 15px; font-weight: 700; color: #FFFFFF; background-color: #1C1C1E; padding: 18px; border-radius: 16px;">
                                🏃‍♂️ Ghé thăm chúng tôi hôm nay để gia hạn mức giảm giá tối đa nhé! 😉☕
                            </p>
                        </div>
                    `;
                } else if (lang.startsWith('en')) {
                    subject = `⚠️ Your ${maxTier}% perk at ${venueName} cools down tomorrow! ☕✨`;
                    bodyHtml = `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 36px; background-color: #000000; border-radius: 28px; color: #FFFFFF; text-align: center; border: 1px solid #333;">
                            <span style="font-size: 48px; display: block; margin-bottom: 12px;">☕✨</span>
                            <h1 style="font-size: 26px; font-weight: 900; margin-bottom: 16px; color: #FFD700;">Your VIP Discount is Expiring!</h1>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #CCCCCC;">
                                Hey <strong>${candidate.guestName}</strong>! Your <strong>${maxTier}%</strong> discount at <strong>${venueName}</strong> drops to <strong>${nextTier}%</strong> tomorrow!
                            </p>
                            <div style="background: rgba(255, 215, 0, 0.1); padding: 24px; border-radius: 20px; border: 1px solid rgba(255, 215, 0, 0.3); margin-bottom: 24px;">
                                <p style="font-size: 14px; margin-bottom: 8px; color: #AAAAAA; text-transform: uppercase; font-weight: bold;">Tomorrow it drops to:</p>
                                <span style="font-size: 52px; font-weight: 900; color: #00FF41; line-height: 1;">${nextTier}%</span>
                            </div>
                            <p style="font-size: 15px; font-weight: 700; color: #FFFFFF; background-color: #1C1C1E; padding: 18px; border-radius: 16px;">
                                🏃‍♂️ Pop in today to keep your maximum discount alive! 😉☕
                            </p>
                        </div>
                    `;
                } else {
                    // Default Russian (Friendly light tone)
                    bodyHtml = `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 36px; background-color: #000000; border-radius: 28px; color: #FFFFFF; text-align: center; border: 1px solid #333;">
                            <span style="font-size: 48px; display: block; margin-bottom: 12px;">☕✨</span>
                            <h1 style="font-size: 26px; font-weight: 900; margin-bottom: 16px; color: #FFD700;">Твоя VIP-скидка скучает!</h1>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #CCCCCC;">
                                Привет, <strong>${candidate.guestName}</strong>! Напоминаем, что твоя максимальная скидка <strong>${maxTier}%</strong> в <strong>${venueName}</strong> уже завтра станет <strong>${nextTier}%</strong>!
                            </p>
                            <div style="background: rgba(212, 175, 55, 0.15); padding: 24px; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.4); margin-bottom: 24px;">
                                <p style="font-size: 13px; margin-bottom: 8px; color: #AAAAAA; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Завтра сумма скидки станет:</p>
                                <span style="font-size: 52px; font-weight: 900; color: #00FF41; line-height: 1;">${nextTier}%</span>
                            </div>
                            <p style="font-size: 15px; font-weight: 700; color: #FFFFFF; background-color: #1C1C1E; padding: 18px; border-radius: 16px;">
                                🏃‍♂️ Забегай к нам сегодня на чашечку кофе или обед, чтобы мгновенно обнулить таймер и сохранить максимум! 😉☕💛
                            </p>
                        </div>
                    `;
                }

                const { error } = await resend.emails.send({
                    from: "Friendly Code <no-reply@friendlycode.fun>",
                    to: [candidate.email],
                    subject: subject,
                    html: bodyHtml
                });

                if (error) {
                    logger.error("Resend reminder error:", error);
                } else {
                    logger.info(`Sent discount drop reminder to ${candidate.email} for venue ${candidate.venueId}`);
                }

                // Send Telegram DM alert if candidate has Telegram connected
                try {
                    let guestChatId = null;
                    const uSnap = await db.collection("users").where("email", "==", candidate.email.toLowerCase()).limit(1).get();
                    if (!uSnap.empty) {
                        guestChatId = uSnap.docs[0].data().telegramChatId || uSnap.docs[0].data().telegram_chat_id;
                    }
                    if (guestChatId) {
                        const tgDecayMsg = `⚠️ <b>Твоя скидка ${maxTier}% в ${venueName} сгорит завтра!</b> ☕✨\n\n` +
                            `Привет, <b>${candidate.guestName}</b>! Твоя максимальная скидка ${maxTier}% в ${venueName} уже завтра станет <b>${nextTier}%</b>.\n\n` +
                            `🏃‍♂️ Забегай к нам сегодня, чтобы обнулить таймер и сохранить максимум! 😉☕`;
                        await sendTelegramMessage(guestChatId, tgDecayMsg).catch(e => logger.warn("Telegram decay alert error:", e));
                    }
                } catch (tgDecayErr) {
                    logger.warn("Error sending Telegram discount decay alert:", tgDecayErr);
                }
            }
        }
    }
});

/**
 * Scenario F: Subscription Expiry Reminder & Auto-Deactivation (Daily at 10:00 MSK)
 * Logic:
 * 1. Checks all venues.
 * 2. If subscription is expired (expiryDate <= now), sets venue.isActive = false in Firestore and notifies Owner + SuperAdmin.
 * 3. If subscription expires in <= 15 days, sends daily notifications to Owner Cabinet, Owner Email, Owner Telegram, and SuperAdmin Telegram.
 */
exports.subscriptionExpiryReminder = onSchedule({
    schedule: "0 10 * * *",
    timeZone: "Europe/Moscow"
}, async (event) => {
    logger.info("Running daily subscription expiry check & notification engine...");

    try {
        const venuesSnapshot = await db.collection("venues").get();
        if (venuesSnapshot.empty) {
            logger.info("No venues found in system.");
            return;
        }

        const now = new Date();

        for (const docSnapshot of venuesSnapshot.docs) {
            const venueData = docSnapshot.data();
            const venueId = docSnapshot.id;
            const venueName = venueData.name || "Unknown Venue";
            
            const sub = venueData.subscription || {};
            if (!sub.expiryDate) continue; // No expiry date set

            const expiryDate = sub.expiryDate.toDate ? sub.expiryDate.toDate() : new Date(sub.expiryDate);
            const diffMs = expiryDate.getTime() - now.getTime();
            const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            let ownerEmail = venueData.ownerEmail;
            let ownerChatId = null;

            if (venueData.ownerId) {
                const ownerDoc = await db.collection("users").doc(venueData.ownerId).get();
                if (ownerDoc.exists) {
                    const oData = ownerDoc.data();
                    if (!ownerEmail && oData.email) ownerEmail = oData.email;
                    ownerChatId = oData.telegramChatId || oData.telegram_chat_id;
                }
            }

            if (!ownerChatId && ownerEmail) {
                const ownerByEmail = await db.collection("users")
                    .where("email", "==", ownerEmail.toLowerCase())
                    .limit(1)
                    .get();
                if (!ownerByEmail.empty) {
                    const oData = ownerByEmail.docs[0].data();
                    ownerChatId = oData.telegramChatId || oData.telegram_chat_id;
                }
            }

            // --- CASE A: EXPIRED (daysRemaining <= 0) ---
            if (daysRemaining <= 0) {
                if (venueData.isActive !== false) {
                    logger.info(`Venue ${venueName} (${venueId}) subscription expired. Automatically deactivating.`);
                    await docSnapshot.ref.update({ isActive: false });
                }

                // 1. In-App Notification
                await db.collection("notifications").add({
                    type: "subscription_expired",
                    venueId: venueId,
                    title: "🚫 Подписка истекла!",
                    message: `Срок действия подписки для заведения ${venueName} истек (${expiryDate.toLocaleDateString()}). Заведение переведено в неактивное состояние.`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    read: false,
                }).catch(e => logger.warn("Error adding in-app notification:", e));

                // 2. Email Notification to Owner
                if (ownerEmail) {
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px; background-color: #1c1c1e; color: #ffffff; border-radius: 16px;">
                            <h2 style="color: #ff3b30;">🚫 Подписка заведения ${venueName} истекла</h2>
                            <p>Здравствуйте!</p>
                            <p>Срок действия подписки для вашего заведения <b>${venueName}</b> закончился (${expiryDate.toLocaleDateString()}).</p>
                            <p>Доступ к системе приостановлен. Пожалуйста, продлите подписку в панели управления.</p>
                            <br/>
                            <p>С уважением,<br/>Команда Revoo / Friendly Code</p>
                        </div>
                    `;
                    await resend.emails.send({
                        from: "Friendly Code <no-reply@friendlycode.fun>",
                        to: [ownerEmail],
                        subject: `🚫 Срочно: Подписка заведения ${venueName} истекла!`,
                        html: html
                    }).catch(e => logger.error("Error sending expiry email to owner:", e));
                }

                // 3. Telegram to Owner
                if (ownerChatId) {
                    const tgMsg = `🚫 <b>Подписка истекла!</b>\n\nСрок подписки для заведения <b>${venueName}</b> закончился (${expiryDate.toLocaleDateString()}). Заведение переведено в неактивный режим. Продлите подписку в панели управления!`;
                    await sendTelegramMessage(ownerChatId, tgMsg).catch(e => logger.warn("Telegram expiry alert error:", e));
                }

                // 4. Telegram to SuperAdmin
                if (SUPER_ADMIN_CHAT_ID && SUPER_ADMIN_CHAT_ID !== "YOUR_SUPER_ADMIN_CHAT_ID") {
                    const saMsg = `🚨 <b>[SuperAdmin Alert] Подписка истекла!</b>\n\n🏛 Заведение: <b>${venueName}</b>\n📧 Owner: ${ownerEmail || 'N/A'}\n📅 Дата: ${expiryDate.toLocaleDateString()}\n⚠️ Заведение автоматически деактивировано.`;
                    await sendTelegramMessage(SUPER_ADMIN_CHAT_ID, saMsg).catch(e => logger.warn("SuperAdmin telegram alert error:", e));
                }

            // --- CASE B: EXPIRING SOON (15 days or less) ---
            } else if (daysRemaining <= 15) {
                logger.info(`Venue ${venueName} (${venueId}) subscription expiring in ${daysRemaining} days. Sending daily reminders.`);

                // 1. In-App Notification
                await db.collection("notifications").add({
                    type: "subscription_expiring",
                    venueId: venueId,
                    title: "⚠️ Срок действия подписки истекает!",
                    message: `До окончания подписки заведения ${venueName} осталось ${daysRemaining} дней (до ${expiryDate.toLocaleDateString()}).`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    read: false,
                }).catch(e => logger.warn("Error adding in-app notification:", e));

                // 2. Email Notification to Owner
                if (ownerEmail) {
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px; background-color: #1c1c1e; color: #ffffff; border-radius: 16px;">
                            <h2 style="color: #ff9500;">⚠️ Подписка истекает через ${daysRemaining} дней</h2>
                            <p>Здравствуйте!</p>
                            <p>Напоминаем, что подписка для заведения <b>${venueName}</b> действует до <b>${expiryDate.toLocaleDateString()}</b> (${daysRemaining} дней осталось).</p>
                            <p>Пожалуйста, продлите подписку, чтобы избежать приостановки обслуживания.</p>
                            <br/>
                            <p>С уважением,<br/>Команда Revoo / Friendly Code</p>
                        </div>
                    `;
                    await resend.emails.send({
                        from: "Friendly Code <no-reply@friendlycode.fun>",
                        to: [ownerEmail],
                        subject: `⚠️ Напоминание: Подписка ${venueName} истекает через ${daysRemaining} дн.`,
                        html: html
                    }).catch(e => logger.error("Error sending expiry reminder email:", e));
                }

                // 3. Telegram to Owner
                if (ownerChatId) {
                    const tgMsg = `⚠️ <b>Внимание: Подписка истекает!</b>\n\nДо окончания подписки заведения <b>${venueName}</b> осталось <b>${daysRemaining} дн.</b> (до ${expiryDate.toLocaleDateString()}).\nПожалуйста, продлите подписку в панели управления.`;
                    await sendTelegramMessage(ownerChatId, tgMsg).catch(e => logger.warn("Telegram expiry reminder error:", e));
                }

                // 4. Telegram Daily Alert to SuperAdmin
                if (SUPER_ADMIN_CHAT_ID && SUPER_ADMIN_CHAT_ID !== "YOUR_SUPER_ADMIN_CHAT_ID") {
                    const saMsg = `⏳ <b>[SuperAdmin Alert] Истекает подписка!</b>\n\n🏛 Заведение: <b>${venueName}</b>\n📧 Owner: ${ownerEmail || 'N/A'}\n⏱ Осталось: <b>${daysRemaining} дн.</b> (${expiryDate.toLocaleDateString()})`;
                    await sendTelegramMessage(SUPER_ADMIN_CHAT_ID, saMsg).catch(e => logger.warn("SuperAdmin telegram reminder error:", e));
                }
            }
        }
    } catch (err) {
        logger.error("Error in subscriptionExpiryReminder: ", err);
    }
});

/**
 * Endpoint to authorize a MAC address for captive Wi-Fi gateway.
 */
exports.wifiAuthorize = onRequest(async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "POST");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    const { mac, venueId, discount } = req.body || {};

    if (!mac || !venueId) {
        res.status(400).send("Missing required parameters: mac and venueId");
        return;
    }

    try {
        await db.collection("wifi_authorizations").add({
            mac,
            venueId,
            discount: discount || 5,
            authorizedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "active"
        });

        logger.info(`MAC address ${mac} authorized for venue ${venueId}`);

        res.status(200).json({
            success: true,
            message: `Device ${mac} authorized for VIP Wi-Fi access.`
        });
    } catch (e) {
        logger.error("Error authorizing Wi-Fi client:", e);
        res.status(500).send("Internal Server Error");
    }
});

/**
 * GET API endpoint: /api/user/hotspots-map
 * Calculates personalized discount mapping and Wi-Fi speed specs for map markers.
 */
exports.hotspotsMap = onRequest(async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "GET");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.status(204).send("");
        return;
    }

    if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    let userId = null;
    let userEmail = null;
    let depositBalance = 0;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split("Bearer ")[1];
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            userId = decodedToken.uid;
            
            // Fetch user doc
            const userDoc = await db.collection("users").doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userEmail = userData.email;
                depositBalance = Number(userData.deposit_balance ?? 0);
            }
        } catch (e) {
            logger.error("Error verifying ID token:", e);
        }
    }

    try {
        const venuesSnapshot = await db.collection("venues").where("isActive", "==", true).get();
        const results = [];

        for (const venueDoc of venuesSnapshot.docs) {
            const venueId = venueDoc.id;
            const venueData = venueDoc.data();
            
            const latitude = venueData.latitude;
            const longitude = venueData.longitude;
            if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
                continue;
            }

            let userDiscount = 5;
            let tierLevel = 4;

            if (userId) {
                if (depositBalance > 0) {
                    const tiersSnapshot = await db.collection("deposit_tiers")
                        .where("venueId", "==", venueId)
                        .orderBy("minBalanceThreshold", "desc")
                        .get();
                    let matched = false;
                    tiersSnapshot.forEach(doc => {
                        if (!matched) {
                            const tier = doc.data();
                            if (depositBalance >= (tier.minBalanceThreshold ?? 0)) {
                                userDiscount = tier.discountPercentage ?? 5;
                                tierLevel = tier.tierLevel ?? 4;
                                matched = true;
                            }
                        }
                    });
                }

                if (depositBalance <= 0 && userEmail) {
                    const visitsSnapshot = await db.collection("visits")
                        .where("guestEmail", "==", userEmail)
                        .where("venueId", "==", venueId)
                        .orderBy("timestamp", "desc")
                        .limit(10)
                        .get();

                    if (!visitsSnapshot.empty) {
                        const visits = [];
                        visitsSnapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.timestamp) {
                                visits.push(data.timestamp.toDate());
                            }
                        });
                        
                        visits.sort((a, b) => b - a);
                        const lastVisit = visits[0];
                        const diffTime = Math.abs(Date.now() - lastVisit.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        const config = venueData.loyaltyConfig || {};
                        const vipWindowDays = config.vipWindowDays ?? 2;
                        const decayStages = config.decayStages || [
                            { days: 3, discount: 15 },
                            { days: 10, discount: 10 }
                        ];
                        const percBase = config.percBase ?? 5;
                        const percVip = config.percVip ?? 20;

                        if (diffDays <= vipWindowDays) {
                            userDiscount = percVip;
                            tierLevel = 1;
                        } else {
                            let decayMatched = false;
                            const sortedStages = [...decayStages].sort((a, b) => a.days - b.days);
                            for (const stage of sortedStages) {
                                if (diffDays <= stage.days) {
                                    userDiscount = stage.discount;
                                    if (stage.discount >= 15) {
                                        tierLevel = 2;
                                    } else if (stage.discount >= 10) {
                                        tierLevel = 3;
                                    } else {
                                        tierLevel = 4;
                                    }
                                    decayMatched = true;
                                    break;
                                }
                            }
                            if (!decayMatched) {
                                userDiscount = percBase;
                                tierLevel = 4;
                            }
                        }
                    }
                }
            }

            results.push({
                venue_id: venueId,
                name: venueData.name || "",
                latitude: Number(latitude),
                longitude: Number(longitude),
                wifi_speed_mbps: Number(venueData.wifi_speed_mbps ?? 100),
                user_discount_percentage: Number(userDiscount),
                tier_level: Number(tierLevel),
                google_maps_url: venueData.googleMapsUrl || venueData.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
            });
        }

        res.status(200).json(results);
    } catch (e) {
        logger.error("Error in hotspotsMap function:", e);
        res.status(500).send("Internal Server Error");
    }
});

/**
 * Resolves short Google Maps URLs to their redirect target and extracts lat/lng coords via regex.
 */
async function resolveMapsCoordinates(url) {
    let finalUrl = url;
    
    // Check if it's a shortened link
    if (url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps") || url.includes("t.co") || url.includes("bit.ly")) {
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            finalUrl = response.url;
            logger.info(`Resolved short Google Maps URL ${url} to ${finalUrl}`);
        } catch (e) {
            logger.error(`Error resolving redirect for URL ${url}:`, e);
        }
    }

    // Extraction patterns
    const patternA = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const patternB = /[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const patternC = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;

    let match = finalUrl.match(patternA);
    if (!match) match = finalUrl.match(patternB);
    if (!match) match = finalUrl.match(patternC);

    let coords = null;
    if (match) {
        const latitude = parseFloat(match[1]);
        const longitude = parseFloat(match[2]);
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
            coords = { latitude, longitude };
        }
    }
    return { coords, resolvedUrl: finalUrl };
}

/**
 * Triggers on venue create/update to unshorten googleMapsUrl and backfill coordinates.
 */
exports.onVenueWritten = onDocumentWritten("venues/{venueId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.after.data();
    const prevData = snapshot.before ? snapshot.before.data() : null;

    if (!data) return;

    const googleMapsUrl = data.googleMapsUrl || data.google_maps_url;
    const prevGoogleMapsUrl = prevData ? (prevData.googleMapsUrl || prevData.google_maps_url) : null;

    const hasUrlChanged = googleMapsUrl !== prevGoogleMapsUrl;
    const needsCoordinates = data.latitude === undefined || data.longitude === undefined || data.latitude === null || data.longitude === null;

    if (googleMapsUrl && (hasUrlChanged || needsCoordinates)) {
        try {
            const { coords, resolvedUrl } = await resolveMapsCoordinates(googleMapsUrl);
            const updateData = {};
            
            if (coords) {
                const { latitude, longitude } = coords;
                if (data.latitude !== latitude || data.longitude !== longitude) {
                    updateData.latitude = latitude;
                    updateData.longitude = longitude;
                }
            }
            
            if (resolvedUrl && resolvedUrl !== googleMapsUrl) {
                updateData.googleReviewLink = resolvedUrl;
            }
            
            if (Object.keys(updateData).length > 0) {
                logger.info(`Automatically updating venue ${event.params.venueId} with:`, updateData);
                await snapshot.after.ref.update(updateData);
            }
        } catch (e) {
            logger.error("Error resolving venue coordinates from Google Maps URL:", e);
        }
    }
});

/**
 * Cloud Function: Deduplicate users in Firestore by email.
 * Merges duplicate user records into a single primary record per unique email address,
 * updates references in visits, leads, deposit_transactions, etc., and deletes secondary duplicate records.
 */
exports.deduplicateUsers = onCall(async (request) => {
    try {
        const usersSnap = await db.collection("users").get();
        const usersByEmail = {};

        usersSnap.forEach(docSnap => {
            const data = docSnap.data();
            const email = (data.email || "").trim().toLowerCase();
            if (!email || !email.includes("@")) return;
            if (email.endsWith("@guest.com") || email.endsWith("@telegram.user") || email.endsWith("@friendlycode.fun")) return;

            if (!usersByEmail[email]) usersByEmail[email] = [];
            usersByEmail[email].push({ id: docSnap.id, data });
        });

        const ROLE_SCORES = { superadmin: 10, superAdmin: 10, admin: 8, owner: 7, staff: 5, guest: 1 };
        const getRoleScore = (role) => ROLE_SCORES[role] || 1;

        let totalMergedCount = 0;
        let emailsProcessed = 0;
        const mergedDetails = [];

        for (const [email, docs] of Object.entries(usersByEmail)) {
            if (docs.length <= 1) continue;
            emailsProcessed++;

            docs.sort((a, b) => {
                const scoreA = getRoleScore(a.data.role);
                const scoreB = getRoleScore(b.data.role);
                if (scoreA !== scoreB) return scoreB - scoreA;

                const balA = Number(a.data.deposit_balance || 0);
                const balB = Number(b.data.deposit_balance || 0);
                if (balA !== balB) return balB - balA;

                const timeA = a.data.createdAt?.seconds || 9999999999;
                const timeB = b.data.createdAt?.seconds || 9999999999;
                return timeA - timeB;
            });

            const primaryDoc = docs[0];
            const primaryUid = primaryDoc.id;
            const secondaryDocs = docs.slice(1);

            let mergedRole = primaryDoc.data.role || 'guest';
            let mergedName = primaryDoc.data.displayName || primaryDoc.data.name || 'Guest';
            let mergedTelegram = primaryDoc.data.telegram || '';
            let mergedDepositBalances = { ...(primaryDoc.data.deposit_balances || {}) };
            let mergedDeposits = { ...(primaryDoc.data.deposits || {}) };
            let maxDepositBalance = Number(primaryDoc.data.deposit_balance || 0);

            for (const docObj of docs) {
                const data = docObj.data;
                if (getRoleScore(data.role) > getRoleScore(mergedRole)) mergedRole = data.role;
                if ((!mergedName || mergedName === 'Guest') && (data.displayName || data.name)) {
                    mergedName = data.displayName || data.name;
                }
                if (!mergedTelegram && data.telegram) mergedTelegram = data.telegram;
                if (Number(data.deposit_balance || 0) > maxDepositBalance) maxDepositBalance = Number(data.deposit_balance);

                if (data.deposit_balances) {
                    Object.keys(data.deposit_balances).forEach(vId => {
                        const val = Number(data.deposit_balances[vId] || 0);
                        mergedDepositBalances[vId] = Math.max(mergedDepositBalances[vId] || 0, val);
                    });
                }
            }

            // Save primary
            await db.collection("users").doc(primaryUid).set({
                email,
                displayName: (mergedName || 'Guest').trim(),
                role: mergedRole,
                ...(mergedTelegram ? { telegram: mergedTelegram } : {}),
                deposit_balance: maxDepositBalance,
                deposit_balances: mergedDepositBalances,
                deposits: mergedDeposits,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Reassign related records and delete secondaries
            for (const sec of secondaryDocs) {
                const secUid = sec.id;
                totalMergedCount++;

                // Reassign visits
                const visits1 = await db.collection("visits").where("uid", "==", secUid).get();
                for (const vDoc of visits1.docs) {
                    await vDoc.ref.update({ uid: primaryUid, userId: primaryUid, guestEmail: email });
                }
                const visits2 = await db.collection("visits").where("userId", "==", secUid).get();
                for (const vDoc of visits2.docs) {
                    await vDoc.ref.update({ uid: primaryUid, userId: primaryUid, guestEmail: email });
                }

                // Reassign leads
                const leads = await db.collection("leads").where("uid", "==", secUid).get();
                for (const lDoc of leads.docs) {
                    await lDoc.ref.update({ uid: primaryUid, email });
                }

                // Reassign deposit_transactions
                const txs = await db.collection("deposit_transactions").where("userId", "==", secUid).get();
                for (const tDoc of txs.docs) {
                    await tDoc.ref.update({ userId: primaryUid, guestEmail: email });
                }

                // Delete secondary doc
                await db.collection("users").doc(secUid).delete();
            }

            mergedDetails.push({ email, primaryUid, removedCount: secondaryDocs.length });
        }

        return {
            success: true,
            emailsProcessed,
            totalMergedCount,
            mergedDetails
        };
    } catch (e) {
        logger.error("Error in deduplicateUsers:", e);
        throw new HttpsError("internal", e.message || String(e));
    }
});
