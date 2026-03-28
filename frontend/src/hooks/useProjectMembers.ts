import { useState, useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase from '../lib/supabase'

export interface ProjectMember {
  userId: string
  displayName: string | null
  avatarColor: string | null
  role: 'owner' | 'member'
}

export function useProjectMembers(projectId: string): ProjectMember[] {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!projectId) return

    const fetchMembers = async () => {
      const { data: memberRows, error } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId)

      if (error || !memberRows) {
        console.error('[useProjectMembers]', error)
        return
      }

      const userIds = memberRows.map(r => r.user_id)
      if (userIds.length === 0) { setMembers([]); return }

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_color')
        .in('id', userIds)

      const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))

      setMembers(
        memberRows.map(row => {
          const profile = profileMap.get(row.user_id)
          return {
            userId: row.user_id,
            displayName: profile?.display_name ?? null,
            avatarColor: profile?.avatar_color ?? null,
            role: row.role as 'owner' | 'member',
          }
        })
      )
    }

    void fetchMembers()

    // Realtime — re-fetch when project_members changes
    const channel = supabase
      .channel(`project-members-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` },
        () => { void fetchMembers() }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [projectId])

  return members
}
