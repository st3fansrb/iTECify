/**
 * TimeTravel — Time-Travel Debugging Slider
 * Loads file snapshots via useFileHistory and lets the user scrub through versions.
 * While active, the editor shows the snapshot content in read-only mode.
 */

import { useState, useEffect } from 'react'
import { useFileHistory } from '../hooks/useFileHistory'

interface TimeTravelProps {
  fileId: string
  /** Called with snapshot content when user drags slider (null = exit time-travel mode) */
  onPreview: (content: string | null) => void
  /** Called when user clicks "Restore This Version" */
  onRestore: (content: string) => void
}

function formatTs(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function TimeTravel({ fileId, onPreview, onRestore }: TimeTravelProps) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const { entries, loading, fetchHistory } = useFileHistory(fileId)

  // Fetch history when panel opens
  useEffect(() => {
    if (open) {
      fetchHistory().then(() => setIndex(0))
    }
  }, [open, fetchHistory])

  // Propagate preview whenever index or entries change (while open)
  useEffect(() => {
    if (!open || entries.length === 0) return
    onPreview(entries[index]?.content ?? null)
  }, [open, index, entries, onPreview])

  const handleOpen = () => setOpen(true)

  const handleClose = () => {
    setOpen(false)
    onPreview(null)
  }

  const handleRestore = () => {
    const content = entries[index]?.content
    if (!content) return
    onRestore(content)
    handleClose()
  }

  const current = entries[index]

  return (
    <>
      {/* Toggle button — always visible above terminal */}
      {!open && (
        <button
          onClick={handleOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '11px',
            fontFamily: 'monospace',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            letterSpacing: '0.06em',
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f9a8d4'
            e.currentTarget.style.background = 'rgba(249,168,212,0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
            e.currentTarget.style.background = 'rgba(0,0,0,0.35)'
          }}
        >
          🕐 Time-Travel Debugging
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div style={{
          background: 'rgba(5,2,14,0.95)',
          borderTop: '1px solid rgba(249,168,212,0.2)',
          borderBottom: '1px solid rgba(249,168,212,0.15)',
          padding: '12px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          animation: 'tt-slide-in 0.2s ease both',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(249,168,212,0.7)', letterSpacing: '0.12em' }}>
              🕐 TIME-TRAVEL MODE
            </span>
            {loading && (
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>
                loading snapshots…
              </span>
            )}
            {!loading && entries.length === 0 && (
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>
                no snapshots yet
              </span>
            )}
            {!loading && entries.length > 0 && (
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>
                {entries.length} snapshot{entries.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Slider */}
          {entries.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                type="range"
                min={0}
                max={entries.length - 1}
                value={index}
                onChange={e => setIndex(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#f472b6',
                  cursor: 'pointer',
                  height: '4px',
                }}
              />
              {/* Tick labels: newest ←→ oldest */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)' }}>
                <span>newest</span>
                <span>oldest</span>
              </div>
            </div>
          )}

          {/* Timestamp */}
          {current && (
            <div style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.55)',
              background: 'rgba(249,168,212,0.06)',
              border: '1px solid rgba(249,168,212,0.12)',
              borderRadius: '6px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ color: '#f9a8d4', fontSize: '11px' }}>saved_at</span>
              <span>{formatTs(current.saved_at)}</span>
              {current.saved_by && (
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginLeft: 'auto' }}>
                  by {current.saved_by.slice(0, 8)}
                </span>
              )}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRestore}
              disabled={!current}
              style={{
                padding: '7px 18px',
                background: current ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${current ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                color: current ? '#34d399' : 'rgba(255,255,255,0.2)',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'monospace',
                cursor: current ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (current) { e.currentTarget.style.background = 'rgba(52,211,153,0.25)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(52,211,153,0.2)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = current ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              ✓ Restore This Version
            </button>

            <button
              onClick={handleClose}
              style={{
                padding: '7px 18px',
                background: 'rgba(249,168,212,0.12)',
                border: '1px solid rgba(249,168,212,0.3)',
                borderRadius: '8px',
                color: '#f9a8d4',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'monospace',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,168,212,0.22)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,168,212,0.12)' }}
            >
              ✕ Exit
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tt-slide-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type='range']::-webkit-slider-thumb {
          width: 14px;
          height: 14px;
          background: #f472b6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(244,114,182,0.5);
        }
        input[type='range']::-webkit-slider-runnable-track {
          background: rgba(249,168,212,0.2);
          border-radius: 2px;
        }
      `}</style>
    </>
  )
}
