import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
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
import { useRealtimeEditor } from './hooks/useRealtimeEditor'
import type { ConnectedUser } from './hooks/useRealtimeEditor'
import { useFileHistory } from './hooks/useFileHistory'
import { useProfile } from './hooks/useProfile'
import { useFileChanges } from './hooks/useFileChanges'
import supabase from './lib/supabase'

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

// ── Room creation/joining ─────────────────────────────────────────────────────

type FileMap = Record<string, { id: string; content: string }>

async function createOrJoinRoom(roomId: string | null): Promise<{ roomId: string; fileMap: FileMap }> {
  if (roomId) {
    const { data: files } = await supabase
      .from('files')
      .select('id, name, content')
      .eq('project_id', roomId)
    if (files && files.length > 0) {
      const fileMap: FileMap = {}
      files.forEach(f => { fileMap[f.name] = { id: f.id, content: f.content ?? '' } })
      return { roomId, fileMap }
    }
  }

  // Create a new project
  const { data: project, error: projError } = await supabase
    .from('projects')
    .insert({ name: 'iTECify Room' })
    .select()
    .single()
  if (projError || !project) throw new Error(projError?.message ?? 'Could not create project')

  // Create files for this project
  const { data: createdFiles, error: filesError } = await supabase
    .from('files')
    .insert(INITIAL_FILES.map(f => ({
      project_id: project.id,
      name: f.name,
      language: f.language,
      content: INITIAL_CODE[f.name],
    })))
    .select('id, name, content')
  if (filesError || !createdFiles) throw new Error(filesError?.message ?? 'Could not create files')

  const fileMap: FileMap = {}
  createdFiles.forEach(f => { fileMap[f.name] = { id: f.id, content: f.content ?? '' } })
  return { roomId: project.id, fileMap }
}

// ── Avatar indicator for connected users ─────────────────────────────────────

