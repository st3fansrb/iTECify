/**
 * useRealtimeEditor — syncs file content + broadcasts cursors in real time.
 *
 * Cursor strategy: Broadcast (instant WebSocket, no throttle) instead of Presence.
 * Presence is kept only for join/leave (displayName, avatarColor).
 * This fixes the "cursor stuck at first position" bug caused by Presence throttling.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '../lib/supabase'

const DEBOUNCE_MS = 150

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
  activeFileId: string | null
}

type CursorBroadcast = {
  userId: string
  cursor: CursorPosition | null
  activeFileId: string
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
    activeFileId: fileId,
  })
  // Cursor positions received via Broadcast — keyed by userId
  const cursorMapRef = useRef<Map<string, CursorPosition | null>>(new Map())
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

  // ── 2. Realtime channel ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const channelName = projectId ? `project-${projectId}` : `file-${fileId}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: '' } },
    })
    channelRef.current = channel

    // ── File content changes (postgres) ──
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'files', ...(projectId ? { filter: `project_id=eq.${projectId}` } : { filter: `id=eq.${fileId}` }) },
      (payload) => {
        const updated = payload.new as { id: string; content: string; updated_by: string | null }
        if (updated.id !== fileId) return
        if (updated.updated_by === currentUserIdRef.current) return
        setCode(updated.content ?? '')
      }
    )

    // ── Cursor positions via Broadcast (instant, no throttle) ──
    channel.on('broadcast', { event: 'cursor' }, ({ payload }: { payload: CursorBroadcast }) => {
      if (cancelled || payload.userId === currentUserIdRef.current) return
      cursorMapRef.current.set(payload.userId, payload.cursor)
      // Merge cursor into connectedUsers state
      setConnectedUsers(prev => prev.map(u =>
        u.userId === payload.userId ? { ...u, cursor: payload.cursor, activeFileId: payload.activeFileId } : u
      ))
    })

    // ── Presence: join/leave only (displayName, avatarColor) ──
    channel.on('presence', { event: 'sync' }, () => {
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
          // Merge cursor from broadcast map if available
          cursor: cursorMapRef.current.get(p.userId) ?? null,
          activeFileId: p.activeFileId ?? null,
        }))
      setConnectedUsers(users)
    })

    channel.subscribe(async (status) => {
      if (cancelled) return
      if (status === 'SUBSCRIBED') {
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

  // ── 3. updateCursor — via Broadcast (instant) ────────────────────────────────
  const updateCursor = useCallback((cursor: CursorPosition | null) => {
    const channel = channelRef.current
    const uid = currentUserIdRef.current
    if (!channel || !uid) return
    void channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { userId: uid, cursor, activeFileId: fileId } satisfies CursorBroadcast,
    })
  }, [fileId])

  // ── 4. updateCode — debounced DB write ───────────────────────────────────────
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
