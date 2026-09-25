import type { ReactNode } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib'
import { ToastContext, type ToastAction, type ToastApi } from './toast-context'

type ToastTone = 'success' | 'error'

interface Toast {
  id: number
  tone: ToastTone
  message: string
  action?: ToastAction
}

const AUTO_DISMISS_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: string, action?: ToastAction) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, tone, message, action }])
      setTimeout(() => {
        dismiss(id)
      }, AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, action) => {
        push('success', message, action)
      },
      error: (message) => {
        push('error', message)
      },
    }),
    [push],
  )

  return (
    <ToastContext value={api}>
      {children}
      <div className="pointer-events-none fixed right-6 bottom-6 z-50 grid gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-4 rounded-[22px] px-[18px] py-3.5',
              'text-sm font-bold text-white shadow-modal',
              toast.tone === 'success' ? 'bg-brand-green' : 'bg-brand-red',
            )}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="opacity-85 underline-offset-2 hover:underline"
                onClick={() => {
                  toast.action?.onClick()
                  dismiss(toast.id)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
