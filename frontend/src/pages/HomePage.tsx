import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import blobSrc from '../assets/blob.png'
import feature1 from '../assets/feature1.png'
import feature2 from '../assets/feature2.png'
import feature3 from '../assets/feature3.png'

const FEATURES = [
  {
    label: 'FIG 0.1',
    img: feature1,
    title: 'Real-Time Collaboration',
    desc: 'Code together, think together. Invite your team into the same editor and watch ideas come to life — cursor by cursor, line by line.',
  },
  {
    label: 'FIG 0.2',
    img: feature2,
    title: 'Sandboxed Execution',
    desc: 'Run anything, break nothing. Every snippet of code lives in its own isolated environment — safe, fast, and ready to execute in seconds.',
  },
  {
    label: 'FIG 0.3',
    img: feature3,
    title: 'Version History',
    desc: 'Nothing is ever lost. Every change is captured, every version preserved — so you can build boldly, knowing you can always go back.',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const clickCountRef = useRef(0)
  const [hackerMode, setHackerMode] = useState(false)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([null, null, null])
  const [openDropdown, setOpenDropdown] = useState<'contact' | 'about' | null>(null)
  const contactRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)

  const handleLogoClick = () => {
    clickCountRef.current += 1
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0
      setHackerMode(true)
      setTimeout(() => setHackerMode(false), 10000)
    }
  }

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    cardsRef.current.forEach((card, i) => {
      if (!card) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              if (card) {
                card.style.opacity = '1'
                card.style.transform = 'translateY(0)'
              }
            }, i * 150)
            observer.disconnect()
          }
        },
        { threshold: 0.12 }
      )
      observer.observe(card)
      observers.push(observer)
    })
    return () => observers.forEach(obs => obs.disconnect())
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #1a0533 0%, #2d1b4e 30%, #1a1a2e 60%, #0f0c29 100%)',
      display: 'flex',
      flexDirection: 'column',
      filter: hackerMode ? 'hue-rotate(90deg) saturate(4) brightness(0.75)' : undefined,
      transition: 'filter 0.5s ease',
    }}>
      {hackerMode && (
        <div style={{
          position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, background: 'rgba(0,255,70,0.15)', border: '1px solid rgba(0,255,70,0.4)',
          borderRadius: '8px', padding: '8px 20px', color: '#00ff46',
          fontFamily: 'monospace', fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.1em', backdropFilter: 'blur(10px)',
          animation: 'hacker-pulse 1s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          ▓ HACKER MODE ACTIVATED ▓
        </div>
      )}

      {/* Blob background */}
      <img
        src={blobSrc}
        alt=""
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          objectFit: 'cover',
          opacity: 0.35,
          zIndex: 0,
          pointerEvents: 'none',
          animation: 'blob-float 6s ease-in-out infinite',
        }}
      />

      {/* ── Hero section ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: '20%', left: '15%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,168,212,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '15%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(216,180,254,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          pointerEvents: 'none',
        }} />

        {/* Navbar */}
        <nav style={{
          position: 'relative', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/src/assets/logo.png"
              alt="iTECify logo"
              onClick={handleLogoClick}
              style={{ width: '32px', height: '32px', filter: 'invert(1) sepia(1) saturate(2) hue-rotate(280deg)', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 700, fontSize: '18px', color: 'white', letterSpacing: '0.05em' }}>iTECify</span>
          </div>

          {/* Right side nav items */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* Contact button + dropdown — closes on mouse leave */}
            <div
              ref={contactRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => setOpenDropdown('contact')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                style={{
                  padding: '7px 16px', fontSize: '13px', fontWeight: 500,
                  background: openDropdown === 'contact' ? 'rgba(249,168,212,0.12)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', color: '#ffffff',
                  cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em',
                }}
              >
                Contact
              </button>
              {openDropdown === 'contact' && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                  minWidth: '320px', zIndex: 999999,
                  maxHeight: '350px', overflowY: 'auto',
                  scrollbarWidth: 'thin', scrollbarColor: '#f472b6 transparent',
                  background: 'rgba(8,4,25,0.98)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(249,168,212,0.2)',
                  borderRadius: '12px', padding: '16px',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 30px rgba(249,168,212,0.06)',
                  animation: 'dropdown-in 0.15s ease both',
                  color: '#ffffff',
                }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(249,168,212,0.7)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '8px' }}>Email</p>
                  <a
                    href="mailto:triquetra.itecify@gmail.com"
                    style={{ fontSize: '13px', color: '#f9a8d4', textDecoration: 'none', fontFamily: 'monospace', display: 'block', marginBottom: '16px' }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                  >
                    triquetra.itecify@gmail.com
                  </a>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(249,168,212,0.7)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '8px' }}>Team</p>
                  {['Mateescu Vlad', 'Sirbu Stefan', 'Termure Madalina'].map(name => (
                    <p key={name} style={{ fontSize: '13px', color: '#ffffff', marginBottom: '4px', paddingLeft: '2px' }}>
                      {name}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* About Us button + dropdown — closes on mouse leave */}
            <div
              ref={aboutRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => setOpenDropdown('about')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                style={{
                  padding: '7px 16px', fontSize: '13px', fontWeight: 500,
                  background: openDropdown === 'about' ? 'rgba(249,168,212,0.12)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', color: '#ffffff',
                  cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em',
                }}
              >
                About Us
              </button>
              {openDropdown === 'about' && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                  minWidth: '320px', zIndex: 999999,
                  maxHeight: '350px', overflowY: 'auto',
                  scrollbarWidth: 'thin', scrollbarColor: '#f472b6 transparent',
                  background: 'rgba(8,4,25,0.98)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(249,168,212,0.2)',
                  borderRadius: '12px', padding: '16px',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 30px rgba(249,168,212,0.06)',
                  animation: 'dropdown-in 0.15s ease both',
                  color: '#ffffff',
                }}>
                  <p style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.6, marginBottom: '16px' }}>
                    iTECify is a real-time collaborative IDE — write, run, and share code with your team instantly.
                  </p>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(249,168,212,0.7)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '8px' }}>How to use</p>
                  {['1. Create an account', '2. Open or create a project', '3. Invite your team and code together'].map(step => (
                    <p key={step} style={{ fontSize: '13px', color: '#ffffff', marginBottom: '4px', paddingLeft: '2px', fontFamily: 'monospace' }}>
                      {step}
                    </p>
                  ))}
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(249,168,212,0.7)', textTransform: 'uppercase', fontFamily: 'monospace', margin: '14px 0 8px' }}>Built with</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['React', 'TypeScript', 'Monaco Editor', 'Supabase', 'Docker'].map(tech => (
                      <span key={tech} style={{
                        padding: '3px 10px', fontSize: '11px', fontFamily: 'monospace',
                        background: 'rgba(249,168,212,0.15)', border: '1px solid rgba(249,168,212,0.3)',
                        borderRadius: '20px', color: '#ffffff',
                      }}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Get Started button */}
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '7px 18px', fontSize: '13px', fontWeight: 600,
                background: 'linear-gradient(135deg, rgba(249,168,212,0.2), rgba(216,180,254,0.2))',
                border: '1px solid rgba(249,168,212,0.4)',
                borderRadius: '8px', color: 'white',
                cursor: 'pointer', transition: 'all 0.2s',
                backdropFilter: 'blur(10px)', letterSpacing: '0.02em',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(249,168,212,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              Sign In
            </button>
          </div>
        </nav>

        {/* Marquee banner */}
        {(() => {
          const LANGS = ['Python', 'C', 'C++', 'TypeScript', 'JavaScript', 'React']
          const allItems = [...LANGS, ...LANGS]
          return (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(5px)',
              overflow: 'hidden',
              width: '100%',
              padding: '10px 0',
              position: 'relative', zIndex: 1,
            }}>
              <div style={{
                display: 'flex',
                width: 'max-content',
                animation: 'marquee 20s linear infinite',
              }}>
                {allItems.map((lang, i) => (
                  <span key={i} style={{
                    flexShrink: 0, whiteSpace: 'nowrap',
                    fontFamily: 'monospace', fontSize: '11px',
                    color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em',
                    padding: '0 28px',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.15)', marginRight: '28px' }}>·</span>
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Hero content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 10, textAlign: 'center',
          padding: '120px 24px 0',
        }}>
          <h1 style={{
            fontSize: '64px', fontWeight: 800, marginBottom: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f9a8d4 50%, #d8b4fe 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.1,
          }}>
            iTECify
          </h1>

          <p style={{
            fontSize: '24px', color: 'white', fontWeight: 500,
            maxWidth: '480px', lineHeight: 1.5, marginBottom: '40px',
            letterSpacing: '0.01em',
          }}>
            Your code. Your team. One place.
          </p>

          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '14px 40px',
              background: 'linear-gradient(135deg, rgba(249,168,212,0.2), rgba(216,180,254,0.2))',
              border: '1px solid rgba(249,168,212,0.4)',
              borderRadius: '12px',
              color: 'white', fontSize: '16px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.3s',
              backdropFilter: 'blur(10px)', letterSpacing: '0.02em',
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
      </div>

      {/* ── Features section ─────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '100px 48px 120px',
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(2px)',
      }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em',
            color: 'rgba(249,168,212,0.6)', textTransform: 'uppercase',
            fontFamily: 'monospace', marginBottom: '14px',
          }}>
            Platform Features
          </p>
          <h2 style={{
            fontSize: '40px', fontWeight: 800, margin: 0,
            background: 'linear-gradient(135deg, #ffffff 0%, #f9a8d4 60%, #d8b4fe 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}>
            Everything you need to build together
          </h2>
        </div>

        {/* Cards row */}
        <div style={{
          display: 'flex', gap: '20px',
          maxWidth: '1200px', margin: '0 auto',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              ref={el => { cardsRef.current[i] = el }}
              style={{
                flex: '1 1 320px', maxWidth: '380px',
                background: 'rgba(10, 6, 20, 0.7)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.6s ease, transform 0.6s ease',
                opacity: 0,
                transform: 'translateY(40px)',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'rgba(249,168,212,0.28)'
                el.style.boxShadow = '0 0 40px rgba(249,168,212,0.08), 0 8px 32px rgba(0,0,0,0.4)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'rgba(255,255,255,0.07)'
                el.style.boxShadow = 'none'
              }}
            >
              {/* Image area */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '62%', overflow: 'hidden' }}>
                <img
                  src={f.img}
                  alt={f.title}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Label top-left */}
                <span style={{
                  position: 'absolute', top: '12px', left: '14px',
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
                  color: 'rgba(249,168,212,0.75)',
                  fontFamily: 'monospace',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  padding: '3px 8px', borderRadius: '4px',
                  border: '1px solid rgba(249,168,212,0.2)',
                }}>
                  {f.label}
                </span>
                {/* Bottom fade */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '60px',
                  background: 'linear-gradient(to bottom, transparent, rgba(10,6,20,0.9))',
                }} />
              </div>

              {/* Text content */}
              <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{
                  margin: 0, fontSize: '16px', fontWeight: 700,
                  color: 'white', letterSpacing: '0.01em',
                }}>
                  {f.title}
                </h3>
                <p style={{
                  margin: 0, fontSize: '13px', lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.45)',
                }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes hacker-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes marquee {
          0%   { transform: translateX(0%);   }
          100% { transform: translateX(-50%); }
        }
        @keyframes blob-float {
          0%, 100% { transform: translateY(-20px) rotate(-5deg); }
          50%       { transform: translateY(20px)  rotate(5deg);  }
        }
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
