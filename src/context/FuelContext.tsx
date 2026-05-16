import { createContext, useContext, useState } from 'react'
import type { FuelDetection } from '../lib/fuelFilter'

interface FuelContextValue {
  pendingFuel: FuelDetection | null
  triggerFuelPopup: (d: FuelDetection) => void
  clearFuelPopup: () => void
}

const FuelContext = createContext<FuelContextValue | null>(null)

export function FuelProvider({ children }: { children: React.ReactNode }) {
  const [pendingFuel, setPendingFuel] = useState<FuelDetection | null>(null)

  return (
    <FuelContext.Provider value={{
      pendingFuel,
      triggerFuelPopup: setPendingFuel,
      clearFuelPopup: () => setPendingFuel(null),
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
