require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PassThrough } = require('stream');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const rateLimit = require('express-rate-limit');

const { executeCode } = require('./services/executionService');
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

// Checks if Docker daemon is reachable
async function isDockerAvailable() {
  try {
    const Docker = require('dockerode');
    const docker = new Docker();
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

const FALLBACK_RUNNERS = {
  javascript: { cmd: 'node',    ext: 'js'  },
  python:     { cmd: 'python3', ext: 'py'  },
  rust:       { cmd: null,      ext: 'rs'  }, // rust needs compile step, skip in fallback
};

const DOCKER_RUNNERS = {
  javascript: { image: 'node:18-alpine',  file: 'code.js', cmd: ['node',   '/sandbox/code.js'] },
  python:     { image: 'python:3.9-slim', file: 'code.py', cmd: ['python', '/sandbox/code.py'] },
  rust:       { image: 'rust:alpine',     file: 'code.rs', cmd: ['sh', '-c', 'rustc /sandbox/code.rs -o /tmp/out 2>&1 && /tmp/out'] },
  go:         { image: 'golang:alpine',   file: 'code.go', cmd: ['go', 'run', '/sandbox/code.go'] },
  java:       { image: 'openjdk:17-alpine', file: 'Main.java', cmd: ['sh', '-c', 'javac /sandbox/Main.java -d /tmp && java -cp /tmp Main'] },
};

const TEMP_DIR = path.join(__dirname, '../../temp');

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

  let cleanupFns = [];

  req.on('close', () => {
    cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
  });

  try {
    const dockerOk = await isDockerAvailable();

    if (dockerOk && DOCKER_RUNNERS[language]) {
      // ── Docker path ──────────────────────────────────────────────────────────
      const Docker = require('dockerode');
      const docker = new Docker();
      const runner = DOCKER_RUNNERS[language];

      const execDir = path.join(TEMP_DIR, randomUUID());
      fs.mkdirSync(execDir, { recursive: true });
      fs.writeFileSync(path.join(execDir, runner.file), code, 'utf8');
      fs.writeFileSync(path.join(execDir, 'stdin.txt'), stdin, 'utf8');
      cleanupFns.push(() => fs.rmSync(execDir, { recursive: true, force: true }));

      const container = await docker.createContainer({
        Image: runner.image,
        Cmd: runner.cmd,
        HostConfig: {
          Binds: [`${execDir}:/sandbox:ro`],
          NetworkMode: 'none',
          Memory: 50 * 1024 * 1024,
          AutoRemove: false,
        },
      });

      cleanupFns.push(async () => {
        try { await container.remove({ force: true }); } catch (_) {}
      });

      const logStream = await container.attach({ stream: true, stdout: true, stderr: true });
      const stdoutPass = new PassThrough();
      const stderrPass = new PassThrough();
      docker.modem.demuxStream(logStream, stdoutPass, stderrPass);

      stdoutPass.on('data', chunk => sendEvent({ type: 'stdout', content: chunk.toString('utf8') }));
      stderrPass.on('data', chunk => sendEvent({ type: 'stderr', content: chunk.toString('utf8') }));

      await container.start();

      const timeoutHandle = setTimeout(async () => {
        sendEvent({ type: 'error', content: 'Execution timed out (10s limit)' });
        sendEvent({ type: 'exit', code: 124 });
        res.end();
        try { await container.kill(); } catch (_) {}
        cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
      }, 10000);

      const exitData = await container.wait();
      clearTimeout(timeoutHandle);
      // Allow stream to flush remaining buffered data (same fix as executionService.js:77)
      await new Promise(r => setTimeout(r, 100));
      sendEvent({ type: 'exit', code: exitData.StatusCode });
      res.end();
      cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });

    } else {
      // ── child_process fallback (no Docker) ──────────────────────────────────
      const { spawn } = require('child_process');
      const runner = FALLBACK_RUNNERS[language];

      if (!runner || !runner.cmd) {
        sendEvent({ type: 'error', content: `Language "${language}" requires Docker (not available on this machine).` });
        sendEvent({ type: 'exit', code: 1 });
        res.end();
        return;
      }

      const tmpFile = path.join(os.tmpdir(), `itecify_${Date.now()}.${runner.ext}`);
      fs.writeFileSync(tmpFile, code, 'utf8');
      cleanupFns.push(() => { try { fs.unlinkSync(tmpFile); } catch (_) {} });

      const proc = spawn(runner.cmd, [tmpFile]);

      // Write stdin and close it
      if (stdin) proc.stdin.write(stdin);
      proc.stdin.end();

      const timeoutHandle = setTimeout(() => {
        sendEvent({ type: 'error', content: 'Execution timed out (5s limit)' });
        sendEvent({ type: 'exit', code: 124 });
        res.end();
        proc.kill('SIGKILL');
        cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
      }, 5000);

      proc.stdout.on('data', chunk => sendEvent({ type: 'stdout', content: chunk.toString('utf8') }));
      proc.stderr.on('data', chunk => sendEvent({ type: 'stderr', content: chunk.toString('utf8') }));

      proc.on('close', exitCode => {
        clearTimeout(timeoutHandle);
        sendEvent({ type: 'exit', code: exitCode });
        res.end();
        cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
      });

      proc.on('error', err => {
        clearTimeout(timeoutHandle);
        sendEvent({ type: 'error', content: err.message });
        sendEvent({ type: 'exit', code: 1 });
        res.end();
        cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
      });
    }

  } catch (error) {
    sendEvent({ type: 'error', content: error.message });
    sendEvent({ type: 'exit', code: 1 });
    res.end();
    cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
  }
});

// ─── AI Route ─────────────────────────────────────────────────────────────────

app.use('/api/ai', aiLimiter, aiRoute);

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`iTECify backend running on http://localhost:${PORT}`);
});
