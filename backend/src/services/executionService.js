const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const TEMP_DIR = path.join(__dirname, '../../temp');
const TIMEOUT_MS = 10000; // 10s hard kill

// Maps language -> { ext, cmd }
const RUNNERS = {
  javascript: { ext: 'js',  cmd: 'node' },
  python:     { ext: 'py',  cmd: 'python' },
};

/**
 * Executes user-submitted code using child_process (Plan B — no Docker).
 * @param {string} language  - 'javascript' | 'python'
 * @param {string} code      - source code string
 * @returns {Promise<{ stdout: string, stderr: string, error: string|null }>}
 */
function executeCode(language, code) {
  return new Promise((resolve) => {
    const runner = RUNNERS[language];

    if (!runner) {
      return resolve({ stdout: '', stderr: '', error: `Unsupported language: ${language}` });
    }

    const filename = `exec_${randomUUID()}.${runner.ext}`;
    const filepath = path.join(TEMP_DIR, filename);

    // 1. Write code to temp file
    try {
      fs.writeFileSync(filepath, code, 'utf8');
    } catch (err) {
      return resolve({ stdout: '', stderr: '', error: `Failed to write temp file: ${err.message}` });
    }

    // 2. Run the file
    const child = exec(
      `${runner.cmd} "${filepath}"`,
      { timeout: TIMEOUT_MS },
      (error, stdout, stderr) => {
        try {
          if (error && error.killed) {
            return resolve({ stdout, stderr, error: `Execution timed out (>${TIMEOUT_MS / 1000}s)` });
          }

          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            error:  error ? error.message : null,
          });
        } finally {
          // 3. Delete temp file — guaranteed, even if an exception occurs above
          try { fs.unlinkSync(filepath); } catch (_) {}
        }
      }
    );

    // Safety: kill if still alive after timeout
    setTimeout(() => {
      try { child.kill(); } catch (_) {}
    }, TIMEOUT_MS + 500);
  });
}

module.exports = { executeCode };
