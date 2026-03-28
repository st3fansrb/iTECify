import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import type { Project } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const LANG_COLORS: Record<string, string> = {
  python: '#3b82f6',
  javascript: '#f59e0b',
  typescript: '#818cf8',
  rust: '#fb923c',
  c: '#22d3ee',
  'c++': '#34d399',
}

function langDot(lang: string) {
  return LANG_COLORS[lang.toLowerCase()] ?? '#9ca3af'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? [])
        setLoading(false)
      })
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name || !user) return
    setCreating(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, owner_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setProjects(prev => [data, ...prev])
      setNewName('')
      setShowForm(false)
    }
    setCreating(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(125deg, #0f0c29, #302b63, #24243e)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Glow orbs */}
      <div style={{ position: 'fixed', top: '10%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 48px',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.05em' }}>
          <span style={{ background: 'linear-gradient(135deg,#f9a8d4,#d8b4fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>iTECify</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: '14px', marginLeft: '12px' }}>Dashboard</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{user?.email}</span>
          <button
            onClick={() => signOut().then(() => navigate('/'))}
            style={{
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '36px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(249,168,212,0.6)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '6px' }}>
              Your workspace
            </p>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#ffffff,#f9a8d4 60%,#d8b4fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Projects
            </h1>
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, rgba(249,168,212,0.2), rgba(216,180,254,0.2))',
              border: '1px solid rgba(249,168,212,0.4)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(249,168,212,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            {showForm ? '✕ Cancel' : '+ New project'}
          </button>
        </div>

        {/* New project form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            style={{
              display: 'flex', gap: '10px', marginBottom: '32px',
              background: 'rgba(10,6,20,0.7)',
              border: '1px solid rgba(249,168,212,0.2)',
              borderRadius: '12px',
              padding: '16px 20px',
              backdropFilter: 'blur(10px)',
              animation: 'dash-fade-in 0.2s ease both',
            }}
          >
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Project name…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'white', fontSize: '14px', fontFamily: 'monospace',
                caretColor: '#f472b6',
              }}
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              style={{
                padding: '8px 20px',
                background: 'rgba(249,168,212,0.2)',
                border: '1px solid rgba(249,168,212,0.35)',
                borderRadius: '8px',
                color: '#f9a8d4',
                fontSize: '13px',
                fontWeight: 600,
                cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer',
                opacity: creating || !newName.trim() ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        )}

        {/* Project grid */}
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '13px' }}>Loading projects…</p>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.2)' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>📁</p>
            <p style={{ fontFamily: 'monospace', fontSize: '13px' }}>No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate('/editor')}
                style={{
                  background: 'rgba(10,6,20,0.7)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  padding: '22px 20px',
                  cursor: 'pointer',
                  transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'rgba(249,168,212,0.3)'
                  el.style.boxShadow = '0 0 30px rgba(249,168,212,0.07), 0 8px 24px rgba(0,0,0,0.4)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'rgba(255,255,255,0.07)'
                  el.style.boxShadow = 'none'
                  el.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>📂</span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: langDot('python'), flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                    {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dash-fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
