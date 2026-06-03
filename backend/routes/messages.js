const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/messages
router.get('/', authenticate, async (req, res) => {
  try {
    const { filter, type } = req.query;
    let query = {};

    if (filter === 'today') {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
      query.sent_at = { $gte: todayStart.toISOString(), $lte: todayEnd.toISOString() };
    } else if (filter === 'week') {
      query.sent_at = { $gte: new Date(Date.now() - 7 * 86400000).toISOString() };
    }

    if (type === 'failed') {
      query.delivery_status = 'failed';
    } else if (type === 'delivered') {
      query.delivery_status = { $in: ['delivered', 'sent'] };
    }

    const messages = await db.messages.find(query).sort({ sent_at: -1 });
    res.json({ messages: messages.map(m => ({ ...m, id: m._id })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await db.notifications.find({ read: false }).sort({ created_at: -1 });
    res.json({ notifications: notifications.map(n => ({ ...n, id: n._id })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/messages/notifications/mark-read
router.put('/notifications/mark-read', authenticate, async (req, res) => {
  try {
    await db.notifications.update({}, { $set: { read: true } }, { multi: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
