const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/settings
router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await db.settings.findOne({ _id: 'default' });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', authenticate, async (req, res) => {
  try {
    const { business_name, support_number, business_address, reminder_before_minutes, messaging_provider } = req.body;
    const update = {};
    if (business_name) update.business_name = business_name;
    if (support_number) update.support_number = support_number;
    if (business_address !== undefined) update.business_address = business_address;
    if (reminder_before_minutes) update.reminder_before_minutes = Number(reminder_before_minutes);
    if (messaging_provider) update.messaging_provider = messaging_provider;

    await db.settings.update({ _id: 'default' }, { $set: update });
    const updated = await db.settings.findOne({ _id: 'default' });
    res.json({ settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
