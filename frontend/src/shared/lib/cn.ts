import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Joins class names and resolves conflicting Tailwind utilities, so a
 * component's own classes can always be overridden via a `className` prop.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
