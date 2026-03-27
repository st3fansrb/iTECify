import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import catSrc from '../assets/logo.png'

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
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Cat — perfect center */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1, pointerEvents: 'none',
      }}>
        <img
          src={catSrc}
          alt="access granted cat"
          style={{
            width: '360px', height: '360px',
            objectFit: 'cover',
            borderRadius: '20px',
            boxShadow: '0 0 50px rgba(244,114,182,0.7), 0 0 100px rgba(244,114,182,0.35), 0 0 160px rgba(167,139,250,0.2)',
            animation: 'k-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both, cat-float 3s 0.6s ease-in-out infinite',
          }}
        />
      </div>

      {/* Text + button — bottom center */}
      <div
        style={{
          position: 'absolute', bottom: '8%', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1, textAlign: 'center',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="k-glitch" data-text="ACCESS GRANTED" style={{
          fontSize: '44px', fontWeight: 900, letterSpacing: '0.12em',
          color: 'white', fontFamily: 'monospace',
          textShadow: '0 0 40px rgba(249,168,212,0.6)',
          animation: 'k-fade-in 0.4s 0.5s both',
          position: 'relative', marginBottom: '8px',
        }}>
          ACCESS GRANTED
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.35)', fontSize: '12px',
          letterSpacing: '0.15em', marginBottom: '20px',
          animation: 'k-fade-in 0.4s 0.8s both',
          fontFamily: 'monospace',
        }}>
          IDENTITY VERIFIED — CLEARANCE LEVEL: VOID
        </p>

        <button
          onClick={handleEnterVoid}
          style={{
            pointerEvents: 'all',
            padding: '12px 32px',
            background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.15))',
            border: '1px solid rgba(236,72,153,0.5)',
            borderRadius: '10px',
            color: 'white', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'monospace',
            letterSpacing: '0.08em',
            animation: 'k-fade-in 0.4s 1.1s both, void-pulse 1.8s 1.5s ease-in-out infinite',
            backdropFilter: 'blur(10px)',
          }}
        >
          Enter the void &gt;
        </button>

        <p style={{
          marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.2)',
          fontFamily: 'monospace', animation: 'k-fade-in 0.4s 1.4s both',
        }}>
          or click anywhere to dismiss
        </p>
      </div>

      <style>{`
        @keyframes k-pop {
          0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(10deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes cat-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes k-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes void-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(236,72,153,0.3), 0 0 40px rgba(139,92,246,0.1); }
          50%       { box-shadow: 0 0 40px rgba(236,72,153,0.6), 0 0 80px rgba(139,92,246,0.3); }
        }
        .k-glitch::before,
        .k-glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          font-size: inherit; font-weight: inherit;
          letter-spacing: inherit; font-family: inherit;
        }
        .k-glitch::before {
          color: #f472b6;
          animation: glitch-1 2.5s infinite;
          clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%);
        }
        .k-glitch::after {
          color: #a78bfa;
          animation: glitch-2 2.5s infinite;
          clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
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
