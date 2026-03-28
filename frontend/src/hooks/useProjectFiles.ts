/**
 * useProjectFiles — creează sau găsește proiectul partajat "iTECify Demo"
 * și returnează cele 3 fișiere implicite cu ID-urile lor reale din Supabase.
 *
 * Folosit de EditorPage din App.tsx:
 *   const { files, loading } = useProjectFiles()
 *   // files[i].id → se pasează ca fileId la useRealtimeEditor
 *
 * Flow:
 *   1. Caută proiectul "iTECify Demo" (vizibil tuturor userilor autentificați via RLS)
 *   2. Dacă nu există → îl creează + cele 3 fișiere implicite
 *   3. Dacă există → returnează fișierele existente
 *   → Toți userii autentificați ajung la același set de fileId-uri → colaborare live
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '../lib/supabase'

const DEMO_PROJECT_NAME = 'iTECify Demo'

const DEFAULT_FILES = [
  { name: 'main.py',   language: 'python',     content: '# Python\nprint("Hello from iTECify!")\n' },
  { name: 'index.js',  language: 'javascript',  content: '// JavaScript\nconsole.log("Hello from iTECify!");\n' },
  { name: 'main.rs',   language: 'rust',        content: '// Rust\nfn main() {\n    println!("Hello from iTECify!");\n}\n' },
]

export interface ProjectFile {
  id: string
  name: string
  language: string
}

export interface UseProjectFilesReturn {
  files: ProjectFile[]
  loading: boolean
  error: string | null
  addFile: (name: string, language: string) => Promise<void>
  projectId: string
}

export function useProjectFiles(): UseProjectFilesReturn {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState('')
  const projectIdRef = useRef<string>('')

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        let projectId: string

        // ── 1. Caută proiectul prin project_members (funcționează și după invite accept) ──
        const { data: membership } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (membership) {
          projectId = membership.project_id
          projectIdRef.current = projectId
          setProjectId(projectId)
        } else {
          // ── 2. Caută proiectul partajat după nume ─────────────────────────
          const { data: existing } = await supabase
            .from('projects')
            .select('id')
            .eq('name', DEMO_PROJECT_NAME)
            .maybeSingle()

          if (existing) {
            projectId = existing.id
          } else {
            // ── 3. Creează proiectul (primul user care se loghează) ───────────
            const { data: created, error: createErr } = await supabase
              .from('projects')
              .insert({ name: DEMO_PROJECT_NAME, owner_id: user.id })
              .select('id')
              .single()

            if (createErr || !created) throw new Error(`Failed to create project: ${createErr?.message ?? ''}`)
            projectId = created.id
          }

          projectIdRef.current = projectId
          setProjectId(projectId)

          // Adaugă userul ca membru dacă nu e deja
          await supabase
            .from('project_members')
            .insert({ project_id: projectId, user_id: user.id, role: 'owner' })
            .then(() => {})
            .catch(() => {})
        }

        // ── 3. Caută fișierele existente ──────────────────────────────────────
        const { data: existingFiles, error: filesErr } = await supabase
          .from('files')
          .select('id, name, language')
          .eq('project_id', projectId)
          .order('name')

        if (filesErr) throw new Error(`Failed to fetch files: ${filesErr.message}`)

        if (existingFiles && existingFiles.length > 0) {
          if (!cancelled) { setFiles(existingFiles); setLoading(false) }
          return
        }

        // ── 4. Creează fișierele implicite (doar dacă nu există) ──────────────
        const { data: createdFiles, error: createFilesErr } = await supabase
          .from('files')
          .insert(DEFAULT_FILES.map(f => ({ ...f, project_id: projectId })))
          .select('id, name, language')
          .order('name')

        if (createFilesErr || !createdFiles) throw new Error(`Failed to create files: ${createFilesErr?.message ?? ''}`)

        if (!cancelled) { setFiles(createdFiles); setLoading(false) }

      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project files')
          setLoading(false)
        }
      }
    }

    void setup()
    return () => { cancelled = true }
  }, [])

  const addFile = useCallback(async (name: string, language: string) => {
    const pid = projectIdRef.current
    if (!pid) return
    const { data, error: insertErr } = await supabase
      .from('files')
      .insert({ name, language, content: '', project_id: pid })
      .select('id, name, language')
      .single()
    if (!insertErr && data) {
      setFiles(prev => [...prev, data])
    }
  }, [])

  return { files, loading, error, addFile, projectId }
}
