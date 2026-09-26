import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib'
import { IconButton } from './button'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Sticky action area at the bottom of the panel. */
  footer?: ReactNode
  className?: string
}

/**
 * Right-hand side panel used for create/edit forms (the design puts the
 * "new purchase" form here). Built on <dialog> for the focus trap and
 * Escape handling.
 */
export function Drawer({ open, onClose, title, children, footer, className }: DrawerProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleClose = () => {
      onClose()
    }
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
    }
  }, [onClose])

  return (
    <dialog
      ref={ref}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'mr-0 ml-auto h-dvh max-h-dvh w-[min(430px,100vw)] max-w-none',
        'rounded-l-card bg-surface p-0 text-ink shadow-drawer',
        'backdrop:bg-ink/40',
        className,
      )}
    >
      <div className="flex h-full flex-col gap-4 p-7">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-black">{title}</h2>
          <IconButton label={t('common.close')} onClick={onClose}>
            ✕
          </IconButton>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">{children}</div>

        {footer !== undefined && <div className="grid gap-2">{footer}</div>}
      </div>
    </dialog>
  )
}

/** Grey context block used inside forms to show computed consequences. */
export function FormNote({
  tone = 'muted',
  children,
  className,
}: {
  tone?: 'muted' | 'success'
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-inner px-3.5 py-3 text-[13px] leading-[1.45] font-semibold',
        tone === 'success'
          ? 'bg-brand-green/10 font-bold text-brand-green-dark'
          : 'bg-surface-muted text-ink-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}
