import { useState, useEffect } from 'react'
import supabase from '../lib/supabase'

export interface ProjectMember {
  userId: string
  displayName: string | null
  avatarColor: string | null
  role: 'owner' | 'member'
}

export function useProjectMembers(projectId: string): ProjectMember[] {
  const [members, setMembers] = useState<ProjectMember[]>([])

  useEffect(() => {
    if (!projectId) return

    const fetchMembers = async () => {
      // Step 1: fetch members
      const { data: memberRows, error } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId)

      if (error || !memberRows) {
        console.error('[useProjectMembers]', error)
        return
      }

      // Step 2: fetch profiles for those users
      const userIds = memberRows.map(r => r.user_id)
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
            role: row.role,
          }
        })
      )
    }

    void fetchMembers()
  }, [projectId])

  return members
}
