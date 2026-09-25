import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useLogin } from '@/entities/session'
import { ApiError } from '@/shared/api'
import { Button, FormField, Input } from '@/shared/ui'

const schema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

/**
 * Sign-in form. Credentials are issued by the shop, so there is no
 * self-service registration or password reset — only an error hint that
 * points the user back to their manager (ToR 3.5/3.7).
 */
export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation()
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { login: '', password: '' },
  })

  const failed = login.isError
  const serverMessage =
    login.error instanceof ApiError && login.error.isUnauthorized
      ? t('auth.invalidCredentials')
      : login.isError
        ? t('errors.generic')
        : null

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => onSuccess?.() })
  })

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event)
      }}
      className="grid gap-3"
      noValidate
    >
      {serverMessage !== null && (
        <div
          role="alert"
          className="rounded-[18px] bg-[#FFF1F1] px-3.5 py-3 text-[13px] font-bold text-brand-red-dark"
        >
          {serverMessage}
        </div>
      )}

      <FormField label={t('auth.login')} message={errors.login ? t('errors.required') : undefined}>
        {({ id, status }) => (
          <Input
            id={id}
            variant="outlined"
            status={failed && status === 'default' ? 'error' : status}
            autoComplete="username"
            autoFocus
            className="font-bold"
            {...register('login')}
          />
        )}
      </FormField>

      <FormField
        label={t('auth.password')}
        message={errors.password ? t('errors.required') : undefined}
      >
        {({ id, status }) => (
          <div className="relative">
            <Input
              id={id}
              variant="outlined"
              status={failed && status === 'default' ? 'error' : status}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-[104px] font-bold"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => {
                setShowPassword((value) => !value)
              }}
              className="absolute top-1/2 right-[18px] -translate-y-1/2 text-[13px] font-semibold text-muted hover:text-ink"
            >
              {showPassword ? t('auth.hide') : t('auth.show')}
            </button>
          </div>
        )}
      </FormField>

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={login.isPending}
        className="mt-1 text-base font-extrabold"
      >
        {login.isPending ? t('common.loading') : t('auth.signIn')}
      </Button>
    </form>
  )
}
