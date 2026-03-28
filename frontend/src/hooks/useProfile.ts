/**
 * useProfile — fetches and updates a user's display profile.
 *
 * Uses a module-level cache so multiple UserDot components sharing
 * the same userId don't fire duplicate Supabase requests.
 *
 * Usage:
 *   const { profile, updateDisplayName } = useProfile(user?.id ?? null)
 */

import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase'
import type { Profile } from '../lib/supabase'

export type { Profile }

// Module-level cache — survives re-renders, cleared on page reload.
const cache = new Map<string, Profile>()

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(
    userId ? (cache.get(userId) ?? null) : null
  )

  useEffect(() => {
    if (!userId) return
    if (cache.has(userId)) {
      setProfile(cache.get(userId)!)
      return
    }
    supabase
      .from('profiles')
      .select('id, display_name, avatar_color, updated_at')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          cache.set(userId, data)
          setProfile(data)
        }
      })
  }, [userId])

  const updateDisplayName = useCallback(async (name: string) => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: name.trim(), updated_at: new Date().toISOString() })
      .select('id, display_name, avatar_color, updated_at')
      .single()
    if (data) {
      cache.set(userId, data)
      setProfile(data)
    }
  }, [userId])

  return { profile, updateDisplayName }
}
