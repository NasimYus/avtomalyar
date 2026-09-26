import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResetDealerPassword, type Dealer } from '@/entities/dealer'
import { Button, CopyIcon, IconButton, Modal, useToast } from '@/shared/ui'
import { apiErrorMessage } from '@/shared/api'

function CopyableRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex items-center justify-between gap-3 rounded-inner bg-field px-4 py-3">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <b className="text-base break-all">{value}</b>
        <IconButton
          label={copied ? t('dealers.copied') : t('dealers.copy')}
          variant="ghost"
          className="size-8"
          onClick={() => {
            navigator.clipboard
              .writeText(value)
              .then(() => {
                setCopied(true)
              })
              .catch(() => {
                // Clipboard can be blocked; the value stays on screen.
              })
          }}
        >
          <CopyIcon />
        </IconButton>
      </div>
    </div>
  )
}

interface DealerAccessDialogProps {
  dealer?: Dealer
  /** Password revealed once, right after the dealer was created. */
  initialPassword?: string
  onClose: () => void
}

/**
 * Shows a dealer's access details on demand. The login is always
 * available; the password is not — it's stored only as a bcrypt hash, so
 * the dialog can't reveal the current one and instead issues a new one.
 */
export function DealerAccessDialog({ dealer, initialPassword, onClose }: DealerAccessDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const reset = useResetDealerPassword()
  const [issuedPassword, setIssuedPassword] = useState<string | undefined>(undefined)

  const password = issuedPassword ?? initialPassword

  const close = () => {
    setIssuedPassword(undefined)
    onClose()
  }

  return (
    <Modal
      open={dealer !== undefined}
      onClose={close}
      title={t('dealers.accessTitle')}
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            className="bg-field"
            disabled={reset.isPending}
            onClick={() => {
              if (!dealer) return
              reset.mutate(dealer.id, {
                onSuccess: ({ password: next }) => {
                  setIssuedPassword(next)
                  toast.success(t('dealers.passwordIssued'))
                },
                onError: (error) => {
                  toast.error(apiErrorMessage(error, t))
                },
              })
            }}
          >
            {reset.isPending ? t('common.loading') : t('dealers.issuePassword')}
          </Button>
          <Button size="sm" onClick={close}>
            {t('common.close')}
          </Button>
        </>
      }
    >
      <div className="grid gap-2">
        <CopyableRow label={t('dealers.login')} value={dealer?.login ?? ''} />

        {password === undefined ? (
          <p className="rounded-inner bg-surface-muted px-4 py-3 text-[13px] leading-[1.5] font-semibold text-ink-soft">
            {t('dealers.passwordNotStored')}
          </p>
        ) : (
          <>
            <CopyableRow label={t('dealers.password')} value={password} />
            <p className="px-1 text-xs font-bold text-brand-yellow-dark">
              {t('dealers.passwordShownOnce')}
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
