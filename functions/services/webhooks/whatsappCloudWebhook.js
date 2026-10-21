/**
 * @file whatsappCloudWebhook.js
 * Meta WhatsApp Cloud API Webhook Handler.
 * 
 * Verifies webhooks and routes messages to ManagerChatDispatcher or GeminiConciergeAgent.
 */

const { GeminiConciergeAgent } = require('../ai/geminiAgent');
const { ManagerChatDispatcher } = require('../ai/managerChatDispatcher');

const geminiAgent = new GeminiConciergeAgent();
const managerDispatcher = new ManagerChatDispatcher();

/**
 * Verification endpoint for Meta Webhook setup.
 */
function handleWebhookVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'revoo_whatsapp_verify_secret';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('WhatsApp Webhook verified successfully!');
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Forbidden');
}

/**
 * Handle incoming WhatsApp messages.
 */
async function handleIncomingWhatsAppMessage(req, res) {
  try {
    const body = req.body;

    if (!body || body.object !== 'whatsapp_business_account') {
      return res.status(200).send('EVENT_RECEIVED');
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.status(200).send('NO_MESSAGES');
    }

    const message = messages[0];
    const fromPhone = message.from; // e.g. "79991234567"
    const text = message.text?.body || '';
    const phoneNumberId = value.metadata?.phone_number_id;

    // Optional query param or mapping for venueId
    const venueId = req.query.venueId || req.params.venueId || 'default_venue';

    // 1. Check if sender is an authorized manager
    const isManager = await managerDispatcher.isAuthorizedManager(venueId, fromPhone);

    let replyText = '';
    if (isManager) {
      replyText = await managerDispatcher.handleManagerMessage({
        venueId,
        senderPhone: fromPhone,
        text
      });
    } else {
      replyText = await geminiAgent.processGuestMessage({
        venueId,
        userMessage: text,
        senderPhone: fromPhone
      });
    }

    // 2. Send reply back to user via Meta Graph API
    await sendWhatsAppReply({
      phoneNumberId,
      recipientPhone: fromPhone,
      text: replyText
    });

    return res.status(200).send('SUCCESS');
  } catch (err) {
    console.error('Error handling WhatsApp message:', err);
    return res.status(200).send('ERROR_HANDLED');
  }
}

/**
 * Send reply message via Meta Cloud API.
 */
async function sendWhatsAppReply({ phoneNumberId, recipientPhone, text }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token || !phoneNumberId) {
    console.log(`[Mock WhatsApp Send] To: ${recipientPhone}, Text: ${text}`);
    return;
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: text }
      })
    });
  } catch (err) {
    console.error('Failed to send WhatsApp message via Meta Cloud API:', err);
  }
}

module.exports = {
  handleWebhookVerification,
  handleIncomingWhatsAppMessage
};
