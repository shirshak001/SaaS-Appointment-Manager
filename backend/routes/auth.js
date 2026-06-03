const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'reminderflow_secret';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Check if email verification is completed
    if (user.verified === false) {
      return res.status(403).json({
        error: 'Verification required',
        verified: false,
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role || 'admin', verified: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role || 'admin', verified: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const user = await db.users.findOne({ _id: payload.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role || 'admin', verified: user.verified !== false } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const emailClean = email.toLowerCase().trim();
    const existing = await db.users.findOne({ email: emailClean });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const userId = uuidv4();
    
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour

    const userRole = role === 'staff' ? 'staff' : 'admin';

    await db.users.insert({
      _id: userId,
      email: emailClean,
      password: hashed,
      name: name.trim(),
      role: userRole,
      verified: false,
      verification_code: verificationCode,
      verification_expires_at: expires,
      created_at: new Date().toISOString(),
    });

    // Log the verification code to backend console
    console.log(`\n==================================================`);
    console.log(`[EMAIL VERIFICATION] Code for ${emailClean}: ${verificationCode}`);
    console.log(`==================================================\n`);

    // Insert verification code into messages collection so it can be seen if needed
    await db.messages.insert({
      _id: uuidv4(),
      customer_name: name.trim(),
      phone: 'SYSTEM',
      message_type: 'verification_email',
      message_body: `Hello ${name.trim()},\n\nYour verification code is: ${verificationCode}\n\nThank you.`,
      delivery_status: 'delivered',
      sent_at: new Date().toISOString(),
    });

    const token = jwt.sign(
      { id: userId, email: emailClean, name: name.trim(), role: userRole, verified: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: userId, email: emailClean, name: name.trim(), role: userRole, verified: false }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and verification code are required' });

    const emailClean = email.toLowerCase().trim();
    const user = await db.users.findOne({ email: emailClean });
    if (!user) return res.status(400).json({ error: 'User not found' });

    if (user.verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (new Date() > new Date(user.verification_expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark as verified
    await db.users.update(
      { _id: user._id },
      { $set: { verified: true }, $unset: { verification_code: true, verification_expires_at: true } }
    );

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role || 'admin', verified: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role || 'admin', verified: true }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailClean = email.toLowerCase().trim();
    const user = await db.users.findOne({ email: emailClean });
    if (!user) return res.status(400).json({ error: 'User not found' });

    if (user.verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3600 * 1000).toISOString();

    await db.users.update(
      { _id: user._id },
      { $set: { verification_code: verificationCode, verification_expires_at: expires } }
    );

    console.log(`\n==================================================`);
    console.log(`[EMAIL VERIFICATION RESENT] Code for ${emailClean}: ${verificationCode}`);
    console.log(`==================================================\n`);

    await db.messages.insert({
      _id: uuidv4(),
      customer_name: user.name,
      phone: 'SYSTEM',
      message_type: 'verification_email',
      message_body: `Hello ${user.name},\n\nYour verification code is: ${verificationCode}\n\nThank you.`,
      delivery_status: 'delivered',
      sent_at: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Verification code resent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailClean = email.toLowerCase().trim();
    const user = await db.users.findOne({ email: emailClean });
    if (!user) return res.status(400).json({ error: 'User with this email does not exist' });

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    await db.users.update(
      { _id: user._id },
      { $set: { reset_token: resetToken, reset_expires_at: expires } }
    );

    console.log(`\n==================================================`);
    console.log(`[PASSWORD RESET] Code for ${emailClean}: ${resetToken}`);
    console.log(`==================================================\n`);

    await db.messages.insert({
      _id: uuidv4(),
      customer_name: user.name,
      phone: 'SYSTEM',
      message_type: 'password_reset_email',
      message_body: `Hello ${user.name},\n\nYour password reset code is: ${resetToken}\n\nThank you.`,
      delivery_status: 'delivered',
      sent_at: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Password reset code sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return res.status(400).json({ error: 'Email, reset token and new password are required' });
    }

    const emailClean = email.toLowerCase().trim();
    const user = await db.users.findOne({ email: emailClean });
    if (!user) return res.status(400).json({ error: 'User not found' });

    if (user.reset_token !== token) {
      return res.status(400).json({ error: 'Invalid password reset code' });
    }

    if (new Date() > new Date(user.reset_expires_at)) {
      return res.status(400).json({ error: 'Password reset code has expired' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    await db.users.update(
      { _id: user._id },
      { $set: { password: hashed }, $unset: { reset_token: true, reset_expires_at: true } }
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/sessions
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    
    // Attempt to extract IP address
    const ip = req.headers['x-forwarded-for'] || 
               req.socket.remoteAddress || 
               '127.0.0.1';

    // Format login/expiry times from token
    const loginTime = req.user.iat ? new Date(req.user.iat * 1000).toISOString() : new Date().toISOString();
    const expiryTime = req.user.exp ? new Date(req.user.exp * 1000).toISOString() : new Date().toISOString();

    res.json({
      sessions: [
        {
          id: 'current-session',
          ip: ip.split(',')[0].trim(),
          userAgent,
          isCurrent: true,
          loggedInAt: loginTime,
          expiresAt: expiryTime,
        }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
