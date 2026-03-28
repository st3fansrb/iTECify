/**
 * useSharedTerminal — broadcasts terminal output to all users in the same project room.
 *
 * Usage (în TerminalOutput.tsx — Membrul 1 se ocupă de UI):
 *   const { outputs, broadcast } = useSharedTerminal(projectId)
 *
 *   // Când user-ul apasă "Run":
 *   broadcast({ userId, displayName, avatarColor, type: 'command', content: 'python main.py', timestamp: new Date().toISOString() })
 *
 *   // Pe fiecare chunk SSE de la backend:
 *   broadcast({ userId, displayName, avatarColor, type: 'stdout', content: chunk, timestamp: new Date().toISOString() })
 *
 *   // Output-ul apare la toți userii subscribed, prefixat cu [displayName] în avatarColor.
 */

import { useState, useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase from '../lib/supabase'

export type TerminalEntryType = 'command' | 'stdout' | 'stderr' | 'exit'

export interface TerminalEntry {
  userId: string
  displayName: string
  avatarColor: string
  type: TerminalEntryType
  content: string
  timestamp: string
}

export interface UseSharedTerminalReturn {
  outputs: TerminalEntry[]
  broadcast: (entry: TerminalEntry) => void
  clearOutputs: () => void
}

export function useSharedTerminal(projectId: string): UseSharedTerminalReturn {
  const [outputs, setOutputs] = useState<TerminalEntry[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`terminal-${projectId}`)
      .on<TerminalEntry>('broadcast', { event: 'terminal-output' }, ({ payload }) => {
        setOutputs((prev) => [...prev, payload])
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [projectId])

  const broadcast = (entry: TerminalEntry) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'terminal-output',
      payload: entry,
    })
  }

  const clearOutputs = () => setOutputs([])

  return { outputs, broadcast, clearOutputs }
}
