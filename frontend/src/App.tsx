import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import CodeEditor from './components/CodeEditor'
import TerminalOutput from './components/TerminalOutput'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import KonamiExplosion from './components/KonamiExplosion'
import { useKonamiCode } from './hooks/useKonamiCode'
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

function EditorPage() {
  const { session } = useAuth()
  const [activeFile, setActiveFile] = useState('main.py')
  const [codes, setCodes] = useState(INITIAL_CODE)
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState(false)
  const toastShownRef = useRef(false)

  useEffect(() => {
    if (toastShownRef.current) return
    const found = Object.values(codes).some(c => c.includes('itecify'))
    if (found) {
      toastShownRef.current = true
      setToast(true)
      setTimeout(() => setToast(false), 4000)
    }
  }, [codes])

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
          'Authorization': `Bearer ${session?.access_token}`,
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

      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(15,12,41,0.6)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(236,72,153,0.2)',
      }}>
        <Sidebar files={INITIAL_FILES} activeFile={activeFile} onSelectFile={setActiveFile} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 8px',
        }}>
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

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor language={activeLanguage} value={codes[activeFile]} onChange={handleCodeChange} />
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(236,72,153,0.25)',
        }}>
          <TerminalOutput output={output} isLoading={isLoading} onRun={handleRun} onClear={() => setOutput('')} />
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          background: 'rgba(15,12,41,0.95)',
          border: '1px solid rgba(236,72,153,0.4)',
          borderRadius: '12px',
          padding: '14px 20px',
          color: 'white', fontSize: '14px', fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(236,72,153,0.2)',
          backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'toast-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <span style={{ fontSize: '20px' }}>👾</span>
          <span>Hello, fellow coder!</span>
        </div>
      )}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { activated, reset } = useKonamiCode()

  return (
    <BrowserRouter>
      {activated && <KonamiExplosion onClose={reset} />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/editor" element={<RequireAuth><EditorPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
