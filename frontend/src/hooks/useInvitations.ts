import { useState, useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase from '../lib/supabase'
import { acceptInvitation, rejectInvitation, type Invitation } from '../lib/sessionApi'

export interface UseInvitationsReturn {
  invitations: Invitation[]
  pendingCount: number
  accept: (invitationId: string) => Promise<void>
  reject: (invitationId: string) => Promise<void>
  loading: boolean
}

export function useInvitations(userEmail: string | undefined): UseInvitationsReturn {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userEmail) { setLoading(false); return }

    // Initial fetch — toate invitațiile pending
    const fetchInvitations = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invited_email', userEmail.toLowerCase())
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (!error && data) setInvitations(data as Invitation[])
      setLoading(false)
    }

    void fetchInvitations()

    // Realtime — invitație nouă primită
    const channel = supabase
      .channel(`invitations-${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'invitations',
          filter: `invited_email=eq.${userEmail.toLowerCase()}`,
        },
        (payload) => {
          setInvitations(prev => [payload.new as Invitation, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invitations',
          filter: `invited_email=eq.${userEmail.toLowerCase()}`,
        },
        (payload) => {
          // Scoate invitația din listă când nu mai e pending
          if (payload.new.status !== 'pending') {
            setInvitations(prev => prev.filter(inv => inv.id !== payload.new.id))
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userEmail])

  const accept = async (invitationId: string) => {
    await acceptInvitation(invitationId)
    setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
  }

  const reject = async (invitationId: string) => {
    await rejectInvitation(invitationId)
    setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
  }

  return {
    invitations,
    pendingCount: invitations.length,
    accept,
    reject,
    loading,
  }
}
