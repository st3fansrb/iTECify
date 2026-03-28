import { useState } from 'react'
import type { TerminalEntry } from './useSharedTerminal'

export interface UsePersonalTerminalReturn {
  personalOutputs: TerminalEntry[]
  addPersonalEntry: (entry: TerminalEntry) => void
  clearPersonalOutputs: () => void
}

export function usePersonalTerminal(): UsePersonalTerminalReturn {
  const [personalOutputs, setPersonalOutputs] = useState<TerminalEntry[]>([])

  const addPersonalEntry = (entry: TerminalEntry) => {
    setPersonalOutputs(prev => [...prev, entry])
  }

  const clearPersonalOutputs = () => setPersonalOutputs([])

  return { personalOutputs, addPersonalEntry, clearPersonalOutputs }
}
