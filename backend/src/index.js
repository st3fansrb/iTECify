require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { executeCode, executeCodeStream } = require('./services/executionService');
const { scanCode } = require('./services/scannerService');
const { requireAuth } = require('./middleware/authMiddleware');
const aiRoute = require('./routes/aiRoute');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// ─── Rate Limiters ─────────────────────────────────────────────────────────────

// TASK 1.6 — Max 10 executions/min/IP
const executeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many executions. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for AI (5/min/IP)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many AI requests. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'iTECify API' });
});

// Original execute endpoint (non-streaming, kept as fallback)
// Rate limiter applied BEFORE auth
app.post('/api/execute', executeLimiter, requireAuth, async (req, res) => {
  const { language, code, stdin = '', force } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Missing required fields: language, code' });
  }

  // Run security scan
  const scan = scanCode(code, language);
  const hasHighSeverity = scan.warnings.some(w => w.severity === 'high');

  // Block if high-severity warnings and no explicit force flag
  if (hasHighSeverity && !force) {
    return res.status(200).json({
      stdout: '',
      stderr: '',
      error: null,
      scanWarnings: scan.warnings,
      blocked: true,
    });
  }

  const result = await executeCode(language, code, stdin);
  res.json({ ...result, scanWarnings: scan.warnings });
});

// ─── TASK 1.7 — SSE Streaming Execution ───────────────────────────────────────

app.post('/api/execute/stream', executeLimiter, requireAuth, async (req, res) => {
  const { language, code, stdin = '', force } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: 'Missing required fields: language, code' });
  }

  // Security scan first
  const scan = scanCode(code, language);
  const hasHighSeverity = scan.warnings.some(w => w.severity === 'high');

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  // Send scan results immediately
  if (scan.warnings.length > 0) {
    sendEvent({ type: 'scan', warnings: scan.warnings, safe: scan.safe });
  }

  // If high-severity and no force flag, stop here
  if (hasHighSeverity && !force) {
    sendEvent({ type: 'blocked', message: 'Execution blocked due to security warnings. Send force: true to override.' });
    sendEvent({ type: 'exit', code: 1 });
    res.end();
    return;
  }

  const cleanupFns = [];

  req.on('close', () => {
    cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
  });

  try {
    await executeCodeStream(language, code, stdin, {
      onStdout: (content) => sendEvent({ type: 'stdout', content }),
      onStderr: (content) => sendEvent({ type: 'stderr', content }),
      onError:  (content) => sendEvent({ type: 'error', content }),
      onExit:   (exitCode) => {
        sendEvent({ type: 'exit', code: exitCode });
        res.end();
        cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
      },
      onCleanup: (fn) => cleanupFns.push(fn),
    });
  } catch (error) {
    sendEvent({ type: 'error', content: error.message });
    sendEvent({ type: 'exit', code: 1 });
    res.end();
    cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
  }
});

// ─── AI Route ─────────────────────────────────────────────────────────────────

app.use('/api/ai', aiLimiter, aiRoute);

// ─── Invite Route ──────────────────────────────────────────────────────────────

const inviteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many invite requests. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/invite', inviteLimiter, requireAuth, async (req, res) => {
  const { email, projectId } = req.body;

  if (!email || !projectId) {
    return res.status(400).json({ error: 'Missing required fields: email, projectId' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const adminClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5173'}/editor`,
    });

    if (error) {
      // User already exists — invitation still created in DB, no magic link needed
      if (error.message?.includes('already been registered')) {
        return res.json({ success: true, alreadyRegistered: true });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, alreadyRegistered: false });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Serve Frontend (production) ───────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
} else {
  console.warn("Folderul frontend/dist nu a fost găsit. Frontend-ul nu va fi servit.");
}

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`iTECify backend running on http://localhost:${PORT}`);
});
