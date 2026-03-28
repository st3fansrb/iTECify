import { useState, useRef } from 'react'
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
  c:    { label: 'C',   bg: '#555597', color: '#fff' },
  cpp:  { label: 'C++', bg: '#004283', color: '#fff' },
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

export default function Sidebar({ files, activeFile, onSelectFile, loading, onCreateFile, onRestoreDefaults, members = [], onlineUserIds = [], onNewProject, projectName }: SidebarProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
      {/* Logo / Title */}
      <div className="border-b border-slate-700">
        <div className="px-4 py-3">
          <span style={{ fontSize: '16px', fontWeight: 800 }} className="text-white tracking-widest uppercase">iTECify</span>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            width: 'calc(100% - 16px)',
            margin: '6px 8px 8px',
            padding: '7px 12px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
            background: 'rgba(236,72,153,0.1)',
            border: '1.5px solid rgba(244,114,182,0.35)',
            borderRadius: '8px',
            color: 'rgba(249,168,212,0.75)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left' as const,
            display: 'block',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.22)'; e.currentTarget.style.color = '#f9a8d4'; e.currentTarget.style.borderColor = 'rgba(244,114,182,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.1)'; e.currentTarget.style.color = 'rgba(249,168,212,0.75)'; e.currentTarget.style.borderColor = 'rgba(244,114,182,0.35)' }}
        >
          ← Home
        </button>
      </div>

      {/* Explorer */}
      <div className="flex-1 overflow-y-auto">
        {/* Section header */}
        <div className="flex items-center px-3 py-1.5">
          <button
            className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-widest hover:text-white flex-1"
            onClick={() => setExpanded(!expanded)}
          >
            <span>{expanded ? '▾' : '▸'}</span> Explorer
          </button>
          {onCreateFile && (
            <button
              title="New file"
              onClick={openCreate}
              style={{
                padding: '3px 10px',
                fontSize: '16px',
                fontWeight: 700,
                background: 'rgba(236,72,153,0.2)',
                border: '1.5px solid rgba(244,114,182,0.5)',
                borderRadius: '7px',
                color: '#f9a8d4',
                cursor: 'pointer',
                lineHeight: 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.2)' }}
            >
              +
            </button>
          )}
        </div>

        {onNewProject && (
          <button
            onClick={onNewProject}
            style={{
              width: 'calc(100% - 16px)',
              margin: '4px 8px',
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
            {/* Project root */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 12px',
              fontSize: '12px', fontWeight: 600,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'monospace',
              userSelect: 'none',
            }}>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>&#9662;</span>
              <span>&#128193;</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {projectName ?? 'iTECify Demo'}
              </span>
            </div>

            {/* Files list with VS Code indentation */}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {files.map((file, index) => {
                const isLast = index === files.length - 1
                const isActive = activeFile === (file.id ?? file.name)
                const key = file.id ?? file.name
                return (
                  <li
                    key={key}
                    onClick={() => onSelectFile(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '3px 12px 3px 24px',
                      fontSize: '13px', fontFamily: 'monospace',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(236,72,153,0.15)' : 'transparent',
                      color: isActive ? '#f9a8d4' : 'rgba(255,255,255,0.65)',
                      borderLeft: isActive ? '2px solid #f472b6' : '2px solid transparent',
                      transition: 'background 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Tree connector line */}
                    <span style={{
                      position: 'absolute', left: '14px',
                      color: 'rgba(255,255,255,0.15)', fontSize: '11px',
                      fontFamily: 'monospace', lineHeight: 1,
                    }}>
                      {isLast ? '\u2514' : '\u251C'}
                    </span>
                    <FileBadge filename={file.name} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                  </li>
                )
              })}
            </ul>
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
    </div>
  )
}
