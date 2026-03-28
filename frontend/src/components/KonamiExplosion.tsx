import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import catSrc from '../assets/cat-access.png'
import accessBgSrc from '../assets/access-bg.png'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  alpha: number; size: number; color: string
}

export default function KonamiExplosion({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()

  const startParticles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const colors = ['#f9a8d4', '#f472b6', '#ec4899', '#d8b4fe', '#a78bfa', '#c084fc', '#fde68a', '#fbcfe8']

    const particles: Particle[] = []
    for (let i = 0; i < 300; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 14 + 3
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1,
        size: Math.random() * 8 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.2
        p.vx *= 0.98
        p.alpha -= 0.006
        if (p.alpha > 0) {
          ctx.save()
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = p.color
          ctx.shadowColor = p.color
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => cancelAnimationFrame(animId)
  }, [])

  useEffect(() => {
    const cleanup = startParticles()
    return cleanup
  }, [startParticles])

  const handleEnterVoid = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
    navigate('/secret')
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onClick={onClose}
    >
      {/* Background image — hue-rotate infinit */}
      <img
        src={accessBgSrc}
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: 0.6,
          zIndex: 0,
          pointerEvents: 'none',
          animation: 'k-hue-spin 10s linear infinite',
        }}
      />

      {/* Dark overlay transparent — fără negru solid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'rgba(4,0,16,0.45)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }} />

      {/* Particles canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      {/* Conținut principal — coloană centrată: imagine → text → buton */}
      <div
        style={{
          position: 'relative', zIndex: 4,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', pointerEvents: 'none',
          gap: '0px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cat logo — sus, fade-in + float + glow pulsating + hover rotate */}
        <img
          src={catSrc}
          alt="access granted"
          style={{
            width: '200px', height: '200px',
            objectFit: 'contain',
            borderRadius: '16px',
            marginBottom: '24px',
            pointerEvents: 'all',
            cursor: 'default',
            animation: 'cat-appear 0.6s ease-out both, cat-float 3s 0.6s ease-in-out infinite, cat-glow-pulse 2s 0.6s ease-in-out infinite',
            transition: 'transform 0.3s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(5deg)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'rotate(0deg)' }}
        />

        {/* ACCESS GRANTED — gradient text roz/mov */}
        <div
          className="k-glitch"
          data-text="ACCESS GRANTED"
          style={{
            fontSize: '54px', fontWeight: 900,
            letterSpacing: '0.3em',
            fontFamily: 'monospace',
            background: 'linear-gradient(135deg, #ffffff 0%, #f9a8d4 45%, #d8b4fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'k-fade-in 0.4s 0.5s both',
            position: 'relative',
            marginBottom: '10px',
            whiteSpace: 'nowrap',
          }}
        >
          ACCESS GRANTED
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.45)', fontSize: '12px',
          letterSpacing: '0.18em', marginBottom: '24px',
          animation: 'k-fade-in 0.4s 0.8s both',
          fontFamily: 'monospace',
          textShadow: '0 0 12px rgba(249,168,212,0.4)',
          whiteSpace: 'nowrap',
        }}>
          IDENTITY VERIFIED — CLEARANCE LEVEL: VOID
        </p>

        {/* Enter the void button — mai mare, glow roz */}
        <button
          onClick={handleEnterVoid}
          style={{
            pointerEvents: 'all',
            padding: '16px 40px',
            background: 'linear-gradient(135deg, rgba(236,72,153,0.18), rgba(139,92,246,0.18))',
            border: '1.5px solid rgba(236,72,153,0.65)',
            borderRadius: '12px',
            color: 'white', fontSize: '16px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'monospace',
            letterSpacing: '0.1em',
            backdropFilter: 'blur(12px)',
            animation: 'k-fade-in 0.4s 1.1s both, void-pulse 1.8s 1.5s ease-in-out infinite',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(139,92,246,0.35))'
            e.currentTarget.style.boxShadow = '0 0 30px rgba(236,72,153,0.6), 0 0 60px rgba(139,92,246,0.3)'
            e.currentTarget.style.borderColor = 'rgba(236,72,153,0.95)'
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.18), rgba(139,92,246,0.18))'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.borderColor = 'rgba(236,72,153,0.65)'
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
          }}
        >
          Enter the void &gt;
        </button>

        <p style={{
          marginTop: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.25)',
          fontFamily: 'monospace', animation: 'k-fade-in 0.4s 1.4s both',
        }}>
          or click anywhere to dismiss
        </p>
      </div>

      <style>{`
        @keyframes k-hue-spin {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        @keyframes cat-appear {
          0%   { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes cat-float {
          0%, 100% { transform: translateY(0px);    }
          50%       { transform: translateY(-10px);  }
        }
        @keyframes cat-glow-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(249,168,212,0.4), 0 0 60px rgba(167,139,250,0.2); }
          50%       { box-shadow: 0 0 50px rgba(249,168,212,0.8), 0 0 90px rgba(167,139,250,0.4); }
        }
        @keyframes k-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes void-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(236,72,153,0.35), 0 0 40px rgba(139,92,246,0.15); }
          50%       { box-shadow: 0 0 48px rgba(236,72,153,0.65), 0 0 90px rgba(139,92,246,0.35); }
        }
        .k-glitch::before,
        .k-glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          font-size: inherit; font-weight: inherit;
          letter-spacing: inherit; font-family: inherit;
          background: inherit;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .k-glitch::before {
          animation: glitch-1 2.5s infinite;
          clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%);
          filter: hue-rotate(-30deg);
        }
        .k-glitch::after {
          animation: glitch-2 2.5s infinite;
          clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
          filter: hue-rotate(30deg);
        }
        @keyframes glitch-1 {
          0%,  90%, 100% { transform: translate(0); opacity: 0; }
          91%            { transform: translate(-4px, 1px); opacity: 0.8; }
          93%            { transform: translate(3px, -1px); opacity: 0.6; }
          95%            { transform: translate(-2px, 0);   opacity: 0.9; }
          97%            { transform: translate(0);          opacity: 0; }
        }
        @keyframes glitch-2 {
          0%,  85%, 100% { transform: translate(0); opacity: 0; }
          86%            { transform: translate(4px, -2px); opacity: 0.7; }
          88%            { transform: translate(-3px, 1px); opacity: 0.5; }
          90%            { transform: translate(2px, 0);    opacity: 0.8; }
          92%            { transform: translate(0);          opacity: 0; }
        }
      `}</style>
    </div>
  )
}
