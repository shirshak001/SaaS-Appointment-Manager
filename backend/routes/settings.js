const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authorize } = require('../middleware/auth');

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

module.exports = router;
