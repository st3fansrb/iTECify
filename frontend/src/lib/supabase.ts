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
        Row: Project
        Insert: { id?: string; name: string; created_at?: string; owner_id?: string }
        Update: Partial<Project>
      }
      files: {
        Row: File
        Insert: {
          id?: string
          project_id: string
          name: string
          language?: string
          content?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: Partial<File>
      }
      profiles: {
        Row: Profile
        Insert: { id: string; display_name?: string; avatar_color?: string; updated_at?: string }
        Update: Partial<Omit<Profile, 'id'>>
      }
      file_history: {
        Row: FileHistoryEntry
        Insert: { id?: string; file_id: string; content: string; saved_by?: string | null; saved_at?: string }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─── Singleton client ─────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. Check .env file.')
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
export default supabase
