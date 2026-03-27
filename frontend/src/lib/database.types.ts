// Hand-written DB types for iTECify. Regenerate with `npx supabase gen types typescript` after schema is stable.

export type Language = 'python' | 'javascript' | 'typescript' | 'rust' | 'go'

export interface Session {
  id: string
  name: string
  language: Language
  code: string
  created_by: string
  created_at: string
  updated_at: string
}

// Supabase Database generic shape — used to type the createClient call.
export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: Session
        Insert: {
          id?: string
          name: string
          language: Language
          code?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Session>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
