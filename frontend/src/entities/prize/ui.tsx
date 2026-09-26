import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib'
import { PRIZE_PHOTO } from './model'

/**
 * A prize photo in the shared 4:3 box. Framed photos fill it exactly;
 * one uploaded before framing existed is centred and trimmed to fit
 * rather than stretched. Without a photo — or when the file is gone —
 * a striped placeholder keeps the card's shape.
 */
export function PrizePhoto({
  src,
  className,
  placeholder = true,
}: {
  src?: string
  className?: string
  /** Show the "no photo" label in the placeholder; off for tiny thumbnails. */
  placeholder?: boolean
}) {
  const { t } = useTranslation()
  // Keyed by src, so a replaced photo gets a fresh chance to load.
  const [failed, setFailed] = useState<string | null>(null)
  const missing = src === undefined || failed === src

  return (
    <div
      className={cn('relative w-full overflow-hidden bg-white', className)}
      style={{ aspectRatio: String(PRIZE_PHOTO.aspect) }}
    >
      {missing ? (
        <div
          className="absolute inset-0 grid place-items-center text-xs font-medium text-faint"
          style={{
            background: 'repeating-linear-gradient(135deg, #ececef 0 10px, #f5f5f7 10px 20px)',
          }}
        >
          {placeholder && t('prizes.noPhoto')}
        </div>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          onError={() => {
            setFailed(src)
          }}
        />
      )}
    </div>
  )
}
