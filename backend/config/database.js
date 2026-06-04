const Datastore = require('nedb-promises');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// On Render (production), set DATA_PATH env var to the persistent disk mount point (e.g. /data)
// so database files survive server restarts. Falls back to local data/ directory.
const DATA_DIR = process.env.DATA_PATH || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = {
  users: Datastore.create({ filename: path.join(DATA_DIR, 'users.db'), autoload: true }),
  appointments: Datastore.create({ filename: path.join(DATA_DIR, 'appointments.db'), autoload: true }),
  messages: Datastore.create({ filename: path.join(DATA_DIR, 'messages.db'), autoload: true }),
  settings: Datastore.create({ filename: path.join(DATA_DIR, 'settings.db'), autoload: true }),
  notifications: Datastore.create({ filename: path.join(DATA_DIR, 'notifications.db'), autoload: true }),
  notes: Datastore.create({ filename: path.join(DATA_DIR, 'notes.db'), autoload: true }),
};

async function initDb() {
  // Seed admin user
  const existingUser = await db.users.findOne({ email: 'admin@reminderflow.com' });
  if (!existingUser) {
    const hashed = bcrypt.hashSync('admin123', 10);
    await db.users.insert({
      _id: uuidv4(),
      email: 'admin@reminderflow.com',
      password: hashed,
      name: 'Admin User',
      role: 'admin',
      verified: true,
      created_at: new Date().toISOString(),
    });
    console.log('[DB] Admin user seeded');
  }

  // Seed settings
  const existingSettings = await db.settings.findOne({ _id: 'default' });
  if (!existingSettings) {
    await db.settings.insert({
      _id: 'default',
      business_name: 'ReminderFlow Business',
      support_number: '+91 9800000000',
      business_address: '123 Business Street',
      reminder_before_minutes: 60,
    });
    console.log('[DB] Settings seeded');
  }

}

module.exports = { db, initDb };
