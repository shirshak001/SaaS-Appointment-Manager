const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.slice(7);

  try {
    // 1. Try Supabase JWT Secret Verification (local verification, no roundtrip)
    if (SUPABASE_JWT_SECRET) {
      try {
        const payload = jwt.verify(token, SUPABASE_JWT_SECRET);
        req.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.user_metadata?.name || payload.email?.split('@')[0],
          role: 'admin'
        };
        return next();
      } catch (err) {
        // Fall through to next check
      }
    }

    // 2. Try Supabase Client getUser Verification (secure network roundtrip validation)
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            role: 'admin'
          };
          return next();
        }
      } catch (err) {
        // Fall through to next check
      }
    }

    // 3. Fallback to Legacy JWT Flow (custom database admin user)
    const JWT_SECRET = process.env.JWT_SECRET || 'reminderflow_secret';
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(roles = []) {
  const rolesArray = typeof roles === 'string' ? [roles] : roles;
  return [
    authenticate,
    (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (rolesArray.length && !rolesArray.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Access denied' });
      }
      next();
    }
  ];
}

module.exports = { authenticate, authorize };
