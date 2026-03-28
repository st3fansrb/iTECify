import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import CodeEditor from './components/CodeEditor'
import TerminalOutput from './components/TerminalOutput'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SecretPage from './pages/SecretPage'
import KonamiExplosion from './components/KonamiExplosion'
import { useKonamiCode } from './hooks/useKonamiCode'
import { useAuth } from './hooks/useAuth'
import { useProjectFiles } from './hooks/useProjectFiles'
import { useRealtimeEditor } from './hooks/useRealtimeEditor'
import ConnectedUsers from './components/ConnectedUsers'
import AIBlock from './components/AIBlock'
import DashboardPage from './pages/DashboardPage'
import TimeTravel from './components/TimeTravel'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0c29', color: 'rgba(249,168,212,0.7)', fontFamily: 'monospace', fontSize: '14px' }}>
      Authenticating...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
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

interface ConnectedUser { user_id: string; cursor_line: number | null }

// ── Inner component that holds realtime state for the active file ──────────────
function RealtimeEditor({
  fileId, language, onCodeChange, onUsersChange, timeTravelContent,
}: { fileId: string; language: string; onCodeChange: (code: string) => void; onUsersChange: (users: ConnectedUser[]) => void; timeTravelContent: string | null }) {
  const { code, updateCode, updateCursor, loading, isSaving, connectedUsers } = useRealtimeEditor({
    fileId,
    initialContent: '',
  })

  // Propagate connected users up to EditorPage
  useEffect(() => { onUsersChange(connectedUsers) }, [connectedUsers, onUsersChange])

  // Propagate initial loaded code so Run works without typing first
  useEffect(() => { if (!loading && code) onCodeChange(code) }, [loading])

  const handleChange = (val: string) => {
    updateCode(val)
    onCodeChange(val)
  }

  const isTimeTraveling = timeTravelContent !== null

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(249,168,212,0.5)', fontFamily: 'monospace', fontSize: '13px' }}>
      Loading file…
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      {/* Time-travel overlay banner */}
      {isTimeTraveling && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          background: 'rgba(249,168,212,0.1)',
          borderBottom: '1px solid rgba(249,168,212,0.25)',
          padding: '6px 16px',
          fontSize: '11px', fontFamily: 'monospace',
          color: 'rgba(249,168,212,0.85)',
          letterSpacing: '0.04em',
          backdropFilter: 'blur(6px)',
          pointerEvents: 'none',
        }}>
          🕐 Time-Travel Mode — viewing a past snapshot (read-only)
        </div>
      )}
      {isSaving && !isTimeTraveling && (
        <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 20, fontSize: '10px', color: 'rgba(249,168,212,0.5)', fontFamily: 'monospace', pointerEvents: 'none' }}>
          saving…
        </div>
      )}
      <CodeEditor
        language={language}
        value={isTimeTraveling ? timeTravelContent! : code}
        onChange={handleChange}
        connectedUsers={isTimeTraveling ? [] : connectedUsers}
        onCursorChange={isTimeTraveling ? undefined : updateCursor}
        readOnly={isTimeTraveling}
      />
    </div>
  )
}

function EditorPage() {
  const { files, loading: filesLoading, addFile } = useProjectFiles()
  const [activeFileId, setActiveFileId] = useState<string>('')
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState(false)
  const toastShownRef = useRef(false)
  const lastCodeRef = useRef('')
  const { user, session } = useAuth()
  const [timeTravelContent, setTimeTravelContent] = useState<string | null>(null)

  // Set first file as active once loaded
  useEffect(() => {
    if (files.length > 0 && !activeFileId) {
      setActiveFileId(files[0].id)
    }
  }, [files, activeFileId])

  const activeFile = files.find(f => f.id === activeFileId)

  const handleCodeChange = (code: string) => {
    lastCodeRef.current = code
    if (toastShownRef.current) return
    if (code.toLowerCase().includes('itecify')) {
      toastShownRef.current = true
      setToast(true)
      setTimeout(() => setToast(false), 4000)
    }
  }

  const handleRun = async () => {
    if (!activeFile) return
    setIsLoading(true)
    setOutput('Running...')
    try {
      const res = await fetch('http://localhost:3001/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ language: activeFile.language, code: lastCodeRef.current }),
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
        <Sidebar files={files} activeFile={activeFileId} onSelectFile={setActiveFileId} loading={filesLoading} onCreateFile={addFile} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 8px',
        }}>
          <div style={{ flex: 1, display: 'flex' }}>
            {files.map((file) => (
              <button key={file.id} onClick={() => setActiveFileId(file.id)} style={{
                padding: '8px 16px', fontSize: '12px',
                background: activeFileId === file.id ? 'rgba(236,72,153,0.1)' : 'transparent',
                color: activeFileId === file.id ? '#f9a8d4' : 'rgba(255,255,255,0.35)',
                border: 'none',
                borderTop: activeFileId === file.id ? '2px solid #f472b6' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'monospace',
              }}>
                {file.name}
              </button>
            ))}
          </div>
          <ConnectedUsers users={connectedUsers} currentUserId={user?.id} />
        </div>

        {/* Editor area — remount when file changes to reset realtime state */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeFileId && activeFile ? (
            <RealtimeEditor
              key={activeFileId}
              fileId={activeFileId}
              language={activeFile.language}
              onCodeChange={handleCodeChange}
              onUsersChange={setConnectedUsers}
              timeTravelContent={timeTravelContent}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: '13px' }}>
              {filesLoading ? 'Loading project…' : 'No files found'}
            </div>
          )}
        </div>

        {activeFileId && (
          <TimeTravel
            fileId={activeFileId}
            onPreview={setTimeTravelContent}
            onRestore={(content) => {
              lastCodeRef.current = content
              setTimeTravelContent(null)
            }}
          />
        )}

        <div style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(236,72,153,0.25)',
        }}>
          <TerminalOutput output={output} isLoading={isLoading} onRun={handleRun} onClear={() => setOutput('')} />
        </div>
      </div>

      <AIBlock currentCode={lastCodeRef.current} language={activeFile?.language ?? 'plaintext'} />

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


export default function App() {
  const { activated, reset } = useKonamiCode()

  return (
    <BrowserRouter>
      {activated && <KonamiExplosion onClose={reset} />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/editor" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
        <Route path="/secret" element={<SecretPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
