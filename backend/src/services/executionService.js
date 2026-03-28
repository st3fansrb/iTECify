const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PassThrough } = require('stream');

const docker = new Docker();
const TEMP_DIR = path.join(__dirname, '../../temp');
const TIMEOUT_MS = 10000; // 10s hard kill

// Maps language -> { Docker image, filename, command }
const RUNNERS = {
  javascript: { image: 'node:18-alpine',  file: 'code.js', cmd: ['node',   '/sandbox/code.js'] },
  python:     { image: 'python:3.9-slim', file: 'code.py', cmd: ['python', '/sandbox/code.py'] },
  rust:       { image: 'rust:alpine',     file: 'code.rs', cmd: ['sh', '-c', 'rustc /sandbox/code.rs -o /tmp/out 2>&1 && /tmp/out'] },
};

/**
 * Executes user-submitted code inside an isolated Docker container.
 * @param {string} language  - 'javascript' | 'python'
 * @param {string} code      - source code string
 * @returns {Promise<{ stdout: string, stderr: string, error: string|null }>}
 */
async function executeCode(language, code) {
  const runner = RUNNERS[language];
  if (!runner) {
    return { stdout: '', stderr: '', error: `Unsupported language: ${language}` };
  }

  // Unique directory per execution so parallel runs don't collide
  const execDir = path.join(TEMP_DIR, randomUUID());
  let container = null;
  let timedOut = false;

  try {
    // 1. Write code to isolated temp directory
    fs.mkdirSync(execDir, { recursive: true });
    fs.writeFileSync(path.join(execDir, runner.file), code, 'utf8');

    // 2. Create container — no network, 50 MB RAM cap, read-only mount
    container = await docker.createContainer({
      Image: runner.image,
      Cmd: runner.cmd,
      HostConfig: {
        Binds: [`${execDir}:/sandbox:ro`],
        NetworkMode: 'none',
        Memory: 50 * 1024 * 1024,
        MemorySwap: 50 * 1024 * 1024,   // fără swap suplimentar
        NanoCpus: 500000000,             // 0.5 CPU cores
        PidsLimit: 50,                   // anti fork bomb
        OomKillDisable: false,           // permite OOM killer
        ReadonlyRootfs: true,
        AutoRemove: false,
      },
    });

    // 3. Attach BEFORE start to capture all stdout/stderr from the first byte
    const logStream = await container.attach({ stream: true, stdout: true, stderr: true });
    const stdoutPass = new PassThrough();
    const stderrPass = new PassThrough();
    docker.modem.demuxStream(logStream, stdoutPass, stderrPass);

    let stdoutData = '', stderrData = '';
    stdoutPass.on('data', chunk => { stdoutData += chunk.toString('utf8'); });
    stderrPass.on('data', chunk => { stderrData += chunk.toString('utf8'); });

    // 4. Start
    await container.start();

    // 5. Wait for exit with timeout
    await Promise.race([
      container.wait(),
      new Promise(resolve => setTimeout(() => { timedOut = true; resolve(); }, TIMEOUT_MS)),
    ]);

    if (timedOut) {
      await container.stop({ t: 0 }).catch(() => {});
      return { stdout: '', stderr: '', error: `Execution timed out (>${TIMEOUT_MS / 1000}s)` };
    }

    // Allow stream to flush remaining buffered data
    await new Promise(r => setTimeout(r, 100));

    return { stdout: stdoutData, stderr: stderrData, error: null };

  } catch (err) {
    return { stdout: '', stderr: '', error: err.message };
  } finally {
    // 6. Cleanup — always, regardless of success/timeout/error
    if (container) {
      await container.remove({ force: true }).catch(() => {});
    }
    fs.rmSync(execDir, { recursive: true, force: true });
  }
}

module.exports = { executeCode };
