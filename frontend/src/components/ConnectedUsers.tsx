/**
 * ConnectedUsers — shows avatar dots for each collaborator currently in the room.
 * Uses displayName + avatarColor from the presence payload (no extra DB fetch needed).
 */

import type { ConnectedUser } from '../hooks/useRealtimeEditor'

interface ConnectedUsersProps {
  users: ConnectedUser[]
  currentUserId?: string | null
}

const FALLBACK_COLORS = ['#f472b6', '#818cf8', '#34d399', '#fb923c', '#38bdf8']

function UserDot({ user, index, isSelf }: { user: ConnectedUser; index: number; isSelf: boolean }) {
  const color = user.avatarColor ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  const label = user.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user.userId.slice(0, 2).toUpperCase()
  const title = user.displayName ?? user.userId.slice(0, 8)

  return (
    <div
      title={isSelf ? `${title} (you)` : title}
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: color,
        border: isSelf ? '2px solid rgba(255,255,255,0.7)' : '2px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 700,
        color: '#0f0c29',
        cursor: 'default',
        flexShrink: 0,
        transition: 'transform 0.2s',
        marginLeft: index > 0 ? '-8px' : 0,
        zIndex: 10 - index,
        position: 'relative',
        boxShadow: `0 0 0 2px rgba(15,12,41,0.9), 0 0 8px ${color}55`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = '20' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = String(10 - index) }}
    >
      {label}
    </div>
  )
}

export default function ConnectedUsers({ users, currentUserId }: ConnectedUsersProps) {
  if (users.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '0 12px',
    }}>
      <span style={{
        fontSize: '10px',
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        marginRight: '2px',
      }}>
        {users.length} online
      </span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {users.map((u, i) => (
          <UserDot
            key={u.userId}
            user={u}
            index={i}
            isSelf={u.userId === currentUserId}
          />
        ))}
      </div>
    </div>
  )
}
