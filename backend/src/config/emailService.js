const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');

// ==================== CACHED TRANSPORTER ====================
// Cache the transporter so we don't hit DB on every single email
let cachedTransporter = null;
let cachedFromLine = null;
let cachedEmailApiUrl = null;
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
        return { transporter: cachedTransporter, fromLine: cachedFromLine, emailApiUrl: cachedEmailApiUrl };
    }

    let host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    let port = parseInt(process.env.EMAIL_PORT) || 587;
    let user = process.env.EMAIL_USER;
    let pass = process.env.EMAIL_PASS;
    let systemName = 'Chaudhary Health Care Center Koraon';
    let emailApiUrl = process.env.EMAIL_API_URL || null;

    try {
        // Single bulk query instead of 5 separate queries
        const settings = await Setting.find({
            key: { $in: ['email-host', 'email-port', 'email-user', 'email-pass', 'hospital-name', 'email-api-url'] }
        }).lean();

        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });

        if (settingsMap['email-host']) host = settingsMap['email-host'];
        if (settingsMap['email-port']) port = parseInt(settingsMap['email-port']) || 587;
        if (settingsMap['email-user']) user = settingsMap['email-user'];
        if (settingsMap['email-pass']) pass = settingsMap['email-pass'];
        if (settingsMap['hospital-name']) systemName = settingsMap['hospital-name'];
        if (settingsMap['email-api-url']) emailApiUrl = settingsMap['email-api-url'];
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
        // Force IPv4 because Render has issues with IPv6 SMTP to Gmail
        family: 4,
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
    cachedEmailApiUrl = emailApiUrl;
    cacheTimestamp = now;

    // Verify connection on first creation (non-blocking)
    if (!cachedEmailApiUrl) {
        cachedTransporter.verify().then(() => {
            console.log('✅ SMTP Connection verified successfully');
        }).catch(err => {
            console.warn('⚠️ SMTP Connection verification failed:', err.message);
        });
    }

    return { transporter: cachedTransporter, fromLine: cachedFromLine, emailApiUrl: cachedEmailApiUrl };
}

/**
 * Send an email — now uses cached transporter (no DB hit on every call)
 */
async function sendEmail({ to, subject, html }) {
    const { transporter, fromLine, emailApiUrl } = await getTransporter();

    if (emailApiUrl) {
        console.log(`Sending email via HTTP API to ${to}`);
        try {
            const response = await fetch(emailApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject, html })
            });
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'HTTP API Email Failed');
            }
            return data;
        } catch (err) {
            console.error('HTTP API Email send error:', err);
            throw err;
        }
    }

    console.log(`Sending email via SMTP to ${to}`);
    const mailOptions = {
        from: fromLine,
        to,
        subject,
        html
    };

    return transporter.sendMail(mailOptions);
}

