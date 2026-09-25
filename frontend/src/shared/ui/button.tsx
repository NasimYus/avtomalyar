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
  label: string
  children: ReactNode
}

/** Round 36px button used for "close" and row actions. */
export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'grid size-9 place-items-center rounded-full bg-field text-base',
        'transition-colors hover:bg-line-strong',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
