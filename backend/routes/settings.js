const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authorize } = require('../middleware/auth');
const { sendWhatsApp, sendSMS } = require('../services/twilioService');
const { sendEmail } = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');

// GET /api/settings
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const settings = await db.settings.findOne({ _id: 'default' });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', authorize('admin'), async (req, res) => {
  try {
    const { business_name, support_number, business_address, reminder_before_minutes } = req.body;
    const update = {};
    if (business_name) update.business_name = business_name;
    if (support_number) update.support_number = support_number;
    if (business_address !== undefined) update.business_address = business_address;
    if (reminder_before_minutes) update.reminder_before_minutes = Number(reminder_before_minutes);

    await db.settings.update({ _id: 'default' }, { $set: update });
    const updated = await db.settings.findOne({ _id: 'default' });
    res.json({ settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/reset-database
router.post('/reset-database', authorize('admin'), async (req, res) => {
  try {
    // Delete all records in appointments, messages, notes, and notifications
    await Promise.all([
      db.appointments.remove({}, { multi: true }),
      db.messages.remove({}, { multi: true }),
      db.notes.remove({}, { multi: true }),
      db.notifications.remove({}, { multi: true }),
    ]);
    res.json({ success: true, message: 'Database cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/test-messaging
router.post('/test-messaging', authorize('admin'), async (req, res) => {
  try {
    const { type, to, message } = req.body;
    if (!type || !to) {
      return res.status(400).json({ error: 'Type (whatsapp, sms, email) and recipient target (to) are required.' });
    }

    let result;
    let actualChannel = type;

    if (type === 'whatsapp') {
      let templateOptions = null;
      if (process.env.META_CONFIRMATION_TEMPLATE_NAME) {
        const isHelloWorld = process.env.META_CONFIRMATION_TEMPLATE_NAME === 'hello_world';
        templateOptions = {
          name: process.env.META_CONFIRMATION_TEMPLATE_NAME,
          languageCode: process.env.META_TEMPLATE_LANGUAGE_CODE || 'en_US',
          parameters: isHelloWorld ? [] : ['TestUser', 'TestClinic', '12:00 PM', 'June 4', '+91 99999 88888']
        };
      }
      result = await sendWhatsApp(to.trim(), message || 'Test WhatsApp message from ReminderFlow Diagnostics.', templateOptions);

      // If WhatsApp failed, attempt SMS fallback
      if (!result.success) {
        console.log(`[Diagnostics] WhatsApp test failed for ${to.trim()} (${result.error}). Trying SMS fallback...`);
        const smsResult = await sendSMS(to.trim(), message || 'Test SMS fallback from ReminderFlow Diagnostics.');
        result = smsResult;
        actualChannel = 'sms_fallback';
      }
    } else if (type === 'sms') {
      result = await sendSMS(to.trim(), message || 'Test SMS from ReminderFlow Diagnostics.');
    } else if (type === 'email') {
      result = await sendEmail({
        to: to.trim(),
        subject: 'ReminderFlow Diagnostic Test Email',
        text: message || 'Hello,\n\nThis is a diagnostic test email from your ReminderFlow instance. If you received this, your SMTP configuration is working correctly.\n\nThank you.'
      });
    } else {
      return res.status(400).json({ error: `Unsupported test channel type: ${type}` });
    }

    if (result.success) {
      const deliveryMode = result.mock ? 'mock_console' : (result.sid ? 'live_api' : 'sent');
      res.json({
        success: true,
        channel: actualChannel,
        deliveryMode,
        mock: !!result.mock,
        messageId: result.sid || null,
        note: result.mock
          ? 'No live credentials configured — message logged to server console (mock mode).'
          : `Message dispatched successfully via ${actualChannel}.`,
        result
      });
    } else {
      // All channels failed
      res.status(500).json({
        success: false,
        channel: actualChannel,
        error: result.error || 'All message dispatch channels failed.',
        hint: type === 'whatsapp'
          ? 'Ensure META_ACCESS_TOKEN and META_PHONE_NUMBER_ID are set correctly in backend .env, or that Twilio credentials are configured.'
          : type === 'email'
          ? 'Ensure SMTP_HOST, SMTP_USER, and SMTP_PASS are configured in backend .env.'
          : 'Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_NUMBER are set in backend .env.'
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
