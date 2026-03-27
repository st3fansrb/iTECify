import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function HomePage() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number }[] = []
    const colors = ['#f9a8d4', '#d8b4fe', '#fde68a', '#fbcfe8', '#e9d5ff']

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.6 + 0.2,
      })
    }

    let animId: number
    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
      })
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'relative',
      background: 'linear-gradient(135deg, #1a0533 0%, #2d1b4e 30%, #1a1a2e 60%, #0f0c29 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '20%', left: '15%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249,168,212,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '15%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(216,180,254,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(253,230,138,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Grid lines like Vercel */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        pointerEvents: 'none',
      }} />

      {/* Navbar */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/src/assets/logo.png" alt="iTECify logo" style={{ width: '32px', height: '32px', filter: 'invert(1) sepia(1) saturate(2) hue-rotate(280deg)' }} />
          <span style={{ fontWeight: 700, fontSize: '18px', color: 'white', letterSpacing: '0.05em' }}>iTECify</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '8px 20px',
            background: 'rgba(249,168,212,0.1)',
            border: '1px solid rgba(249,168,212,0.3)',
            borderRadius: '8px',
            color: '#f9a8d4',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'monospace',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,168,212,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(249,168,212,0.1)')}
        >
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 10, textAlign: 'center',
        padding: '0 24px',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: '-20px',
            background: 'radial-gradient(circle, rgba(249,168,212,0.2) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <img
            src="/src/assets/logo.png"
            alt="iTECify"
            style={{
              width: '120px', height: '120px',
              filter: 'invert(1) sepia(1) saturate(2) hue-rotate(280deg) brightness(1.2)',
              position: 'relative',
              animation: 'float 4s ease-in-out infinite',
            }}
          />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '64px', fontWeight: 800, marginBottom: '16px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f9a8d4 50%, #d8b4fe 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.1,
        }}>
          iTECify
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '18px', color: 'rgba(255,255,255,0.5)',
          maxWidth: '480px', lineHeight: 1.6, marginBottom: '40px',
        }}>
          O platformă de <span style={{ color: '#f9a8d4' }}>code-collaboration</span> și{' '}
          <span style={{ color: '#d8b4fe' }}>sandboxing</span> — scrie, rulează și colaborează în timp real.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '14px 40px',
            background: 'linear-gradient(135deg, rgba(249,168,212,0.2), rgba(216,180,254,0.2))',
            border: '1px solid rgba(249,168,212,0.4)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s',
            backdropFilter: 'blur(10px)',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(249,168,212,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          ✦ Get Started
        </button>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  )
}
