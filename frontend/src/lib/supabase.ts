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
  throw new Error('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
export default supabase
