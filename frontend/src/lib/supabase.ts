import { createClient } from '@supabase/supabase-js'

// ─── Domain types (match Supabase tables exactly) ────────────────────────────

export interface Project {
  id: string
  name: string
  created_at: string
  owner_id: string
}

// Named `File` to match the `files` table row.
// NOTE: shadows the DOM global `File` in files that import this — use `import type { File as ProjectFile }` if you need both.
export interface File {
  id: string
  project_id: string
  name: string
  language: string
  content: string
  updated_at: string
  updated_by: string | null
}

export interface Profile {
  id: string
  display_name: string
  avatar_color: string
  updated_at: string
}

export interface FileHistoryEntry {
  id: string
  file_id: string
  content: string
  saved_by: string | null
  saved_at: string
}

// ─── Supabase Database generic (gives us fully-typed .from() calls) ──────────

type Database = {
  public: {
    Tables: {
      projects: {
        Row: { id: string; name: string; created_at: string; owner_id: string; invite_code: string | null }
        Insert: { id?: string; name: string; created_at?: string; owner_id?: string; invite_code?: string | null }
        Update: { id?: string; name?: string; created_at?: string; owner_id?: string; invite_code?: string | null }
        Relationships: never[]
      }
      files: {
        Row: { id: string; project_id: string; name: string; language: string; content: string; updated_at: string; updated_by: string | null }
        Insert: { id?: string; project_id: string; name: string; language?: string; content?: string; updated_at?: string; updated_by?: string | null }
        Update: { id?: string; project_id?: string; name?: string; language?: string; content?: string; updated_at?: string; updated_by?: string | null }
        Relationships: never[]
      }
      profiles: {
        Row: { id: string; display_name: string; avatar_color: string; updated_at: string }
        Insert: { id: string; display_name?: string; avatar_color?: string; updated_at?: string }
        Update: { display_name?: string; avatar_color?: string; updated_at?: string }
        Relationships: never[]
      }
      file_history: {
        Row: { id: string; file_id: string; content: string; saved_by: string | null; saved_at: string }
        Insert: { id?: string; file_id: string; content: string; saved_by?: string | null; saved_at?: string }
        Update: { id?: string; file_id?: string; content?: string; saved_by?: string | null; saved_at?: string }
        Relationships: never[]
      }
      project_members: {
        Row: { project_id: string; user_id: string; role: 'owner' | 'member'; joined_at: string }
        Insert: { project_id: string; user_id: string; role?: 'owner' | 'member'; joined_at?: string }
        Update: { role?: 'owner' | 'member' }
        Relationships: never[]
      }
      invitations: {
        Row: { id: string; project_id: string; invited_email: string; invited_by: string; status: 'pending' | 'accepted' | 'rejected'; created_at: string }
        Insert: { id?: string; project_id: string; invited_email: string; invited_by: string; status?: 'pending' | 'accepted' | 'rejected'; created_at?: string }
        Update: { status?: 'pending' | 'accepted' | 'rejected' }
        Relationships: never[]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// ─── Singleton client ─────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy frontend/.env.example to frontend/.env.local')
}

const supabase = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
  {
    realtime: {
      params: { eventsPerSecond: 10 },
      timeout: 20000,
    },
  }
)
export default supabase
