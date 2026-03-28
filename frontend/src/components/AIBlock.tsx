/**
 * AIBlock — floating AI assistant panel for the editor.
 * Sends selected code + a prompt to /api/ai and streams the response.
 * Collapsed to a small button by default; expands on click.
 */

import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
// @ts-ignore — TriqBot is a .jsx component without type declarations
import TriqBot from './TriqBot'

interface AIBlockProps {
  /** Currently visible code in the editor — used as context for AI. */
  currentCode: string
  language: string
}

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function AIBlock({ currentCode, language }: AIBlockProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { session } = useAuth()

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const prompt = input.trim()
    if (!prompt || loading) return

    setInput('')
    const userMsg: Message = { role: 'user', text: prompt }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    scrollToBottom()

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ prompt, code: currentCode, language }),
      })
      const data = await res.json()
      const reply = data.generatedCode ?? data.error ?? 'No response from AI.'
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Could not reach AI backend.' }])
    } finally {
      setLoading(false)
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, loading, currentCode, language])

  return (
    <>
      {/* Toggle button — TriqBot avatar (fixed position) */}
      <div
        style={{
          position: 'fixed',
          right: '32px',
          top: '62vh',
          transform: 'translateY(-50%)',
          zIndex: 200,
        }}
      >
        <TriqBot onClick={() => setOpen(o => !o)} />
      </div>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '240px',
          right: '24px',
          zIndex: 199,
          width: '320px',
          height: '420px',
          background: 'rgba(10,5,30,0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(249,168,212,0.25)',
          borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(244,114,182,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'ai-slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(249,168,212,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.3)',
            flexShrink: 0,
            position: 'relative',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(249,168,212,0.5)', letterSpacing: '0.12em', fontFamily: 'monospace' }}>
              ✦ AI ASSISTANT
            </span>
            <span style={{
              marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.2)',
              fontFamily: 'monospace', marginRight: '18px',
            }}>
              {language}
            </span>
            <button
              onClick={() => setOpen(false)}
              title="Close"
              style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                width: '14px',
                height: '14px',
                fontSize: '10px',
                padding: '2px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                borderRadius: '3px',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f9a8d4' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(249,168,212,0.2) transparent',
          }}>
            {messages.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center', marginTop: '40px' }}>
                Ask anything about your code…
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user'
                  ? 'rgba(249,168,212,0.15)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${m.role === 'user' ? 'rgba(249,168,212,0.25)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '8px 12px',
                fontSize: '12px',
                lineHeight: 1.6,
                color: m.role === 'user' ? '#f9a8d4' : 'rgba(220,220,230,0.85)',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                color: 'rgba(249,168,212,0.5)',
                fontSize: '12px',
                fontFamily: 'monospace',
                animation: 'ai-dots 1.2s steps(3,end) infinite',
              }}>
                thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '8px 12px',
              borderTop: '1px solid rgba(249,168,212,0.1)',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask the AI…"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f9a8d4',
                fontSize: '12px',
                fontFamily: 'monospace',
                caretColor: '#f472b6',
                opacity: loading ? 0.5 : 1,
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: 'rgba(249,168,212,0.15)',
                border: '1px solid rgba(249,168,212,0.3)',
                borderRadius: '6px',
                color: '#f9a8d4',
                fontSize: '11px',
                padding: '4px 10px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
                opacity: loading || !input.trim() ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              send
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes ai-slide-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes ai-dots {
          0%   { content: 'thinking'; }
          33%  { content: 'thinking.'; }
          66%  { content: 'thinking..'; }
          100% { content: 'thinking...'; }
        }
        @keyframes ai-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(244,114,182,0.5), 0 4px 24px rgba(168,85,247,0.4); }
          50%       { box-shadow: 0 0 36px rgba(244,114,182,0.85), 0 4px 32px rgba(168,85,247,0.7); }
        }
        .ai-pulse { animation: ai-pulse 2s ease-in-out infinite; }
      `}</style>
    </>
  )
}
