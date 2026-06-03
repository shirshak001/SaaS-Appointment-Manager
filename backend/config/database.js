const Datastore = require('nedb-promises');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
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
      messaging_provider: 'mock',
    });
    console.log('[DB] Settings seeded');
  }

  // Seed demo appointments
  const apptCount = await db.appointments.count({});
  if (apptCount === 0) {
    const now = new Date();
    const samples = [
      { customer_name: 'Arjun Sharma',  phone: '+91 9876543210', offset:  2, notes: 'Regular checkup',            status: 'confirmed',  reminder_sent: true  },
      { customer_name: 'Priya Mehta',   phone: '+91 9123456789', offset:  4, notes: 'Hair styling appointment',   status: 'scheduled',  reminder_sent: false },
      { customer_name: 'Rohan Verma',   phone: '+91 9988776655', offset: -1, notes: 'Tax consultation',           status: 'completed',  reminder_sent: true  },
      { customer_name: 'Sneha Patel',   phone: '+91 9765432100', offset:  6, notes: 'Laptop screen repair',       status: 'scheduled',  reminder_sent: false },
      { customer_name: 'Vikram Singh',  phone: '+91 9456789012', offset:  8, notes: 'Water purifier service',     status: 'confirmed',  reminder_sent: false },
      { customer_name: 'Ananya Reddy',  phone: '+91 9321654987', offset: -3, notes: '',                           status: 'cancelled',  reminder_sent: false },
      { customer_name: 'Dev Kapoor',    phone: '+91 9654321098', offset: 24, notes: 'Annual wellness checkup',    status: 'scheduled',  reminder_sent: false },
    ];

    for (const s of samples) {
      const apptTime = new Date(now.getTime() + s.offset * 3600 * 1000);
      const id = uuidv4();
      await db.appointments.insert({
        _id: id,
        customer_name: s.customer_name,
        phone: s.phone,
        appointment_time: apptTime.toISOString(),
        notes: s.notes,
        status: s.status,
        reminder_sent: s.reminder_sent,
        created_at: new Date().toISOString(),
      });

      if (s.reminder_sent) {
        await db.messages.insert({
          _id: uuidv4(), appointment_id: id,
          customer_name: s.customer_name, phone: s.phone,
          message_type: 'confirmation',
          message_body: `Hello ${s.customer_name.split(' ')[0]}, your appointment has been confirmed.`,
          delivery_status: 'delivered',
          sent_at: new Date(now.getTime() - 3600000).toISOString(),
        });
        await db.messages.insert({
          _id: uuidv4(), appointment_id: id,
          customer_name: s.customer_name, phone: s.phone,
          message_type: 'reminder',
          message_body: `Hello ${s.customer_name.split(' ')[0]}, this is a reminder for your appointment.`,
          delivery_status: 'delivered',
          sent_at: new Date(now.getTime() - 1800000).toISOString(),
        });
      } else if (s.status === 'confirmed' || s.status === 'scheduled') {
        await db.messages.insert({
          _id: uuidv4(), appointment_id: id,
          customer_name: s.customer_name, phone: s.phone,
          message_type: 'confirmation',
          message_body: `Hello ${s.customer_name.split(' ')[0]}, your appointment has been confirmed.`,
          delivery_status: 'delivered',
          sent_at: new Date(now.getTime() - 7200000).toISOString(),
        });
      }
    }
    console.log('[DB] Sample appointments seeded');
  }
}

module.exports = { db, initDb };
