const token = process.env.RESEND_API_KEY || 're_fallback_key';

if (!token || token === 're_fallback_key') {
    console.log('No Resend API Key found in env.');
    // We can't actually send without a key, so we'll mock it for now.
    console.log('Mock email sent successfully to 0451611@gmail.com');
} else {
    fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: '0451611@gmail.com',
            subject: 'ВАШ VIP ВАУЧЕР (ТЕСТ)',
            html: '<h1>ВАШ VIP ВАУЧЕР</h1><p>Покажите этот QR-код официанту:</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://bot-lab-21910.web.app/thank-you?uid=test_guest_123%26mode=shared" />'
        })
    }).then(r => r.json()).then(console.log).catch(console.error);
}
