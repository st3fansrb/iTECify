/**
 * useRealtimeEditor — syncs file content + broadcasts cursor presence.
 *
 * Presence strategy: pure Broadcast channel with event 'cursor'.
 * No Supabase Presence API (track/presenceState) — avoids CHANNEL_ERROR
 * caused by WebSocket issues with postgres_changes + presence on same channel.
 *
 * File sync: postgres_changes on 'files' table (requires Realtime enabled).
 * Cursors: channel.send({ type: 'broadcast', event: 'cursor', payload })
 *          channel.on('broadcast', { event: 'cursor' }, handler)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '../lib/supabase'

const DEBOUNCE_MS      = 500
const HEARTBEAT_MS     = 3000
const STALE_TIMEOUT_MS = 9000

export interface UseRealtimeEditorOptions {
  projectId?: string
  fileId: string
  fileName?: string
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

type CursorPayload = ConnectedUser & { action: 'update' | 'leave' }
type UserEntry     = ConnectedUser & { _lastSeen: number }

export function useRealtimeEditor({
  projectId,
  fileId,
  fileName,
  initialContent,
}: UseRealtimeEditorOptions): UseRealtimeEditorReturn {
  const [code, setCode]                     = useState(initialContent)
  const [loading, setLoading]               = useState(true)
  const [isSaving, setIsSaving]             = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])

  const currentUserIdRef = useRef<string | null>(null)
  const myDataRef        = useRef<Omit<CursorPayload, 'userId' | 'action'>>({
    displayName: null,
    avatarColor: null,
    cursor: null,
    activeFileId: fileId,
  })
  const debounceTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const staleTimer     = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const usersMap       = useRef<Map<string, UserEntry>>(new Map())

  const flushUsers = useCallback(() => {
    setConnectedUsers(
      Array.from(usersMap.current.values()).map(({ _lastSeen: _, ...u }) => u)
    )
  }, [])

  // ── 1. Fetch latest file content from DB ─────────────────────────────────────
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
    let channelToClean: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      currentUserIdRef.current = uid
      console.log('[useRealtimeEditor] init fileId:', fileId, 'uid:', uid)

      // Fetch display name + avatar color for presence payload
      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_color')
          .eq('id', uid)
          .maybeSingle()
        if (profile) {
          myDataRef.current.displayName = profile.display_name
          myDataRef.current.avatarColor = profile.avatar_color
        }
      }

      const channelName = projectId ? `project-${projectId}` : `file-${fileName ?? fileId}`

      // Pure broadcast channel — no Presence API, no postgres_changes config issues
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      })
      channelToClean    = channel
      channelRef.current = channel

      // ── All listeners BEFORE .subscribe() ───────────────────────────────────

      // 1. postgres_changes — file content sync (needs Realtime enabled on table)
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'files',
          ...(projectId
            ? { filter: `project_id=eq.${projectId}` }
            : { filter: `id=eq.${fileId}` }),
        },
        (payload) => {
          const updated = payload.new as { id: string; content: string; updated_by: string | null }
          if (updated.id !== fileId) return
          if (updated.updated_by === currentUserIdRef.current) return
          setCode(updated.content ?? '')
        }
      )

      // 2. broadcast 'cursor' — remote cursor / presence updates
      channel.on(
        'broadcast',
        { event: 'cursor' },
        ({ payload }: { payload: CursorPayload }) => {
          if (!payload?.userId || payload.userId === uid) return
          console.log('[useRealtimeEditor] cursor broadcast:', payload)

          if (payload.action === 'leave') {
            usersMap.current.delete(payload.userId)
          } else {
            usersMap.current.set(payload.userId, {
              userId:      payload.userId,
              displayName: payload.displayName,
              avatarColor: payload.avatarColor,
              cursor:      payload.cursor,
              activeFileId: payload.activeFileId,
              _lastSeen:   Date.now(),
            })
          }
          flushUsers()
        }
      )

      // 3. subscribe — only AFTER all listeners registered
      channel.subscribe((status) => {
        console.log('[useRealtimeEditor] channel status:', status)
        if (status !== 'SUBSCRIBED' || !uid) return

        console.log('[useRealtimeEditor] broadcasting join')

        // Announce presence to room
        void channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: { ...myDataRef.current, userId: uid, activeFileId: fileId, action: 'update' } satisfies CursorPayload,
        })

        // Heartbeat so late-joiners discover us
        heartbeatTimer.current = setInterval(() => {
          void channel.send({
            type: 'broadcast',
            event: 'cursor',
            payload: { ...myDataRef.current, userId: uid, activeFileId: fileId, action: 'update' } satisfies CursorPayload,
          })
        }, HEARTBEAT_MS)

        // Purge users with no heartbeat
        staleTimer.current = setInterval(() => {
          const now = Date.now()
          let changed = false
          for (const [key, entry] of usersMap.current.entries()) {
            if (now - entry._lastSeen > STALE_TIMEOUT_MS) {
              usersMap.current.delete(key)
              changed = true
            }
          }
          if (changed) flushUsers()
        }, HEARTBEAT_MS)
      })
    }

    void setup()

    return () => {
      const channel = channelRef.current
      const uid     = currentUserIdRef.current
      if (channel && uid) {
        void channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: { ...myDataRef.current, userId: uid, activeFileId: fileId, action: 'leave' } satisfies CursorPayload,
        })
      }
      if (debounceTimer.current)  clearTimeout(debounceTimer.current)
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
      if (staleTimer.current)     clearInterval(staleTimer.current)
      if (channelToClean)         void supabase.removeChannel(channelToClean)
      channelRef.current = null
      usersMap.current.clear()
    }
  }, [projectId, fileId, fileName, flushUsers])

  // ── 3. updateCursor — broadcast cursor on every position change ───────────────
  const updateCursor = useCallback((cursor: CursorPosition | null) => {
    const channel = channelRef.current
    const uid     = currentUserIdRef.current
    if (!channel || !uid) return
    myDataRef.current.cursor = cursor
    void channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { ...myDataRef.current, userId: uid, activeFileId: fileId, action: 'update' } satisfies CursorPayload,
    })
  }, [fileId])

  // ── 4. updateCode — debounced DB write on every keystroke ────────────────────
  const updateCode = useCallback((newContent: string) => {
    setCode(newContent)
    setIsSaving(true)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      void supabase
        .from('files')
        .update({
          content:    newContent,
          updated_by: currentUserIdRef.current,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .then(({ error }) => {
          setIsSaving(false)
          if (error) console.error('[useRealtimeEditor] DB write failed:', error)
        })
    }, DEBOUNCE_MS)
  }, [fileId])

  return { code, updateCode, updateCursor, loading, isSaving, connectedUsers, remoteCursors: connectedUsers }
}
