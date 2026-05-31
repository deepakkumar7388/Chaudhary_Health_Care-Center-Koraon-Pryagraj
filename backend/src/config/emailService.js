const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');

// ==================== CACHED TRANSPORTER ====================
// Cache the transporter so we don't hit DB on every single email
let cachedTransporter = null;
let cachedFromLine = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // Refresh cache every 5 minutes

/**
 * Get or create a cached nodemailer transporter.
 * Settings are fetched from DB only once every 5 minutes.
 */
async function getTransporter() {
    const now = Date.now();

    // Return cached transporter if still valid
    if (cachedTransporter && (now - cacheTimestamp) < CACHE_TTL) {
        return { transporter: cachedTransporter, fromLine: cachedFromLine };
    }

    let host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    let port = parseInt(process.env.EMAIL_PORT) || 587;
    let user = process.env.EMAIL_USER;
    let pass = process.env.EMAIL_PASS;
    let systemName = 'Chaudhary Health Care Center Koraon';

    try {
        // Single bulk query instead of 5 separate queries
        const settings = await Setting.find({
            key: { $in: ['email-host', 'email-port', 'email-user', 'email-pass', 'hospital-name'] }
        }).lean();

        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });

        if (settingsMap['email-host']) host = settingsMap['email-host'];
        if (settingsMap['email-port']) port = parseInt(settingsMap['email-port']) || 587;
        if (settingsMap['email-user']) user = settingsMap['email-user'];
        if (settingsMap['email-pass']) pass = settingsMap['email-pass'];
        if (settingsMap['hospital-name']) systemName = settingsMap['hospital-name'];
    } catch (err) {
        console.error('Error fetching email settings from DB:', err.message);
    }

    if (!pass) {
        console.warn('SMTP password is not configured. Email sending might fail.');
    }

    const secure = port === 465; // SSL for 465, STARTTLS for 587

    cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certs on cloud environments
            minVersion: 'TLSv1.2'
        },
        // Connection pooling for faster subsequent sends
        pool: true,
        maxConnections: 3,
        maxMessages: 50,
        // Longer timeouts for Render cold-start environments
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000
    });

    cachedFromLine = `"${systemName}" <${user}>`;
    cacheTimestamp = now;

    // Verify connection on first creation (non-blocking)
    cachedTransporter.verify().then(() => {
        console.log('✅ SMTP Connection verified successfully');
    }).catch(err => {
        console.warn('⚠️ SMTP Connection verification failed:', err.message);
    });

    return { transporter: cachedTransporter, fromLine: cachedFromLine };
}

/**
 * Send an email — now uses cached transporter (no DB hit on every call)
 */
async function sendEmail({ to, subject, html }) {
    const { transporter, fromLine } = await getTransporter();

    const mailOptions = {
        from: fromLine,
        to,
        subject,
        html
    };

    return transporter.sendMail(mailOptions);
}

/**
 * Send OTP Verification Email
 */
async function sendOtpEmail(to, otp, userName) {
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
            <h2 style="color: #4CAF50;">Password Reset Request</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>We received a request to reset your password. Use the following 6-digit OTP to complete the process:</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; margin: 20px 0;">
                ${otp}
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email or contact support.</p>
        </div>
    `;
    return sendEmail({ to, subject: 'Password Reset OTP - Chaudhary Health Care Center Koraon', html });
}

/**
 * Send Admission Email to Patient/Guardian
 */
async function sendAdmissionEmail(to, patientData) {
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
            <h2 style="color: #3b82f6;">Patient Admission Successful</h2>
            <p>Dear <strong>${patientData.guardian_name || 'Guardian'}</strong>,</p>
            <p>This is to confirm that patient <strong>${patientData.name}</strong> has been successfully admitted to our facility.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b;">Admission Details:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">Patient ID:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${patientData.patient_id}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">Assigned Bed:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${patientData.bed_no || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">Date & Time:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${new Date(patientData.admission_date).toLocaleString()}</td>
                    </tr>
                </table>
            </div>
            
            <p>For any queries or assistance, please contact the reception counter.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
    `;
    return sendEmail({ to, subject: `Admission Confirmation: ${patientData.name} (${patientData.patient_id})`, html });
}

/**
 * Send Discharge Email
 */
async function sendDischargeEmail(to, patientData, summary) {
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
            <h2 style="color: #ef4444;">Patient Discharged</h2>
            <p>Dear <strong>${patientData.guardian_name || 'Guardian'}</strong>,</p>
            <p>Patient <strong>${patientData.name}</strong> has been discharged from our facility.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #1e293b;">Discharge Details:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">Patient ID:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${patientData.patient_id}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">Discharge Date:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${new Date(summary.discharge_date).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">Condition at Discharge:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${summary.condition_at_discharge || 'Normal'}</td>
                    </tr>
                </table>
            </div>
            
            <p>Please refer to the attached discharge summary and prescription provided at the counter for recovery instructions.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">Thank you for choosing Chaudhary Health Care Center Koraon.</p>
        </div>
    `;
    return sendEmail({ to, subject: `Discharge Confirmation: ${patientData.name} (${patientData.patient_id})`, html });
}

/**
 * Force refresh the cached transporter (useful when settings change from admin panel)
 */
function clearTransporterCache() {
    cachedTransporter = null;
    cachedFromLine = null;
    cacheTimestamp = 0;
    console.log('SMTP transporter cache cleared.');
}

module.exports = {
    sendEmail,
    sendOtpEmail,
    sendAdmissionEmail,
    sendDischargeEmail,
    getTransporter,
    clearTransporterCache
};
