import { useState, useRef, useCallback, useEffect } from 'react'
import ReactDOM from 'react-dom'
import type { User } from '@supabase/supabase-js'
import { useInvitations } from '../hooks/useInvitations'
import { sendInvitation } from '../lib/sessionApi'

interface UserMenuProps {
  user: User
  projectId: string
  onSignOut: () => void
}

export default function UserMenu({ user, projectId, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [inviteError, setInviteError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const email = user.email ?? ''
  const displayName = email.split('@')[0]
  const initials = displayName.slice(0, 2).toUpperCase()

  const { invitations, pendingCount, accept, reject } = useInvitations(email)

  // Când dropdown-ul e deschis, dezactivăm pointer-events pe Monaco ca să nu capteze click-urile
  useEffect(() => {
    const editors = document.querySelectorAll<HTMLElement>('.monaco-editor, .overflow-guard')
    editors.forEach(el => { el.style.pointerEvents = open ? 'none' : '' })
    return () => {
      editors.forEach(el => { el.style.pointerEvents = '' })
    }
  }, [open])

  const toggleOpen = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(o => !o)
  }, [])


  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteStatus('sending')
    setInviteError('')
    try {
      await sendInvitation(projectId, inviteEmail.trim())

      // Also trigger backend to send magic link email
      const { data: { session } } = await import('../lib/supabase').then(m => m.default.auth.getSession())
      await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), projectId }),
      })

      setInviteStatus('sent')
      setInviteEmail('')
      setTimeout(() => setInviteStatus('idle'), 3000)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
      setInviteStatus('error')
    }
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Avatar button */}
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: open ? 'rgba(236,72,153,0.15)' : 'transparent',
          border: '1.5px solid rgba(236,72,153,0.3)',
          borderRadius: '20px',
          padding: '4px 10px 4px 4px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          color: 'white',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.15)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Initials circle */}
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #f472b6, #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {initials}
        </div>
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        {/* Badge */}
        {pendingCount > 0 && (
          <div style={{
            minWidth: '16px', height: '16px', borderRadius: '8px',
            background: '#f472b6', color: 'white',
            fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>
            {pendingCount}
          </div>
        )}
      </button>

      {/* Portal: render backdrop + dropdown directly into document.body to escape any stacking context */}
      {open && ReactDOM.createPortal(
        <>
          {/* Backdrop — closes dropdown on outside click */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div ref={menuRef} style={{
            position: 'fixed', top: `${dropdownPos.top}px`, right: `${dropdownPos.right}px`,
            width: '280px',
            background: 'rgba(15,12,41,0.97)',
            border: '1px solid rgba(236,72,153,0.25)',
            borderRadius: '12px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 24px rgba(236,72,153,0.1)',
            backdropFilter: 'blur(20px)',
            zIndex: 9999,
            overflow: 'hidden',
            pointerEvents: 'all',
          }}>
            {/* User info */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(249,168,212,0.5)', fontFamily: 'monospace', marginBottom: '2px' }}>Logged in as</div>
              <div style={{ fontSize: '13px', color: 'white', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            </div>

            {/* Invitations received */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(249,168,212,0.5)', fontFamily: 'monospace', marginBottom: '8px', letterSpacing: '0.06em' }}>
                INVITATIONS {pendingCount > 0 && <span style={{ color: '#f472b6' }}>({pendingCount})</span>}
              </div>
              {invitations.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>No pending invitations</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {invitations.map(inv => (
                    <div key={inv.id} style={{
                      background: 'rgba(244,114,182,0.08)',
                      border: '1px solid rgba(244,114,182,0.2)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                    }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', marginBottom: '6px' }}>
                        Invited to collaborate
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={async () => {
                            await accept(inv.id)
                            window.location.href = '/editor'
                          }}
                          style={{
                            flex: 1, padding: '4px 0', fontSize: '11px', fontWeight: 600,
                            background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)',
                            borderRadius: '6px', color: '#34d399', cursor: 'pointer', fontFamily: 'monospace',
                          }}
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => reject(inv.id)}
                          style={{
                            flex: 1, padding: '4px 0', fontSize: '11px', fontWeight: 600,
                            background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
                            borderRadius: '6px', color: '#f87171', cursor: 'pointer', fontFamily: 'monospace',
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send invite */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(249,168,212,0.5)', fontFamily: 'monospace', marginBottom: '8px', letterSpacing: '0.06em' }}>
                INVITE COLLABORATOR
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendInvite() }}
                  placeholder="email@example.com"
                  disabled={inviteStatus === 'sending'}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px', padding: '6px 10px',
                    color: 'white', fontSize: '11px', fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleSendInvite}
                  disabled={inviteStatus === 'sending' || !inviteEmail.trim()}
                  style={{
                    padding: '6px 12px', fontSize: '11px', fontWeight: 600,
                    background: inviteStatus === 'sent' ? 'rgba(52,211,153,0.2)' : 'rgba(236,72,153,0.25)',
                    border: `1px solid ${inviteStatus === 'sent' ? 'rgba(52,211,153,0.4)' : '#f472b6'}`,
                    borderRadius: '6px',
                    color: inviteStatus === 'sent' ? '#34d399' : '#f9a8d4',
                    cursor: inviteStatus === 'sending' || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'monospace', whiteSpace: 'nowrap',
                    opacity: inviteStatus === 'sending' || !inviteEmail.trim() ? 0.5 : 1,
                  }}
                >
                  {inviteStatus === 'sending' ? '...' : inviteStatus === 'sent' ? '✓ Sent' : 'Send'}
                </button>
              </div>
              {inviteStatus === 'error' && (
                <div style={{ fontSize: '10px', color: '#f87171', fontFamily: 'monospace', marginTop: '4px' }}>{inviteError}</div>
              )}
            </div>

            {/* Sign out */}
            <div style={{ padding: '8px' }}>
              <button
                onClick={() => { setOpen(false); onSignOut() }}
                style={{
                  width: '100%', padding: '8px', fontSize: '12px',
                  background: 'transparent', border: 'none',
                  borderRadius: '6px', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontFamily: 'monospace', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#f87171' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
