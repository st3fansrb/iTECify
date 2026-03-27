import Editor from '@monaco-editor/react'

interface CodeEditorProps {
  language: string
  value: string
  onChange: (value: string) => void
}

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  return (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(val) => onChange(val ?? '')}
        onMount={(editor, monaco) => {
          monaco.editor.defineTheme('itecify', {
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
          monaco.editor.setTheme('itecify')
        }}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          padding: { top: 16 },
        }}
      />
    </div>
  )
}
