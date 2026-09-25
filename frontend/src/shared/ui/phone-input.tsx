import type { InputHTMLAttributes } from 'react'
import { useLayoutEffect, useRef } from 'react'
import { cn, formatPhone } from '@/shared/lib'
import { fieldClasses, type FieldStatus, type FieldVariant } from './field'

const COUNTRY_CODE = '+992'
/** Length of the "+992 " prefix inside a fully formatted value. */
const PREFIX_LENGTH = COUNTRY_CODE.length + 1

/** The national part of a formatted value: "+992 92 555 01 10" -> "92 555 01 10". */
function nationalPart(value: string): string {
  const formatted = formatPhone(value)
  return formatted === '' ? '' : formatted.slice(PREFIX_LENGTH)
}

/** Caret position counted in digits, so it survives reformatting. */
function digitsBefore(value: string, caret: number): number {
  return value.slice(0, caret).replace(/\D/g, '').length
}

/** Where that digit index sits inside the formatted national part. */
function caretForDigitIndex(national: string, index: number): number {
  if (index <= 0) return 0

  let seen = 0
  for (let i = 0; i < national.length; i += 1) {
    if (/\d/.test(national[i])) {
      seen += 1
      if (seen === index) return i + 1
    }
  }
  return national.length
}

interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'size'
> {
  /** Full value, e.g. "+992 92 555 01 10". Empty string when unset. */
  value: string
  onChange: (value: string) => void
  status?: FieldStatus
  variant?: FieldVariant
}

/**
 * Phone field for Tajik numbers. "+992" is always visible as a fixed part
 * of the field rather than something that appears once typing starts, so
 * the admin only ever types the nine national digits — and the caret can
 * never land inside the country code.
 *
 * The component still speaks the full formatted value to its parent.
 */
export function PhoneInput({
  value,
  onChange,
  status = 'default',
  variant = 'field',
  className,
  disabled,
  ...props
}: PhoneInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  // Where the caret should land once React writes the reformatted value
  // back into this controlled input.
  const pendingCaret = useRef<{ value: string; position: number } | null>(null)

  const national = nationalPart(value)

  useLayoutEffect(() => {
    const pending = pendingCaret.current
    const input = ref.current
    if (!pending || !input) return

    // Only restore on the render that carries our value; an unrelated
    // re-render must not move the caret.
    if (input.value !== pending.value) return

    pendingCaret.current = null
    input.setSelectionRange(pending.position, pending.position)
  })

  return (
    <div
      className={cn(
        fieldClasses(status, variant, className),
        'flex items-center gap-2',
        'focus-within:border-brand-red',
        disabled === true && 'opacity-60',
      )}
    >
      <span className="shrink-0 text-muted select-none">{COUNTRY_CODE}</span>
      <input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        value={national}
        className="w-full bg-transparent font-semibold text-ink placeholder:font-medium placeholder:text-faint focus:outline-none"
        onChange={(event) => {
          const input = event.target
          const caret = input.selectionStart ?? input.value.length
          const index = digitsBefore(input.value, caret)

          const nextNational = nationalPart(input.value)
          pendingCaret.current = {
            value: nextNational,
            position: caretForDigitIndex(nextNational, index),
          }

          onChange(nextNational === '' ? '' : `${COUNTRY_CODE} ${nextNational}`)
        }}
        {...props}
      />
    </div>
  )
}
