import { useEffect, useState } from 'react'

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
]

export function useKonamiCode() {
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    let buffer: string[] = []
    const onKey = (e: KeyboardEvent) => {
      buffer = [...buffer, e.key].slice(-KONAMI.length)
      if (buffer.join(',') === KONAMI.join(',')) {
        setActivated(true)
        buffer = []
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { activated, reset: () => setActivated(false) }
}
