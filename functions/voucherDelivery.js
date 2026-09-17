/**
 * Personal QR Voucher Delivery Service (Zero-Complexity Add-on)
 * This module generates Shared Battery Screen URLs and delivers them to guests 
 * as digital vouchers via Telegram and Email.
 */

// const nodemailer = require('nodemailer'); // Uncomment when configuring SMTP/SendGrid
const BASE_APP_URL = 'https://bot-lab-21910.web.app';
const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=15&data=';

/**
 * Generates the Mirror Mode URL and the corresponding QR Code image URL.
 * @param {string} venueId 
 * @param {string} userId 
 * @param {number} discount 
 * @returns {Object} { qrPayloadUrl, qrImageUrl }
 */
function generateVoucherLinks(venueId, userId, discount = 20) {
    // Zero-Complexity Shared Mode URL
    const qrPayloadUrl = `${BASE_APP_URL}/thank-you?venueId=${venueId}&uid=${userId}&discount=${discount}&mode=shared`;
    const qrImageUrl = `${QR_API_URL}${encodeURIComponent(qrPayloadUrl)}`;
    return { qrPayloadUrl, qrImageUrl };
}

/**
 * Sends a visually rich Telegram message containing the personal QR Voucher.
 * Designed to look like the "Thank You" screen aesthetics.
 * 
 * @param {string} botToken 
 * @param {string} telegramChatId 
 * @param {string} venueName 
 * @param {string} venueId 
 * @param {string} userId 
 * @param {number} discount 
 * @param {string} googleMapsUrl 
 * @param {string} expirationDate - e.g., "до 15 сентября 23:59"
 */
async function sendTelegramVoucher(botToken, telegramChatId, venueName, venueId, userId, discount = 20, googleMapsUrl = '', expirationDate = '') {
    if (!botToken || !telegramChatId) {
        console.warn('Telegram voucher skipped: Missing bot token or chat ID');
        return false;
    }

    const { qrPayloadUrl, qrImageUrl } = generateVoucherLinks(venueId, userId, discount);
    
    // Aesthetic caption formatting
    const caption = `
🌟 <b>ВАШ ПЕРСОНАЛЬНЫЙ ВАУЧЕР</b> 🌟

В знак нашей дружбы, мы подготовили для вас персональную карту лояльности в заведении <b>${venueName}</b>!

Ваш подарок: <b>Скидка ${discount}%</b> от общего счета. 🎁
${expirationDate ? `\n⏳ <i>Действует: ${expirationDate}</i>` : ''}

<i>Как использовать?</i>
Просто покажите этот QR-код официанту при оплате, или нажмите кнопку ниже, чтобы открыть интерактивную «Визитку Гостя»!

👇 <b>Ваш активный ваучер ниже:</b>
    `;

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    
    const inline_keyboard = [
        [{ text: '🎫 Открыть Мой Ваучер', url: qrPayloadUrl }]
    ];

    if (googleMapsUrl) {
        inline_keyboard.push([{ text: `📍 Маршрут до ${venueName}`, url: googleMapsUrl }]);
    }
    
    try {
        const response = await fetch(telegramApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramChatId,
                photo: qrImageUrl,
                caption: caption,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error sending Telegram voucher:', errorData);
            return false;
        }

        console.log(`Telegram voucher successfully sent to ${telegramChatId}`);
        return true;
    } catch (error) {
        console.error('Error sending Telegram voucher:', error.message);
        return false;
    }
}

/**
 * Generates HTML for an Email Voucher (Matching the Thank You dark/emerald theme)
 */
function buildEmailVoucherHtml(venueName, qrImageUrl, qrPayloadUrl, discount = 20, googleMapsUrl = '', expirationDate = '') {
    return `
    <div style="background-color: #000; color: #fff; font-family: sans-serif; padding: 40px 20px; text-align: center;">
        <h1 style="color: #D4AF37; margin-bottom: 5px;">ВАШ VIP ВАУЧЕР</h1>
        <h2 style="color: #fff; font-weight: normal; margin-top: 0;">в заведении ${venueName}</h2>
        
        <div style="background: linear-gradient(135deg, #1C1C1E, #0D0D0F); border: 1px solid rgba(212,175,55,0.4); border-radius: 20px; padding: 30px; margin: 30px auto; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
            <div style="font-size: 60px; font-weight: bold; color: #fff; text-shadow: 0 0 20px rgba(255,255,255,0.2); margin-bottom: 10px;">
                ${discount}%
            </div>
            
            ${expirationDate ? `<div style="color: #FFAA00; font-size: 14px; font-weight: bold; margin-bottom: 20px; letter-spacing: 1px;">⏳ ДЕЙСТВУЕТ: ${expirationDate.toUpperCase()}</div>` : ''}

            <img src="${qrImageUrl}" alt="Ваш QR Код" style="width: 200px; height: 200px; border-radius: 10px; border: 4px solid #fff; box-shadow: 0 0 30px rgba(0,255,65,0.4);" />
            
            <p style="color: #00FF41; font-weight: bold; margin-top: 25px; letter-spacing: 2px;">ПОКАЖИТЕ ЭТОТ КОД ОФИЦИАНТУ</p>
        </div>
        
        <a href="${qrPayloadUrl}" style="background-color: #D4AF37; color: #000; padding: 15px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 20px;">
            ОТКРЫТЬ ИНТЕРАКТИВНЫЙ ВАУЧЕР
        </a>
        
        ${googleMapsUrl ? `<br><br><a href="${googleMapsUrl}" style="color: #fff; text-decoration: underline; font-size: 14px; opacity: 0.8;">📍 Проложить маршрут до ${venueName}</a>` : ''}
    </div>
    `;
}

module.exports = {
    generateVoucherLinks,
    sendTelegramVoucher,
    buildEmailVoucherHtml
};
