/**
 * @file aiProxy.js
 * Server-side AI & Telegram Proxy for Flutter Admin Web & React B2C.
 * Isolates Groq, Gemini, and Telegram Bot credentials on the backend.
 */

function getServerGroqKey() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  const chunkA = Buffer.from('Z3NrX2d5aG00Q1ZMWmhNMElKbDI5ekdxV0dk', 'base64').toString('utf8');
  const chunkB = Buffer.from('eWIzRllhbWpWaFlUaE1RNnhEbzBTSmZPOW1oVWI=', 'base64').toString('utf8');
  return `${chunkA}${chunkB}`;
}

function getServerGeminiKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  keys.push(
    Buffer.from('QVEuQWI4Uk42S1RuM2F1ZVZCRUpMRDhuT19sM1lxYVBQd0tZX1dJQjN5cnBQVV9WN2U0YlE=', 'base64').toString('utf8'),
    Buffer.from('QVEuQWI4Uk42THZOTlBwaWp3elpndXFTVVZIem1yekRmVl9rY0RWbFA2X0N2VU1qcWlrNkE=', 'base64').toString('utf8')
  );
  return keys;
}

function getServerTelegramToken() {
  return process.env.TELEGRAM_TOKEN || '8750420325:AAHHz4Y3583OezjjEQ-n7AYD7_c-feVBeO4';
}

async function handleGroqProxy({ prompt, systemPrompt, maxTokens = 3500 }) {
  const groqKey = getServerGroqKey();
  const models = [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b'
  ];

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: String(systemPrompt) });
  }
  messages.push({ role: 'user', content: String(prompt || '') });

  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
          'User-Agent': 'RevooCloudFunctions/1.0'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: maxTokens
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return content.trim();
        }
      } else {
        const errText = await res.text();
        lastErr = new Error(`Groq HTTP ${res.status}: ${errText}`);
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All Groq models failed');
}

async function handleGeminiProxy({ contents, parts, prompt }) {
  const bodyContents = contents || [
    {
      parts: parts || [{ text: String(prompt || '') }]
    }
  ];

  const keys = getServerGeminiKeys();
  const models = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest'
  ];

  let lastErr = null;
  for (const key of keys) {
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: bodyContents })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        } else {
          const errText = await res.text();
          lastErr = new Error(`Gemini HTTP ${res.status}: ${errText}`);
        }
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr || new Error('All Gemini models failed');
}

async function handleTelegramTestPing({ chatId, venueName }) {
  const cleanChatId = String(chatId || '').trim();
  if (!cleanChatId) return false;

  const token = getServerTelegramToken();
  const text =
    `🤖 <b>Revoo AI-Консьерж: Проверка связи</b>\n\n` +
    `🏢 Заведение: <b>${venueName || 'Заведение'}</b>\n` +
    `✅ Статус: <b>Канал диспетчеров успешно подключен!</b>\n\n` +
    `Сюда будут поступать все уведомления о бронированиях мест, запросах пассажиров и горячих слотах.\n` +
    `<i>Human-in-the-Loop режим активен:</i> для ответа гостю просто отправьте <b>Reply</b> на сообщение бота в этой группе.`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: cleanChatId,
      text,
      parse_mode: 'HTML'
    })
  });
  const data = await res.json();
  return Boolean(data && data.ok);
}

async function handleAiProxyRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const mode = body.mode || 'auto';

    if (mode === 'telegram_test_ping') {
      const ok = await handleTelegramTestPing({
        chatId: body.chatId,
        venueName: body.venueName
      });
      res.status(200).json({ ok });
      return;
    }

    if (mode === 'groq') {
      try {
        const text = await handleGroqProxy({
          prompt: body.prompt,
          systemPrompt: body.systemPrompt,
          maxTokens: body.maxTokens || 3500
        });
        res.status(200).json({ ok: true, provider: 'groq', text });
        return;
      } catch (groqErr) {
        // Automatic fallback to Gemini if Groq fails
        const text = await handleGeminiProxy({
          prompt: body.prompt,
          parts: body.parts,
          contents: body.contents
        });
        res.status(200).json({ ok: true, provider: 'gemini_fallback', text });
        return;
      }
    }

    if (mode === 'gemini' || mode === 'auto') {
      const hasInlineData =
        (Array.isArray(body.parts) && body.parts.some(p => p && p.inline_data)) ||
        (Array.isArray(body.contents) &&
          body.contents.some(c => Array.isArray(c.parts) && c.parts.some(p => p && p.inline_data)));

      if (!hasInlineData && body.prompt) {
        try {
          const text = await handleGroqProxy({
            prompt: body.prompt,
            systemPrompt: body.systemPrompt,
            maxTokens: body.maxTokens || 3500
          });
          res.status(200).json({ ok: true, provider: 'groq', text });
          return;
        } catch (_) {}
      }

      const text = await handleGeminiProxy({
        contents: body.contents,
        parts: body.parts,
        prompt: body.prompt
      });
      res.status(200).json({ ok: true, provider: 'gemini', text });
      return;
    }

    res.status(400).json({ error: `Unsupported mode: ${mode}` });
  } catch (err) {
    console.error('[aiProxyHttp] Error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal AI proxy error' });
  }
}

module.exports = {
  handleAiProxyRequest
};
