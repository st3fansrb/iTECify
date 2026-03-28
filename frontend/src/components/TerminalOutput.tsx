interface TerminalOutputProps {
  output: string
  isLoading: boolean
  onRun: () => void
  onClear: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function TerminalOutput({ output, isLoading, onRun, onClear, collapsed = false, onToggleCollapse }: TerminalOutputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 border-b border-pink-500/20" style={{ height: '36px', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
          <span className="text-pink-300 text-xs uppercase tracking-widest font-mono">Terminal</span>
        </div>
        <div className="flex gap-2" style={{ alignItems: 'center' }}>
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
            onClick={onClear}
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

      {/* Output — hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs terminal-pink">
          {output
            ? output.split('\n').map((line, i) => (
                <div key={i} className={line.toLowerCase().includes('error') ? 'text-red-400' : 'text-pink-300'}>
                  <span className="text-pink-500/50 mr-2">❯</span>{line}
                </div>
              ))
            : <span className="text-pink-500/30">// Output-ul va apărea aici după Run...</span>
          }
        </div>
      )}
    </div>
  )
}
