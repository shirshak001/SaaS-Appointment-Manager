require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/database');
const { startReminderEngine, addSseClient, removeSseClient } = require('./services/reminderEngine');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports', require('./routes/reports'));

// SSE for real-time reminder notifications
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  addSseClient(res);
  const hb = setInterval(() => res.write(`: heartbeat\n\n`), 30000);
  req.on('close', () => { clearInterval(hb); removeSseClient(res); });
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve static assets from frontend build folder in production
const path = require('path');
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// For all other requests, serve index.html (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Initialize DB then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`ReminderFlow API running on http://localhost:${PORT}`);
    startReminderEngine();
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
