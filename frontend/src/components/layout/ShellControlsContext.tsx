import { createContext, useContext } from 'react'

interface ShellControls {
  openMobileNavigation: () => void
}

const ShellControlsContext = createContext<ShellControls | null>(null)

export const ShellControlsProvider = ShellControlsContext.Provider

export function useShellControls() {
  return useContext(ShellControlsContext)
}
