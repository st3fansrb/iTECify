/**
 * useRealtimeEditor — syncs a single file's content in real time between all editors
 * in the same project room.
 *
 * Strategy:
 *   - Fetches latest content from `files` table on mount.
 *   - Local changes are broadcast instantly via Supabase Broadcast (<100ms peer-to-peer).
 *   - DB write is debounced 1000ms for persistence only (not for live sync).
 *   - postgres_changes acts as fallback for late-joining users.
 *   - Presence per project-channel exposes `connectedUsers` with cursor + active file.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '../lib/supabase'

const DB_DEBOUNCE_MS = 1000

export interface UseRealtimeEditorOptions {
  projectId?: string
  fileId: string
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
  cursor: CursorPosition | null
  activeFileId: string | null
}

export interface UseRealtimeEditorReturn {
  code: string
  updateCode: (newContent: string) => void
  updateCursor: (cursor: CursorPosition | null) => void
  loading: boolean
  isSaving: boolean
  connectedUsers: ConnectedUser[]
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
  const dbDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // ── 2. Realtime channel: broadcast + postgres_changes fallback + presence ─────
  useEffect(() => {
    let channelToClean: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
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
      }

      const channel = supabase.channel(projectId ? `project-${projectId}` : `file-${fileId}`)
      channelToClean = channel
      channelRef.current = channel

      channel
        // ── Broadcast: instant peer-to-peer sync ──────────────────────────────
        .on('broadcast', { event: 'code-update' }, ({ payload }) => {
          if (payload.fileId !== fileId) return
          if (payload.userId === currentUserIdRef.current) return
          setCode(payload.content)
        })
        // ── postgres_changes: fallback for late-joining users ─────────────────
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'files',
            ...(projectId ? { filter: `project_id=eq.${projectId}` } : { filter: `id=eq.${fileId}` }),
          },
          (payload) => {
            const updated = payload.new as { id: string; content: string; updated_by: string | null }
            if (updated.id !== fileId) return
            // Only apply if we haven't already received this via broadcast
            if (updated.updated_by === currentUserIdRef.current) return
            setCode(updated.content ?? '')
          }
        )
        // ── Presence: who's in this room ──────────────────────────────────────
        .on('presence', { event: 'sync' }, () => {
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
          if (status === 'SUBSCRIBED' && uid) {
            await channel.track({
              userId: uid,
              ...presenceRef.current,
              activeFileId: fileId,
            })
          }
        })
    }

    void setup()

    return () => {
      if (dbDebounceTimer.current) clearTimeout(dbDebounceTimer.current)
      if (channelToClean) void supabase.removeChannel(channelToClean)
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

  // ── 4. updateCode — broadcast instantly, persist to DB with debounce ──────────
  const updateCode = useCallback(
    (newContent: string) => {
      setCode(newContent)
      setIsSaving(true)

      // Instant broadcast to all connected users (no DB round-trip)
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'code-update',
        payload: { fileId, content: newContent, userId: currentUserIdRef.current },
      })

      // DB write debounced for persistence
      if (dbDebounceTimer.current) clearTimeout(dbDebounceTimer.current)
      dbDebounceTimer.current = setTimeout(() => {
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
      }, DB_DEBOUNCE_MS)
    },
    [fileId]
  )

  return { code, updateCode, updateCursor, loading, isSaving, connectedUsers, remoteCursors: connectedUsers }
}
