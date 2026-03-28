import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Command responses ────────────────────────────────────────────────────────

const RESPONSES: Record<string, string> = {
  help: 'Available commands: help, whoami, hack nasa, sudo make coffee, vibe check, rizz, ls /universe, exit',
  whoami: 'You are the chosen one. Or maybe just someone who knows the Konami Code. Respect either way.',
  'hack nasa':
    'Initializing breach protocol...\n' +
    '[████░░░░░░░░░░░░░░░░]  20%  Connecting to NASA mainframe...\n' +
    '[████████░░░░░░░░░░░░]  40%  Bypassing firewall... done ✓\n' +
    '[████████████░░░░░░░░]  60%  Locating moon coordinates...\n' +
    '[█████████████░░░░░░░]  69%  Downloading moon... 69%\n' +
    '[█████████████░░░░░░░]  69%  ⚠ Connection timeout: moon > MAX_INT\n' +
    'Just kidding lol 💀',
  'sudo make coffee': 'clock it body tea body matcha ☕\nError 418: I am a teapot',
  'vibe check':
    'Calculating vibe...\n' +
    '▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100%\n' +
    'Vibe: IMMACULATE ✨  You passed. Barely.',
  rizz:
    'Calculating rizz level...\n' +
    '▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ERROR\n' +
    'ERROR: Value too large for defined data type 💅',
  'ls /universe':
    'total 13.8B\n' +
    'drwxr-xr-x  42  god  staff  dark_matter/\n' +
    'drwxr-xr-x  ??  god  staff  mysteries/\n' +
    'drwxr-xr-x   1  god  staff  your_future/\n' +
    'drwxr-xr-x   0  god  staff  definitely_not_void/',
  exit: 'Disconnecting...\nConnection closed. See you in the void. 👁',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: number
  cmd: string
  displayText: string
  fullText: string
  done: boolean
  isExit: boolean
}

const WELCOME =
  '╔══════════════════════════════════════════════╗\n' +
  '║   iTECify Secret Terminal  v0.0.1-void       ║\n' +
  '║   You should not be here. And yet. Here.     ║\n' +
  '╚══════════════════════════════════════════════╝\n' +
  'Type "help" for available commands.'

// ─── Component ────────────────────────────────────────────────────────────────

export default function SecretPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryEntry[]>([{
    id: 0, cmd: '', displayText: WELCOME, fullText: WELCOME, done: true, isExit: false,
  }])
  const [input, setInput] = useState('')
  const [inputEnabled, setInputEnabled] = useState(true)
  const idRef = useRef(1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Typewriter effect — only re-runs when a new entry starts typing
  const typingEntry = history.find(h => !h.done)
  useEffect(() => {
    if (!typingEntry) return
    let pos = 0
    const interval = setInterval(() => {
      pos++
      if (pos > typingEntry.fullText.length) {
        clearInterval(interval)
        setHistory(prev => prev.map(h => h.id === typingEntry.id ? { ...h, done: true } : h))
        if (typingEntry.isExit) {
          setTimeout(() => navigate('/'), 700)
        } else {
          setInputEnabled(true)
        }
        return
      }
      setHistory(prev => prev.map(h =>
        h.id === typingEntry.id ? { ...h, displayText: typingEntry.fullText.slice(0, pos) } : h
      ))
    }, 15)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingEntry?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const cmd = input.trim().toLowerCase()
    if (!cmd || !inputEnabled) return
    setInput('')
    setInputEnabled(false)
    const fullText = RESPONSES[cmd] ?? `bash: ${cmd}: command not found. Type "help" for available commands.`
    setHistory(prev => [...prev, {
      id: idRef.current++,
      cmd,
      displayText: '',
      fullText,
      done: false,
      isExit: cmd === 'exit',
    }])
  }, [input, inputEnabled])

  return (
    <div
      style={{
        height: '100vh', width: '100vw', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", Courier, monospace',
        position: 'relative',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #0a0010 0%, #0f0c29 50%, #050010 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Edge blur vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        boxShadow: 'inset 0 0 120px rgba(0,0,0,0.9)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Terminal window */}
      <div style={{
        width: '90%', maxWidth: '820px', height: '78vh',
        background: 'rgba(8,4,18,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(236,72,153,0.2)',
        borderRadius: '14px',
        boxShadow: '0 0 80px rgba(236,72,153,0.08), 0 32px 64px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative', zIndex: 10,
      }}>

        {/* Title bar */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid rgba(236,72,153,0.12)',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '8px',
          flexShrink: 0,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', boxShadow: '0 0 6px #ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', boxShadow: '0 0 6px #febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', boxShadow: '0 0 6px #28c840' }} />
          <span style={{
            marginLeft: '10px', fontSize: '12px', letterSpacing: '0.08em',
            color: 'rgba(249,168,212,0.5)',
          }}>
            iTECify — secret terminal — bash
          </span>
        </div>

        {/* Output area */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '14px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(236,72,153,0.3) transparent',
        }}>
          {history.map(entry => (
            <div key={entry.id}>
              {/* Prompt line */}
              {entry.cmd && (
                <div style={{ marginBottom: '6px', fontSize: '13px', display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#a78bfa' }}>iTECify@secret</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>:</span>
                  <span style={{ color: '#60a5fa' }}>~</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>$</span>
                  <span style={{ color: '#f9a8d4', marginLeft: '6px' }}>{entry.cmd}</span>
                </div>
              )}
              {/* Response */}
              <div style={{
                color: 'rgba(220,220,230,0.85)', fontSize: '13px', lineHeight: 1.8,
                whiteSpace: 'pre-wrap', letterSpacing: '0.01em',
              }}>
                {entry.displayText}
                {!entry.done && (
                  <span style={{ color: '#f472b6', animation: 'blink 1s step-end infinite' }}>█</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input row */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '10px 24px',
            borderTop: '1px solid rgba(236,72,153,0.12)',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: '6px',
            flexShrink: 0,
            opacity: inputEnabled ? 1 : 0.4,
            transition: 'opacity 0.2s',
          }}
        >
          <span style={{ color: '#a78bfa', fontSize: '13px', whiteSpace: 'nowrap' }}>iTECify@secret</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>:</span>
          <span style={{ color: '#60a5fa', fontSize: '13px' }}>~</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>$</span>
          <input
            ref={inputRef}
            autoFocus
            disabled={!inputEnabled}
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#f9a8d4', fontSize: '13px',
              fontFamily: '"Courier New", Courier, monospace',
              caretColor: '#f472b6',
              letterSpacing: '0.01em',
            }}
            spellCheck={false}
            autoComplete="off"
          />
        </form>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
