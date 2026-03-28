import { useState, useRef } from 'react'

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

export default function Sidebar({ files, activeFile, onSelectFile, loading, onCreateFile }: SidebarProps) {
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
      <div className="px-4 py-3 border-b border-slate-700">
        <span className="text-white font-bold text-sm tracking-widest uppercase">iTECify</span>
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
                  <span className="text-xs">📄</span>
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

      {/* Bottom user info */}
      <div className="px-4 py-2 border-t border-slate-700 text-slate-500 text-xs">
        iTEC 2026 Hackathon
      </div>
    </div>
  )
}
