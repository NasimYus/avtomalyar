import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useId } from 'react'
import { cn } from '@/shared/lib'

export type FieldStatus = 'default' | 'error' | 'warning'

/**
 * "field" is the grey control used across admin forms; "outlined" is the
 * larger white control from the sign-in screen.
 */
export type FieldVariant = 'field' | 'outlined'

const STATUS_CLASSES: Record<FieldVariant, Record<FieldStatus, string>> = {
  field: {
    default: 'border-transparent bg-field focus:border-brand-red',
    error: 'border-brand-red bg-danger-bg',
    warning: 'border-brand-yellow bg-warning-bg',
  },
  outlined: {
    default: 'border-line-strong bg-surface focus:border-ink',
    error: 'border-brand-red bg-surface',
    warning: 'border-brand-yellow bg-surface',
  },
}

const VARIANT_CLASSES: Record<FieldVariant, string> = {
  field: 'rounded-field px-3.5 py-3 text-sm',
  outlined: 'rounded-inner px-[18px] py-[15px] text-base',
}

const MESSAGE_CLASSES: Record<Exclude<FieldStatus, 'default'>, string> = {
  error: 'text-brand-red-dark',
  warning: 'text-brand-yellow-dark',
}

/**
 * Shared look for every control; the 2px border is reserved for states.
 * Exported so custom inputs (PhoneInput) look identical without
 * duplicating the styling.
 */
export function fieldClasses(
  status: FieldStatus,
  variant: FieldVariant = 'field',
  className?: string,
): string {
  return cn(
    'w-full border-2 font-semibold text-ink',
    'placeholder:font-medium placeholder:text-faint',
    'focus:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT_CLASSES[variant],
    STATUS_CLASSES[variant][status],
    className,
  )
}

interface FormFieldProps {
  label?: ReactNode
  /** Validation message; its presence switches the control into `status`. */
  message?: ReactNode
  status?: FieldStatus
  hint?: ReactNode
  className?: string
  children: (props: { id: string; status: FieldStatus }) => ReactNode
}

/** Label + control + validation message, matching the design's form rows. */
export function FormField({
  label,
  message,
  status = 'default',
  hint,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const effectiveStatus: FieldStatus =
    message !== undefined && status === 'default' ? 'error' : status

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label !== undefined && (
        <label htmlFor={id} className="text-[13px] font-bold">
          {label}
        </label>
      )}
      {children({ id, status: effectiveStatus })}
      {message !== undefined && effectiveStatus !== 'default' && (
        <span className={cn('text-xs font-bold', MESSAGE_CLASSES[effectiveStatus])}>{message}</span>
      )}
      {message === undefined && hint !== undefined && (
        <span className="text-xs font-medium text-muted">{hint}</span>
      )}
    </div>
  )
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  status?: FieldStatus
  variant?: FieldVariant
  /** Larger type for money fields, as in the "Сумма, сомони" input. */
  emphasis?: boolean
}

export function Input({
  status = 'default',
  variant = 'field',
  emphasis = false,
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={fieldClasses(
        status,
        variant,
        cn(emphasis && 'py-3.5 text-[22px] font-black', className),
      )}
      {...props}
    />
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  status?: FieldStatus
  variant?: FieldVariant
}

export function Textarea({
  status = 'default',
  variant = 'field',
  className,
  rows = 3,
  ...props
}: TextareaProps) {
  return <textarea rows={rows} className={fieldClasses(status, variant, className)} {...props} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  status?: FieldStatus
  variant?: FieldVariant
}

export function Select({
  status = 'default',
  variant = 'field',
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <select
      className={cn(fieldClasses(status, variant, className), 'appearance-none pr-9')}
      {...props}
    >
      {children}
    </select>
  )
}

/** White pill search box used above admin tables. */
export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="search"
      className={cn(
        'min-w-[260px] flex-1 rounded-card border-2 border-transparent bg-surface px-[18px] py-3',
        'text-sm font-semibold text-ink placeholder:font-medium placeholder:text-faint',
        'focus:border-brand-red focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}
