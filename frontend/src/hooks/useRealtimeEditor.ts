/**
 * useRealtimeEditor — syncs a single file's content in real time between all editors
 * in the same project room.
 *
 * Usage (in Membru 1's CodeEditor wrapper):
 *   const { code, updateCode, updateCursor, loading, isSaving, connectedUsers } =
 *     useRealtimeEditor({ projectId, fileId, initialContent })
 *   <Editor value={code} onChange={(v) => updateCode(v ?? '')} />
 *
 * Strategy:
 *   - Fetches latest content from `files` table on mount.
 *   - Subscribes to `postgres_changes` on `files` filtered by `project_id=eq.{projectId}`.
 *   - Remote changes for THIS file applied only if `updated_by` !== current user (no echo).
 *   - Local changes are debounced 500 ms before writing to DB (no write storm).
 *   - Presence per project-channel exposes `connectedUsers` with cursor + active file.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '../lib/supabase'

const DEBOUNCE_MS = 150

export interface UseRealtimeEditorOptions {
  projectId?: string
  fileId: string
  /** Used as the initial code value while the DB fetch is in flight. */
  initialContent: string
}

export interface CursorPosition {
  lineNumber: number
  column: number
}

export interface ConnectedUser {
  userId: string
  displayName: string | null
  avatarColor: string | null
  /** Monaco cursor position (1-based), null if not reported. */
  cursor: CursorPosition | null
  activeFileId: string | null
}

export interface UseRealtimeEditorReturn {
  code: string
  updateCode: (newContent: string) => void
  /** Call with the current Monaco cursor position to broadcast to teammates. */
  updateCursor: (cursor: CursorPosition | null) => void
  loading: boolean
  /** True during the 500ms debounce + DB write. */
  isSaving: boolean
  /** Everyone currently in this project room, with cursor + active file. */
  connectedUsers: ConnectedUser[]
  /** Same as connectedUsers — use in CodeEditor for remote cursor rendering. */
  remoteCursors: ConnectedUser[]
}

type PresencePayload = {
  userId: string
  displayName: string | null
  avatarColor: string | null
  cursor: CursorPosition | null
  activeFileId: string | null
}

export function useRealtimeEditor({
  projectId,
  fileId,
  initialContent,
}: UseRealtimeEditorOptions): UseRealtimeEditorReturn {
  const [code, setCode] = useState(initialContent)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])

  const currentUserIdRef = useRef<string | null>(null)
  const presenceRef = useRef<Omit<PresencePayload, 'userId'>>({
    displayName: null,
    avatarColor: null,
    cursor: null,
    activeFileId: fileId,
  })
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

    return () => { cancelled = true }
  }, [fileId])

  // ── 2. Realtime channel: postgres_changes + presence ─────────────────────────
  useEffect(() => {
    let cancelled = false
    const channelName = projectId ? `project-${projectId}` : `file-${fileId}`
    const channel = supabase.channel(channelName)
    channelRef.current = channel

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files', ...(projectId ? { filter: `project_id=eq.${projectId}` } : { filter: `id=eq.${fileId}` }) },
        (payload) => {
          const updated = payload.new as { id: string; content: string; updated_by: string | null }
          if (updated.id !== fileId) return
          if (updated.updated_by === currentUserIdRef.current) return
          setCode(updated.content ?? '')
        }
      )
      .on('presence', { event: 'sync' }, () => {
        if (cancelled) return
        const uid = currentUserIdRef.current
        const state = channel.presenceState<PresencePayload>()
        const seen = new Set<string>()
        const users: ConnectedUser[] = Object.values(state)
          .flat()
          .filter((p) => {
            if (!p.userId || p.userId === uid || seen.has(p.userId)) return false
            seen.add(p.userId)
            return true
          })
          .map((p) => ({
            userId: p.userId,
            displayName: p.displayName ?? null,
            avatarColor: p.avatarColor ?? null,
            cursor: p.cursor ?? null,
            activeFileId: p.activeFileId ?? null,
          }))
        setConnectedUsers(users)
      })
      .subscribe(async (status) => {
        if (cancelled) return
        if (status === 'SUBSCRIBED') {
          // Fetch user + profile only after channel is ready
          const { data: { user } } = await supabase.auth.getUser()
          const uid = user?.id ?? null
          currentUserIdRef.current = uid
          if (uid) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_color')
              .eq('id', uid)
              .maybeSingle()
            if (profile) {
              presenceRef.current.displayName = profile.display_name
              presenceRef.current.avatarColor = profile.avatar_color
            }
            await channel.track({ userId: uid, ...presenceRef.current, activeFileId: fileId })
          }
        }
        // Auto-reconnect on error
        if (status === 'CHANNEL_ERROR' && !cancelled) {
          setTimeout(() => void supabase.removeChannel(channel), 2000)
        }
      })

    return () => {
      cancelled = true
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [projectId, fileId])

  // ── 3. updateCursor — broadcast cursor position to teammates ─────────────────
  const updateCursor = useCallback((cursor: CursorPosition | null) => {
    const channel = channelRef.current
    const uid = currentUserIdRef.current
    if (!channel || !uid) return
    presenceRef.current.cursor = cursor
    void channel.track({ userId: uid, ...presenceRef.current, activeFileId: fileId })
  }, [fileId])

  // ── 4. updateCode — called by Monaco on every keystroke ──────────────────────
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

  return { code, updateCode, updateCursor, loading, isSaving, connectedUsers, remoteCursors: connectedUsers }
}
