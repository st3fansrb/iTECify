const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Verifies the Supabase JWT from the Authorization: Bearer <token> header.
 * Attaches the user to req.user if valid, otherwise returns 401.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: error?.message || 'Invalid or expired token' });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('[authMiddleware] Unexpected error:', err);
    return res.status(500).json({ error: 'Auth service error: ' + (err.message || 'unknown') });
  }
}

module.exports = { requireAuth };
