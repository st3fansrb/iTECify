import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor'
import { useRef, useEffect } from 'react'
import type { ConnectedUser, CursorPosition } from '../hooks/useRealtimeEditor'

interface CodeEditorProps {
  language: string
  value: string
  onChange: (value: string) => void
  onEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void
  connectedUsers?: ConnectedUser[]
  remoteCursors?: ConnectedUser[]
  activeFileId?: string
  onCursorChange?: (cursor: CursorPosition | null) => void
  readOnly?: boolean
}

const CURSOR_COLORS = ['#f472b6', '#818cf8', '#34d399', '#fb923c', '#38bdf8']

export default function CodeEditor({
  language, value, onChange, onEditorMount,
  connectedUsers = [], remoteCursors = [], activeFileId,
  onCursorChange, readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  const oldDecorationsRef = useRef<string[]>([])
  const oldWidgetsRef = useRef<monaco.editor.IContentWidget[]>([])

  const handleMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance

    monacoInstance.editor.defineTheme('itecify', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#00000000',
        'editor.lineHighlightBackground': '#ffffff08',
        'editorLineNumber.foreground': '#ffffff30',
        'editorCursor.foreground': '#f472b6',
        'editor.selectionBackground': '#f472b640',
      },
    })
    monacoInstance.editor.setTheme('itecify')

    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange({ lineNumber: e.position.lineNumber, column: e.position.column })
      })
    }

    onEditorMount?.(editor)
  }

  // ── Remote cursor decorations + ContentWidgets ──────────────────────────────
  useEffect(() => {
    const editor = editorRef.current
    const monacoInstance = monacoRef.current
    if (!editor || !monacoInstance) return

    console.log('remoteCursors:', remoteCursors)

    // Filter to cursors in the currently active file with a known position
    const cursors = remoteCursors.filter(
      u => u.activeFileId === activeFileId && u.cursor !== null
    )

    // Inject per-user CSS for caret color + line highlight
    const styleId = 'rc-style'
    document.getElementById(styleId)?.remove()
    if (cursors.length > 0) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = cursors.map((u, i) => {
        const color = u.avatarColor ?? CURSOR_COLORS[i % CURSOR_COLORS.length]
        const cls = u.userId.replace(/[^a-z0-9]/gi, '')
        return `
          .rc-caret-${cls}::after {
            content: '';
            display: inline-block;
            width: 2px;
            height: 1.2em;
            background: ${color};
            margin-left: -1px;
            vertical-align: text-bottom;
          }
          .rc-line-${cls} { background: ${color}18 !important; }
        `
      }).join('\n')
      document.head.appendChild(style)
    }

    // Remove old widgets
    for (const w of oldWidgetsRef.current) {
      editor.removeContentWidget(w)
    }
    oldWidgetsRef.current = []

    // Remove old decorations
    oldDecorationsRef.current = editor.deltaDecorations(oldDecorationsRef.current, [])

    if (cursors.length === 0) return

    // Add decorations (line highlight + caret marker)
    const newDecorations = cursors.map(u => {
      const { lineNumber, column } = u.cursor!
      const cls = u.userId.replace(/[^a-z0-9]/gi, '')
      return {
        range: new monacoInstance.Range(lineNumber, column, lineNumber, column),
        options: {
          afterContentClassName: `rc-caret-${cls}`,
          lineHighlightClassName: `rc-line-${cls}`,
          isWholeLine: false,
          stickiness: monacoInstance.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      }
    })
    oldDecorationsRef.current = editor.deltaDecorations([], newDecorations)

    // Add ContentWidgets — name label above cursor
    const newWidgets: monaco.editor.IContentWidget[] = cursors.map((u, i) => {
      const { lineNumber, column } = u.cursor!
      const color = u.avatarColor ?? CURSOR_COLORS[i % CURSOR_COLORS.length]
      const label = u.displayName ?? u.userId.slice(0, 6)

      const node = document.createElement('div')
      node.textContent = label
      node.style.cssText = [
        `background:${color}`,
        'color:#0f0c29',
        'font-size:11px',
        'padding:1px 6px',
        'border-radius:3px',
        'font-family:monospace',
        'font-weight:700',
        'white-space:nowrap',
        'pointer-events:none',
        'z-index:100',
        'line-height:1.4',
      ].join(';')

      const widget: monaco.editor.IContentWidget = {
        getId: () => `remote-cursor-${u.userId}`,
        getDomNode: () => node,
        getPosition: () => ({
          position: { lineNumber, column },
          preference: [monacoInstance.editor.ContentWidgetPositionPreference.ABOVE],
        }),
      }
      editor.addContentWidget(widget)
      return widget
    })
    oldWidgetsRef.current = newWidgets
  }, [remoteCursors, activeFileId])

  // Cleanup decorations + widgets on unmount
  useEffect(() => {
    return () => {
      const editor = editorRef.current
      if (!editor) return
      for (const w of oldWidgetsRef.current) {
        editor.removeContentWidget(w)
      }
      editor.deltaDecorations(oldDecorationsRef.current, [])
      document.getElementById('rc-style')?.remove()
    }
  }, [])

  return (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(val) => onChange(val ?? '')}
        onMount={handleMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          padding: { top: 16 },
          readOnly,
        }}
      />

      {/* Sidebar badges — show which line each remote user is on */}
      {connectedUsers.filter(u => u.cursor !== null).map((u, i) => (
        <div
          key={u.userId}
          style={{
            position: 'absolute',
            right: '8px',
            top: `${56 + (i * 22)}px`,
            background: CURSOR_COLORS[i % CURSOR_COLORS.length],
            color: '#0f0c29',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '10px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            zIndex: 10,
            opacity: 0.88,
          }}
        >
          L{u.cursor!.lineNumber} · {u.displayName ?? u.userId.slice(0, 6)}
        </div>
      ))}
    </div>
  )
}