// ==================== SHARED EMAIL WRAPPER ====================
// Clean, professional hospital-branded wrapper — no emojis, no gradients
function wrapInBrandedTemplate(bodyContent, accentColor = '#1a56db') {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Chaudhary Health Care Center</title></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f8;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- HEADER -->
      <tr>
        <td style="background-color:${accentColor};padding:24px 32px;border-radius:6px 6px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;line-height:1.3;">Chaudhary Health Care Center</p>
                <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Gandhi Chauraha, Meja Road, Koraon, Prayagraj (U.P.)</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background:#ffffff;padding:32px 32px 24px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
          ${bodyContent}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f9fafb;padding:20px 32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 6px 6px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:11px;color:#6b7280;line-height:1.8;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
                <strong style="color:#374151;">Contact:</strong> +91-9839843847 &nbsp;|&nbsp;
                <strong style="color:#374151;">Email:</strong> chaudharyhealthcare.koraon@gmail.com<br>
                <strong style="color:#374151;">Website:</strong> <a href="https://deepakkumar7388.github.io/Chaudhary_Health_Care-Center-Koraon-Pryagraj/" style="color:#1a56db;">deepakkumar7388.github.io/Chaudhary_Health_Care-Center-Koraon-Pryagraj</a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;font-size:10px;color:#9ca3af;line-height:1.6;text-align:center;">
                This is an official automated notification from Chaudhary Health Care Center, Koraon.<br>
                If you did not expect this email, please contact hospital reception. Do not reply to this email.<br>
                &copy; ${year} Chaudhary Health Care Center. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

/**
 * Send OTP Verification Email
 */
async function sendOtpEmail(to, otp, userName) {
    const body = `
        <p style="margin:0 0 20px;font-size:15px;color:#111827;font-weight:bold;">Password Reset Request</p>

        <p style="margin:0 0 8px;font-size:14px;color:#374151;">Dear <strong>${userName}</strong>,</p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
            We received a request to reset the password for your Chaudhary Health Care Center HMS account.
            Use the verification code below to proceed. This code is valid for 10 minutes only.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f0fdf4;border:2px solid #22c55e;border-radius:8px;padding:16px 32px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;color:#16a34a;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Verification Code</p>
                    <p style="margin:0;font-size:34px;font-weight:bold;letter-spacing:10px;color:#111827;font-family:'Courier New',monospace;">${otp}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="12" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin-bottom:20px;">
          <tr><td style="font-size:12px;color:#92400e;line-height:1.6;">
            This code expires in <strong>10 minutes</strong>.
            Do not share this code with anyone. Hospital staff will never ask for your OTP or password.
          </td></tr>
        </table>

        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
            If you did not request a password reset, you can safely ignore this email. Your account remains secure.
        </p>
    `;
    return sendEmail({ to, subject: 'Password Reset Verification Code - Chaudhary Health Care Center', html: wrapInBrandedTemplate(body, '#059669') });
}

/**
 * Send Welcome Email on Account Creation
 */
async function sendWelcomeEmail(to, userName, role) {
    const roleLabel = {
        admin: 'Administrator',
        doctor: 'Doctor',
        staff: 'Staff / Nurse',
        receptionist: 'Receptionist'
    }[role] || role;

    const body = `
        <p style="margin:0 0 20px;font-size:15px;color:#111827;font-weight:bold;">Account Successfully Created</p>

        <p style="margin:0 0 8px;font-size:14px;color:#374151;">Dear <strong>${userName}</strong>,</p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
            Your account has been successfully created in the
            <strong>Chaudhary Health Care Center Hospital Management System</strong>.
            You can now log in using the credentials you set during registration.
        </p>

        <!-- Account Details Table -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
          <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0 0 10px;font-size:11px;color:#6b7280;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Account Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:5px 0;font-size:13px;color:#6b7280;width:40%;">Full Name</td>
                <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:bold;">${userName}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:13px;color:#6b7280;">Login Email</td>
                <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:bold;">${to}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:13px;color:#6b7280;">Assigned Role</td>
                <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:bold;">${roleLabel}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.6;">
            If your account status is set to pending, your administrator will activate it shortly.
            You will be able to log in once your account is active.
        </p>

        <table width="100%" cellpadding="12" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;">
          <tr><td style="font-size:12px;color:#92400e;line-height:1.6;">
            <strong>Security Notice:</strong> Never share your login password with anyone.
            Hospital administration will never ask for your password by email, phone, or in person.
          </td></tr>
        </table>

        <!-- Login Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#1a56db;border-radius:6px;padding:12px 32px;text-align:center;">
                    <a href="https://deepakkumar7388.github.io/Chaudhary_Health_Care-Center-Koraon-Pryagraj/"
                       style="color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;display:inline-block;letter-spacing:0.3px;">
                      Login to HMS Portal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:10px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Or copy this link: <a href="https://deepakkumar7388.github.io/Chaudhary_Health_Care-Center-Koraon-Pryagraj/" style="color:#1a56db;">https://deepakkumar7388.github.io/Chaudhary_Health_Care-Center-Koraon-Pryagraj/</a>
              </p>
            </td>
          </tr>
        </table>
    `;
    return sendEmail({ to, subject: 'Account Created - Chaudhary Health Care Center HMS', html: wrapInBrandedTemplate(body, '#1a56db') });
}


/**
 * Send Admission Email to Patient/Guardian
 */
async function sendAdmissionEmail(to, patientData) {
    const body = `
        <p style="margin:0 0 20px;font-size:15px;color:#111827;font-weight:bold;">Patient Admission Confirmation</p>

        <p style="margin:0 0 8px;font-size:14px;color:#374151;">Dear <strong>${patientData.guardian_name || 'Guardian'}</strong>,</p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
            This is to confirm that patient <strong>${patientData.name}</strong> has been
            successfully admitted to <strong>Chaudhary Health Care Center, Koraon</strong>.
            Please retain this email for your records.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0 0 10px;font-size:11px;color:#1d4ed8;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Admission Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Patient Name</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${patientData.name}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Patient ID</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${patientData.patient_id}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Assigned Bed</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${patientData.bed_no || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;">Admission Date</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:bold;">${new Date(patientData.admission_date).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
            For any queries related to treatment, billing, or visiting hours,
            please contact the reception desk at the hospital.
        </p>
    `;
    return sendEmail({ to, subject: `Admission Confirmation - ${patientData.name} | Chaudhary Health Care Center`, html: wrapInBrandedTemplate(body, '#1a56db') });
}

/**
 * Send Discharge Email
 */
async function sendDischargeEmail(to, patientData, summary) {
    const body = `
        <p style="margin:0 0 20px;font-size:15px;color:#111827;font-weight:bold;">Patient Discharge Summary</p>

        <p style="margin:0 0 8px;font-size:14px;color:#374151;">Dear <strong>${patientData.guardian_name || 'Guardian'}</strong>,</p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
            Patient <strong>${patientData.name}</strong> has been officially discharged from
            <strong>Chaudhary Health Care Center, Koraon</strong>.
            Please collect all documents from the reception counter.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0 0 10px;font-size:11px;color:#dc2626;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Discharge Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Patient Name</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${patientData.name}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Patient ID</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${patientData.patient_id}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Discharge Date</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:bold;border-bottom:1px solid #e5e7eb;">${new Date(summary.discharge_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;">Condition at Discharge</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:bold;">${summary.condition_at_discharge || 'Stable / Normal'}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
            We wish <strong>${patientData.name}</strong> a speedy and complete recovery.
            Thank you for choosing Chaudhary Health Care Center for your healthcare needs.
        </p>

        <table width="100%" cellpadding="12" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;">
          <tr><td style="font-size:12px;color:#92400e;line-height:1.6;">
            <strong>Follow-up Reminder:</strong> Please follow the prescribed medication and dietary plan.
            Return to the hospital immediately if the patient's condition worsens.
          </td></tr>
        </table>
    `;
    return sendEmail({ to, subject: `Discharge Summary - ${patientData.name} | Chaudhary Health Care Center`, html: wrapInBrandedTemplate(body, '#dc2626') });
}

/**
 * Force refresh the cached transporter (useful when settings change from admin panel)
 */
function clearTransporterCache() {
    cachedTransporter = null;
    cachedFromLine = null;
    cachedEmailApiUrl = null;
    cacheTimestamp = 0;
    console.log('SMTP transporter cache cleared.');
}

module.exports = {
    sendEmail,
    sendOtpEmail,
    sendWelcomeEmail,
    sendAdmissionEmail,
    sendDischargeEmail,
    getTransporter,
    clearTransporterCache
};
