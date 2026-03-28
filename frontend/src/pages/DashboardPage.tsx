import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import type { Project } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import dashBgSrc from '../assets/dashboard-bg.png'

// Palette of vivid icons + colors for project cards
const PROJECT_ICONS = ['🚀', '⚡', '🔥', '🌊', '🎯', '💎', '🧬', '🛸', '🎪', '🌈', '🔮', '🎭']
const PROJECT_COLORS = [
  ['#f9a8d4', '#ec4899'],
  ['#d8b4fe', '#8b5cf6'],
  ['#6ee7b7', '#10b981'],
  ['#67e8f9', '#06b6d4'],
  ['#fde68a', '#f59e0b'],
  ['#fca5a5', '#ef4444'],
  ['#c4b5fd', '#7c3aed'],
  ['#86efac', '#22c55e'],
]


function getProjectAccent(id: string): [string, string, string] {
  // deterministic pick based on id chars
  const idx = id.charCodeAt(0) % PROJECT_COLORS.length
  const iconIdx = (id.charCodeAt(0) + id.charCodeAt(1)) % PROJECT_ICONS.length
  const [from, to] = PROJECT_COLORS[idx]
  return [PROJECT_ICONS[iconIdx], from, to]
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
    if (error) {
      console.error('[DashboardPage] create project error:', error)
      alert(`Eroare la creare proiect: ${error.message}`)
    } else if (data) {
      await supabase
        .from('project_members')
        .insert({ project_id: data.id, user_id: user.id, role: 'owner' })
      await supabase
        .from('files')
        .insert({
          project_id: data.id,
          name: 'README.md',
          language: 'markdown',
          content: `# ${name}\n\nBun venit în proiectul tău iTECify!\n\n## Cum începi\n\n- Adaugă fișiere noi cu butonul **+** din sidebar\n- Rulează codul cu butonul **Run**\n- Invită colegi din meniul de utilizator (avatar sus-dreapta)\n`,
        })
      setProjects(prev => [data, ...prev])
      setNewName('')
      setShowForm(false)
      navigate('/editor', { state: { projectId: data.id } })
    }
    setCreating(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #1a0533 0%, #2d1b4e 30%, #1a1a2e 60%, #0f0c29 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      overflowX: 'hidden',
    }}>
      {/* Dashboard background image — rotatie lenta + plutire, colorata mov/roz */}
      <img
        src={dashBgSrc}
        alt=""
        style={{
          position: 'fixed', top: '50%', left: '50%',
          width: '700px', height: '700px',
          opacity: 0.15, zIndex: 0, pointerEvents: 'none',
          filter: 'hue-rotate(260deg) saturate(3) brightness(1.5)',
          animation: 'dash-bg-spin 20s linear infinite, dash-bg-float 6s ease-in-out infinite',
        }}
      />

      {/* Glow orbs */}
      <div style={{ position: 'fixed', top: '8%', left: '10%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '8%', right: '8%', width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

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
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 24px', position: 'relative', zIndex: 1 }}>

        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '40px',
          animation: 'dash-slide-up 0.5s ease both',
        }}>
          <div>
            <p style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em',
              color: 'rgba(249,168,212,0.6)', textTransform: 'uppercase',
              fontFamily: 'monospace', marginBottom: '6px',
            }}>
              Your workspace
            </p>
            <h1 style={{
              fontSize: '36px', fontWeight: 800, margin: 0,
              background: 'linear-gradient(135deg, #ffffff 0%, #f9a8d4 50%, #d8b4fe 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Projects
            </h1>
          </div>

          {/* + New Project button — same style as Get Started */}
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              padding: '10px 26px',
              background: 'linear-gradient(135deg, rgba(249,168,212,0.2), rgba(216,180,254,0.2))',
              border: '1px solid rgba(249,168,212,0.4)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              letterSpacing: '0.02em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(249,168,212,0.25)'
              e.currentTarget.style.borderColor = 'rgba(249,168,212,0.7)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.borderColor = 'rgba(249,168,212,0.4)'
            }}
          >
            {showForm ? '✕ Cancel' : '+ New project'}
          </button>
        </div>

        {/* New project form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            style={{
              display: 'flex', gap: '10px', marginBottom: '36px',
              background: 'rgba(10,6,20,0.6)',
              border: '1px solid rgba(249,168,212,0.25)',
              borderRadius: '14px',
              padding: '16px 20px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 30px rgba(249,168,212,0.06)',
              animation: 'dash-slide-up 0.2s ease both',
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
                padding: '8px 22px',
                background: creating || !newName.trim()
                  ? 'rgba(249,168,212,0.08)'
                  : 'linear-gradient(135deg, rgba(249,168,212,0.25), rgba(216,180,254,0.25))',
                border: '1px solid rgba(249,168,212,0.35)',
                borderRadius: '8px',
                color: '#f9a8d4',
                fontSize: '13px', fontWeight: 600,
                cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer',
                opacity: creating || !newName.trim() ? 0.45 : 1,
                transition: 'all 0.2s',
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        )}

        {/* Project grid */}
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '13px', animation: 'dash-slide-up 0.4s ease both' }}>
            Loading projects…
          </p>
        ) : projects.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '100px 0',
            color: 'rgba(255,255,255,0.2)',
            animation: 'dash-slide-up 0.4s ease both',
          }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>✦</p>
            <p style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.05em' }}>
              No projects yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {projects.map((project, i) => {
              const [icon, colorFrom, colorTo] = getProjectAccent(project.id)
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  icon={icon}
                  colorFrom={colorFrom}
                  colorTo={colorTo}
                  delay={i * 60}
                  onClick={() => navigate('/editor', { state: { projectId: project.id } })}
                />
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dash-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dash-bg-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes dash-bg-float {
          0%, 100% { margin-top: -15px; }
          50%       { margin-top: 15px; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

// ── Separate component so each card manages its own hover state ───────────────
function ProjectCard({
  project, icon, colorFrom, colorTo, delay, onClick,
}: {
  project: Project
  icon: string
  colorFrom: string
  colorTo: string
  delay: number
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hovered ? 'rgba(249,168,212,0.45)' : 'rgba(249,168,212,0.15)'}`,
        borderRadius: '16px',
        padding: '24px 22px',
        cursor: 'pointer',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: hovered
          ? '0 0 28px rgba(249,168,212,0.18), 0 12px 32px rgba(0,0,0,0.45)'
          : '0 2px 12px rgba(0,0,0,0.25)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.25s ease',
        display: 'flex', flexDirection: 'column', gap: '14px',
        animation: 'card-in 0.45s ease both',
        animationDelay: `${delay}ms`,
        opacity: 0,
      }}
    >
      {/* Icon + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Colored icon bubble */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: `linear-gradient(135deg, ${colorFrom}33, ${colorTo}22)`,
          border: `1px solid ${colorFrom}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
          boxShadow: hovered ? `0 0 14px ${colorFrom}55` : 'none',
          transition: 'box-shadow 0.25s',
        }}>
          {icon}
        </div>
        <span style={{
          fontWeight: 700, fontSize: '15px', color: 'white',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {project.name}
        </span>
      </div>

      {/* Bottom row — color accent bar + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          height: '3px', width: '32px', borderRadius: '99px',
          background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
          opacity: hovered ? 1 : 0.5,
          transition: 'opacity 0.25s',
        }} />
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace' }}>
          {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}
