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

const STARTER_CONTENT: Record<string, string> = {
  python:     '# Python\nprint("Hello from iTECify!")\n',
  javascript: '// JavaScript\nconsole.log("Hello from iTECify!");\n',
  typescript: '// TypeScript\nconst msg: string = "Hello from iTECify!";\nconsole.log(msg);\n',
  rust:       '// Rust\nfn main() {\n    println!("Hello from iTECify!");\n}\n',
  go:         '// Go\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from iTECify!")\n}\n',
  java:       '// Java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from iTECify!");\n    }\n}\n',
  c:          '// C\n#include <stdio.h>\n\nint main() {\n    printf("Hello from iTECify!\\n");\n    return 0;\n}\n',
  cpp:        '// C++\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from iTECify!" << std::endl;\n    return 0;\n}\n',
}

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
  restoreDefaults: () => Promise<void>
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

        // ── 1. Caută proiectul owned de user ─────────────────────────────────
        const { data: ownedRows } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', user.id)
          .eq('name', DEMO_PROJECT_NAME)
          .order('created_at')
          .limit(1)

        const ownedProject = ownedRows?.[0] ?? null

        if (ownedProject) {
          projectId = ownedProject.id
          projectIdRef.current = projectId
          setProjectId(projectId)

          // Asigură membership ca owner
          await supabase
            .from('project_members')
            .upsert({ project_id: projectId, user_id: user.id, role: 'owner' }, { onConflict: 'project_id,user_id' })
            .then(() => {}).catch(() => {})
        } else {
          // ── 2. Caută membership ca member (după invite accept) ───────────────
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
            // ── 3. Creează proiectul nou ────────────────────────────────────
            const { data: created, error: createErr } = await supabase
              .from('projects')
              .insert({ name: DEMO_PROJECT_NAME, owner_id: user.id })
              .select('id')
              .single()

            if (createErr || !created) throw new Error(`Failed to create project: ${createErr?.message ?? ''}`)
            projectId = created.id
            projectIdRef.current = projectId
            setProjectId(projectId)

            await supabase
              .from('project_members')
              .insert({ project_id: projectId, user_id: user.id, role: 'owner' })
              .then(() => {}).catch(() => {})
          }
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
    const content = STARTER_CONTENT[language] ?? `// ${name}\n`
    const { data, error: insertErr } = await supabase
      .from('files')
      .insert({ name, language, content, project_id: pid })
      .select('id, name, language')
      .single()
    if (!insertErr && data) {
      setFiles(prev => [...prev, data])
    }
  }, [])

  // Re-seeds the 3 default files if they were accidentally deleted
  const restoreDefaults = useCallback(async () => {
    const pid = projectIdRef.current
    if (!pid) return
    const { data: existing } = await supabase
      .from('files')
      .select('name')
      .eq('project_id', pid)
    const existingNames = new Set((existing ?? []).map((f: { name: string }) => f.name))
    const missing = DEFAULT_FILES.filter(f => !existingNames.has(f.name))
    if (missing.length === 0) return
    const { data: created } = await supabase
      .from('files')
      .insert(missing.map(f => ({ ...f, project_id: pid })))
      .select('id, name, language')
    if (created) setFiles(prev => [...prev, ...created])
  }, [])

  return { files, loading, error, addFile, restoreDefaults, projectId }
}
