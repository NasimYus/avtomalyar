import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { cn } from '@/shared/lib'
import { Button } from './button'

/**
 * Syncs a native <dialog> with an `open` prop. The native element gives us
 * a focus trap, Escape handling and an inert backdrop for free.
 */
function useNativeDialog(open: boolean, onClose: () => void) {
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

  return ref
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Small mono-ish kicker above the title, as in the design. */
  kicker?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, kicker, children, footer, className }: ModalProps) {
  const ref = useNativeDialog(open, onClose)

  return (
    <dialog
      ref={ref}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto w-[min(520px,calc(100vw-32px))] rounded-card bg-surface p-6 text-ink shadow-modal',
        // Browsers give <dialog> overflow:auto, which clips a select's
        // dropdown at the modal edge. Modals here are short — long forms
        // belong in a Drawer — so letting content escape is the right
        // trade for dropdowns that stay readable.
        'overflow-visible',
        'backdrop:bg-ink/40 open:animate-in',
        className,
      )}
    >
      {kicker !== undefined && (
        <div className="text-xs font-semibold tracking-[0.04em] text-muted">{kicker}</div>
      )}
      <h2 className="mt-2.5 text-xl font-black">{title}</h2>
      {children !== undefined && (
        <div className="mt-2 text-[13px] leading-[1.55] text-ink-soft">{children}</div>
      )}
      {footer !== undefined && <div className="mt-[18px] flex justify-end gap-2">{footer}</div>}
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  /** Spell out the consequences — the design does this deliberately. */
  description?: ReactNode
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  busy?: boolean
  /** Blocks confirmation when the action is known to be impossible. */
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" size="sm" className="bg-field" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description}
    </Modal>
  )
}
