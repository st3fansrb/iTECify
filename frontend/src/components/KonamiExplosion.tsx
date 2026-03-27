import { useEffect, useRef, useCallback } from 'react'
import logoSrc from '../assets/logo.png'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  alpha: number; size: number; color: string
}

export default function KonamiExplosion({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startAnimation = useCallback(() => {
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
    for (let i = 0; i < 280; i++) {
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
      let anyAlive = false
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.2
        p.vx *= 0.98
        p.alpha -= 0.009
        if (p.alpha > 0) {
          anyAlive = true
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
      if (anyAlive) {
        animId = requestAnimationFrame(animate)
      } else {
        setTimeout(onClose, 400)
      }
    }
    animate()

    return () => cancelAnimationFrame(animId)
  }, [onClose])

  useEffect(() => {
    const cleanup = startAnimation()
    return cleanup
  }, [startAnimation])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', pointerEvents: 'none' }}>
        <img
          src={logoSrc}
          alt="logo"
          style={{
            width: '140px', height: '140px',
            filter: 'invert(1) sepia(1) saturate(3) hue-rotate(280deg) brightness(1.5) drop-shadow(0 0 40px #f472b6)',
            animation: 'konami-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        />
        <p style={{
          marginTop: '28px', fontSize: '34px', fontWeight: 900,
          color: 'white',
          textShadow: '0 0 30px rgba(249,168,212,0.9), 0 0 60px rgba(216,180,254,0.6)',
          animation: 'konami-fade-in 0.5s 0.4s both',
          letterSpacing: '0.02em',
        }}>
          🎉 You found the secret!
        </p>
        <p style={{
          marginTop: '10px', fontSize: '14px',
          color: 'rgba(255,255,255,0.35)',
          animation: 'konami-fade-in 0.5s 0.7s both',
        }}>
          click anywhere to close
        </p>
      </div>

      <style>{`
        @keyframes konami-pop {
          0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
          60%  { transform: scale(1.4) rotate(15deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes konami-fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  )
}
