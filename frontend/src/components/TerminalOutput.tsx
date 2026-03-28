import { useState } from 'react'
import type { TerminalEntry } from '../hooks/useSharedTerminal'

interface TerminalOutputProps {
  output: string
  isLoading: boolean
  onRun: () => void
  onClear: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  isBlocked?: boolean
  onForceRun?: () => void
  stdin?: string
  onStdinChange?: (value: string) => void
  personalEntries?: TerminalEntry[]
  onClearPersonal?: () => void
}

export default function TerminalOutput({ output, isLoading, onRun, onClear, collapsed = false, onToggleCollapse, isBlocked = false, onForceRun, stdin = '', onStdinChange, personalEntries, onClearPersonal }: TerminalOutputProps) {
  const [activeTab, setActiveTab] = useState<'shared' | 'personal'>('shared')

  const handleClear = () => {
    if (activeTab === 'personal' && onClearPersonal) {
      onClearPersonal()
    } else {
      onClear()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 border-b border-pink-500/20" style={{ height: '36px', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
          <span className="text-pink-300 text-xs uppercase tracking-widest font-mono">Terminal</span>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '2px', marginLeft: '12px' }}>
            {(['shared', 'personal'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '3px 12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                background: activeTab === tab ? 'rgba(236,72,153,0.2)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #f472b6' : '2px solid transparent',
                color: activeTab === tab ? '#f9a8d4' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                letterSpacing: '0.05em',
              }}>
                {tab === 'shared' ? 'Shared' : 'My Terminal'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2" style={{ alignItems: 'center' }}>
          {isBlocked && onForceRun && (
            <button
              onClick={onForceRun}
              disabled={isLoading}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'rgba(251,191,36,0.15)',
                border: '1.5px solid rgba(251,191,36,0.6)',
                borderRadius: '8px',
                color: '#fbbf24',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                transition: 'all 0.2s',
                fontFamily: 'monospace',
              }}
              onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = 'rgba(251,191,36,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.15)' }}
            >
              ⚠ Execute Anyway
            </button>
          )}
          <button
            onClick={onRun}
            disabled={isLoading}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'rgba(236,72,153,0.25)',
              border: '1.5px solid #f472b6',
              borderRadius: '8px',
              color: '#f9a8d4',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s',
              fontFamily: 'monospace',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={e => {
              if (!isLoading) {
                e.currentTarget.style.background = 'rgba(236,72,153,0.45)'
                e.currentTarget.style.boxShadow = '0 0 18px rgba(244,114,182,0.4)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(236,72,153,0.25)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {isLoading ? '⟳ Running...' : '▶ Run'}
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'monospace',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            }}
          >
            Clear
          </button>

          {/* Collapse toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand terminal' : 'Collapse terminal'}
              style={{
                padding: '4px 8px',
                fontSize: '14px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                lineHeight: 1,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f9a8d4' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
            >
              {collapsed ? '⌃' : '⌄'}
            </button>
          )}
        </div>
      </div>

      {/* stdin input — hidden when collapsed */}
      {!collapsed && onStdinChange && (
        <div style={{
          borderBottom: '1px solid rgba(249,168,212,0.1)',
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0,0,0,0.2)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '10px', color: 'rgba(249,168,212,0.4)', fontFamily: 'monospace', whiteSpace: 'nowrap', letterSpacing: '0.08em' }}>
            stdin:
          </span>
          <input
            value={stdin}
            onChange={e => onStdinChange(e.target.value)}
            placeholder="Input for your program (e.g. Ana 20)…"
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fde68a',
              fontSize: '11px',
              fontFamily: 'monospace',
              caretColor: '#fde68a',
              opacity: isLoading ? 0.4 : 1,
            }}
          />
        </div>
      )}

      {/* Output — hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs terminal-pink">
          {activeTab === 'shared' ? (
            // Shared tab — original behavior
            output
              ? output.split('\n').map((line, i) => (
                  <div key={i} className={line.toLowerCase().includes('error') ? 'text-red-400' : 'text-pink-300'}>
                    <span className="text-pink-500/50 mr-2">❯</span>{line}
                  </div>
                ))
              : <span className="text-pink-500/30">// Output-ul va apărea aici după Run...</span>
          ) : (
            // Personal tab — TerminalEntry[] with per-type colors
            personalEntries && personalEntries.length > 0
              ? personalEntries.map((entry, i) => {
                  if (entry.type === 'command') {
                    return (
                      <div key={i} style={{ color: 'rgba(249,168,212,0.7)', fontFamily: 'monospace' }}>
                        ▶ [{entry.displayName}] {entry.content}
                      </div>
                    )
                  }
                  if (entry.type === 'exit') {
                    return (
                      <div key={i} style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                        [{entry.displayName}] exited ({entry.content})
                      </div>
                    )
                  }
                  if (entry.type === 'stderr') {
                    return (
                      <div key={i} style={{ color: '#f87171', fontFamily: 'monospace' }}>
                        {entry.content}
                      </div>
                    )
                  }
                  // stdout
                  return (
                    <div key={i} style={{ color: '#f9a8d4', fontFamily: 'monospace' }}>
                      {entry.content}
                    </div>
                  )
                })
              : <span className="text-pink-500/30">// Personal output va apărea aici după Run...</span>
          )}
        </div>
      )}
    </div>
  )
}
