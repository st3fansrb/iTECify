const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');

const TEMP_DIR = path.join(os.tmpdir(), 'itecify');
const TIMEOUT_MS = 30000;

// Languages that need more memory for compilation (Go, Rust, Java, TypeScript)
const HIGH_MEMORY_LANGS = new Set(['go', 'rust', 'java', 'typescript']);

// Docker runners — stdin piped via /sandbox/stdin.txt
const DOCKER_RUNNERS = {
  javascript: {
    image: 'node:18-alpine',
    file: 'code.js',
    cmd: ['sh', '-c', 'cat /sandbox/stdin.txt | node /sandbox/code.js'],
  },
  python: {
    image: 'python:3.9-slim',
    file: 'code.py',
    cmd: ['sh', '-c', 'cat /sandbox/stdin.txt | python /sandbox/code.py'],
  },
  rust: {
    image: 'rust:alpine',
    file: 'code.rs',
    cmd: ['sh', '-c', 'rustc /sandbox/code.rs -o /tmp/out 2>&1 && cat /sandbox/stdin.txt | /tmp/out'],
  },
  go: {
    image: 'golang:alpine',
    file: 'code.go',
    cmd: ['sh', '-c', 'cat /sandbox/stdin.txt | go run /sandbox/code.go'],
  },
  java: {
    image: 'eclipse-temurin:17-alpine',
    file: 'Main.java',
    cmd: ['sh', '-c', 'javac /sandbox/Main.java -d /tmp && cat /sandbox/stdin.txt | java -cp /tmp Main'],
  },
  c: {
    image: 'gcc:14',
    file: 'code.c',
    cmd: ['sh', '-c', 'gcc /sandbox/code.c -o /tmp/out -lm 2>&1 && cat /sandbox/stdin.txt | /tmp/out'],
  },
  cpp: {
    image: 'gcc:14',
    file: 'code.cpp',
    cmd: ['sh', '-c', 'g++ /sandbox/code.cpp -o /tmp/out -lm 2>&1 && cat /sandbox/stdin.txt | /tmp/out'],
  },
  typescript: {
    image: 'node:22-alpine',
    file: 'code.ts',
    cmd: ['sh', '-c', 'cat /sandbox/stdin.txt | node --experimental-strip-types /sandbox/code.ts'],
  },
};

// Fallback runners (child_process, no Docker needed)
// Each runner can define: cmd, args(file), ext, and optionally compile(file) for compiled langs
const FALLBACK_RUNNERS = {
  javascript: {
    ext: 'js',
    run: (tmpFile) => ({ cmd: 'node', args: [tmpFile] }),
  },
  python: {
    ext: 'py',
    run: (tmpFile) => ({ cmd: 'python', args: [tmpFile] }),
  },
  typescript: {
    ext: 'ts',
    run: (tmpFile) => ({ cmd: 'npx', args: ['--yes', 'ts-node', '--skip-project', tmpFile] }),
  },
  rust: {
    ext: 'rs',
    compile: (tmpFile) => {
      const outFile = tmpFile.replace(/\.rs$/, '.exe');
      return { cmd: 'rustc', args: [tmpFile, '-o', outFile], outFile };
    },
    run: (tmpFile) => {
      const outFile = tmpFile.replace(/\.rs$/, '.exe');
      return { cmd: outFile, args: [] };
    },
  },
  go: {
    ext: 'go',
    run: (tmpFile) => ({ cmd: 'go', args: ['run', tmpFile] }),
  },
  java: {
    ext: 'java',
    fileName: 'Main.java',
    compile: (tmpFile) => {
      const dir = path.dirname(tmpFile);
      return { cmd: 'javac', args: [tmpFile, '-d', dir], outFile: null };
    },
    run: (tmpFile) => {
      const dir = path.dirname(tmpFile);
      return { cmd: 'java', args: ['-cp', dir, 'Main'] };
    },
  },
  c: {
    ext: 'c',
    compile: (tmpFile) => {
      const outFile = tmpFile.replace(/\.c$/, '.exe');
      return { cmd: 'gcc', args: [tmpFile, '-o', outFile, '-lm'], outFile };
    },
    run: (tmpFile) => {
      const outFile = tmpFile.replace(/\.c$/, '.exe');
      return { cmd: outFile, args: [] };
    },
  },
  cpp: {
    ext: 'cpp',
    compile: (tmpFile) => {
      const outFile = tmpFile.replace(/\.cpp$/, '.exe');
      return { cmd: 'g++', args: [tmpFile, '-o', outFile, '-lm'], outFile };
    },
    run: (tmpFile) => {
      const outFile = tmpFile.replace(/\.cpp$/, '.exe');
      return { cmd: outFile, args: [] };
    },
  },
};

