/**
 * useRealtimeEditor — syncs a single file's content in real time between all editors.
 *
 * Usage (in Membru 1's CodeEditor wrapper):
 *   const { code, updateCode, loading, connectedUsers } = useRealtimeEditor({ fileId, initialContent })
 *   <Editor value={code} onChange={(v) => updateCode(v ?? '')} />
 *
 * Strategy:
 *   - Fetches latest content from `files` table on mount.
 *   - Subscribes to `postgres_changes` on the `files` table filtered by `id=eq.{fileId}`.
 *   - Remote changes are applied only if `updated_by` !== current user (no echo).
 *   - Local changes are debounced 500 ms before writing to DB (no write storm).
 *   - Presence tracking on the same channel exposes `connectedUsers` (array of user IDs).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '../lib/supabase'

const DEBOUNCE_MS = 500

export interface UseRealtimeEditorOptions {
  fileId: string
  /** Used as the initial code value while the DB fetch is in flight. */
  initialContent: string
}

export interface UseRealtimeEditorReturn {
  code: string
  updateCode: (newContent: string) => void
  loading: boolean
  /** True în intervalul de 500ms debounce + cât durează write-ul în DB. */
  isSaving: boolean
  /** Supabase user IDs of everyone currently viewing this file. */
  connectedUsers: string[]
}

type PresencePayload = { user_id: string }

export function useRealtimeEditor({
  fileId,
  initialContent,
}: UseRealtimeEditorOptions): UseRealtimeEditorReturn {
  const [code, setCode] = useState(initialContent)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<string[]>([])

  const currentUserIdRef = useRef<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── 1. Fetch latest content from DB ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase
      .from('files')
      .select('content')
      .eq('id', fileId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) setCode(data.content ?? '')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fileId])

  // ── 2. Realtime channel: postgres_changes + presence ─────────────────────────
  useEffect(() => {
    let channelToClean: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      currentUserIdRef.current = uid

      const channel = supabase.channel(`file:${fileId}`)
      channelToClean = channel
      channelRef.current = channel

      channel
        // Listen for UPDATE events on this specific file row.
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'files', filter: `id=eq.${fileId}` },
          (payload) => {
            const updated = payload.new as { content: string; updated_by: string | null }
            // Ignore our own writes — we already have the latest state locally.
            if (updated.updated_by === currentUserIdRef.current) return
            setCode(updated.content ?? '')
          }
        )
        // Track who else is viewing this file.
        .on<PresencePayload>('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresencePayload>()
          const users = Object.values(state).flat().map((p) => p.user_id)
          setConnectedUsers(users)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && uid) {
            await channel.track({ user_id: uid })
          }
        })
    }

    void setup()

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (channelToClean) void supabase.removeChannel(channelToClean)
      channelRef.current = null
    }
  }, [fileId])

  // ── 3. updateCode — called by Monaco on every keystroke ──────────────────────
  const updateCode = useCallback(
    (newContent: string) => {
      setCode(newContent)

      setIsSaving(true)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        void supabase
          .from('files')
          .update({
            content: newContent,
            updated_by: currentUserIdRef.current,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fileId)
          .then(({ error }) => {
            setIsSaving(false)
            if (error) console.error('[useRealtimeEditor] DB update failed:', error)
          })
      }, DEBOUNCE_MS)
    },
    [fileId]
  )

  return { code, updateCode, loading, isSaving, connectedUsers }
}
