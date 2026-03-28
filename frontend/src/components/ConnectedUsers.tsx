/**
 * ConnectedUsers — shows avatar dots for each collaborator currently viewing the file.
 * Pulls display_name + avatar_color from the `profiles` table via useProfile.
 */

import { useProfile } from '../hooks/useProfile'
import type { ConnectedUser } from '../hooks/useRealtimeEditor'

interface ConnectedUsersProps {
  users: ConnectedUser[]
  currentUserId?: string | null
}

const FALLBACK_COLORS = ['#f472b6', '#818cf8', '#34d399', '#fb923c', '#38bdf8']

function UserDot({ userId, index, isSelf }: { userId: string; index: number; isSelf: boolean }) {
  const { profile } = useProfile(userId)

  const color = profile?.avatar_color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  const label = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : userId.slice(0, 2).toUpperCase()
  const title = profile?.display_name ?? userId.slice(0, 8)

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
            userId={u.userId}
            index={i}
            isSelf={u.userId === currentUserId}
          />
        ))}
      </div>
    </div>
  )
}
