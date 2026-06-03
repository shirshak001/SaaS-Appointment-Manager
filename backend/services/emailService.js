const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const secure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[EmailService] SMTP credentials are not configured in environment variables. Falling back to mock console logs.');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure,
      auth: {
        user,
        pass,
      },
    });
    return transporter;
  } catch (err) {
    console.error('[EmailService] Initialization error:', err.message);
    return null;
  }
}

/**
 * Sends a real email using SMTP, or logs to console as fallback.
 * 
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Text body
 * @param {string} [options.html] - Optional HTML body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendEmail({ to, subject, text, html }) {
  const client = getTransporter();
  const from = process.env.SMTP_FROM || `"ReminderFlow" <${process.env.SMTP_USER}>`;

  if (!client) {
    console.log(`\n--- [MOCK EMAIL SENT] ---`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);
    console.log(`-------------------------\n`);
    return { success: true, mock: true };
  }

  try {
    const info = await client.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    console.log(`[EmailService] Email sent successfully to ${to}, MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
};
