const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendWhatsApp, sendSMS } = require('./twilioService');

const sseClients = new Set();

function addSseClient(res) { sseClients.add(res); }
function removeSseClient(res) { sseClients.delete(res); }

function broadcastReminder(notification) {
  const data = JSON.stringify(notification);
  for (const client of sseClients) {
    try { client.write(`data: ${data}\n\n`); }
    catch { sseClients.delete(client); }
  }
}

function buildReminderMessage(appt, settings, stage = '1h') {
  const d = new Date(appt.appointment_time);
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const dateStr = d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
  const first = appt.customer_name.split(' ')[0];
  const biz = settings?.business_name || 'ReminderFlow';
  const num = settings?.support_number || '';

  const stageText = {
    '24h': 'tomorrow',
    '1h':  'in 1 hour',
    '15m': 'in 15 minutes',
  }[stage] || 'soon';

  return `Hello ${first},\n\nThis is a reminder that your appointment at ${biz} is scheduled ${stageText} — at ${timeStr} on ${dateStr}.\n\nFor any queries, contact us at ${num}.\n\nThank you.`;
}

function buildConfirmationMessage(appt, settings) {
  const d = new Date(appt.appointment_time);
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const dateStr = d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
  const first = appt.customer_name.split(' ')[0];
  const biz = settings?.business_name || 'ReminderFlow';
  const num = settings?.support_number || '';
  return `Hello ${first},\n\nYour appointment at ${biz} has been confirmed for ${timeStr} on ${dateStr}.\n\nFor any queries, contact us at ${num}.\n\nThank you.`;
}

function generateWhatsAppLink(phone, message) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0091')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(message)}`;
}

// Returns reminder stage info for an appointment
function getReminderStages(appointment) {
  return [
    {
      key: 'reminder_24h',
      label: '24-hour reminder',
      description: '24 hours before appointment',
      sent: !!appointment.reminder_24h,
    },
    {
      key: 'reminder_1h',
      label: '1-hour reminder',
      description: '1 hour before appointment',
      sent: !!appointment.reminder_1h,
    },
    {
      key: 'reminder_15m',
      label: '15-minute reminder',
      description: '15 minutes before appointment',
      sent: !!appointment.reminder_15m,
    },
  ];
}

async function checkAndSendStage(appt, settings, stageKey, windowMs, stage) {
  if (appt[stageKey]) return; // Already sent

  const now = new Date();
  const apptTime = new Date(appt.appointment_time);
  const msUntil = apptTime - now;

  if (msUntil > 0 && msUntil <= windowMs) {
    const message = buildReminderMessage(appt, settings, stage);
    const waLink = generateWhatsAppLink(appt.phone, message);
    const msgId = uuidv4();
    const notifId = uuidv4();
    const timeStr = apptTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

    let deliveryStatus = 'sent';
    let errorMessage = null;
    let messageSid = null;

    let templateOptions = null;
    if (process.env.META_REMINDER_TEMPLATE_NAME) {
      const d = new Date(appt.appointment_time);
      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
      const dateStr = d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
      const first = appt.customer_name.split(' ')[0];
      const biz = settings?.business_name || 'ReminderFlow';
      const num = settings?.support_number || '';
      const stageText = {
        '24h': 'tomorrow',
        '1h':  'in 1 hour',
        '15m': 'in 15 minutes',
      }[stage] || 'soon';

      const isHelloWorld = process.env.META_REMINDER_TEMPLATE_NAME === 'hello_world';
      templateOptions = {
        name: process.env.META_REMINDER_TEMPLATE_NAME,
        languageCode: process.env.META_TEMPLATE_LANGUAGE_CODE || 'en_US',
        parameters: isHelloWorld ? [] : [first, biz, stageText, timeStr, dateStr, num]
      };
    }

    let result = await sendWhatsApp(appt.phone, message, templateOptions);
    let channel = 'whatsapp';

    if (!result.success) {
      console.log(`[SMS Fallback] WhatsApp automated reminder failed for ${appt.phone} at stage ${stage}. Attempting SMS fallback...`);
      const smsResult = await sendSMS(appt.phone, message);
      result = smsResult;
      channel = 'sms';
    }

    if (!result.success) {
      deliveryStatus = 'failed';
      errorMessage = result.error;
    } else {
      deliveryStatus = result.mock ? 'sent' : 'delivered';
      messageSid = result.sid;
    }

    await db.messages.insert({
      _id: msgId,
      appointment_id: appt._id,
      customer_name: appt.customer_name,
      phone: appt.phone,
      message_type: `reminder_${stage}`,
      message_body: message,
      delivery_channel: channel,
      delivery_status: deliveryStatus,
      error_message: errorMessage,
      message_sid: messageSid,
      sent_at: new Date().toISOString(),
    });

    await db.appointments.update({ _id: appt._id }, { $set: { [stageKey]: true, reminder_sent: true } });

    await db.notifications.insert({
      _id: notifId,
      type: 'reminder',
      title: `${stage === '24h' ? '24h' : stage === '1h' ? '1h' : '15min'} reminder sent to ${appt.customer_name}`,
      message: `Appointment at ${timeStr}${deliveryStatus === 'failed' ? ' (Delivery Failed)' : ''}`,
      whatsappLink: waLink,
      delivery_status: deliveryStatus,
      appointment_time: appt.appointment_time,
      read: false,
      created_at: new Date().toISOString(),
    });

    broadcastReminder({
      type: 'reminder',
      id: notifId,
      title: `${stage === '24h' ? '24-hour' : stage === '1h' ? '1-hour' : '15-minute'} reminder ${deliveryStatus === 'failed' ? 'failed' : 'sent'}`,
      message: `${appt.customer_name} — appointment at ${timeStr}`,
      whatsappLink: waLink,
      customerName: appt.customer_name,
      phone: appt.phone,
      appointmentTime: appt.appointment_time,
      messageBody: message,
      stage,
      status: deliveryStatus,
      timestamp: new Date().toISOString(),
    });

    console.log(`[ReminderEngine] ${stage} reminder (${deliveryStatus}) → ${appt.customer_name}`);
  }
}

async function runReminderEngine() {
  try {
    const settings = await db.settings.findOne({ _id: 'default' }) || {};

    const upcoming = await db.appointments.find({
      status: { $in: ['scheduled', 'confirmed'] },
      appointment_time: { $gt: new Date().toISOString() },
    });

    for (const appt of upcoming) {
      // 24h window: between 24h and 23h before
      await checkAndSendStage(appt, settings, 'reminder_24h', 24.5 * 3600 * 1000, '24h');
      // 1h window: between 65 and 55 min before
      await checkAndSendStage(appt, settings, 'reminder_1h', 65 * 60 * 1000, '1h');
      // 15min window: between 20 and 10 min before
      await checkAndSendStage(appt, settings, 'reminder_15m', 20 * 60 * 1000, '15m');
    }
  } catch (err) {
    console.error('[ReminderEngine] Error:', err.message);
  }
}

function startReminderEngine() {
  console.log('[ReminderEngine] Started — 3-stage reminder system, polling every 60s');
  runReminderEngine();
  setInterval(runReminderEngine, 60 * 1000);
}

module.exports = {
  startReminderEngine,
  addSseClient,
  removeSseClient,
  buildConfirmationMessage,
  buildReminderMessage,
  generateWhatsAppLink,
  getReminderStages,
};
