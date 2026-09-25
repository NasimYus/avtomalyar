import { createContext, use } from 'react'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastApi {
  success: (message: string, action?: ToastAction) => void
  error: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
