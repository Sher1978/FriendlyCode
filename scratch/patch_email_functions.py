import os

file_path = r"c:\Sher_AI_Studio\projects\FriendlyCode\functions\index.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update onUserCreated
on_user_created_target = """exports.onUserCreated = onDocumentCreated("users/{uid}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const data = snapshot.data();

    // Notify Super Admin
    if (SUPER_ADMIN_CHAT_ID === "YOUR_SUPER_ADMIN_CHAT_ID") return; // Skip if not configured

    const message = `🚀 <b>Новый пользователь!</b>\\n\\n👤 ${data.name || "No Name"}\\n📧 ${data.email || "No Email"}`;
    await sendTelegramMessage(SUPER_ADMIN_CHAT_ID, message);
});"""

on_user_created_replacement = """exports.onUserCreated = onDocumentCreated("users/{uid}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const data = snapshot.data();

    // 1. Send Welcome Email
    if (data.email) {
        try {
            const emailControls = await getEmailControls();
            if (emailControls.enableWelcomeEmails !== false) {
                await resend.emails.send({
                    from: "Friendly Code <no-reply@friendlycode.fun>",
                    to: [data.email],
                    subject: `Welcome to Friendly Code! 🎉`,
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #FAFAFA; border-radius: 24px; color: #333333;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <span style="font-size: 14px; font-weight: 900; letter-spacing: 2px; color: #000000; text-transform: uppercase;">Friendly Code</span>
                            </div>
                            <p style="font-size: 20px; font-weight: 500; margin-bottom: 24px; text-align: center;">
                                Hi ${data.displayName || data.name || "there"}, welcome to <strong>Friendly Code</strong>! 👋
                            </p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #555555; text-align: center;">
                                We're thrilled to have you on board. Start scanning QR codes at your favorite venues to unlock exclusive dynamic discounts and build up your loyalty tiers!
                            </p>
                            <div style="text-align: center; margin-top: 40px; border-top: 1px solid #EEEEEE; padding-top: 20px;">
                                <p style="font-size: 14px; color: #999999;">Friendly Code Team</p>
                            </div>
                        </div>
                    `
                });
                logger.info(`Welcome email sent to ${data.email}`);
            }
        } catch (error) {
            logger.error(`Failed to send welcome email to ${data.email}:`, error);
        }
    }

    // 2. Notify Super Admin
    if (SUPER_ADMIN_CHAT_ID === "YOUR_SUPER_ADMIN_CHAT_ID") return; // Skip if not configured

    const message = `🚀 <b>Новый пользователь!</b>\\n\\n👤 ${data.name || "No Name"}\\n📧 ${data.email || "No Email"}`;
    await sendTelegramMessage(SUPER_ADMIN_CHAT_ID, message);
});"""

content = content.replace(on_user_created_target, on_user_created_replacement)


# 2. Update dailyStatsReport
daily_stats_target = """        const totalScans = todayVisits.size;
        const previousScans = yesterdayVisits.size;

        const activatedDiscounts = todayVisits.docs.filter(doc => doc.data().status === "activated").length;
        const conversionRate = totalScans > 0 ? Math.round((activatedDiscounts / totalScans) * 100) : 0;"""

daily_stats_replacement = """        const totalScans = todayVisits.size;
        const previousScans = yesterdayVisits.size;

        const activatedDocs = todayVisits.docs.filter(doc => doc.data().status === "activated");
        const activatedDiscounts = activatedDocs.length;
        const conversionRate = totalScans > 0 ? Math.round((activatedDiscounts / totalScans) * 100) : 0;
        
        // Calculate Unique Guests
        const uniqueGuestIds = new Set();
        let totalDiscountSum = 0;
        
        todayVisits.docs.forEach(doc => {
            const vData = doc.data();
            if (vData.uid && vData.uid !== 'anonymous') {
                uniqueGuestIds.add(vData.uid);
            } else if (vData.guestEmail) {
                uniqueGuestIds.add(vData.guestEmail.toLowerCase());
            } else if (vData.guestName) {
                uniqueGuestIds.add(vData.guestName); // Fallback
            }
            
            if (vData.status === "activated" && vData.discountValue) {
                totalDiscountSum += Number(vData.discountValue);
            }
        });
        const totalGuests = uniqueGuestIds.size;
        const averageDiscount = activatedDiscounts > 0 ? Math.round(totalDiscountSum / activatedDiscounts) : 0;"""

