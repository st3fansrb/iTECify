import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export interface AuthState {
  user: User | null
  /** True while the initial session check is in flight — gate your UI on this. */
  loading: boolean
}

export interface AuthActions {
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export type UseAuthReturn = AuthState & AuthActions

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Resolve the existing session immediately (avoids flash of logged-out state).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Keep state in sync for tab-switches, token refreshes, sign-outs in other tabs, etc.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithEmail(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUpWithEmail(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return { user, loading, signInWithEmail, signUpWithEmail, signOut }
}
