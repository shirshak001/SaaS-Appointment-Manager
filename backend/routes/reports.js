const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ─── GET /api/reports/summary ────────────────────────────────────────────────
// Overall business summary statistics
router.get('/summary', authenticate, async (req, res) => {
  try {
    const [appointments, messages] = await Promise.all([
      db.appointments.find({}),
      db.messages.find({}),
    ]);

    const total     = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;

    const completionRate   = total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0;
    const cancellationRate = total > 0 ? parseFloat(((cancelled / total) * 100).toFixed(1)) : 0;

    // Reminder success = appointments where reminder_sent is true / all that had a reminder attempted
    const reminderSent    = appointments.filter(a => a.reminder_sent === true).length;
    const reminderSuccessRate = total > 0 ? parseFloat(((reminderSent / total) * 100).toFixed(1)) : 0;

    // Top customers by appointment count
    const customerMap = new Map();
    for (const appt of appointments) {
      const key = appt.phone;
      if (!customerMap.has(key)) {
        customerMap.set(key, { name: appt.customer_name, phone: appt.phone, count: 0 });
      }
      customerMap.get(key).count++;
    }
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      total,
      completed,
      cancelled,
      completionRate,
      cancellationRate,
      reminderSuccessRate,
      topCustomers,
    });
  } catch (err) {
    console.error('[reports] GET /summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ─── GET /api/reports/appointments ──────────────────────────────────────────
// Filtered appointment list for export
// Query params: from (ISO), to (ISO), status
router.get('/appointments', authenticate, async (req, res) => {
  try {
    const { from, to, status } = req.query;

    // Build nedb query
    const query = {};

    if (status && status.trim() !== '') {
      query.status = status.trim();
    }

    let appointments = await db.appointments.find(query).sort({ appointment_time: 1 });

    // Date range filtering (done in JS to keep nedb compat)
    if (from) {
      const fromDate = new Date(from).toISOString();
      appointments = appointments.filter(a => a.appointment_time >= fromDate);
    }
    if (to) {
      const toDate = new Date(to).toISOString();
      appointments = appointments.filter(a => a.appointment_time <= toDate);
    }

    res.json({
      count: appointments.length,
      appointments: appointments.map(a => ({ ...a, id: a._id })),
    });
  } catch (err) {
    console.error('[reports] GET /appointments error:', err);
    res.status(500).json({ error: 'Failed to fetch appointments for report' });
  }
});

module.exports = router;
