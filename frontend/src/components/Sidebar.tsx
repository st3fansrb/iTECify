import { useState, useRef, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { ProjectMember } from '../hooks/useProjectMembers'

interface FileItem {
  id?: string
  name: string
  language: string
}

interface SidebarProps {
  files: FileItem[]
  activeFile: string
  onSelectFile: (idOrName: string) => void
  loading?: boolean
  onCreateFile?: (name: string, language: string) => void
  onRestoreDefaults?: () => void
  members?: ProjectMember[]
  onlineUserIds?: string[]
  onNewProject?: () => void
  projectName?: string
  userProjects?: Array<{ id: string; name: string }>
  currentProjectId?: string
  onSwitchProject?: (projectId: string) => void
  onRenameFile?: (id: string, newName: string) => void
  onDeleteFile?: (fileId: string) => void
}

const EXT_TO_LANG: Record<string, string> = {
  py: 'python', js: 'javascript', ts: 'typescript', tsx: 'typescript',
  jsx: 'javascript', rs: 'rust', c: 'c', cpp: 'cpp', go: 'go',
  java: 'java', md: 'markdown', json: 'json', css: 'css', html: 'html',
}

function guessLanguage(filename: string): string {
  const ext = filename.split('.').pop() ?? ''
  return EXT_TO_LANG[ext.toLowerCase()] ?? 'plaintext'
}

const EXT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  js:   { label: 'JS',  bg: '#f7df1e', color: '#000' },
  jsx:  { label: 'JS',  bg: '#f7df1e', color: '#000' },
  py:   { label: 'PY',  bg: '#3776ab', color: '#fff' },
  rs:   { label: 'RS',  bg: '#ce422b', color: '#fff' },
  ts:   { label: 'TS',  bg: '#3178c6', color: '#fff' },
  tsx:  { label: 'TS',  bg: '#3178c6', color: '#fff' },
  go:   { label: 'GO',  bg: '#00acd7', color: '#fff' },
  java: { label: 'JV',  bg: '#f89820', color: '#000' },
  c:    { label: 'C',   bg: '#a8b9cc', color: '#000' },
  cpp:  { label: 'C++', bg: '#a8b9cc', color: '#000' },
  md:   { label: 'MD',  bg: '#555',    color: '#fff' },
}

const FILE_TYPES = [
  { label: 'Python',     ext: 'py',   defaultName: 'main.py',   bg: '#3776ab', color: '#fff' },
  { label: 'JavaScript', ext: 'js',   defaultName: 'index.js',  bg: '#f7df1e', color: '#000' },
  { label: 'TypeScript', ext: 'ts',   defaultName: 'index.ts',  bg: '#3178c6', color: '#fff' },
  { label: 'Rust',       ext: 'rs',   defaultName: 'main.rs',   bg: '#ce422b', color: '#fff' },
  { label: 'Go',         ext: 'go',   defaultName: 'main.go',   bg: '#00acd7', color: '#fff' },
  { label: 'Java',       ext: 'java', defaultName: 'Main.java', bg: '#f89820', color: '#000' },
  { label: 'C',          ext: 'c',    defaultName: 'main.c',    bg: '#555597', color: '#fff' },
  { label: 'C++',        ext: 'cpp',  defaultName: 'main.cpp',  bg: '#004283', color: '#fff' },
]

function FileBadge({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const badge = EXT_BADGE[ext]
  if (!badge) return <span style={{ width: 18, display: 'inline-block' }} />
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 16, borderRadius: 3,
      background: badge.bg, color: badge.color,
      fontSize: 9, fontWeight: 'bold',
      marginRight: 6, flexShrink: 0, letterSpacing: '-0.02em',
    }}>
      {badge.label}
    </span>
  )
}

const FALLBACK_COLORS = ['#f472b6', '#818cf8', '#34d399', '#fb923c', '#38bdf8']

