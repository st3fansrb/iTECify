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
  c:    { label: 'C',   bg: '#a8b9cc', color: '#000' },
  cpp:  { label: 'C++', bg: '#a8b9cc', color: '#000' },
  md:   { label: 'MD',  bg: '#555',    color: '#fff' },
}

// Per-extension gradient + border-left color for file items
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

// ── FileRow — manages its own hover state ─────────────────────────────────────
function FileRow({
  file, isActive, fileStyle, onSelect,
}: {
  file: FileItem
  isActive: boolean
  fileStyle: { gradient: string; gradientActive: string; borderColor: string }
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)

  // Hex color → rgba string for inset glow
  const glowColor = fileStyle.borderColor

  return (
    <li
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={isActive ? 'sidebar-file-active' : ''}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        margin: '4px 8px',
        padding: '10px 12px',
        borderRadius: '8px',
        fontSize: '13px', fontFamily: 'monospace',
        cursor: 'pointer',
        background: isActive
          ? fileStyle.gradientActive
          : hovered
            ? fileStyle.gradient
            : 'transparent',
        color: isActive ? '#ffffff' : hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
        borderLeft: `${isActive ? '3px' : '2px'} solid ${isActive || hovered ? glowColor : 'transparent'}`,
        transform: hovered && !isActive ? 'translateX(4px)' : 'translateX(0)',
        boxShadow: isActive
          ? `inset 0 0 20px ${glowColor}1a, 0 0 10px ${glowColor}18`
          : hovered
            ? `inset 0 0 20px ${glowColor}12`
            : 'none',
        // Transition all props — includ border-color pentru badge-glow smoothness
        transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease',
        // CSS animation pentru puls pe activ — via className + keyframes în <style>
        animationName: isActive ? 'sidebar-pulse' : 'none',
        animationDuration: '2.4s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
      } as React.CSSProperties}
    >
      <FileBadge filename={file.name} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {file.name}
      </span>
    </li>
  )
}

// Keyframes injected once globally — used by FileRow active pulse
function SidebarStyles() {
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
    `}</style>
  )
}

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
        <div style={{ padding: '14px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: '17px' }}>
            <span className="sidebar-shimmer" style={{ fontWeight: 700, color: '#f472b6' }}>iTECify</span>
            <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>{' · editor'}</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%', padding: '10px 8px',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(249,168,212,0.6)', fontSize: '13px',
            cursor: 'pointer', textAlign: 'left',
            fontFamily: 'monospace', transition: 'color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f9a8d4' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(249,168,212,0.6)' }}
        >
          ← Home
        </button>
      </div>

      {/* Explorer */}
      <div className="flex-1 overflow-y-auto">

        {/* + New Project — deasupra Explorer */}
        {onNewProject && (
          <div style={{ padding: '8px 8px 4px' }}>
            <button
              onClick={onNewProject}
              style={{
                width: '100%',
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
          </div>
        )}

        {/* Section header — Explorer */}
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
              padding: '10px 14px 10px',
              userSelect: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              marginBottom: '4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>&#128193;</span>
                <span style={{
                  fontSize: '16px', fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '0.05em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {projectName ?? 'iTECify Demo'}
                </span>
              </div>
            </div>

            {/* Files list */}
            <ul style={{ listStyle: 'none', margin: 0, padding: '2px 0 4px' }}>
              {files.map((file) => {
                const isActive = activeFile === (file.id ?? file.name)
                const key = file.id ?? file.name
                const fs = getFileStyle(file.name)
                return (
                  <FileRow
                    key={key}
                    file={file}
                    isActive={isActive}
                    fileStyle={fs}
                    onSelect={() => onSelectFile(key)}
                  />
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

      <SidebarStyles />
    </div>
  )
}
