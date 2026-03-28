/**
 * useFileHistory — loads and saves code snapshots for a single file.
 *
 * Usage:
 *   const { entries, loading, fetchHistory, saveSnapshot } = useFileHistory(fileId)
 *   // Call fetchHistory() to load; saveSnapshot(content, userId) to persist.
 */

import { useState, useCallback } from 'react'
import supabase from '../lib/supabase'
import type { FileHistoryEntry } from '../lib/supabase'

export type { FileHistoryEntry }

export function useFileHistory(fileId: string) {
  const [entries, setEntries] = useState<FileHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!fileId) return
    setLoading(true)
    const { data } = await supabase
      .from('file_history')
      .select('id, file_id, content, saved_by, saved_at')
      .eq('file_id', fileId)
      .order('saved_at', { ascending: false })
      .limit(20)
    setEntries(data ?? [])
    setLoading(false)
  }, [fileId])

  const saveSnapshot = useCallback(async (content: string, userId: string | null) => {
    if (!fileId || !content.trim()) return
    await supabase.from('file_history').insert({
      file_id: fileId,
      content,
      saved_by: userId ?? undefined,
    })
  }, [fileId])

  return { entries, loading, fetchHistory, saveSnapshot }
}
