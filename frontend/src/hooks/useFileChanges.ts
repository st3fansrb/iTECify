/**
 * useFileChanges — tracks which project files were modified by a teammate
 * while you were not viewing them (shows a dot indicator on the file tab).
 *
 * Subscribes to postgres_changes UPDATE on each file in the project via a
 * single Supabase channel with one filter per file.
 *
 * Usage:
 *   const modifiedFiles = useFileChanges(fileNameToIdMap, activeFile)
 *   // modifiedFiles is a Set<string> of file names with unseen changes.
 */

import { useState, useEffect, useRef } from 'react'
import supabase from '../lib/supabase'

export function useFileChanges(
  fileNameToId: Record<string, string>,
  activeFile: string,
): Set<string> {
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set())
  const activeFileRef = useRef(activeFile)

  // Keep ref in sync and clear mark when switching to a file.
  useEffect(() => {
    activeFileRef.current = activeFile
    setModifiedFiles(prev => {
      if (!prev.has(activeFile)) return prev
      const next = new Set(prev)
      next.delete(activeFile)
      return next
    })
  }, [activeFile])

  useEffect(() => {
    const entries = Object.entries(fileNameToId)
    if (entries.length === 0) return

    const channelKey = entries.map(([, id]) => id).sort().join('|')
    const channel = supabase.channel(`file-changes:${channelKey}`)

    for (const [name, id] of entries) {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'files', filter: `id=eq.${id}` },
        () => {
          if (name === activeFileRef.current) return
          setModifiedFiles(prev => {
            const next = new Set(prev)
            next.add(name)
            return next
          })
        }
      )
    }

    channel.subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [JSON.stringify(fileNameToId)]) // eslint-disable-line react-hooks/exhaustive-deps

  return modifiedFiles
}
