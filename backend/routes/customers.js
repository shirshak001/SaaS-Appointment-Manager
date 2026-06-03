const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeRiskLevel(noShows, cancellations) {
  const bad = noShows + cancellations;
  if (bad > 3) return 'high';
  if (bad > 1) return 'medium';
  return 'low';
}

// ─── GET /api/customers ──────────────────────────────────────────────────────
// List all customers grouped by phone with aggregated stats
router.get('/', authenticate, async (req, res) => {
  try {
    const appointments = await db.appointments.find({});

    // Group by phone
    const map = new Map();
    for (const appt of appointments) {
      const key = appt.phone;
      if (!map.has(key)) {
        map.set(key, {
          phone: appt.phone,
          customer_name: appt.customer_name,
          total: 0,
          completed: 0,
          cancelled: 0,
          no_shows: 0,
          last_appointment: null,
          next_appointment: null,
          all_times: [],
        });
      }
      const g = map.get(key);
      g.total++;
      if (appt.status === 'completed') g.completed++;
      if (appt.status === 'cancelled') g.cancelled++;
      if (appt.status === 'no-show') g.no_shows++;
      g.all_times.push(appt.appointment_time);
    }

    const now = new Date().toISOString();
    const customers = [];

    for (const [, g] of map) {
      const past = g.all_times.filter(t => t <= now).sort().reverse();
      const future = g.all_times.filter(t => t > now).sort();

      customers.push({
        phone: g.phone,
        customer_name: g.customer_name,
        total: g.total,
        completed: g.completed,
        cancelled: g.cancelled,
        last_appointment: past[0] || null,
        next_appointment: future[0] || null,
        risk_level: computeRiskLevel(g.no_shows, g.cancelled),
      });
    }

    // Sort by most recent activity (last or next appointment descending)
    customers.sort((a, b) => {
      const aTime = a.next_appointment || a.last_appointment || '';
      const bTime = b.next_appointment || b.last_appointment || '';
      return bTime.localeCompare(aTime);
    });

    res.json({ customers });
  } catch (err) {
    console.error('[customers] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ─── GET /api/customers/:phone ───────────────────────────────────────────────
// Full customer profile: appointments + stats + notes
router.get('/:phone', authenticate, async (req, res) => {
  try {
    const phone = decodeURIComponent(req.params.phone);

    const [appointments, notes] = await Promise.all([
      db.appointments.find({ phone }),
      db.notes.find({ phone }),
    ]);

    if (appointments.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Sort appointments by time ascending
    appointments.sort((a, b) =>
      new Date(a.appointment_time) - new Date(b.appointment_time)
    );

    // Compute stats
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const noShows  = appointments.filter(a => a.status === 'no-show').length;
    const now = new Date().toISOString();
    const past   = appointments.filter(a => a.appointment_time <= now);
    const future = appointments.filter(a => a.appointment_time > now);

    const stats = {
      total,
      completed,
      cancelled,
      no_shows: noShows,
      upcoming: future.length,
      last_appointment: past.length ? past[past.length - 1].appointment_time : null,
      next_appointment: future.length ? future[0].appointment_time : null,
      risk_level: computeRiskLevel(noShows, cancelled),
    };

    // Sort notes descending
    notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const customer_name = appointments[appointments.length - 1].customer_name;

    res.json({
      phone,
      customer_name,
      stats,
      appointments: appointments.map(a => ({ ...a, id: a._id })),
      notes: notes.map(n => ({ ...n, id: n._id })),
    });
  } catch (err) {
    console.error('[customers] GET /:phone error:', err);
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

// ─── POST /api/customers/:phone/notes ────────────────────────────────────────
// Add a note for a customer
router.post('/:phone/notes', authenticate, async (req, res) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { note, staff } = req.body;

    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ error: 'note is required' });
    }

    // Verify customer exists
    const exists = await db.appointments.findOne({ phone });
    if (!exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const doc = {
      _id: uuidv4(),
      phone,
      customer_name: exists.customer_name,
      note: note.trim(),
      staff: staff || 'System',
      created_at: new Date().toISOString(),
    };

    await db.notes.insert(doc);
    res.status(201).json({ ...doc, id: doc._id });
  } catch (err) {
    console.error('[customers] POST /:phone/notes error:', err);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// ─── GET /api/customers/:phone/notes ─────────────────────────────────────────
// List notes for a customer sorted by created_at desc
router.get('/:phone/notes', authenticate, async (req, res) => {
  try {
    const phone = decodeURIComponent(req.params.phone);

    const notes = await db.notes.find({ phone }).sort({ created_at: -1 });

    res.json({ notes: notes.map(n => ({ ...n, id: n._id })) });
  } catch (err) {
    console.error('[customers] GET /:phone/notes error:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

module.exports = router;
