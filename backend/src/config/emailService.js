const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');

/**
 * Dynamically configure and get nodemailer transporter based on current DB Settings or env.
 */
async function getTransporter() {
    let host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    let port = parseInt(process.env.EMAIL_PORT) || 587;
    let user = process.env.EMAIL_USER || 'dk21230621@gmail.com';
    let pass = process.env.EMAIL_PASS;

    try {
        const hostSetting = await Setting.findOne({ key: 'email-host' });
        const portSetting = await Setting.findOne({ key: 'email-port' });
        const userSetting = await Setting.findOne({ key: 'email-user' });
        const passSetting = await Setting.findOne({ key: 'email-pass' });

        if (hostSetting && hostSetting.value) host = hostSetting.value;
        if (portSetting && portSetting.value) port = parseInt(portSetting.value) || 587;
        if (userSetting && userSetting.value) user = userSetting.value;
        if (passSetting && passSetting.value) pass = passSetting.value;
    } catch (err) {
        console.error('Error fetching email settings from DB:', err.message);
    }

    if (!pass) {
        // Log a warning but create a dummy transporter or rely on nodemailer's fail logic
        console.warn('SMTP password is not configured. Email sending might fail.');
    }

    // Determine secure connection
    const secure = port === 465;

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass
        }
    });
}

/**
 * Send an email with helper parameters
 */
async function sendEmail({ to, subject, html }) {
    const transporter = await getTransporter();
    
    // Fetch system display name
    let systemName = 'Chaudhary Health Care';
    let emailUser = process.env.EMAIL_USER || 'dk21230621@gmail.com';
    try {
        const nameSetting = await Setting.findOne({ key: 'hospital-name' });
        if (nameSetting && nameSetting.value) systemName = nameSetting.value;
        
        const userSetting = await Setting.findOne({ key: 'email-user' });
        if (userSetting && userSetting.value) emailUser = userSetting.value;
    } catch (err) {}

    const mailOptions = {
        from: `"${systemName}" <${emailUser}>`,
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
    return sendEmail({ to, subject: 'Password Reset OTP - Chaudhary Health Care', html });
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
            <p style="font-size: 12px; color: #999;">Thank you for choosing Chaudhary Health Care.</p>
        </div>
    `;
    return sendEmail({ to, subject: `Discharge Confirmation: ${patientData.name} (${patientData.patient_id})`, html });
}

module.exports = {
    sendEmail,
    sendOtpEmail,
    sendAdmissionEmail,
    sendDischargeEmail,
    getTransporter
};
