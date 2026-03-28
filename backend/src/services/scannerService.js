const DANGEROUS_PATTERNS = {
  javascript: [
    { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, severity: 'high', message: 'child_process module detected — potential system command execution' },
    { pattern: /require\s*\(\s*['"]fs['"]\s*\)/, severity: 'medium', message: 'fs module detected — file system access' },
    { pattern: /require\s*\(\s*['"]net['"]\s*\)/, severity: 'high', message: 'net module detected — network access attempt' },
    { pattern: /\beval\s*\(/, severity: 'high', message: 'eval() detected — arbitrary code execution risk' },
    { pattern: /\bFunction\s*\(/, severity: 'medium', message: 'Function constructor detected — dynamic code generation' },
    { pattern: /process\.exit/, severity: 'medium', message: 'process.exit detected — may terminate the sandbox' },
    { pattern: /process\.env/, severity: 'low', message: 'process.env access detected — environment variable leak risk' },
  ],
  python: [
    { pattern: /\bimport\s+os\b/, severity: 'high', message: 'os module imported — system command access' },
    { pattern: /\bimport\s+subprocess\b/, severity: 'high', message: 'subprocess module imported — command execution risk' },
    { pattern: /\bimport\s+socket\b/, severity: 'high', message: 'socket module imported — network access attempt' },
    { pattern: /\bexec\s*\(/, severity: 'high', message: 'exec() detected — arbitrary code execution' },
    { pattern: /\beval\s*\(/, severity: 'high', message: 'eval() detected — arbitrary code execution' },
    { pattern: /open\s*\(\s*['"]\/etc\//, severity: 'high', message: 'Attempting to read system files' },
    { pattern: /\b__import__\s*\(/, severity: 'medium', message: 'Dynamic import detected' },
  ],
  rust: [
    { pattern: /std::process::Command/, severity: 'high', message: 'Command execution detected' },
    { pattern: /\bunsafe\s*\{/, severity: 'medium', message: 'Unsafe block detected — memory safety bypassed' },
    { pattern: /std::net/, severity: 'high', message: 'Network access attempt detected' },
    { pattern: /std::fs/, severity: 'medium', message: 'File system access detected' },
  ],
  go: [
    { pattern: /os\.Exec|exec\.Command/, severity: 'high', message: 'Command execution detected' },
    { pattern: /\bnet\.Dial|net\.Listen/, severity: 'high', message: 'Network access attempt detected' },
    { pattern: /\bos\.Open|ioutil\.ReadFile|os\.ReadFile/, severity: 'medium', message: 'File system access detected' },
  ],
  java: [
    { pattern: /Runtime\.getRuntime\(\)\.exec/, severity: 'high', message: 'Runtime command execution detected' },
    { pattern: /ProcessBuilder/, severity: 'high', message: 'ProcessBuilder detected — command execution risk' },
    { pattern: /\bnew\s+Socket\s*\(/, severity: 'high', message: 'Network socket detected' },
    { pattern: /\bReflection|\.forName\s*\(/, severity: 'medium', message: 'Reflection API detected' },
  ],
};

/**
 * Scans code for dangerous patterns.
 * @param {string} code
 * @param {string} language
 * @returns {{ safe: boolean, warnings: Array<{severity: string, message: string}>, scannedAt: string }}
 */
function scanCode(code, language) {
  const patterns = DANGEROUS_PATTERNS[language] || [];
  const warnings = [];

  for (const { pattern, severity, message } of patterns) {
    if (pattern.test(code)) {
      warnings.push({ severity, message });
    }
  }

  return {
    safe: warnings.filter(w => w.severity === 'high').length === 0,
    warnings,
    scannedAt: new Date().toISOString(),
  };
}

module.exports = { scanCode };
