// Project session API — create rooms, join via invite code, list user projects.
// Components must NOT import supabase directly — use these helpers or hooks.

import supabase from './supabase'

export interface ProjectSession {
  projectId: string
  inviteCode: string
}

export interface UserProject {
  project_id: string
  role: string
  projects: {
    id: string
    name: string
    invite_code: string
    created_at: string
  }
}

const DEFAULT_FILES = [
  { name: 'main.js',  language: 'javascript', content: '// Start coding here\nconsole.log("Hello iTECify!");' },
  { name: 'main.py',  language: 'python',     content: '# Start coding here\nprint("Hello iTECify!")' },
  { name: 'main.rs',  language: 'rust',       content: 'fn main() {\n    println!("Hello iTECify!");\n}' },
]

/** Create a new project room. Adds owner as member and seeds 3 default files. */
export async function createSession(name = 'New Room'): Promise<ProjectSession> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('createSession: not authenticated')

  const inviteCode = crypto.randomUUID()

  // 1. Create project
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .insert({ name, owner_id: user.id, invite_code: inviteCode })
    .select('id')
    .single()
  if (projectErr || !project) throw new Error(`createSession: ${projectErr?.message}`)

  const projectId = project.id

  // 2. Add owner as member
  const { error: memberErr } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: user.id, role: 'owner' })
  if (memberErr) throw new Error(`createSession (member): ${memberErr.message}`)

  // 3. Seed default files
  const { error: filesErr } = await supabase
    .from('files')
    .insert(DEFAULT_FILES.map(f => ({ ...f, project_id: projectId })))
  if (filesErr) throw new Error(`createSession (files): ${filesErr.message}`)

  return { projectId, inviteCode }
}

/** Join an existing project via invite code. Returns the projectId. */
export async function joinSession(inviteCode: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('joinSession: not authenticated')

  // 1. Find project by invite code
  const { data: project, error: findErr } = await supabase
    .from('projects')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()
  if (findErr || !project) throw new Error('joinSession: invalid invite code')

  // 2. Add user as member (ignore duplicate — already a member)
  const { error: memberErr } = await supabase
    .from('project_members')
    .insert({ project_id: project.id, user_id: user.id, role: 'member' })

  // UNIQUE constraint violation (already a member) is acceptable
  if (memberErr && !memberErr.message.includes('duplicate') && !memberErr.code?.includes('23505')) {
    throw new Error(`joinSession: ${memberErr.message}`)
  }

  return project.id
}

// ── Invitations ───────────────────────────────────────────────────────────────

export interface Invitation {
  id: string
  project_id: string
  invited_email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

/** Send an invitation to a collaborator by email. */
export async function sendInvitation(projectId: string, email: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('sendInvitation: not authenticated')

  const { error } = await supabase
    .from('invitations')
    .insert({ project_id: projectId, invited_email: email.toLowerCase().trim(), invited_by: user.id })

  if (error) throw new Error(`sendInvitation: ${error.message}`)
}

/** Accept a pending invitation — marks as accepted. */
export async function acceptInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)

  if (error) throw new Error(`acceptInvitation: ${error.message}`)
}

/** Reject a pending invitation — marks as rejected. */
export async function rejectInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'rejected' })
    .eq('id', invitationId)

  if (error) throw new Error(`rejectInvitation: ${error.message}`)
}

/** Returns all projects the user is a member of (owned + joined). */
export async function getUserProjects(userId: string): Promise<UserProject[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('project_id, role, projects(id, name, invite_code, created_at)')
    .eq('user_id', userId)
    .order('project_id')

  if (error) throw new Error(`getUserProjects: ${error.message}`)
  return (data ?? []) as UserProject[]
}
