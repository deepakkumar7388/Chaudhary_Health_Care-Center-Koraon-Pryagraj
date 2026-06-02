const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');

console.log('Using EMAIL_USER:', process.env.EMAIL_USER);
console.log('Using EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('Using EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('Using EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.EMAIL_PORT) || 587;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const secure = port === 465;

const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
    }
});

transporter.verify().then(() => {
    console.log('✅ SMTP Connection verified successfully!');
    // Try sending a test email to the user email itself
    return transporter.sendMail({
        from: `"${user}" <${user}>`,
        to: user,
        subject: 'SMTP Test Email',
        text: 'This is a test email to verify SMTP configuration.'
    });
}).then((info) => {
    console.log('✅ Test email sent successfully:', info.messageId);
    process.exit(0);
}).catch(err => {
    console.error('❌ SMTP test failed:', err);
    process.exit(1);
});
