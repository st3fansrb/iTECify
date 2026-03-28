import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor'

interface ConnectedUser {
  user_id: string
  cursor_line: number | null
}

interface CodeEditorProps {
  language: string
  value: string
  onChange: (value: string) => void
  onEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void
  connectedUsers?: ConnectedUser[]
  onCursorChange?: (line: number | null) => void
  readOnly?: boolean
}

const CURSOR_COLORS = ['#f472b6', '#818cf8', '#34d399', '#fb923c', '#38bdf8']

export default function CodeEditor({ language, value, onChange, onEditorMount, connectedUsers = [], onCursorChange, readOnly = false }: CodeEditorProps) {
  const decorationsRef = { current: [] as string[] }

  const handleMount: OnMount = (editor, monacoInstance) => {
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

    // Broadcast cursor line changes
    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange(e.position.lineNumber)
      })
    }

    onEditorMount?.(editor)
  }

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

      {/* Remote cursor indicators — overlay badges */}
      {connectedUsers.filter(u => u.cursor_line !== null).map((u, i) => (
        <div
          key={u.user_id}
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
          L{u.cursor_line} · {u.user_id.slice(0, 6)}
        </div>
      ))}
    </div>
  )
}
