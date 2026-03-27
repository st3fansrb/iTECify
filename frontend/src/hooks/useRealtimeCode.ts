/**
 * useRealtimeCode — the main collaboration hook.
 *
 * Usage (in Membru 1's Monaco wrapper):
 *   const { code, loading, error, onCodeChange } = useRealtimeCode({ sessionId, userId })
 *   <Editor value={code} onChange={(v) => onCodeChange(v ?? '')} />
 *
 * Strategy:
 *   - Initial code loaded from Supabase DB (getSession).
 *   - Live changes broadcast via Supabase Realtime channel (low-latency WebSocket).
 *   - DB write is debounced (2 s) so we don't hammer the DB on every keystroke.
 *   - self: false → we don't receive our own broadcasts back (no echo).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getSession, updateSessionCode } from '../lib/sessionApi'

const PERSIST_DEBOUNCE_MS = 2000

// Shape of the broadcast payload sent over the realtime channel.
type CodeChangeBroadcast = { userId: string; code: string }

export interface UseRealtimeCodeOptions {
  sessionId: string
  /** Supabase user.id — used to ignore echoed broadcasts from self. */
  userId: string
}

export interface UseRealtimeCodeReturn {
  code: string
  loading: boolean
  error: string | null
  /**
   * Call this from Monaco's onChange handler.
   * Broadcasts to peers and debounces a DB write — do NOT debounce before calling.
   */
  onCodeChange: (newCode: string) => void
}

export function useRealtimeCode({
  sessionId,
  userId,
}: UseRealtimeCodeOptions): UseRealtimeCodeReturn {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mutable refs — stable across re-renders, no subscription churn.
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 1. Load initial code from DB ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getSession(sessionId)
      .then((session) => {
        if (cancelled) return
        setCode(session.code)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load session')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId])

  // ── 2. Subscribe to realtime broadcast channel ───────────────────────────────
  useEffect(() => {
    const channel = supabase.channel(`session:${sessionId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on<CodeChangeBroadcast>(
        'broadcast',
        { event: 'code_change' },
        ({ payload }) => {
          // Belt-and-suspenders guard (self:false already filters, but RLS edge cases exist).
          if (payload.userId === userId) return
          setCode(payload.code)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [sessionId, userId])

  // ── 3. onCodeChange — called by Monaco on every edit ────────────────────────
  const onCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode)

      // Broadcast to all peers immediately (WebSocket, sub-100ms).
      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'code_change',
          payload: { userId, code: newCode } satisfies CodeChangeBroadcast,
        })
      }

      // Persist to DB after user pauses typing (avoids write storm).
      if (persistTimer.current) clearTimeout(persistTimer.current)
      persistTimer.current = setTimeout(() => {
        void updateSessionCode(sessionId, newCode).catch((err: unknown) => {
          console.error('[useRealtimeCode] DB persist failed:', err)
        })
      }, PERSIST_DEBOUNCE_MS)
    },
    [sessionId, userId]
  )

  return { code, loading, error, onCodeChange }
}
