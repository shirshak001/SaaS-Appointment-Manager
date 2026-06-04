const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { sendWhatsApp } = require('../services/twilioService');
const { v4: uuidv4 } = require('uuid');

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'reminderflow_webhook_secret';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/webhook/whatsapp  — Meta verification challenge
// Meta calls this when you register the webhook URL in the developer portal.
// It sends a hub.challenge that we must echo back to prove we own the endpoint.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[Webhook] Verification request received');
  console.log(`[Webhook] mode=${mode}, token=${token}`);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] ✅ Verified successfully! Echoing challenge back.');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] ❌ Verification failed — token mismatch');
  return res.status(403).json({ error: 'Forbidden: token mismatch' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhook/whatsapp  — Incoming messages from Meta
// Called every time someone sends a message TO your WhatsApp business number.
// Once a user messages you, a 24-hour window opens where you can send them
// free-form text messages without needing approved templates.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/whatsapp', async (req, res) => {
  // Always respond 200 immediately — Meta retries if you don't respond fast
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // Validate it's a WhatsApp message event
    if (body?.object !== 'whatsapp_business_account') return;

    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    if (!value) return;

    // ── Handle incoming text messages ──────────────────────────────────────
    const messages = value.messages;
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const fromPhone = msg.from; // E.164 without '+', e.g. "918617300719"
        const msgText   = msg.text?.body || '';
        const msgType   = msg.type;   // 'text', 'image', etc.
        const wamid     = msg.id;

        const contactName = value.contacts?.[0]?.profile?.name || 'Customer';

        console.log(`[Webhook] 📨 Incoming ${msgType} from ${fromPhone} (${contactName}): "${msgText}"`);

        // Store the inbound message in DB
        await db.messages.insert({
          _id: uuidv4(),
          appointment_id: null,
          customer_name: contactName,
          phone: fromPhone,
          message_type: 'inbound_whatsapp',
          message_body: msgText,
          delivery_channel: 'whatsapp',
          delivery_status: 'received',
          wamid,
          received_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        });

        // ── Auto-reply: look up their next appointment ──────────────────────
        await handleAutoReply(fromPhone, contactName, msgText);
      }
    }

    // ── Handle delivery status updates ─────────────────────────────────────
    const statuses = value.statuses;
    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        const { id: wamid, status: deliveryStatus, recipient_id } = status;
        console.log(`[Webhook] 📬 Delivery update — wamid=${wamid}, status=${deliveryStatus}, to=${recipient_id}`);

        // Update message delivery status in DB
        await db.messages.update(
          { wamid },
          { $set: { delivery_status: deliveryStatus, updated_at: new Date().toISOString() } },
          { multi: false }
        );
      }
    }

  } catch (err) {
    console.error('[Webhook] Error processing event:', err.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-reply logic:
// When a customer texts in, reply with their next appointment details.
// This opens a 24-hour conversation window so future messages (reminders)
// will be delivered as free-form text — no template approval needed.
// ─────────────────────────────────────────────────────────────────────────────
async function handleAutoReply(fromPhone, contactName, msgText) {
  try {
    const settings = await db.settings.findOne({ _id: 'default' }) || {};
    const bizName  = settings.business_name || 'ReminderFlow';

    // Normalize phone for DB lookup (remove country code prefix for matching)
    const digitsOnly = fromPhone.replace(/\D/g, '');

    // Find their upcoming appointments
    const now = new Date().toISOString();
    const allAppointments = await db.appointments.find({
      status: { $in: ['scheduled', 'confirmed'] },
      appointment_time: { $gt: now }
    }).sort({ appointment_time: 1 });

    // Match by phone (try exact, then last 10 digits)
    const matchedAppts = allAppointments.filter(a => {
      const d = a.phone.replace(/\D/g, '');
      return d === digitsOnly || d.endsWith(digitsOnly.slice(-10)) || digitsOnly.endsWith(d.slice(-10));
    });

    let replyText;

    if (matchedAppts.length > 0) {
      const next = matchedAppts[0];
      const apptDate = new Date(next.appointment_time);
      const timeStr  = apptDate.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
      });
      const dateStr = apptDate.toLocaleDateString('en-IN', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
      });

      replyText = `Hello ${contactName}! 👋\n\nYour upcoming appointment at *${bizName}*:\n\n📅 *${dateStr}*\n🕐 *${timeStr}*\n\nWe'll send you a reminder before your appointment. Reply *CANCEL* to cancel or *HELP* for support.\n\nThank you! 🙏`;

      if (msgText.trim().toUpperCase() === 'CANCEL') {
        // Cancel the appointment
        await db.appointments.update(
          { _id: next._id },
          { $set: { status: 'cancelled' } }
        );
        replyText = `We've cancelled your appointment on ${dateStr} at ${timeStr}.\n\nTo book a new appointment, please contact *${bizName}* directly.\n\nThank you!`;
        console.log(`[Webhook] Appointment ${next._id} cancelled via WhatsApp reply from ${fromPhone}`);
      }
    } else {
      replyText = `Hello ${contactName}! 👋\n\nWelcome to *${bizName}*!\n\nWe don't have any upcoming appointments for your number. Please contact us to schedule one.\n\nThank you for reaching out! 🙏`;
    }

    // Send the auto-reply (this works because customer messaged us first — 24h window is now open!)
    const result = await sendWhatsApp(fromPhone, replyText);
    console.log(`[Webhook] Auto-reply sent to ${fromPhone}:`, result.success ? '✅' : '❌ ' + result.error);

    // Log the outbound reply
    await db.messages.insert({
      _id: uuidv4(),
      appointment_id: matchedAppts[0]?._id || null,
      customer_name: contactName,
      phone: fromPhone,
      message_type: 'auto_reply_whatsapp',
      message_body: replyText,
      delivery_channel: 'whatsapp',
      delivery_status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
      sent_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[Webhook] Auto-reply error:', err.message);
  }
}

module.exports = router;
