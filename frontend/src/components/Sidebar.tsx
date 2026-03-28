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
  members?: ProjectMember[]
  onlineUserIds?: string[]
}

const EXT_TO_LANG: Record<string, string> = {
  py: 'python',
  js: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'javascript',
  rs: 'rust',
  c: 'c',
  cpp: 'cpp',
  go: 'go',
  md: 'markdown',
  json: 'json',
  css: 'css',
  html: 'html',
}

function guessLanguage(filename: string): string {
  const ext = filename.split('.').pop() ?? ''
  return EXT_TO_LANG[ext.toLowerCase()] ?? 'plaintext'
}

const EXT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  js:  { label: 'JS',  bg: '#f7df1e', color: '#000' },
  jsx: { label: 'JS',  bg: '#f7df1e', color: '#000' },
  py:  { label: 'PY',  bg: '#3776ab', color: '#fff' },
  rs:  { label: 'RS',  bg: '#ce422b', color: '#fff' },
  ts:  { label: 'TS',  bg: '#3178c6', color: '#fff' },
  tsx: { label: 'TS',  bg: '#3178c6', color: '#fff' },
  go:  { label: 'GO',  bg: '#00acd7', color: '#fff' },
  c:   { label: 'C',   bg: '#555597', color: '#fff' },
  cpp: { label: 'C++', bg: '#004283', color: '#fff' },
  md:  { label: 'MD',  bg: '#555',    color: '#fff' },
}

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

export default function Sidebar({ files, activeFile, onSelectFile, loading, onCreateFile, members = [], onlineUserIds = [] }: SidebarProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleNewFileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) { setCreating(false); setNewName(''); return }
    onCreateFile?.(name, guessLanguage(name))
    setNewName('')
    setCreating(false)
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
            width: '100%', padding: '10px 8px',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(249,168,212,0.6)', fontSize: '13px',
            cursor: 'pointer', textAlign: 'left',
            fontFamily: 'monospace',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f9a8d4' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(249,168,212,0.6)' }}
        >
          ← Home
        </button>
      </div>

      {/* Explorer */}
      <div className="flex-1 overflow-y-auto">
        {/* Section header with + button */}
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
              className="text-slate-500 hover:text-pink-300 text-base leading-none px-1 transition-colors"
              onClick={() => { setCreating(true); setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50) }}
            >
              +
            </button>
          )}
        </div>

        {loading && (
          <p className="px-6 py-2 text-xs text-slate-500">Loading files…</p>
        )}

        {expanded && !loading && (
          <ul>
            {files.map((file) => {
              const key = file.id ?? file.name
              return (
                <li
                  key={key}
                  onClick={() => onSelectFile(key)}
                  className={`flex items-center gap-2 px-6 py-1.5 text-sm cursor-pointer transition-colors ${
                    activeFile === key
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <FileBadge filename={file.name} />
                  {file.name}
                </li>
              )
            })}

            {/* New file inline form */}
            {creating && (
              <li className="px-6 py-1">
                <form onSubmit={handleNewFileSubmit}>
                  <input
                    ref={inputRef}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onBlur={() => { if (!newName.trim()) { setCreating(false); setNewName('') } }}
                    onKeyDown={e => { if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                    placeholder="filename.py"
                    className="w-full bg-slate-800 border border-pink-400/30 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-400/60 font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </form>
              </li>
            )}
          </ul>
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
                {/* Avatar */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700, color: '#0f0c29',
                  position: 'relative',
                }}>
                  {label}
                  {/* Online dot */}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 7, height: 7, borderRadius: '50%',
                    background: isOnline ? '#34d399' : 'rgba(255,255,255,0.2)',
                    border: '1.5px solid #0f0c29',
                  }} />
                </div>
                {/* Name + role */}
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

      {/* Bottom user info */}
      <div className="px-4 py-2 border-t border-slate-700 text-slate-500 text-xs">
        iTEC 2026 Hackathon
      </div>
    </div>
  )
}
