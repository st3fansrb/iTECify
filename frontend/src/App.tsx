import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
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
import { getUserProjects } from './lib/sessionApi'
import { useProjectMembers } from './hooks/useProjectMembers'
import { useRealtimeEditor, type ConnectedUser } from './hooks/useRealtimeEditor'
import { useSharedTerminal } from './hooks/useSharedTerminal'
import { usePersonalTerminal } from './hooks/usePersonalTerminal'
import ConnectedUsers from './components/ConnectedUsers'
import UserMenu from './components/UserMenu'
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
  flex: 1,
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

// ── Inner component that holds realtime state for the active file ──────────────
function RealtimeEditor({
  fileId, fileName, projectId, language, onCodeChange, onUsersChange, timeTravelContent, currentUserId,
}: { fileId: string; fileName?: string; projectId?: string; language: string; onCodeChange: (code: string) => void; onUsersChange: (users: ConnectedUser[]) => void; timeTravelContent: string | null; currentUserId?: string | null }) {
  const { code, updateCode, updateCursor, loading, isSaving, connectedUsers } = useRealtimeEditor({
    projectId,
    fileId,
    fileName,
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
        currentUserId={currentUserId}
      />
    </div>
  )
}

function EditorPage({ externalProjectId, onProjectName }: { externalProjectId?: string; onProjectName?: (name: string) => void }) {
  const navigate = useNavigate()
  const { files, loading: filesLoading, addFile, restoreDefaults, projectId, projectName } = useProjectFiles(externalProjectId)
  const { outputs, broadcast, clearOutputs } = useSharedTerminal(projectId)
  const { personalOutputs, addPersonalEntry, clearPersonalOutputs } = usePersonalTerminal()
  const members = useProjectMembers(projectId)


  const [activeFileId, setActiveFileId] = useState<string>('')
  const [openFileIds, setOpenFileIds] = useState<string[]>([])
  const initializedRef = useRef(false)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [stdin, setStdin] = useState('')
  const [toast, setToast] = useState(false)
  const [editorMode, setEditorMode] = useState<'shared' | 'personal'>('shared')
  const [personalCode, setPersonalCode] = useState('')
  const personalCodeMap = useRef<Map<string, string>>(new Map())
  const toastShownRef = useRef(false)
  const lastCodeRef = useRef('')
  const { user, session, signOut } = useAuth()
  const [timeTravelContent, setTimeTravelContent] = useState<string | null>(null)
  const [userProjects, setUserProjects] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    if (!user?.id) return
    getUserProjects(user.id).then(list => {
      setUserProjects(list.map(p => ({ id: p.projects.id, name: p.projects.name })))
    }).catch(() => {})
  }, [user?.id])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [terminalHeight, setTerminalHeight] = useState(192)
  const [terminalCollapsed, setTerminalCollapsed] = useState(false)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(192)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStartY.current - e.clientY
      const next = Math.min(500, Math.max(80, dragStartHeight.current + delta))
      setTerminalHeight(next)
    }
    const onMouseUp = () => { isDragging.current = false }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Report project name to parent (for project tabs)
  useEffect(() => {
    if (projectName) onProjectName?.(projectName)
  }, [projectName])

  // Manage open file tabs
  useEffect(() => {
    if (files.length === 0) return
    if (!initializedRef.current) {
      // First load — open all files
      initializedRef.current = true
      const ids = files.map(f => f.id).filter(Boolean)
      setOpenFileIds(ids)
      setActiveFileId(ids[0] ?? '')
    } else {
      // Subsequent updates — auto-open newly added files
      setOpenFileIds(prev => {
        const prevSet = new Set(prev)
        const newIds = files.map(f => f.id).filter(id => id && !prevSet.has(id))
        if (newIds.length === 0) return prev
        setActiveFileId(newIds[newIds.length - 1])
        return [...prev, ...newIds]
      })
    }
  }, [files])

  const activeFile = files.find(f => f.id === activeFileId)
  const openFiles = files.filter(f => openFileIds.includes(f.id))

  const closeFileTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenFileIds(prev => {
      const next = prev.filter(id => id !== fileId)
      if (activeFileId === fileId) {
        setActiveFileId(next[next.length - 1] ?? '')
      }
      return next
    })
  }

  const handleSelectFile = (idOrName: string) => {
    setActiveFileId(idOrName)
    setOpenFileIds(prev => prev.includes(idOrName) ? prev : [...prev, idOrName])
  }

  // Restore personal code for the newly selected file
  useEffect(() => {
    if (!activeFileId) return
    setPersonalCode(personalCodeMap.current.get(activeFileId) ?? '')
    if (editorMode === 'personal') {
      lastCodeRef.current = personalCodeMap.current.get(activeFileId) ?? ''
    }
  }, [activeFileId])

  const handlePersonalCodeChange = (code: string) => {
    setPersonalCode(code)
    personalCodeMap.current.set(activeFileId, code)
    lastCodeRef.current = code
    if (toastShownRef.current) return
    if (code.toLowerCase().includes('itecify')) {
      toastShownRef.current = true
      setToast(true)
      setTimeout(() => setToast(false), 4000)
    }
  }

  const handleCodeChange = (code: string) => {
    lastCodeRef.current = code
    if (toastShownRef.current) return
    if (code.toLowerCase().includes('itecify')) {
      toastShownRef.current = true
      setToast(true)
      setTimeout(() => setToast(false), 4000)
    }
  }

  const handleRun = async (force = false) => {
    if (!activeFile) return
    if (!session?.access_token) {
      setOutput('ERROR: Not logged in. Please sign in to run code.')
      return
    }
    setIsLoading(true)
    setIsBlocked(false)
    setOutput('')
    clearOutputs()

    const displayName = user?.email?.split('@')[0] ?? 'user'
    const userId = user?.id ?? 'unknown'

    broadcast({ userId, displayName, avatarColor: '#f472b6', type: 'command', content: `${activeFile.language}: ${activeFile.name}`, timestamp: new Date().toISOString() })
    addPersonalEntry({ userId, displayName, avatarColor: '#f472b6', type: 'command', content: `${activeFile.language}: ${activeFile.name}`, timestamp: new Date().toISOString() })

    try {
      const res = await fetch('/api/execute/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ language: activeFile.language, code: lastCodeRef.current, stdin, force }),
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        let errMsg = `HTTP ${res.status}`
        try {
          const json = JSON.parse(text)
          errMsg = json.error || errMsg
        } catch {
          errMsg = text || errMsg
        }
        setOutput(`ERROR: ${errMsg}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'stdout') {
              setOutput(prev => prev + event.content)
              broadcast({ userId, displayName, avatarColor: '#f472b6', type: 'stdout', content: event.content, timestamp: new Date().toISOString() })
              addPersonalEntry({ userId, displayName, avatarColor: '#f472b6', type: 'stdout', content: event.content, timestamp: new Date().toISOString() })
            } else if (event.type === 'stderr') {
              setOutput(prev => prev + event.content)
              broadcast({ userId, displayName, avatarColor: '#f472b6', type: 'stderr', content: event.content, timestamp: new Date().toISOString() })
              addPersonalEntry({ userId, displayName, avatarColor: '#f472b6', type: 'stderr', content: event.content, timestamp: new Date().toISOString() })
            } else if (event.type === 'scan') {
              const warnings = event.warnings.map((w: { severity: string; message: string }) =>
                `⚠ [${w.severity.toUpperCase()}] ${w.message}`
              ).join('\n')
              setOutput(prev => prev + warnings + '\n')
            } else if (event.type === 'blocked') {
              setIsBlocked(true)
              setOutput(prev => prev + `\n🛑 ${event.message}\n`)
            } else if (event.type === 'error') {
              setOutput(prev => prev + `ERROR: ${event.content}\n`)
              broadcast({ userId, displayName, avatarColor: '#f472b6', type: 'stderr', content: `ERROR: ${event.content}\n`, timestamp: new Date().toISOString() })
              addPersonalEntry({ userId, displayName, avatarColor: '#f472b6', type: 'stderr', content: `ERROR: ${event.content}\n`, timestamp: new Date().toISOString() })
            } else if (event.type === 'exit') {
              broadcast({ userId, displayName, avatarColor: '#f472b6', type: 'exit', content: String(event.code ?? 0), timestamp: new Date().toISOString() })
              addPersonalEntry({ userId, displayName, avatarColor: '#f472b6', type: 'exit', content: String(event.code ?? 0), timestamp: new Date().toISOString() })
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }

      if (!lastCodeRef.current.trim()) {
        setOutput('(no output)')
      }

    } catch (err) {
      console.error('[handleRun] error:', err)
      setOutput('ERROR: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  const remoteOutput = outputs.length > 0
    ? outputs.map(e => {
        if (e.type === 'command') return `▶ [${e.displayName}] ${e.content}\n`
        if (e.type === 'exit') return `[${e.displayName}] exited (${e.content})\n`
        return e.content
      }).join('')
    : ''

  return (
    <div style={BG_STYLE}>
      {ORBS}

      {/* Sidebar wrapper — collapses to 0 width */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: sidebarOpen ? 256 : 0,
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        background: 'rgba(15,12,41,0.6)',
        backdropFilter: 'blur(24px)',
      }}>
        <Sidebar
          files={files}
          activeFile={activeFileId}
          onSelectFile={handleSelectFile}
          loading={filesLoading}
          onCreateFile={addFile}
          onRestoreDefaults={restoreDefaults}
          members={members}
          onlineUserIds={connectedUsers.map(u => u.userId)}
          projectName={projectName}
          onNewProject={() => navigate('/dashboard')}
          userProjects={userProjects}
          currentProjectId={projectId ?? undefined}
          onSwitchProject={(pid) => navigate('/editor', { state: { projectId: pid } })}
        />
      </div>

      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        style={{
          position: 'relative', zIndex: 2,
          width: 14, flexShrink: 0,
          background: 'rgba(15,12,41,0.7)',
          border: 'none',
          borderRight: '1px solid rgba(236,72,153,0.15)',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
          fontSize: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.2s, background 0.2s',
          writingMode: 'vertical-rl',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#f9a8d4'; e.currentTarget.style.background = 'rgba(236,72,153,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(15,12,41,0.7)' }}
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '4px 8px',
          gap: '4px',
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {openFiles.map((file) => {
              const isActive = activeFileId === file.id
              return (
                <div key={file.id} style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => setActiveFileId(file.id)}
                    style={{
                      padding: '5px 28px 5px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      letterSpacing: '0.03em',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: isActive ? 'rgba(236,72,153,0.25)' : 'rgba(255,255,255,0.05)',
                      border: isActive ? '1.5px solid #f472b6' : '1.5px solid rgba(255,255,255,0.15)',
                      color: isActive ? '#f9a8d4' : 'rgba(255,255,255,0.4)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(236,72,153,0.1)'
                        e.currentTarget.style.borderColor = 'rgba(244,114,182,0.4)'
                        e.currentTarget.style.color = 'rgba(249,168,212,0.7)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                      }
                    }}
                  >
                    {file.name}
                  </button>
                  {/* Close tab button */}
                  <button
                    onClick={e => closeFileTab(file.id, e)}
                    title="Close tab"
                    style={{
                      position: 'absolute',
                      right: '7px',
                      width: '14px',
                      height: '14px',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '3px',
                      padding: 0,
                      lineHeight: 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f9a8d4'; e.currentTarget.style.background = 'rgba(236,72,153,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
          {/* Editor mode toggle */}
          <div style={{ display: 'flex', gap: '5px', marginLeft: '8px', marginRight: '4px' }}>
            {(['shared', 'personal'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setEditorMode(mode)
                  if (mode === 'personal') {
                    lastCodeRef.current = personalCodeMap.current.get(activeFileId) ?? ''
                  }
                }}
                style={{
                  padding: '5px 14px',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  letterSpacing: '0.03em',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: editorMode === mode ? 'rgba(236,72,153,0.25)' : 'rgba(255,255,255,0.05)',
                  border: editorMode === mode ? '1.5px solid #f472b6' : '1.5px solid rgba(255,255,255,0.15)',
                  color: editorMode === mode ? '#f9a8d4' : 'rgba(255,255,255,0.4)',
                }}
                onMouseEnter={e => {
                  if (editorMode !== mode) {
                    e.currentTarget.style.background = 'rgba(236,72,153,0.1)'
                    e.currentTarget.style.borderColor = 'rgba(244,114,182,0.4)'
                    e.currentTarget.style.color = 'rgba(249,168,212,0.7)'
                  }
                }}
                onMouseLeave={e => {
                  if (editorMode !== mode) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                  }
                }}
              >
                {mode === 'shared' ? '👥 Shared' : '🔒 Personal'}
              </button>
            ))}
          </div>
          <ConnectedUsers users={connectedUsers} currentUserId={user?.id} />
            {user && (
              <UserMenu
                user={user}
                projectId={projectId}
                onSignOut={signOut}
              />
            )}
        </div>

        {/* Editor area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeFileId && activeFile ? (
            editorMode === 'shared' ? (
              <RealtimeEditor
                key={activeFileId}
                projectId={projectId || undefined}
                fileId={activeFileId}
                fileName={activeFile.name}
                language={activeFile.language}
                onCodeChange={handleCodeChange}
                onUsersChange={setConnectedUsers}
                timeTravelContent={timeTravelContent}
                currentUserId={user?.id}
              />
            ) : (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  flexShrink: 0,
                  background: 'rgba(139,92,246,0.08)',
                  borderBottom: '1px solid rgba(139,92,246,0.2)',
                  padding: '4px 16px',
                  fontSize: '11px', fontFamily: 'monospace',
                  color: 'rgba(139,92,246,0.7)',
                  letterSpacing: '0.04em',
                }}>
                  🔒 Personal Editor — visible only to you
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <CodeEditor
                    language={activeFile.language}
                    value={personalCode}
                    onChange={handlePersonalCodeChange}
                  />
                </div>
              </div>
            )
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

        {/* Resize divider */}
        <div
          onMouseDown={e => {
            isDragging.current = true
            dragStartY.current = e.clientY
            dragStartHeight.current = terminalHeight
            e.preventDefault()
          }}
          style={{
            height: '6px',
            flexShrink: 0,
            background: 'rgba(236,72,153,0.3)',
            cursor: 'row-resize',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.6)' }}
          onMouseLeave={e => { if (!isDragging.current) e.currentTarget.style.background = 'rgba(236,72,153,0.3)' }}
        />

        <div style={{
          height: terminalCollapsed ? '36px' : `${terminalHeight}px`,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'height 0.2s ease',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(236,72,153,0.25)',
        }}>
          <TerminalOutput
            output={output || remoteOutput}
            isLoading={isLoading}
            onRun={() => handleRun(false)}
            onClear={() => { setOutput(''); setIsBlocked(false); clearOutputs() }}
            collapsed={terminalCollapsed}
            onToggleCollapse={() => setTerminalCollapsed(c => !c)}
            isBlocked={isBlocked}
            onForceRun={() => handleRun(true)}
            stdin={stdin}
            onStdinChange={setStdin}
            personalEntries={personalOutputs}
            onClearPersonal={clearPersonalOutputs}
          />
        </div>
      </div>

      <AIBlock currentCode={lastCodeRef.current} language={activeFile?.language ?? 'plaintext'} terminalHeight={terminalHeight} terminalCollapsed={terminalCollapsed} />

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


// ── Multi-project tab wrapper ────────────────────────────────────────────────
interface OpenProject {
  id?: string
  name: string
}

function MultiProjectEditorWrapper() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const incomingId =
    searchParams.get('project') ??
    (location.state as { projectId?: string } | null)?.projectId

  const [openProjects, setOpenProjects] = useState<OpenProject[]>([
    { id: incomingId ?? undefined, name: incomingId ? '…' : 'Demo' },
  ])
  const [activeIdx, setActiveIdx] = useState(0)
  const prevIdRef = useRef(incomingId)

  // Detect navigation to a new project
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const pid =
      sp.get('project') ??
      (location.state as { projectId?: string } | null)?.projectId
    if (pid === prevIdRef.current) return
    prevIdRef.current = pid
    if (!pid) return

    setOpenProjects(prev => {
      const idx = prev.findIndex(p => p.id === pid)
      if (idx >= 0) {
        setActiveIdx(idx)
        return prev
      }
      const next = [...prev, { id: pid, name: '…' }]
      setActiveIdx(next.length - 1)
      return next
    })
  }, [location.state])

  const updateName = (idx: number, name: string) => {
    setOpenProjects(prev => prev.map((p, i) => i === idx ? { ...p, name } : p))
  }

  const closeProject = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (openProjects.length === 1) {
      navigate('/dashboard')
      return
    }
    setOpenProjects(prev => {
      const next = prev.filter((_, i) => i !== idx)
      setActiveIdx(a => Math.min(a > idx ? a - 1 : a, next.length - 1))
      return next
    })
  }

  const active = openProjects[activeIdx]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Project tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(5,2,20,0.7)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(139,92,246,0.2)',
        padding: '4px 8px',
        gap: '4px',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {openProjects.map((p, i) => {
          const isActive = activeIdx === i
          return (
            <div key={`${p.id ?? 'demo'}-${i}`} style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setActiveIdx(i)}
                style={{
                  padding: '4px 26px 4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  letterSpacing: '0.03em',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: isActive ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                  border: isActive ? '1.5px solid #a78bfa' : '1.5px solid rgba(255,255,255,0.12)',
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(139,92,246,0.12)'
                    e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'
                    e.currentTarget.style.color = 'rgba(196,181,253,0.8)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                  }
                }}
              >
                📁 {p.name}
              </button>
              <button
                onClick={e => closeProject(i, e)}
                title="Close project"
                style={{
                  position: 'absolute',
                  right: '7px',
                  width: '14px',
                  height: '14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '3px',
                  padding: 0,
                  lineHeight: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.background = 'rgba(139,92,246,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      <EditorPage
        key={active?.id ?? 'demo'}
        externalProjectId={active?.id}
        onProjectName={name => updateName(activeIdx, name)}
      />
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
        <Route path="/editor" element={<ProtectedRoute><MultiProjectEditorWrapper /></ProtectedRoute>} />
        <Route path="/secret" element={<SecretPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
