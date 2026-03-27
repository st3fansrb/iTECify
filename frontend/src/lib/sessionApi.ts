// CRUD helpers for the `sessions` table.
// Used exclusively by hooks — components must NOT import supabase directly.

import { supabase } from './supabaseClient'
import type { Session, Language } from './database.types'

/** Create a new session. `created_by` is injected by Supabase RLS (auth.uid()). */
export async function createSession(name: string, language: Language): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ name, language, code: '' })
    .select()
    .single()

  if (error) throw new Error(`createSession: ${error.message}`)
  return data
}

/** Fetch a single session by id. Throws if not found. */
export async function getSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .select()
    .eq('id', id)
    .single()

  if (error) throw new Error(`getSession: ${error.message}`)
  return data
}

/**
 * Persist the latest code to DB.
 * Called debounced from useRealtimeCode — not on every keystroke.
 */
export async function updateSessionCode(id: string, code: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ code, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`updateSessionCode: ${error.message}`)
}

/** List all sessions, newest first — for the session picker UI. */
export async function listSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select()
    .order('created_at', { ascending: false })

  if (error) throw new Error(`listSessions: ${error.message}`)
  return data ?? []
}