function UserDot({ user }: { user: ConnectedUser }) {
  const { profile } = useProfile(user.user_id)
  const displayName = profile?.display_name || user.user_id
  const initials = displayName.slice(0, 2).toUpperCase()
  const hue = [...user.user_id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const tooltipText = user.cursor_line
    ? `${displayName} — linha ${user.cursor_line}`
    : displayName
  return (
    <div title={tooltipText} style={{
      width: '26px', height: '26px', borderRadius: '50%',
      background: profile?.avatar_color ?? `hsl(${hue}, 70%, 55%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '10px', fontWeight: 700, color: 'white',
      border: '2px solid rgba(255,255,255,0.15)',
      flexShrink: 0,
      cursor: 'default',
    }}>
      {initials}
    </div>
  )
}

// ── Realtime editor wrapper ───────────────────────────────────────────────────

function RealtimeEditorPage({
  fileMap,
  roomId,
}: {
  fileMap: FileMap
  roomId: string
}) {
  const { session, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeFile, setActiveFile] = useState('main.py')
  const [localCodes, setLocalCodes] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(fileMap).map(([name, f]) => [name, f.content]))
  )
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(false)
  const toastShownRef = useRef(false)

  // ── Task 1: Istoric versiuni ──────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false)
  const activeFileId = fileMap[activeFile]?.id ?? ''
  const { entries: historyEntries, loading: historyLoading, fetchHistory, saveSnapshot } = useFileHistory(activeFileId)

  // ── Task 4: Profil utilizator ─────────────────────────────────────────────────
  const { profile: ownProfile, updateDisplayName } = useProfile(user?.id ?? null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  // ── Task 3: Notificări fișiere modificate ─────────────────────────────────────
  const fileNameToId = Object.fromEntries(Object.entries(fileMap).map(([n, f]) => [n, f.id]))
  const modifiedFiles = useFileChanges(fileNameToId, activeFile)

  const activeLanguage = INITIAL_FILES.find(f => f.name === activeFile)?.language ?? 'plaintext'

  // ── Task 2: Presence cu cursor ────────────────────────────────────────────────
  const { code, updateCode, connectedUsers } = useRealtimeEditor({
    fileId: activeFileId,
    initialContent: localCodes[activeFile] ?? '',
  })

  // Open history panel — fetch entries each time it opens
  useEffect(() => {
    if (historyOpen) void fetchHistory()
  }, [historyOpen, fetchHistory])

  // Sync realtime code → local cache
  useEffect(() => {
    setLocalCodes(prev => ({ ...prev, [activeFile]: code }))
  }, [code, activeFile])

  // Easter egg toast
  useEffect(() => {
    if (toastShownRef.current) return
    const found = Object.values(localCodes).some(c => c.toLowerCase().includes('itecify'))
    if (found) {
      toastShownRef.current = true
      setToast(true)
      setTimeout(() => setToast(false), 4000)
    }
  }, [localCodes])

  const handleCodeChange = (value: string) => {
    updateCode(value)
  }

  const handleRun = async () => {
    // Save snapshot before running so history reflects what was executed.
    void saveSnapshot(code, user?.id ?? null)

    setIsLoading(true)
    setOutput('Running...')
    try {
      const res = await fetch('http://localhost:3001/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ language: activeLanguage, code }),
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleRestoreSnapshot = (content: string) => {
    updateCode(content)
    setHistoryOpen(false)
  }

  const handleStartRename = () => {
    setNameInput(ownProfile?.display_name ?? user?.email?.split('@')[0] ?? '')
    setEditingName(true)
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nameInput.trim()) await updateDisplayName(nameInput)
    setEditingName(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
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

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 8px', gap: '8px', minHeight: '38px',
        }}>
          {/* File tabs */}
          <div style={{ display: 'flex' }}>
            {INITIAL_FILES.map((file) => (
              <button key={file.name} onClick={() => setActiveFile(file.name)} style={{
                padding: '8px 16px', fontSize: '12px', position: 'relative',
                background: activeFile === file.name ? 'rgba(236,72,153,0.1)' : 'transparent',
                color: activeFile === file.name ? '#f9a8d4' : 'rgba(255,255,255,0.35)',
                border: 'none',
                borderTop: activeFile === file.name ? '2px solid #f472b6' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'monospace',
              }}>
                {file.name}
                {/* Task 3 — dot pentru fișiere modificate de colegi */}
                {modifiedFiles.has(file.name) && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '4px',
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#f472b6',
                    boxShadow: '0 0 4px #f472b6',
                    display: 'inline-block',
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Right side: connected users + share + user + history + sign out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '4px' }}>

            {/* Task 2 — connected users with cursor info */}
            {connectedUsers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                <div style={{ display: 'flex', gap: '3px' }}>
                  {connectedUsers.slice(0, 5).map(u => <UserDot key={u.user_id} user={u} />)}
                  {connectedUsers.length > 5 && (
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', alignSelf: 'center' }}>
                      +{connectedUsers.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Task 1 — history button */}
            <button onClick={() => setHistoryOpen(o => !o)} style={{
              fontSize: '11px', padding: '4px 10px',
              background: historyOpen ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${historyOpen ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px', color: historyOpen ? '#f9a8d4' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              History
            </button>

            {/* Share button */}
            <button onClick={handleShare} style={{
              fontSize: '11px', padding: '4px 10px',
              background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(139,92,246,0.15)',
              border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'rgba(139,92,246,0.3)'}`,
              borderRadius: '6px',
              color: copied ? '#4ade80' : '#c4b5fd',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {copied ? 'Copiat!' : 'Share'}
            </button>

            {/* Task 4 — profile display name / rename */}
            {editingName ? (
              <form onSubmit={handleSaveName} style={{ display: 'flex', gap: '4px' }}>
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  style={{
                    fontSize: '11px', padding: '3px 8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(236,72,153,0.4)',
                    borderRadius: '6px', color: 'white',
                    outline: 'none', width: '120px',
                    fontFamily: 'inherit',
                  }}
                />
              </form>
            ) : (
              <span
                title="Clic pentru a schimba numele"
                onClick={handleStartRename}
                style={{
                  fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                  cursor: 'pointer',
                  borderBottom: '1px dashed rgba(255,255,255,0.15)',
                }}
              >
                {ownProfile?.display_name || user?.email}
              </span>
            )}

            {/* Sign out */}
            <button onClick={handleSignOut} style={{
              fontSize: '11px', padding: '4px 10px',
              background: 'rgba(236,72,153,0.1)',
              border: '1px solid rgba(236,72,153,0.25)',
              borderRadius: '6px', color: '#f9a8d4',
              cursor: 'pointer',
            }}>
              Ieși
            </button>
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor language={activeLanguage} value={code} onChange={handleCodeChange} />
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

      {/* Task 1 — History panel */}
      {historyOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '300px',
          zIndex: 50, display: 'flex', flexDirection: 'column',
          background: 'rgba(8,4,18,0.97)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(236,72,153,0.2)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{ color: '#f9a8d4', fontSize: '12px', fontWeight: 600, fontFamily: 'monospace' }}>
              {activeFile} — history
            </span>
            <button
              onClick={() => setHistoryOpen(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
            >×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {historyLoading ? (
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', padding: '12px', textAlign: 'center' }}>Se încarcă...</p>
            ) : historyEntries.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', padding: '12px', textAlign: 'center' }}>
                Niciun snapshot yet.<br />Apasă Run pentru a salva primul.
              </p>
            ) : historyEntries.map(entry => (
              <div key={entry.id} style={{
                padding: '9px 11px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                    {new Date(entry.saved_at).toLocaleString('ro-RO', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <button
                    onClick={() => handleRestoreSnapshot(entry.content)}
                    style={{
                      fontSize: '10px', padding: '2px 8px',
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '4px', color: '#c4b5fd',
                      cursor: 'pointer', fontFamily: 'monospace',
                    }}
                  >Restore</button>
                </div>
                <pre style={{
                  fontSize: '10px', color: 'rgba(200,200,215,0.4)',
                  margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  maxHeight: '54px', overflow: 'hidden',
                  fontFamily: '"Courier New", monospace', lineHeight: 1.5,
                }}>
                  {entry.content.slice(0, 120)}{entry.content.length > 120 ? '…' : ''}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Easter egg toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          background: 'rgba(15,12,41,0.95)',
          border: '1px solid rgba(236,72,153,0.4)',
          borderRadius: '12px', padding: '14px 20px',
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

// ── EditorPage — handles room setup ──────────────────────────────────────────

function EditorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [fileMap, setFileMap] = useState<FileMap | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const existingRoom = searchParams.get('room')
    createOrJoinRoom(existingRoom)
      .then(({ roomId: rid, fileMap: fm }) => {
        setRoomId(rid)
        setFileMap(fm)
        if (rid !== existingRoom) {
          setSearchParams({ room: rid }, { replace: true })
        }
      })
      .catch((err: unknown) => setError(`Eroare Supabase: ${err instanceof Error ? err.message : String(err)}`))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ ...BG_STYLE, alignItems: 'center', justifyContent: 'center' }}>
        {ORBS}
        <p style={{ position: 'relative', zIndex: 1, color: '#f87171', fontSize: '14px' }}>{error}</p>
      </div>
    )
  }

  if (!fileMap || !roomId) {
    return (
      <div style={{ ...BG_STYLE, alignItems: 'center', justifyContent: 'center' }}>
        {ORBS}
        <p style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Se pregătește room-ul...
        </p>
      </div>
    )
  }

  return <RealtimeEditorPage fileMap={fileMap} roomId={roomId} />
}

// ── Route guard ───────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { activated, reset } = useKonamiCode()

  return (
    <BrowserRouter>
      {activated && <KonamiExplosion onClose={reset} />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/editor" element={<RequireAuth><EditorPage /></RequireAuth>} />
        <Route path="/secret" element={<SecretPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