content = content.replace(daily_stats_target, daily_stats_replacement)

# Daily Stats Email Template
daily_email_target = """                            <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                                <div style="font-size: 28px; font-weight: 900; color: #4CAF50;">${conversionRate}%</div>
                                <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Конверсия</div>
                            </div>"""

daily_email_replacement = """                            <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                                <div style="font-size: 28px; font-weight: 900; color: #4CAF50;">${conversionRate}%</div>
                                <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Конверсия</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 15px; margin-bottom: 40px;">
                            <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                                <div style="font-size: 28px; font-weight: 900; color: #1976D2;">${totalGuests}</div>
                                <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Уникальных гостей</div>
                            </div>
                            <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                                <div style="font-size: 28px; font-weight: 900; color: #D32F2F;">${averageDiscount}%</div>
                                <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Средняя скидка</div>
                            </div>"""

content = content.replace(daily_email_target, daily_email_replacement)


# 3. Add missYouReminder and Test endpoints
new_functions = """

// ============================================================================
// WE MISS YOU REMINDER (14 DAYS)
// ============================================================================
exports.missYouReminder = onSchedule("0 10 * * *", async (event) => {
    logger.info("Starting We Miss You Reminder cron job...");
    
    try {
        const emailControls = await getEmailControls();
        if (emailControls.enableDiscountReminders === false) { // Reusing discount reminders setting or global toggle
            logger.info("Discount reminders disabled globally. Skipping miss you reminder.");
            return;
        }

        const now = Date.now();
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
        const fifteenDaysAgo = now - (15 * 24 * 60 * 60 * 1000);
        
        // Find users who were last seen between 14 and 15 days ago
        // To do this properly without complex composite indexes, we can just query users where lastSeen < 14 days ago,
        // and filter in memory if they haven't been emailed recently.
        
        const usersRef = db.collection("users");
        // We might not have an index on lastSeen, so we'll fetch recently active users or just users with email.
        // For robustness, let's fetch users with an email and process them.
        // In a very large DB, we'd need an index.
        const snapshot = await usersRef.where("email", "!=", null).get();
        
        let sentCount = 0;
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.lastSeen || !data.email) continue;
            
            const lastSeenTime = new Date(data.lastSeen).getTime();
            
            // Check if lastSeen is exactly 14-15 days ago
            if (lastSeenTime > fifteenDaysAgo && lastSeenTime <= fourteenDaysAgo) {
                // To prevent duplicates, check a flag (missYouSentAt)
                if (!data.missYouSentAt || new Date(data.missYouSentAt).getTime() < lastSeenTime) {
                    
                    // Send Email
                    await resend.emails.send({
                        from: "Friendly Code <no-reply@friendlycode.fun>",
                        to: [data.email],
                        subject: `We Miss You! 😢 Come back for rewards`,
                        html: `
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #F3E5F5; border-radius: 24px; color: #4A148C;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <span style="font-size: 24px;">👀</span>
                                </div>
                                <p style="font-size: 22px; font-weight: 800; margin-bottom: 24px; text-align: center;">
                                    It's been a while, ${data.displayName || data.name || "friend"}!
                                </p>
                                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; text-align: center; color: #6A1B9A;">
                                    We haven't seen you at our venues lately. Did you know you could be missing out on exclusive discounts and loyalty perks? 
                                    Come back and check in at any participating location to start saving again!
                                </p>
                                <div style="text-align: center;">
                                    <a href="https://friendlycode.fun" style="display: inline-block; padding: 14px 28px; background-color: #9C27B0; color: #FFFFFF; font-weight: bold; text-decoration: none; border-radius: 50px;">Find Venues</a>
                                </div>
                            </div>
                        `
                    });
                    
                    await doc.ref.update({
                        missYouSentAt: new Date().toISOString()
                    });
                    sentCount++;
                }
            }
        }
        
        logger.info(`Successfully sent ${sentCount} 'We Miss You' emails.`);
    } catch (error) {
        logger.error("Error in missYouReminder:", error);
    }
});


// ============================================================================
// TEST ENDPOINTS (TEMPORARY)
// ============================================================================
exports.testWelcomeEmail = onRequest(async (req, res) => {
    const targetEmail = req.query.email;
    if (!targetEmail) return res.status(400).send("Provide ?email= query param");
    try {
        await resend.emails.send({
            from: "Friendly Code <no-reply@friendlycode.fun>",
            to: [targetEmail],
            subject: `Welcome to Friendly Code! 🎉 (TEST)`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #FAFAFA; border-radius: 24px; color: #333333;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 14px; font-weight: 900; letter-spacing: 2px; color: #000000; text-transform: uppercase;">Friendly Code</span>
                    </div>
                    <p style="font-size: 20px; font-weight: 500; margin-bottom: 24px; text-align: center;">
                        Hi Tester, welcome to <strong>Friendly Code</strong>! 👋
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #555555; text-align: center;">
                        We're thrilled to have you on board. Start scanning QR codes at your favorite venues to unlock exclusive dynamic discounts and build up your loyalty tiers!
                    </p>
                    <div style="text-align: center; margin-top: 40px; border-top: 1px solid #EEEEEE; padding-top: 20px;">
                        <p style="font-size: 14px; color: #999999;">Friendly Code Team</p>
                    </div>
                </div>
            `
        });
        res.send(`Test Welcome Email sent to ${targetEmail}`);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

exports.testMissYouEmail = onRequest(async (req, res) => {
    const targetEmail = req.query.email;
    if (!targetEmail) return res.status(400).send("Provide ?email= query param");
    try {
        await resend.emails.send({
            from: "Friendly Code <no-reply@friendlycode.fun>",
            to: [targetEmail],
            subject: `We Miss You! 😢 Come back for rewards (TEST)`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #F3E5F5; border-radius: 24px; color: #4A148C;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 24px;">👀</span>
                    </div>
                    <p style="font-size: 22px; font-weight: 800; margin-bottom: 24px; text-align: center;">
                        It's been a while, Tester!
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; text-align: center; color: #6A1B9A;">
                        We haven't seen you at our venues lately. Did you know you could be missing out on exclusive discounts and loyalty perks? 
                        Come back and check in at any participating location to start saving again!
                    </p>
                    <div style="text-align: center;">
                        <a href="https://friendlycode.fun" style="display: inline-block; padding: 14px 28px; background-color: #9C27B0; color: #FFFFFF; font-weight: bold; text-decoration: none; border-radius: 50px;">Find Venues</a>
                    </div>
                </div>
            `
        });
        res.send(`Test Miss You Email sent to ${targetEmail}`);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

exports.testDailyReportEmail = onRequest(async (req, res) => {
    const targetEmail = req.query.email;
    if (!targetEmail) return res.status(400).send("Provide ?email= query param");
    try {
        const dateStr = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        await resend.emails.send({
            from: "Friendly Code <no-reply@friendlycode.fun>",
            to: [targetEmail],
            reply_to: "support@friendlycode.fun",
            subject: `📊 Итоги дня: Test Venue — ${dateStr} (TEST)`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #4E342E; max-width: 600px; margin: auto; padding: 40px; background-color: #FFF8E1; border-radius: 24px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 12px; font-weight: 900; letter-spacing: 2px; color: #E68A00; text-transform: uppercase;">Friendly Code</span>
                    </div>
                    
                    <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 10px; color: #4E342E; text-align: center;">Ваш отчет за сегодня</h1>
                    <p style="text-align: center; color: #795548; margin-bottom: 40px;">${dateStr}</p>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                            <div style="font-size: 28px; font-weight: 900; color: #4E342E;">15</div>
                            <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Всего касаний</div>
                        </div>
                        <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                            <div style="font-size: 28px; font-weight: 900; color: #E68A00;">12</div>
                            <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Активировано</div>
                        </div>
                        <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                            <div style="font-size: 28px; font-weight: 900; color: #4CAF50;">80%</div>
                            <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Конверсия</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 40px;">
                        <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                            <div style="font-size: 28px; font-weight: 900; color: #1976D2;">8</div>
                            <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Уникальных гостей</div>
                        </div>
                        <div style="flex: 1; background: #ffffff; padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(78, 52, 46, 0.05);">
                            <div style="font-size: 28px; font-weight: 900; color: #D32F2F;">15%</div>
                            <div style="font-size: 11px; font-weight: 700; color: #795548; text-transform: uppercase; margin-top: 5px;">Средняя скидка</div>
                        </div>
                    </div>
                </div>
            `
        });
        res.send(`Test Daily Report Email sent to ${targetEmail}`);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});
"""

content = content + new_functions

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patch successful.")
