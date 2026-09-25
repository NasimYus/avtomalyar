import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useLogout } from '@/entities/session'
import { Button } from '@/shared/ui'

export function LogoutButton({ className }: { className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useLogout()

  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      disabled={logout.isPending}
      onClick={() => {
        logout.mutate(undefined, {
          onSettled: () => {
            void navigate('/login', { replace: true })
          },
        })
      }}
    >
      {t('auth.signOut')}
    </Button>
  )
}
