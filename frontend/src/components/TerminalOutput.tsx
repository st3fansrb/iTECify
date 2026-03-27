interface TerminalOutputProps {
  output: string
  isLoading: boolean
  onRun: () => void
  onClear: () => void
}

export default function TerminalOutput({ output, isLoading, onRun, onClear }: TerminalOutputProps) {
  return (
    <div className="h-48 flex flex-col">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-pink-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
          <span className="text-pink-300 text-xs uppercase tracking-widest font-mono">Terminal</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRun}
            disabled={isLoading}
            className="px-3 py-0.5 bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 disabled:opacity-50 text-pink-300 text-xs rounded-full transition-all duration-300 font-mono"
          >
            {isLoading ? '⟳ Running...' : '▶ Run'}
          </button>
          <button
            onClick={onClear}
            className="px-3 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 text-xs rounded-full transition-all duration-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
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
    </div>
  )
}
