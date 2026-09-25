import { cn, initials } from '@/shared/lib'

export type AvatarTone = 'neutral' | 'dark' | 'red'

const TONES: Record<AvatarTone, string> = {
  neutral: 'bg-line-strong text-ink',
  dark: 'bg-ink text-white',
  red: 'bg-brand-red text-white',
}

interface AvatarProps {
  name: string
  tone?: AvatarTone
  size?: 'sm' | 'md'
  className?: string
}

/** Initials circle used in dealer lists and cards. */
export function Avatar({ name, tone = 'neutral', size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-extrabold',
        size === 'sm' ? 'size-8 text-[11px]' : 'size-9 text-xs',
        TONES[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
