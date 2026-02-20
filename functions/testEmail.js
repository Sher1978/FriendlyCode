const { Resend } = require('resend');
const resend = new Resend('re_hhcZAqvV_PrA1srdegsuaoqkQEVZoGCNc'); // Taken from index.js

async function testEmail() {
    try {
        console.log("Sending test email...");
        const { data, error } = await resend.emails.send({
            from: "Friendly Code <no-reply@friendlycode.fun>",
            to: ["0451611@gmail.com"], // Using user's known email from logs
            subject: `Test from Diagnostic Script`,
            html: `<p>This is a test of the Resend API.</p>`
        });

        if (error) {
            console.error("Resend API Error:", error);
        } else {
            console.log("Success! Data:", data);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}
testEmail();
