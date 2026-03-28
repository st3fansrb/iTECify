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
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          profiles (
            display_name,
            avatar_color
          )
        `)
        .eq('project_id', projectId)

      if (error || !data) return

      setMembers(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((row: any) => ({
          userId: row.user_id,
          displayName: row.profiles?.display_name ?? null,
          avatarColor: row.profiles?.avatar_color ?? null,
          role: row.role,
        }))
      )
    }

    void fetchMembers()
  }, [projectId])

  return members
}
