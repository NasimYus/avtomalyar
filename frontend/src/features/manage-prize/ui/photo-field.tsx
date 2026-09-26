import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { PRIZE_PHOTO, PrizePhoto } from '@/entities/prize'
import {
  INITIAL_CROP,
  cn,
  loadImage,
  renderCrop,
  upscaleFactor,
  type Crop,
  type Size,
} from '@/shared/lib'
import { Button, ImageCropper, Modal } from '@/shared/ui'

/**
 * The picked file is only a source: what gets uploaded is the framed
 * 1200×900 JPEG, far under the server's 5 MB limit. So a big photo
 * straight off a phone is fine here.
 */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** Enlarging the source more than this makes the card look soft. */
const LOW_RES_UPSCALE = 2

/** An image to frame: a picked file (an object URL we own) or the stored photo. */
interface Source {
  url: string
  owned: boolean
}

interface Draft extends Source {
  crop: Crop
}

/**
 * The prize photo control: pick or drop a file, frame it into the prize
 * photo shape, see it exactly as the cards will. Reports the framed file
 * to the form; nothing is uploaded until the form is saved.
 *
 * The original stays around, so reframing starts from the full picture
 * rather than from the previous crop. A stored photo can be reframed too
 * — handy for photos uploaded before framing existed.
 */
export function PrizePhotoField({
  currentUrl,
  onChange,
}: {
  /** The photo already stored for the prize, if any. */
  currentUrl?: string
  onChange: (file: File | null) => void
}) {
  const { t } = useTranslation()
  const fileInput = useRef<HTMLInputElement>(null)

  const [source, setSource] = useState<Source | null>(null)
  const [crop, setCrop] = useState<Crop>(INITIAL_CROP)
  const [result, setResult] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [imageSize, setImageSize] = useState<Size | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Object URLs we created, released when the form closes.
  const owned = useRef(new Set<string>())
  useEffect(() => {
    const urls = owned.current
    return () => {
      urls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [])
  const own = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    owned.current.add(url)
    return url
  }
  const release = (url: string | null | undefined) => {
    if (url && owned.current.delete(url)) URL.revokeObjectURL(url)
  }

  const pickFile = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('prizes.photoInvalid'))
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError(t('prizes.photoTooLarge'))
      return
    }
    setError(null)
    setImageSize(null)
    setDraft({ url: own(file), owned: true, crop: INITIAL_CROP })
  }

  const reframe = () => {
    const url = source?.url ?? currentUrl
    if (url === undefined) return
    setImageSize(null)
    setDraft({ url, owned: false, crop: source ? crop : INITIAL_CROP })
  }

  const cancel = () => {
    if (draft && draft.url !== source?.url) release(draft.url)
    setDraft(null)
  }

  const apply = async () => {
    if (!draft) return
    setPreparing(true)
    try {
      const image = await loadImage(draft.url)
      const blob = await renderCrop(image, draft.crop, PRIZE_PHOTO)
      const file = new File([blob], 'prize.jpg', { type: blob.type })

      release(result)
      setResult(own(blob))
      if (source && source.url !== draft.url) release(source.url)
      setSource({ url: draft.url, owned: draft.owned })
      setCrop(draft.crop)
      setDraft(null)
      onChange(file)
    } catch {
      setError(t('prizes.photoInvalid'))
      cancel()
    } finally {
      setPreparing(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragOver(false)
    pickFile(event.dataTransfer.files[0])
  }

  const shown = result ?? currentUrl
  const lowRes =
    draft !== null &&
    imageSize !== null &&
    upscaleFactor(draft.crop, PRIZE_PHOTO, imageSize) > LOW_RES_UPSCALE

  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-bold">{t('prizes.photo')}</span>

      <button
        type="button"
        onClick={() => {
          fileInput.current?.click()
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => {
          setDragOver(false)
        }}
        onDrop={onDrop}
        className={cn(
          'overflow-hidden rounded-[22px] border-2 text-xs font-semibold text-muted transition-colors hover:border-brand-red',
          shown === undefined && 'border-dashed',
          error !== null
            ? 'border-brand-red'
            : dragOver
              ? 'border-brand-red'
              : shown === undefined
                ? 'border-border-dashed'
                : 'border-transparent',
        )}
      >
        {shown === undefined ? (
          <span
            className="grid place-items-center px-6 text-center"
            style={{ aspectRatio: String(PRIZE_PHOTO.aspect) }}
          >
            {t('prizes.photoHint')}
          </span>
        ) : (
          <PrizePhoto src={shown} />
        )}
      </button>

      {shown !== undefined && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="bg-field" onClick={reframe}>
            {t('prizes.photoRecrop')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-field"
            onClick={() => {
              fileInput.current?.click()
            }}
          >
            {t('prizes.photoReplace')}
          </Button>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          pickFile(event.target.files?.[0])
          // Picking the same file again must still fire a change.
          event.target.value = ''
        }}
      />

      {error !== null ? (
        <span className="text-xs font-bold text-brand-red-dark">{error}</span>
      ) : (
        <span className="text-xs font-medium text-muted">{t('prizes.photoFormat')}</span>
      )}

      {draft !== null && (
        <Modal
          open
          onClose={cancel}
          title={t('prizes.photoCropTitle')}
          footer={
            <>
              <Button variant="ghost" onClick={cancel} disabled={preparing}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={preparing || imageSize === null}
                onClick={() => {
                  void apply()
                }}
              >
                {preparing ? t('prizes.photoPreparing') : t('prizes.photoApply')}
              </Button>
            </>
          }
        >
          <p>{t('prizes.photoCropHint')}</p>
          <ImageCropper
            className="mt-3"
            src={draft.url}
            aspect={PRIZE_PHOTO.aspect}
            crop={draft.crop}
            onChange={(next) => {
              setDraft((current) => current && { ...current, crop: next })
            }}
            onImageSize={setImageSize}
          />
          {lowRes && (
            <p className="mt-2 text-xs font-bold text-brand-yellow-dark">
              {t('prizes.photoLowRes')}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