// ── Per-extension gradient styles for file rows ───────────────────────────────
const EXT_FILE_STYLE: Record<string, { gradient: string; gradientActive: string; borderColor: string }> = {
  js:   { gradient: 'linear-gradient(135deg, rgba(247,223,30,0.08), rgba(247,223,30,0.02))',   gradientActive: 'linear-gradient(135deg, rgba(247,223,30,0.18), rgba(247,223,30,0.06))',   borderColor: '#f7df1e' },
  jsx:  { gradient: 'linear-gradient(135deg, rgba(247,223,30,0.08), rgba(247,223,30,0.02))',   gradientActive: 'linear-gradient(135deg, rgba(247,223,30,0.18), rgba(247,223,30,0.06))',   borderColor: '#f7df1e' },
  py:   { gradient: 'linear-gradient(135deg, rgba(55,118,171,0.1),  rgba(55,118,171,0.02))',   gradientActive: 'linear-gradient(135deg, rgba(55,118,171,0.22),  rgba(55,118,171,0.07))',   borderColor: '#3776ab' },
  rs:   { gradient: 'linear-gradient(135deg, rgba(206,66,43,0.1),   rgba(206,66,43,0.02))',    gradientActive: 'linear-gradient(135deg, rgba(206,66,43,0.22),   rgba(206,66,43,0.07))',    borderColor: '#ce422b' },
  ts:   { gradient: 'linear-gradient(135deg, rgba(49,120,198,0.1),  rgba(49,120,198,0.02))',   gradientActive: 'linear-gradient(135deg, rgba(49,120,198,0.22),  rgba(49,120,198,0.07))',   borderColor: '#3178c6' },
  tsx:  { gradient: 'linear-gradient(135deg, rgba(49,120,198,0.1),  rgba(49,120,198,0.02))',   gradientActive: 'linear-gradient(135deg, rgba(49,120,198,0.22),  rgba(49,120,198,0.07))',   borderColor: '#3178c6' },
  c:    { gradient: 'linear-gradient(135deg, rgba(168,185,204,0.08), rgba(168,185,204,0.02))', gradientActive: 'linear-gradient(135deg, rgba(168,185,204,0.18), rgba(168,185,204,0.06))', borderColor: '#a8b9cc' },
  cpp:  { gradient: 'linear-gradient(135deg, rgba(168,185,204,0.08), rgba(168,185,204,0.02))', gradientActive: 'linear-gradient(135deg, rgba(168,185,204,0.18), rgba(168,185,204,0.06))', borderColor: '#a8b9cc' },
  go:   { gradient: 'linear-gradient(135deg, rgba(0,172,215,0.08),  rgba(0,172,215,0.02))',    gradientActive: 'linear-gradient(135deg, rgba(0,172,215,0.18),  rgba(0,172,215,0.07))',    borderColor: '#00acd7' },
  java: { gradient: 'linear-gradient(135deg, rgba(248,152,32,0.08), rgba(248,152,32,0.02))',   gradientActive: 'linear-gradient(135deg, rgba(248,152,32,0.18), rgba(248,152,32,0.07))',   borderColor: '#f89820' },
}
const DEFAULT_FILE_STYLE = {
  gradient: 'linear-gradient(135deg, rgba(249,168,212,0.07), rgba(249,168,212,0.02))',
  gradientActive: 'linear-gradient(135deg, rgba(249,168,212,0.18), rgba(249,168,212,0.06))',
  borderColor: '#f9a8d4',
}
function getFileStyle(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return EXT_FILE_STYLE[ext] ?? DEFAULT_FILE_STYLE
}

// ── FileRow — manages own hover state, per-language gradient ──────────────────
function FileRow({ file, isActive, onSelect, onCtxMenu }: { file: FileItem; isActive: boolean; onSelect: () => void; onCtxMenu?: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false)
  const fileStyle = getFileStyle(file.name)

  return (
    <li
      onClick={onSelect}
      onContextMenu={onCtxMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={isActive ? 'sidebar-file-active' : ''}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        margin: '3px 8px',
        padding: '8px 10px',
        borderRadius: '8px',
        fontSize: '13px', fontFamily: 'monospace',
        cursor: 'pointer',
        listStyle: 'none',
        background: isActive ? fileStyle.gradientActive : hovered ? fileStyle.gradient : 'transparent',
        color: isActive ? '#ffffff' : hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
        borderLeft: `${isActive ? '3px' : '2px'} solid ${isActive || hovered ? fileStyle.borderColor : 'transparent'}`,
        transform: hovered && !isActive ? 'translateX(4px)' : 'translateX(0)',
        boxShadow: isActive
          ? `inset 0 0 20px ${fileStyle.borderColor}1a, 0 0 10px ${fileStyle.borderColor}18`
          : hovered ? `inset 0 0 20px ${fileStyle.borderColor}12` : 'none',
        transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease',
        animationName: isActive ? 'sidebar-pulse' : 'none',
        animationDuration: '2.4s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
      } as CSSProperties}
    >
      <FileBadge filename={file.name} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {file.name}
      </span>
    </li>
  )
}

