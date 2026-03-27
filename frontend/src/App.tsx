import { useState } from 'react'
import Sidebar from './components/Sidebar'
import CodeEditor from './components/CodeEditor'
import TerminalOutput from './components/TerminalOutput'
import { useAuth } from './hooks/useAuth'

const INITIAL_FILES = [
  { name: 'main.py', language: 'python' },
  { name: 'index.js', language: 'javascript' },
  { name: 'main.rs', language: 'rust' },
]

const INITIAL_CODE: Record<string, string> = {
  'main.py': '# Python\nprint("Hello from iTECify!")\n',
  'index.js': '// JavaScript\nconsole.log("Hello from iTECify!");\n',
  'main.rs': '// Rust\nfn main() {\n    println!("Hello from iTECify!");\n}\n',
}

const BG_STYLE: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  width: '100vw',
  overflow: 'hidden',
  color: 'white',
  position: 'relative',
  background: 'linear-gradient(125deg, #0f0c29, #302b63, #24243e)',
}

const ORBS = (
  <>
    <div style={{
      position: 'absolute', top: '5%', left: '25%',
      width: '500px', height: '500px', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)',
      pointerEvents: 'none', zIndex: 0,
    }} />
    <div style={{
      position: 'absolute', bottom: '10%', right: '15%',
      width: '600px', height: '600px', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
      pointerEvents: 'none', zIndex: 0,
    }} />
  </>
)

// ─── Login / Signup screen ───────────────────────────────────────────────────

function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(236,72,153,0.3)',
    borderRadius: '8px', color: 'white',
    fontSize: '14px', outline: 'none',
    boxSizing: 'border-box',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setInfo('Cont creat! Verifică emailul pentru confirmare.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare necunoscută')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={BG_STYLE}>
      {ORBS}
      <div style={{
        position: 'relative', zIndex: 1,
        margin: 'auto',
        background: 'rgba(15,12,41,0.75)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(236,72,153,0.25)',
        borderRadius: '16px',
        padding: '40px 36px',
        width: '360px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f9a8d4' }}>
            iTECify
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            {mode === 'login' ? 'Autentifică-te pentru a continua' : 'Creează un cont nou'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {error && (
            <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>
          )}
          {info && (
            <p style={{ margin: 0, fontSize: '12px', color: '#86efac' }}>{info}</p>
          )}

          <button type="submit" disabled={loading} style={{
            padding: '10px', borderRadius: '8px', border: 'none',
            background: loading ? 'rgba(236,72,153,0.4)' : 'rgba(236,72,153,0.8)',
            color: 'white', fontWeight: 600, fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
          }}>
            {loading ? 'Se procesează...' : mode === 'login' ? 'Intră' : 'Creează cont'}
          </button>
        </form>

        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          {mode === 'login' ? 'Nu ai cont? ' : 'Ai deja cont? '}
          <span
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setInfo(null) }}
            style={{ color: '#f9a8d4', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {mode === 'login' ? 'Înregistrează-te' : 'Autentifică-te'}
          </span>
        </p>
      </div>
    </div>
  )
}

// ─── Main editor ─────────────────────────────────────────────────────────────

function Editor() {
  const { session, user, signOut } = useAuth()
  const [activeFile, setActiveFile] = useState('main.py')
  const [codes, setCodes] = useState(INITIAL_CODE)
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const activeLanguage = INITIAL_FILES.find(f => f.name === activeFile)?.language ?? 'plaintext'

  const handleCodeChange = (value: string) => {
    setCodes((prev) => ({ ...prev, [activeFile]: value }))
  }

  const handleRun = async () => {
    setIsLoading(true)
    setOutput('Running...')
    try {
      const res = await fetch('http://localhost:3001/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ language: activeLanguage, code: codes[activeFile] }),
      })
      const data = await res.json()
      if (data.error) {
        setOutput(`ERROR: ${data.error}`)
      } else {
        setOutput([data.stdout, data.stderr].filter(Boolean).join('\n') || '(no output)')
      }
    } catch {
      setOutput('ERROR: Could not reach backend (http://localhost:3001)')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={BG_STYLE}>
      {ORBS}

      {/* Sidebar */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(15,12,41,0.6)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(236,72,153,0.2)',
      }}>
        <Sidebar files={INITIAL_FILES} activeFile={activeFile} onSelectFile={setActiveFile} />
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Tab bar + user info */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 8px',
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {INITIAL_FILES.map((file) => (
              <button key={file.name} onClick={() => setActiveFile(file.name)} style={{
                padding: '8px 16px', fontSize: '12px',
                background: activeFile === file.name ? 'rgba(236,72,153,0.1)' : 'transparent',
                color: activeFile === file.name ? '#f9a8d4' : 'rgba(255,255,255,0.35)',
                border: 'none',
                borderTop: activeFile === file.name ? '2px solid #f472b6' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'monospace',
              }}>
                {file.name}
              </button>
            ))}
          </div>

          {/* User info + sign out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '8px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{user?.email}</span>
            <button onClick={signOut} style={{
              fontSize: '11px', padding: '4px 10px',
              background: 'rgba(236,72,153,0.15)',
              border: '1px solid rgba(236,72,153,0.3)',
              borderRadius: '6px', color: '#f9a8d4',
              cursor: 'pointer',
            }}>
              Ieși
            </button>
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor language={activeLanguage} value={codes[activeFile]} onChange={handleCodeChange} />
        </div>

        {/* Terminal */}
        <div style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(236,72,153,0.25)',
        }}>
          <TerminalOutput output={output} isLoading={isLoading} onRun={handleRun} onClear={() => setOutput('')} />
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ ...BG_STYLE, alignItems: 'center', justifyContent: 'center' }}>
        {ORBS}
        <p style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Se încarcă...
        </p>
      </div>
    )
  }

  return session ? <Editor /> : <AuthScreen />
}