/**
 * Convert a Windows path to a Docker-compatible bind mount path.
 * Docker Desktop for Windows with Linux containers expects forward slashes.
 */
function toDockerPath(winPath) {
  return winPath.replace(/\\/g, '/');
}

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

async function executeWithDocker(language, code, stdin = '') {
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
    fs.writeFileSync(path.join(execDir, 'stdin.txt'), stdin, 'utf8');

    container = await docker.createContainer({
      Image: runner.image,
      Cmd: runner.cmd,
      HostConfig: {
        Binds: [`${toDockerPath(execDir)}:/sandbox:ro`],
        Tmpfs: { '/tmp': HIGH_MEMORY_LANGS.has(language) ? 'size=256m,exec' : 'size=64m,exec' },
        NetworkMode: 'none',
        Memory: (HIGH_MEMORY_LANGS.has(language) ? 512 : 64) * 1024 * 1024,
        MemorySwap: (HIGH_MEMORY_LANGS.has(language) ? 512 : 64) * 1024 * 1024,
        NanoCpus: 1000000000,
        PidsLimit: 64,
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
    logStream.on('error',  err => { console.error('[docker] log stream error:', err.message); });

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

/**
 * Stream execution via Docker — calls onStdout/onStderr/onError/onExit callbacks
 */
async function streamWithDocker(language, code, stdin, { onStdout, onStderr, onError, onExit, onCleanup }) {
  const { PassThrough } = require('stream');
  const Docker = require('dockerode');
  const docker = new Docker();
  const runner = DOCKER_RUNNERS[language];

  const execDir = path.join(TEMP_DIR, randomUUID());
  let container = null;

  try {
    fs.mkdirSync(execDir, { recursive: true });
    // Register dir cleanup immediately — before anything else can throw
    onCleanup(() => { fs.rmSync(execDir, { recursive: true, force: true }); });

    fs.writeFileSync(path.join(execDir, runner.file), code, 'utf8');
    fs.writeFileSync(path.join(execDir, 'stdin.txt'), stdin, 'utf8');

    container = await docker.createContainer({
      Image: runner.image,
      Cmd: runner.cmd,
      HostConfig: {
        Binds: [`${toDockerPath(execDir)}:/sandbox:ro`],
        Tmpfs: { '/tmp': HIGH_MEMORY_LANGS.has(language) ? 'size=256m,exec' : 'size=64m,exec' },
        NetworkMode: 'none',
        Memory: (HIGH_MEMORY_LANGS.has(language) ? 512 : 64) * 1024 * 1024,
        MemorySwap: (HIGH_MEMORY_LANGS.has(language) ? 512 : 64) * 1024 * 1024,
        NanoCpus: 1000000000,
        PidsLimit: 64,
        OomKillDisable: false,
        AutoRemove: false,
      },
    });

    onCleanup(async () => {
      try { await container.remove({ force: true }); } catch (_) {}
    });

    const logStream = await container.attach({ stream: true, stdout: true, stderr: true });
    const stdoutPass = new PassThrough();
    const stderrPass = new PassThrough();
    docker.modem.demuxStream(logStream, stdoutPass, stderrPass);

    stdoutPass.on('data', chunk => onStdout(chunk.toString('utf8')));
    stderrPass.on('data', chunk => onStderr(chunk.toString('utf8')));

    await container.start();

    let timedOut = false;
    const timeoutHandle = setTimeout(async () => {
      timedOut = true;
      onError(`Execution timed out (${TIMEOUT_MS / 1000}s limit)`);
      onExit(124);
      try { await container.kill(); } catch (_) {}
    }, TIMEOUT_MS);

    const exitData = await container.wait();
    clearTimeout(timeoutHandle);

    if (!timedOut) {
      // Allow stream to flush remaining buffered data
      await new Promise(r => setTimeout(r, 100));
      onExit(exitData.StatusCode);
    }

  } catch (err) {
    onError(err.message);
    onExit(1);
  }
}

/**
 * Stream execution via child_process fallback
 */
async function streamWithFallback(language, code, stdin, { onStdout, onStderr, onError, onExit, onCleanup }) {
  const runner = FALLBACK_RUNNERS[language];
  if (!runner) {
    onError(`Language "${language}" is not supported. No Docker and no local runtime available.`);
    onExit(1);
    return;
  }

  // Determine temp file path
  const tmpBase = path.join(os.tmpdir(), `itecify_${randomUUID()}`);
  let tmpFile;
  if (runner.fileName) {
    // For languages that need a specific filename (e.g., Java Main.java)
    const tmpDir = tmpBase;
    fs.mkdirSync(tmpDir, { recursive: true });
    tmpFile = path.join(tmpDir, runner.fileName);
    onCleanup(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  } else {
    tmpFile = `${tmpBase}.${runner.ext}`;
    onCleanup(() => { try { fs.unlinkSync(tmpFile); } catch (_) {} });
  }
  fs.writeFileSync(tmpFile, code, 'utf8');

  // Compile step if needed
  if (runner.compile) {
    const compileInfo = runner.compile(tmpFile);
    if (compileInfo.outFile) {
      onCleanup(() => { try { fs.unlinkSync(compileInfo.outFile); } catch (_) {} });
    }

    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(compileInfo.cmd, compileInfo.args, {
          env: { ...process.env },
        });
        let stderr = '';
        proc.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
        proc.stdout.on('data', chunk => { onStderr(chunk.toString('utf8')); }); // compiler warnings to stderr
        proc.on('close', (exitCode) => {
          if (exitCode !== 0) {
            reject(new Error(stderr || `Compilation failed with exit code ${exitCode}`));
          } else {
            resolve();
          }
        });
        proc.on('error', (err) => {
          reject(new Error(`Compiler "${compileInfo.cmd}" not found. Is it installed? (${err.message})`));
        });
      });
    } catch (err) {
      onStderr(err.message);
      onExit(1);
      return;
    }
  }

  // Run step
  const runInfo = runner.run(tmpFile);

  const proc = spawn(runInfo.cmd, runInfo.args, {
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
  });

  onCleanup(() => { try { proc.kill('SIGKILL'); } catch (_) {} });

  proc.stdout.on('data', chunk => onStdout(chunk.toString('utf8')));
  proc.stderr.on('data', chunk => onStderr(chunk.toString('utf8')));

  if (proc.stdin) {
    if (stdin) proc.stdin.write(stdin);
    proc.stdin.end();
  }

  const timeoutHandle = setTimeout(() => {
    proc.kill('SIGKILL');
    onError(`Execution timed out (${TIMEOUT_MS / 1000}s limit)`);
    onExit(124);
  }, TIMEOUT_MS);

  proc.on('close', (exitCode) => {
    clearTimeout(timeoutHandle);
    onExit(exitCode);
  });

  proc.on('error', (err) => {
    clearTimeout(timeoutHandle);
    onError(`Runtime "${runInfo.cmd}" not found. Is it installed? (${err.message})`);
    onExit(1);
  });
}

async function executeWithFallback(language, code, stdin = '') {
  const runner = FALLBACK_RUNNERS[language];
  if (!runner) {
    return {
      stdout: '',
      stderr: '',
      error: `Language "${language}" requires Docker. Start Docker Desktop and try again.`,
    };
  }

  // Use the streaming fallback but collect results
  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let errorMsg = null;

    streamWithFallback(language, code, stdin, {
      onStdout: (chunk) => { stdoutData += chunk; },
      onStderr: (chunk) => { stderrData += chunk; },
      onError: (msg) => { errorMsg = msg; },
      onExit: () => {
        resolve({ stdout: stdoutData, stderr: stderrData, error: errorMsg });
      },
      onCleanup: () => {},
    });
  });
}

async function executeCode(language, code, stdin = '') {
  if (!DOCKER_RUNNERS[language] && !FALLBACK_RUNNERS[language]) {
    return { stdout: '', stderr: '', error: `Unsupported language: ${language}` };
  }

  const dockerOk = await isDockerAvailable();

  if (dockerOk && DOCKER_RUNNERS[language]) {
    return executeWithDocker(language, code, stdin);
  }

  return executeWithFallback(language, code, stdin);
}

/**
 * Execute code and stream output via callbacks.
 * Used by the SSE streaming endpoint.
 */
async function executeCodeStream(language, code, stdin, callbacks) {
  if (!DOCKER_RUNNERS[language] && !FALLBACK_RUNNERS[language]) {
    callbacks.onError(`Unsupported language: ${language}`);
    callbacks.onExit(1);
    return;
  }

  const dockerOk = await isDockerAvailable();

  if (dockerOk && DOCKER_RUNNERS[language]) {
    return streamWithDocker(language, code, stdin, callbacks);
  }

  return streamWithFallback(language, code, stdin, callbacks);
}

module.exports = { executeCode, executeCodeStream, isDockerAvailable };
