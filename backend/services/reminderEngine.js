const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendWhatsApp } = require('./twilioService');

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
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' });
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
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' });
  const first = appt.customer_name.split(' ')[0];
  const biz = settings?.business_name || 'ReminderFlow';
  const num = settings?.support_number || '';
  return `Hello ${first},\n\nYour appointment at ${biz} has been confirmed for ${timeStr} on ${dateStr}.\n\nFor any queries, contact us at ${num}.\n\nThank you.`;
}

function generateWhatsAppLink(phone, message) {
  const cleaned = phone.replace(/\s+/g, '').replace(/^\+/, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
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
    const timeStr = apptTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    let deliveryStatus = 'sent';
    let errorMessage = null;
    let messageSid = null;

    if (settings.messaging_provider === 'twilio') {
      const result = await sendWhatsApp(appt.phone, message);
      if (!result.success) {
        deliveryStatus = 'failed';
        errorMessage = result.error;
      } else {
        deliveryStatus = result.mock ? 'sent' : 'delivered';
        messageSid = result.sid;
      }
    }

    await db.messages.insert({
      _id: msgId,
      appointment_id: appt._id,
      customer_name: appt.customer_name,
      phone: appt.phone,
      message_type: `reminder_${stage}`,
      message_body: message,
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
