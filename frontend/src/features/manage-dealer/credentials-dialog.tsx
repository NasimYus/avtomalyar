import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal } from '@/shared/ui'

interface Credentials {
  login: string
  password: string
}

/**
 * Shows a dealer's credentials once, right after they are generated. The
 * password is never retrievable afterwards — the admin has to reset it —
 * so the dialog makes copying easy and says so plainly.
 */
export function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials?: Credentials
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!credentials) return
    const text = `${t('dealers.login')}: ${credentials.login}\n${t('dealers.password')}: ${credentials.password}`
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
      })
      .catch(() => {
        // Clipboard can be blocked; the values stay visible on screen.
      })
  }

  return (
    <Modal
      open={credentials !== undefined}
      onClose={onClose}
      title={t('dealers.credentialsTitle')}
      footer={
        <>
          <Button variant="secondary" size="sm" className="bg-field" onClick={copy}>
            {copied ? t('dealers.copied') : t('dealers.copy')}
          </Button>
          <Button size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </>
      }
    >
      <p>{t('dealers.credentialsHint')}</p>
      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between rounded-inner bg-field px-4 py-3">
          <span className="text-xs font-semibold text-muted">{t('dealers.login')}</span>
          <b className="text-base">{credentials?.login}</b>
        </div>
        <div className="flex items-center justify-between rounded-inner bg-field px-4 py-3">
          <span className="text-xs font-semibold text-muted">{t('dealers.password')}</span>
          <b className="text-base tracking-[0.05em]">{credentials?.password}</b>
        </div>
      </div>
    </Modal>
  )
}
