import { createContext, useContext, useState } from 'react'
import type { FuelDetection } from '../lib/fuelFilter'

export interface CompletedFuel {
  fuelType: 'regular' | 'premium'
  amount: number
  storeName: string
  loggedAt: string
}

interface FuelContextValue {
  pendingFuel: FuelDetection | null
  triggerFuelPopup: (d: FuelDetection) => void
  clearFuelPopup: () => void
  completedFuel: CompletedFuel | null
  showComplete: (d: CompletedFuel) => void
  clearComplete: () => void
}

const FuelContext = createContext<FuelContextValue | null>(null)

export function FuelProvider({ children }: { children: React.ReactNode }) {
  const [pendingFuel, setPendingFuel] = useState<FuelDetection | null>(null)
  const [completedFuel, setCompletedFuel] = useState<CompletedFuel | null>(null)

  return (
    <FuelContext.Provider value={{
      pendingFuel,
      triggerFuelPopup: setPendingFuel,
      clearFuelPopup: () => setPendingFuel(null),
      completedFuel,
      showComplete: setCompletedFuel,
      clearComplete: () => setCompletedFuel(null),
    }}>
      {children}
    </FuelContext.Provider>
  )
}

export function useFuel() {
  const ctx = useContext(FuelContext)
  if (!ctx) throw new Error('useFuel must be used inside FuelProvider')
  return ctx
}
