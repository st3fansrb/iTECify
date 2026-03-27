import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = () => {
    navigate('/editor')
  }

  return (
    <div style={{
      height: '100vh', width: '100vw', overflow: 'hidden',
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a0533 0%, #2d1b4e 30%, #1a1a2e 60%, #0f0c29 100%)',
    }}>
      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,168,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(216,180,254,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '80px 80px', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(249,168,212,0.2)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 8px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/src/assets/logo.png" alt="logo" style={{ width: '56px', height: '56px', filter: 'invert(1) sepia(1) saturate(2) hue-rotate(280deg)', marginBottom: '12px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 700, background: 'linear-gradient(135deg, #ffffff, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '4px' }}>iTECify</p>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
          {['Sign In', 'Sign Up'].map((label, i) => (
            <button key={label} onClick={() => setIsLogin(i === 0)} style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
              background: (isLogin ? i === 0 : i === 1) ? 'rgba(249,168,212,0.15)' : 'transparent',
              color: (isLogin ? i === 0 : i === 1) ? '#f9a8d4' : 'rgba(255,255,255,0.4)',
            }}>{label}</button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '14px', outline: 'none',
            }}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} style={{
          width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(249,168,212,0.3)',
          background: 'linear-gradient(135deg, rgba(249,168,212,0.2), rgba(216,180,254,0.2))',
          color: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          backdropFilter: 'blur(10px)', marginBottom: '16px',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {isLogin ? '✦ Sign In' : '✦ Create Account'}
        </button>

        {/* Back */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer', color: 'rgba(249,168,212,0.6)' }}>← Back to home</span>
        </p>
      </div>
    </div>
  )
}
