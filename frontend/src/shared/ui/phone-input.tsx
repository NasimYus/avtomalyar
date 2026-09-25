import type { InputHTMLAttributes } from 'react'
import { useLayoutEffect, useRef } from 'react'
import { formatPhone } from '@/shared/lib'
import { fieldClasses, type FieldStatus, type FieldVariant } from './field'

const PREFIX = '+992 '

/**
 * Caret position counted in national digits, so it can be restored after
 * the value is reformatted. Country-code digits don't count.
 */
function nationalIndexAt(value: string, caret: number): number {
  const digits = value.slice(0, caret).replace(/\D/g, '')
  return digits.startsWith('992') ? digits.length - 3 : digits.length
}

/** Where that national digit index sits inside the formatted value. */
function caretForNationalIndex(formatted: string, index: number): number {
  if (formatted === '') return 0
  if (index <= 0) return PREFIX.length

  let seen = 0
  for (let i = PREFIX.length; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1
      if (seen === index) return i + 1
    }
  }
  return formatted.length
}

interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'size'
> {
  value: string
  onChange: (value: string) => void
  status?: FieldStatus
  variant?: FieldVariant
}

/**
 * Phone field masked as "+992 92 555 01 10". The value is reformatted on
 * every keystroke, and the caret is restored by digit position so editing
 * in the middle of a number doesn't throw it to the end.
 */
export function PhoneInput({
  value,
  onChange,
  status = 'default',
  variant = 'field',
  className,
  ...props
}: PhoneInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  // Where the caret should land once React has written the reformatted
  // value back into this controlled input.
  const pendingCaret = useRef<{ value: string; position: number } | null>(null)

  useLayoutEffect(() => {
    const pending = pendingCaret.current
    const input = ref.current
    if (!pending || !input) return

    // Only restore for the render that actually carries our value —
    // otherwise a later, unrelated render would move the caret.
    if (input.value !== pending.value) return

    pendingCaret.current = null
    input.setSelectionRange(pending.position, pending.position)
  })

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      className={fieldClasses(status, variant, className)}
      onChange={(event) => {
        const input = event.target
        const caret = input.selectionStart ?? input.value.length
        const index = nationalIndexAt(input.value, caret)

        const formatted = formatPhone(input.value)
        pendingCaret.current = {
          value: formatted,
          position: caretForNationalIndex(formatted, index),
        }
        onChange(formatted)
      }}
      {...props}
    />
  )
}
