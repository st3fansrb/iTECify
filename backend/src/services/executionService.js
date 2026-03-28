const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');

const TEMP_DIR = path.join(__dirname, '../../temp');
const TIMEOUT_MS = 10000;

// Docker runners (used when Docker is available)
const DOCKER_RUNNERS = {
  javascript: { image: 'node:18-alpine',    file: 'code.js', cmd: ['node',   '/sandbox/code.js'] },
  python:     { image: 'python:3.9-slim',   file: 'code.py', cmd: ['python', '/sandbox/code.py'] },
  rust:       { image: 'rust:alpine',       file: 'code.rs', cmd: ['sh', '-c', 'rustc /sandbox/code.rs -o /tmp/out 2>&1 && /tmp/out'] },
  go:         { image: 'golang:alpine',     file: 'code.go', cmd: ['go', 'run', '/sandbox/code.go'] },
  java:       { image: 'openjdk:17-alpine', file: 'Main.java', cmd: ['sh', '-c', 'javac /sandbox/Main.java -d /tmp && java -cp /tmp Main'] },
};

// Fallback runners (child_process, no Docker needed)
const FALLBACK_RUNNERS = {
  javascript: { cmd: 'node',    args: (f) => [f], ext: 'js'  },
  python:     { cmd: 'python',  args: (f) => [f], ext: 'py'  },
};

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

async function executeWithDocker(language, code) {
  const { PassThrough } = require('stream');
  const Docker = require('dockerode');
  const docker = new Docker();
  const runner = DOCKER_RUNNERS[language];

  const execDir = path.join(TEMP_DIR, randomUUID());
  let container = null;
  let timedOut = false;

  try {
    fs.mkdirSync(execDir, { recursive: true });
    fs.writeFileSync(path.join(execDir, runner.file), code, 'utf8');

    container = await docker.createContainer({
      Image: runner.image,
      Cmd: runner.cmd,
      HostConfig: {
        Binds: [`${execDir}:/sandbox:ro`],
        Tmpfs: { '/tmp': 'size=64m,exec' },  // Rust/Java compilează în /tmp
        NetworkMode: 'none',
        Memory: 50 * 1024 * 1024,
        MemorySwap: 50 * 1024 * 1024,
        NanoCpus: 500000000,
        PidsLimit: 50,
        OomKillDisable: false,
        AutoRemove: false,
      },
    });

    const logStream = await container.attach({ stream: true, stdout: true, stderr: true });
    const stdoutPass = new PassThrough();
    const stderrPass = new PassThrough();
    docker.modem.demuxStream(logStream, stdoutPass, stderrPass);

    let stdoutData = '', stderrData = '';
    stdoutPass.on('data', chunk => { stdoutData += chunk.toString('utf8'); });
    stderrPass.on('data', chunk => { stderrData += chunk.toString('utf8'); });
    stdoutPass.on('error', err => { console.error('[docker] stdout error:', err.message); });
    stderrPass.on('error', err => { console.error('[docker] stderr error:', err.message); });
    logStream.on('error', err => { console.error('[docker] log stream error:', err.message); });

    await container.start();

    await Promise.race([
      container.wait(),
      new Promise(resolve => setTimeout(() => { timedOut = true; resolve(); }, TIMEOUT_MS)),
    ]);

    if (timedOut) {
      await container.stop({ t: 0 }).catch(() => {});
      return { stdout: '', stderr: '', error: `Execution timed out (>${TIMEOUT_MS / 1000}s)` };
    }

    await new Promise(r => setTimeout(r, 100));
    return { stdout: stdoutData, stderr: stderrData, error: null };

  } catch (err) {
    return { stdout: '', stderr: '', error: err.message };
  } finally {
    if (container) await container.remove({ force: true }).catch(() => {});
    fs.rmSync(execDir, { recursive: true, force: true });
  }
}

async function executeWithFallback(language, code) {
  const runner = FALLBACK_RUNNERS[language];
  if (!runner) {
    return {
      stdout: '',
      stderr: '',
      error: `Language "${language}" requires Docker. Start Docker Desktop and try again.`,
    };
  }

  const tmpFile = path.join(os.tmpdir(), `itecify_${randomUUID()}.${runner.ext}`);
  fs.writeFileSync(tmpFile, code, 'utf8');

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let finished = false;

    const proc = spawn(runner.cmd, runner.args(tmpFile), { timeout: 5000 });

    const finish = (error = null) => {
      if (finished) return;
      finished = true;
      try { fs.unlinkSync(tmpFile); } catch (_) {}
      resolve({ stdout: stdoutData, stderr: stderrData, error });
    };

    proc.stdout.on('data', chunk => { stdoutData += chunk.toString('utf8'); });
    proc.stderr.on('data', chunk => { stderrData += chunk.toString('utf8'); });
    proc.on('close', () => finish());
    proc.on('error', err => finish(err.message));

    setTimeout(() => {
      proc.kill('SIGKILL');
      finish('Execution timed out (>5s)');
    }, 5000);
  });
}

async function executeCode(language, code) {
  if (!DOCKER_RUNNERS[language] && !FALLBACK_RUNNERS[language]) {
    return { stdout: '', stderr: '', error: `Unsupported language: ${language}` };
  }

  const dockerOk = await isDockerAvailable();

  if (dockerOk && DOCKER_RUNNERS[language]) {
    return executeWithDocker(language, code);
  }

  return executeWithFallback(language, code);
}

module.exports = { executeCode };
