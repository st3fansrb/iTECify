// Hand-written DB types for iTECify. Regenerate with `npx supabase gen types typescript` after schema is stable.

export type Language = 'python' | 'javascript' | 'typescript' | 'rust' | 'go'

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          owner_id: string
          invite_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          invite_code?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Row']>
      }
      files: {
        Row: {
          id: string
          project_id: string
          name: string
          language: string
          content: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          language: string
          content?: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['files']['Row']>
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['project_members']['Row']>
      }
      file_history: {
        Row: {
          id: string
          file_id: string
          content: string
          saved_by: string | null
          saved_at: string
        }
        Insert: {
          id?: string
          file_id: string
          content: string
          saved_by?: string | null
          saved_at?: string
        }
        Update: Partial<Database['public']['Tables']['file_history']['Row']>
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_color: string | null
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_color?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      sessions: {
        Row: {
          id: string
          name: string
          language: Language
          code: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          language: Language
          code?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sessions']['Row']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
