import { useState } from 'react'

interface FileItem {
  name: string
  language: string
}

interface SidebarProps {
  files: FileItem[]
  activeFile: string
  onSelectFile: (name: string) => void
}

export default function Sidebar({ files, activeFile, onSelectFile }: SidebarProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-full select-none">
      {/* Logo / Title */}
      <div className="px-4 py-3 border-b border-slate-700">
        <span className="text-white font-bold text-sm tracking-widest uppercase">iTECify</span>
      </div>

      {/* Explorer */}
      <div className="flex-1 overflow-y-auto">
        <button
          className="w-full flex items-center gap-1 px-3 py-1.5 text-slate-400 text-xs uppercase tracking-widest hover:text-white"
          onClick={() => setExpanded(!expanded)}
        >
          <span>{expanded ? '▾' : '▸'}</span> Explorer
        </button>

        {expanded && (
          <ul>
            {files.map((file) => (
              <li
                key={file.name}
                onClick={() => onSelectFile(file.name)}
                className={`flex items-center gap-2 px-6 py-1.5 text-sm cursor-pointer transition-colors ${
                  activeFile === file.name
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-xs">📄</span>
                {file.name}
              </li>
            ))}
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