function SidebarKeyframes() {
  return (
    <style>{`
      @keyframes sidebar-pulse {
        0%, 100% { border-left-width: 3px; opacity: 1; }
        50%       { border-left-width: 5px; opacity: 0.88; }
      }
      @keyframes shimmer {
        0%, 100% { color: #f472b6; text-shadow: 0 0 8px rgba(244,114,182,0.5); }
        50%       { color: #d8b4fe; text-shadow: 0 0 14px rgba(216,180,254,0.7); }
      }
      .sidebar-shimmer {
        animation: shimmer 2.4s ease-in-out infinite;
      }
      @keyframes switcher-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        0%, 100% { color: #f472b6; }
        50%       { color: #d8b4fe; }
      }
    `}</style>
  )
}

export default function Sidebar({ files, activeFile, onSelectFile, loading, onCreateFile, onRestoreDefaults, members = [], onlineUserIds = [], onNewProject, projectName, userProjects = [], currentProjectId, onSwitchProject, onDeleteFile, onRenameFile }: SidebarProps) {

  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close) }
  }, [contextMenu])

  useEffect(() => {
    if (renaming) setTimeout(() => renameInputRef.current?.select(), 30)
  }, [renaming])

const handleFileContextMenu = (file: FileItem, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ file, x: e.clientX, y: e.clientY })
  }

  const handleRenameSubmit = (newName: string) => {
    if (renaming && newName.trim() && newName.trim() !== renaming.name) {
      onRenameFile?.(renaming.id, newName.trim())
    }
    setRenaming(null)
  }

  const handleDeleteFile = () => {
    if (!contextMenu?.file.id) return
    onDeleteFile?.(contextMenu.file.id)
    setContextMenu(null)
    setCreating(true)
    setExpanded(true)
    setNewName('')
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const openCreate = () => {
    setCreating(true)
    setExpanded(true)
    setNewName('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleTypeClick = (ext: string, defaultName: string) => {
    const lang = guessLanguage(defaultName)
    const name = newName.trim() || defaultName
    const finalName = name.includes('.') ? name : `${name}.${ext}`
    onCreateFile?.(finalName, lang)
    setCreating(false)
    setNewName('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) { setCreating(false); return }
    onCreateFile?.(name, guessLanguage(name))
    setCreating(false)
    setNewName('')
  }

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-full select-none">
      <SidebarKeyframes />
      {/* Logo / Title */}
      <div className="border-b border-slate-700">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '14px 16px 12px',
          position: 'relative',
        }}>
          {/* Glow behind logo */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 50% 60%, rgba(236,72,153,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <span style={{
            fontSize: '18px',
            fontWeight: 900,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #f9a8d4 0%, #e879f9 40%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.45))',
            position: 'relative',
          }}>
            iTECify
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', margin: '6px 8px 8px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              flex: 1, padding: '7px 8px', fontSize: '11px', fontWeight: 600,
              fontFamily: 'monospace', letterSpacing: '0.04em',
              background: 'rgba(139,92,246,0.1)', border: '1.5px solid rgba(139,92,246,0.35)',
              borderRadius: '8px', color: 'rgba(196,181,253,0.75)', cursor: 'pointer',
              transition: 'all 0.2s', textAlign: 'left' as const,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.22)'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.color = 'rgba(196,181,253,0.75)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)' }}
          >
            ← Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              flex: 1, padding: '7px 8px', fontSize: '11px', fontWeight: 600,
              fontFamily: 'monospace', letterSpacing: '0.04em',
              background: 'rgba(236,72,153,0.1)', border: '1.5px solid rgba(244,114,182,0.35)',
              borderRadius: '8px', color: 'rgba(249,168,212,0.75)', cursor: 'pointer',
              transition: 'all 0.2s', textAlign: 'left' as const,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.22)'; e.currentTarget.style.color = '#f9a8d4'; e.currentTarget.style.borderColor = 'rgba(244,114,182,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.1)'; e.currentTarget.style.color = 'rgba(249,168,212,0.75)'; e.currentTarget.style.borderColor = 'rgba(244,114,182,0.35)' }}
          >
            ← Home
          </button>
        </div>
      </div>

      {/* Explorer */}
      <div className="flex-1 overflow-y-auto">
        {onNewProject && (
          <button
            onClick={onNewProject}
            style={{
              width: 'calc(100% - 16px)',
              margin: '8px 8px 4px',
              padding: '7px 12px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              background: 'rgba(139,92,246,0.15)',
              border: '1.5px solid rgba(139,92,246,0.4)',
              borderRadius: '8px',
              color: 'rgba(167,139,250,0.9)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left' as const,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)' }}
          >
            + New Project
          </button>
        )}

        {/* Section header */}
        <div className="flex items-center px-3 py-1.5">
          <button
            className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-widest hover:text-white flex-1"
            onClick={() => setExpanded(!expanded)}
          >
            <span>{expanded ? '▾' : '▸'}</span> Explorer
          </button>
        </div>

        {onCreateFile && (
          <button
            onClick={openCreate}
            style={{
              width: 'calc(100% - 16px)',
              margin: '4px 8px',
              padding: '7px 12px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              background: 'rgba(236,72,153,0.15)',
              border: '1.5px solid rgba(244,114,182,0.4)',
              borderRadius: '8px',
              color: 'rgba(249,168,212,0.9)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left' as const,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.3)'; e.currentTarget.style.borderColor = 'rgba(244,114,182,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.15)'; e.currentTarget.style.borderColor = 'rgba(244,114,182,0.4)' }}
          >
            + New File
          </button>
        )}


        {/* New file panel */}
        {creating && (
          <div style={{
            margin: '4px 8px 8px',
            background: 'rgba(15,12,41,0.8)',
            border: '1px solid rgba(236,72,153,0.25)',
            borderRadius: '10px',
            padding: '10px',
          }}>
            <p style={{ fontSize: '10px', color: 'rgba(249,168,212,0.5)', fontFamily: 'monospace', marginBottom: '8px', letterSpacing: '0.06em' }}>
              NEW FILE
            </p>

            {/* Filename input */}
            <form onSubmit={handleSubmit} style={{ marginBottom: '10px' }}>
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                placeholder="filename (optional)"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(236,72,153,0.3)',
                  borderRadius: '6px', padding: '5px 8px',
                  fontSize: '12px', color: 'white',
                  fontFamily: 'monospace', outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,114,182,0.7)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(236,72,153,0.3)' }}
                autoComplete="off"
                spellCheck={false}
              />
            </form>

            {/* Language type buttons */}
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: '6px' }}>
              Choose type:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {FILE_TYPES.map(ft => (
                <button
                  key={ft.ext}
                  onClick={() => handleTypeClick(ft.ext, ft.defaultName)}
                  title={ft.label}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px', fontWeight: 700,
                    fontFamily: 'monospace',
                    background: ft.bg,
                    color: ft.color,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s, transform 0.15s',
                    opacity: 0.9,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  .{ft.ext}
                </button>
              ))}
            </div>

            {/* Cancel */}
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              style={{
                marginTop: '8px', width: '100%',
                background: 'transparent', border: 'none',
                fontSize: '11px', color: 'rgba(255,255,255,0.25)',
                cursor: 'pointer', fontFamily: 'monospace',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
            >
              cancel
            </button>
          </div>
        )}

        {loading && <p className="px-6 py-2 text-xs text-slate-500">Loading files…</p>}

        {expanded && !loading && (
          <div>
            {/* Project root — clickable switcher */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSwitcherOpen(o => !o)}
                title="Switch project"
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px',
                  fontSize: '12px', fontWeight: 600,
                  color: switcherOpen ? '#f9a8d4' : 'rgba(255,255,255,0.65)',
                  fontFamily: 'monospace',
                  background: switcherOpen ? 'rgba(236,72,153,0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!switcherOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' } }}
                onMouseLeave={e => { if (!switcherOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' } }}
              >
                <span style={{ fontSize: '13px' }}>📁</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {projectName ?? 'iTECify Demo'}
                </span>
                <span style={{
                  fontSize: '9px', opacity: 0.5,
                  transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}>▼</span>
              </button>

              {/* Dropdown */}
              {switcherOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 8, right: 8,
                  zIndex: 100,
                  background: 'rgba(10,6,25,0.97)',
                  border: '1px solid rgba(236,72,153,0.2)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  animation: 'switcher-in 0.15s ease both',
                }}>
                  <div style={{ padding: '6px 10px 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                    Your projects
                  </div>
                  {userProjects.length === 0 && (
                    <div style={{ padding: '8px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                      No projects found
                    </div>
                  )}
                  {userProjects.map(p => {
                    const isCurrent = p.id === currentProjectId
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setSwitcherOpen(false); if (!isCurrent) onSwitchProject?.(p.id) }}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '8px 12px',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          background: isCurrent ? 'rgba(236,72,153,0.12)' : 'transparent',
                          border: 'none',
                          color: isCurrent ? '#f9a8d4' : 'rgba(255,255,255,0.65)',
                          fontSize: '12px', fontFamily: 'monospace',
                          cursor: isCurrent ? 'default' : 'pointer',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: '11px' }}>📁</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        {isCurrent && <span style={{ fontSize: '10px', color: '#f9a8d4', opacity: 0.7 }}>✓</span>}
                      </button>
                    )
                  })}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <button
                    onClick={() => { setSwitcherOpen(false); onNewProject?.() }}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '8px 12px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'transparent', border: 'none',
                      color: 'rgba(167,139,250,0.8)',
                      fontSize: '12px', fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                      marginBottom: 4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span>＋</span>
                    <span>New project</span>
                  </button>
                </div>
              )}
            </div>

            {/* Files list */}
            <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
              {files.map((file) => {
                const isActive = activeFile === (file.id ?? file.name)
                const key = file.id ?? file.name

                if (renaming?.id === (file.id ?? '')) {
                  return (
                    <li key={key} style={{ padding: '3px 8px 3px 24px' }}>
                      <input
                        ref={renameInputRef}
                        defaultValue={renaming.name}
                        onBlur={e => handleRenameSubmit(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSubmit(e.currentTarget.value)
                          if (e.key === 'Escape') setRenaming(null)
                        }}
                        style={{
                          width: '100%', padding: '3px 6px',
                          background: 'rgba(139,92,246,0.15)',
                          border: '1px solid rgba(139,92,246,0.5)',
                          borderRadius: '4px',
                          color: '#e2e8f0', fontSize: '12px', fontFamily: 'monospace',
                          outline: 'none',
                        }}
                      />
                    </li>
                  )
                }

                return (
                  <FileRow
                    key={key}
                    file={file}
                    isActive={isActive}
                    onSelect={() => onSelectFile(key)}
                    onCtxMenu={(e) => handleFileContextMenu(file, e)}
                  />
                )
              })}
            </ul>

            {/* Context menu */}
            {contextMenu && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: contextMenu.y,
                  left: contextMenu.x,
                  zIndex: 9999,
                  background: 'rgba(18,14,40,0.97)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(12px)',
                  minWidth: '140px',
                  padding: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                <button
                  onClick={() => {
                    setRenaming({ id: contextMenu.file.id ?? '', name: contextMenu.file.name })
                    setContextMenu(null)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '7px 10px',
                    background: 'transparent', border: 'none',
                    color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                    borderRadius: '5px', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  ✏️ Rename
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '2px 6px' }} />
                <button
                  onClick={() => {
                    onDeleteFile?.(contextMenu.file.id ?? '')
                    setContextMenu(null)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '7px 10px',
                    background: 'transparent', border: 'none',
                    color: 'rgba(248,113,113,0.85)', cursor: 'pointer',
                    borderRadius: '5px', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Restore defaults button — shown when no files */}
        {!loading && files.length === 0 && onRestoreDefaults && (
          <div style={{ padding: '12px 12px 0' }}>
            <button
              onClick={onRestoreDefaults}
              style={{
                width: '100%', padding: '8px 12px',
                fontSize: '11px', fontFamily: 'monospace',
                fontWeight: 600,
                background: 'rgba(236,72,153,0.15)',
                border: '1.5px solid rgba(244,114,182,0.4)',
                borderRadius: '8px',
                color: '#f9a8d4',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.15)' }}
            >
              ↺ Restore default files
            </button>
          </div>
        )}
      </div>

      {/* Members section */}
      {members.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 0' }}>
          <div style={{ padding: '0 12px 6px', fontSize: '10px', color: 'rgba(249,168,212,0.45)', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Members ({members.length})
          </div>
          {members.map((m, i) => {
            const isOnline = onlineUserIds.includes(m.userId)
            const color = m.avatarColor ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
            const label = m.displayName
              ? m.displayName.slice(0, 2).toUpperCase()
              : m.userId.slice(0, 2).toUpperCase()
            const name = m.displayName ?? m.userId.slice(0, 12)
            return (
              <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700, color: '#0f0c29',
                  position: 'relative',
                }}>
                  {label}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 7, height: 7, borderRadius: '50%',
                    background: isOnline ? '#34d399' : 'rgba(255,255,255,0.2)',
                    border: '1.5px solid #0f0c29',
                  }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '11px', color: isOnline ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </div>
                  <div style={{ fontSize: '9px', color: m.role === 'owner' ? 'rgba(249,168,212,0.5)' : 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                    {m.role === 'owner' ? '★ owner' : 'member'} {isOnline ? '· online' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom */}
      <div className="px-4 py-2 border-t border-slate-700 text-slate-500 text-xs">
        iTEC 2026 Hackathon
      </div>

      {/* Right-click context menu — rendered in a portal to escape stacking context */}
      {contextMenu && createPortal(
        <>
          {/* Full-screen backdrop */}
          <div
            onClick={() => setContextMenu(null)}
            onContextMenu={e => { e.preventDefault(); setContextMenu(null) }}
            style={{
              position: 'fixed', inset: 0,
              zIndex: 9998,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Menu popup */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 9999,
              background: 'rgba(8,4,22,0.98)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '12px',
              boxShadow: '0 12px 48px rgba(0,0,0,0.85), 0 0 0 1px rgba(239,68,68,0.12), 0 0 28px rgba(239,68,68,0.15)',
              backdropFilter: 'blur(24px)',
              minWidth: '200px',
              overflow: 'hidden',
              animation: 'ctx-in 0.15s cubic-bezier(0.34,1.4,0.64,1) both',
            }}
          >
            {/* File name label */}
            <div style={{
              padding: '9px 16px 7px',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace',
              textTransform: 'uppercase',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              {contextMenu.file.name}
            </div>

            {/* Rename option */}
            <button
              onClick={() => {
                setRenaming({ id: contextMenu.file.id ?? '', name: contextMenu.file.name })
                setContextMenu(null)
              }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'transparent', border: 'none',
                color: '#c4b5fd',
                fontSize: '13px', fontFamily: 'monospace', fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; e.currentTarget.style.color = '#ddd6fe' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c4b5fd' }}
            >
              <span style={{ fontSize: '15px', lineHeight: 1 }}>✏️</span>
              Rename
            </button>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '2px 12px' }} />

            {/* Delete option */}
            <button
              onClick={handleDeleteFile}
              style={{
                width: '100%', textAlign: 'left',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'transparent', border: 'none',
                color: '#fca5a5',
                fontSize: '13px', fontFamily: 'monospace', fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#fecaca' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fca5a5' }}
            >
              <span style={{ fontSize: '15px', lineHeight: 1 }}>🗑</span>
              Delete permanently
            </button>
          </div>
        </>,
        document.body
      )}

      <style>{`
        @keyframes ctx-in {
          from { opacity: 0; transform: scale(0.93) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
