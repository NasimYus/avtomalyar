import type { SVGProps } from 'react'
import { cn } from '@/shared/lib'

/**
 * Small line icons for row actions. Hand-rolled instead of pulling in an
 * icon package — the admin needs a handful, all in the same 20×20 stroke
 * style.
 */
function Icon({ children, className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      // Merged, not overwritten: a caller adding a margin must not lose
      // the icon's size and end up with a full-width SVG.
      className={cn('size-[18px] shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  )
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M13.2 3.6a1.7 1.7 0 0 1 2.4 2.4L7.3 14.3l-3.1.7.7-3.1 8.3-8.3Z" />
      <path d="M12.2 4.6l2.4 2.4" />
    </Icon>
  )
}

export function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="3.2" />
      <path d="M9.4 9.4 16 16" />
      <path d="M13.6 13.6 12 15.2" />
    </Icon>
  )
}

export function PowerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M10 3.5v6" />
      <path d="M14.6 5.9a6 6 0 1 1-9.2 0" />
    </Icon>
  )
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 6h12" />
      <path d="M8 6V4.5h4V6" />
      <path d="M5.5 6l.7 9a1.3 1.3 0 0 0 1.3 1.2h5a1.3 1.3 0 0 0 1.3-1.2l.7-9" />
      <path d="M8.5 9v5M11.5 9v5" />
    </Icon>
  )
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="7" y="7" width="9" height="9" rx="2" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4H5.5A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </Icon>
  )
}

export function TrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6.5 3h7v4.5a3.5 3.5 0 0 1-7 0V3Z" />
      <path d="M6.5 4.5h-2a2 2 0 0 0 2 3.6" />
      <path d="M13.5 4.5h2a2 2 0 0 1-2 3.6" />
      <path d="M10 11v2.5" />
      <path d="M7.2 17h5.6l-.7-3.5H7.9L7.2 17Z" />
    </Icon>
  )
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="8.5" width="11" height="7.5" rx="2" />
      <path d="M7.2 8.5V6.4a2.8 2.8 0 0 1 5.6 0v2.1" />
    </Icon>
  )
}

export function ArchiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="14" height="3.6" rx="1.2" />
      <path d="M4.6 7.6v6.6a2 2 0 0 0 2 2h6.8a2 2 0 0 0 2-2V7.6" />
      <path d="M8.2 11h3.6" />
    </Icon>
  )
}
