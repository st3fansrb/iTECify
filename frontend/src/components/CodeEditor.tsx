import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monacoType from 'monaco-editor'
import { useRef, useEffect } from 'react'
import type { ConnectedUser, CursorPosition } from '../hooks/useRealtimeEditor'

interface CodeEditorProps {
  language: string
  value: string
  onChange: (value: string) => void
  onEditorMount?: (editor: monacoType.editor.IStandaloneCodeEditor) => void
  connectedUsers?: ConnectedUser[]
  remoteCursors?: ConnectedUser[]
  activeFileId?: string
  onCursorChange?: (cursor: CursorPosition | null) => void
  readOnly?: boolean
  currentUserId?: string | null
}

const FALLBACK_COLORS = ['#f472b6', '#818cf8', '#34d399', '#fb923c', '#38bdf8']

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(244,114,182,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

export default function CodeEditor({
  language, value, onChange, onEditorMount,
  connectedUsers = [], onCursorChange, readOnly = false, currentUserId,
}: CodeEditorProps) {
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monacoType | null>(null)
  const decorationIdsRef = useRef<string[]>([])
  const widgetListRef = useRef<monacoType.editor.IContentWidget[]>([])
  const styleTagRef = useRef<HTMLStyleElement | null>(null)

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

  // ── Remote cursor decorations + ContentWidgets ────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    // Remove old widgets
    widgetListRef.current.forEach(w => {
      try { editor.removeContentWidget(w) } catch (_) {}
    })
    widgetListRef.current = []

    // Remote users with a known cursor, excluding self
    const remote = connectedUsers.filter(
      u => u.cursor !== null && u.userId !== currentUserId
    )
    console.log('remoteCursors:', remote)

    // Build CSS for line backgrounds and inject into <head>
    const css = remote.map((u, i) => {
      const color = u.avatarColor ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
      const safeId = u.userId.replace(/[^a-zA-Z0-9]/g, '')
      return `.rcursor-${safeId} { background-color: ${hexToRgba(color, 0.18)} !important; border-left: 3px solid ${color} !important; }`
    }).join('\n')

    if (!styleTagRef.current) {
      styleTagRef.current = document.createElement('style')
      styleTagRef.current.id = 'itecify-remote-cursors'
      document.head.appendChild(styleTagRef.current)
    }
    styleTagRef.current.textContent = css

    // Apply line decorations
    const decorations: monacoType.editor.IModelDeltaDecoration[] = remote.map((u, i) => {
      const color = u.avatarColor ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
      const safeId = u.userId.replace(/[^a-zA-Z0-9]/g, '')
      const lineNumber = u.cursor!.lineNumber
      return {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: `rcursor-${safeId}`,
          overviewRulerColor: color,
          overviewRulerLane: monaco.editor.OverviewRulerLane.Right,
        },
      }
    })
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations)

    // Add username label widgets above each cursor line
    remote.forEach((u, i) => {
      const color = u.avatarColor ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
      const label = u.displayName ?? u.userId.slice(0, 6)
      const { lineNumber, column } = u.cursor!

      const dom = document.createElement('div')
      dom.style.cssText = [
        `background:${color}`,
        'color:#0f0c29',
        'font-size:10px',
        'font-weight:700',
        'font-family:JetBrains Mono,Fira Code,monospace',
        'padding:1px 7px',
        'border-radius:3px',
        'pointer-events:none',
        'white-space:nowrap',
        'user-select:none',
        'line-height:16px',
        'opacity:0.92',
        'margin-bottom:1px',
        'display:inline-block',
      ].join(';')
      dom.textContent = label

      const widget: monacoType.editor.IContentWidget = {
        getId: () => `rcursor-widget-${u.userId}`,
        getDomNode: () => dom,
        getPosition: () => ({
          position: { lineNumber, column },
          preference: [
            monaco.editor.ContentWidgetPositionPreference.ABOVE,
            monaco.editor.ContentWidgetPositionPreference.BELOW,
          ],
        }),
      }

      editor.addContentWidget(widget)
      widgetListRef.current.push(widget)
    })
  }, [connectedUsers, currentUserId])

  // Clean up style tag + widgets + decorations on unmount
  useEffect(() => {
    return () => {
      const editor = editorRef.current
      if (editor) {
        widgetListRef.current.forEach(w => { try { editor.removeContentWidget(w) } catch (_) {} })
        editor.deltaDecorations(decorationIdsRef.current, [])
      }
      styleTagRef.current?.remove()
      styleTagRef.current = null
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
          tabSize: 4,
          detectIndentation: false,
          autoIndent: 'keep',
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          padding: { top: 16 },
          stickyScroll: { enabled: false },
          readOnly,
        }}
      />
    </div>
  )
}
