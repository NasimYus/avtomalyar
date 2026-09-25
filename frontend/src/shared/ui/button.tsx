import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib'

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-red text-white shadow-glow hover:bg-brand-red-dark',
  dark: 'bg-ink text-white hover:bg-night',
  secondary: 'bg-surface text-ink hover:bg-line',
  ghost: 'bg-transparent text-muted hover:text-ink',
  danger: 'bg-brand-red text-white hover:bg-brand-red-dark',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2.5 text-[13px]',
  md: 'px-5 py-[11px] text-sm',
  lg: 'px-5 py-[15px] text-[15px]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-card font-bold whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; also shown as the native tooltip. */
  label: string
  children: ReactNode
  /** "solid" is the grey circle used for close buttons. */
  variant?: 'solid' | 'ghost'
  tone?: 'neutral' | 'danger'
}

const ICON_TONES: Record<NonNullable<IconButtonProps['tone']>, string> = {
  neutral: 'text-ink-soft hover:text-ink',
  danger: 'text-brand-red hover:text-brand-red-dark',
}

/** Round icon button used for close and for compact row actions. */
export function IconButton({
  label,
  variant = 'solid',
  tone = 'neutral',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'solid' ? 'bg-field text-base hover:bg-line-strong' : 'hover:bg-field',
        ICON_TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
