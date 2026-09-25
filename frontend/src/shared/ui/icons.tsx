import type { SVGProps } from 'react'

/**
 * Small line icons for row actions. Hand-rolled instead of pulling in an
 * icon package — the admin needs a handful, all in the same 20×20 stroke
 * style.
 */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-[18px]"
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
