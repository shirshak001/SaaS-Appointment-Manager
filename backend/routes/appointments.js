const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { buildConfirmationMessage, buildReminderMessage, generateWhatsAppLink, getReminderStages } = require('../services/reminderEngine');
const { checkConflict } = require('../services/conflictDetector');
const { sendWhatsApp } = require('../services/twilioService');

// GET /api/appointments/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);

    const [total, todayCount, messagesCount, pendingReminders] = await Promise.all([
      db.appointments.count({}),
      db.appointments.count({
        appointment_time: { $gte: todayStart.toISOString(), $lte: todayEnd.toISOString() }
      }),
      db.messages.count({}),
      db.appointments.count({
        reminder_sent: false,
        status: { $in: ['scheduled', 'confirmed'] },
        appointment_time: { $gt: now.toISOString() }
      }),
    ]);

    res.json({ total, today: todayCount, messages: messagesCount, pendingReminders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments/check-conflict
router.post('/check-conflict', authenticate, async (req, res) => {
  try {
    const { appointment_time, duration_minutes = 60, exclude_id } = req.body;
    if (!appointment_time) return res.status(400).json({ error: 'appointment_time required' });
    const result = await checkConflict(appointment_time, duration_minutes, exclude_id || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appointments
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search, date } = req.query;
    let query = {};

    if (status && status !== 'all') query.status = status;
    if (date) {
      const d = new Date(date + 'T00:00:00');
      const dEnd = new Date(date + 'T23:59:59');
      query.appointment_time = { $gte: d.toISOString(), $lte: dEnd.toISOString() };
    }

    let appointments = await db.appointments.find(query).sort({ appointment_time: 1 });

    if (search) {
      const s = search.toLowerCase();
      appointments = appointments.filter(a =>
        a.customer_name.toLowerCase().includes(s) || a.phone.includes(s)
      );
    }

    // Map _id to id for frontend compatibility
    appointments = appointments.map(a => ({ ...a, id: a._id }));
    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appointments/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const appt = await db.appointments.findOne({ _id: req.params.id });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const messages = await db.messages.find({ appointment_id: req.params.id }).sort({ sent_at: -1 });
    const reminderStages = getReminderStages(appt);
    res.json({
      appointment: { ...appt, id: appt._id },
      messages: messages.map(m => ({ ...m, id: m._id })),
      reminderStages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments
router.post('/', authenticate, async (req, res) => {
  try {
    const { customer_name, phone, appointment_time, notes } = req.body;
    if (!customer_name || !phone || !appointment_time)
      return res.status(400).json({ error: 'Customer name, phone and appointment time are required' });

    const settings = await db.settings.findOne({ _id: 'default' }) || {};
    const id = uuidv4();

    await db.appointments.insert({
      _id: id,
      customer_name: customer_name.trim(),
      phone: phone.trim(),
      appointment_time: new Date(appointment_time).toISOString(),
      notes: notes?.trim() || '',
      status: 'scheduled',
      reminder_sent: false,
      created_at: new Date().toISOString(),
    });

    const confirmMsg = buildConfirmationMessage({ customer_name, phone, appointment_time }, settings);
    const waLink = generateWhatsAppLink(phone, confirmMsg);

    let deliveryStatus = 'sent';
    let errorMessage = null;
    let messageSid = null;

    const result = await sendWhatsApp(phone.trim(), confirmMsg);
    if (!result.success) {
      deliveryStatus = 'failed';
      errorMessage = result.error;
    } else {
      deliveryStatus = result.mock ? 'sent' : 'delivered';
      messageSid = result.sid;
    }

    await db.messages.insert({
      _id: uuidv4(),
      appointment_id: id,
      customer_name: customer_name.trim(),
      phone: phone.trim(),
      message_type: 'confirmation',
      message_body: confirmMsg,
      delivery_status: deliveryStatus,
      error_message: errorMessage,
      message_sid: messageSid,
      sent_at: new Date().toISOString(),
    });

    const appt = await db.appointments.findOne({ _id: id });
    res.status(201).json({ appointment: { ...appt, id: appt._id }, whatsappLink: waLink, confirmationMessage: confirmMsg, deliveryStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appointments/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const appt = await db.appointments.findOne({ _id: req.params.id });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const { customer_name, phone, appointment_time, notes, status } = req.body;
    const update = {};
    if (customer_name) update.customer_name = customer_name;
    if (phone) update.phone = phone;
    if (appointment_time) update.appointment_time = new Date(appointment_time).toISOString();
    if (notes !== undefined) update.notes = notes;
    if (status) update.status = status;

    await db.appointments.update({ _id: req.params.id }, { $set: update });
    const updated = await db.appointments.findOne({ _id: req.params.id });
    res.json({ appointment: { ...updated, id: updated._id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/appointments/:id (cancel)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const appt = await db.appointments.findOne({ _id: req.params.id });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    await db.appointments.update({ _id: req.params.id }, { $set: { status: 'cancelled' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments/:id/send-reminder
router.post('/:id/send-reminder', authenticate, async (req, res) => {
  try {
    const appt = await db.appointments.findOne({ _id: req.params.id });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const settings = await db.settings.findOne({ _id: 'default' }) || {};
    const message = buildReminderMessage(appt, settings);
    const waLink = generateWhatsAppLink(appt.phone, message);

    let deliveryStatus = 'sent';
    let errorMessage = null;
    let messageSid = null;

    const result = await sendWhatsApp(appt.phone, message);
    if (!result.success) {
      deliveryStatus = 'failed';
      errorMessage = result.error;
    } else {
      deliveryStatus = result.mock ? 'sent' : 'delivered';
      messageSid = result.sid;
    }

    await db.messages.insert({
      _id: uuidv4(),
      appointment_id: appt._id,
      customer_name: appt.customer_name,
      phone: appt.phone,
      message_type: 'reminder',
      message_body: message,
      delivery_status: deliveryStatus,
      error_message: errorMessage,
      message_sid: messageSid,
      sent_at: new Date().toISOString(),
    });

    await db.appointments.update({ _id: req.params.id }, { $set: { reminder_sent: true } });
    res.json({ success: true, whatsappLink: waLink, message, deliveryStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
