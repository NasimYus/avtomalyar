import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MAX_ZOOM,
  clampCrop,
  cn,
  minZoom,
  panCrop,
  placeImage,
  type Crop,
  type Size,
} from '@/shared/lib'

interface ImageCropperProps {
  src: string
  /** Width / height of the frame — the shape every result will have. */
  aspect: number
  crop: Crop
  onChange: (crop: Crop) => void
  /** The source image's own size, once it has loaded. */
  onImageSize?: (size: Size) => void
  className?: string
}

/** Arrow keys move the photo by this many screen pixels. */
const KEY_STEP = 12
/** One wheel "click" (~100 deltaY) zooms by about 16%. */
const WHEEL_SENSITIVITY = 0.0015

/**
 * A fixed-shape frame to drag and zoom a photo in. Controlled: the parent
 * owns the Crop, which does not depend on the frame's on-screen size, so
 * it can be rendered at full resolution afterwards (renderCrop).
 *
 * Drag (mouse or finger) to move, wheel or the slider to zoom, arrows and
 * +/− from the keyboard. Zooming out below "cover" leaves white bands —
 * that is how a photo is fitted whole.
 */
export function ImageCropper({
  src,
  aspect,
  crop,
  onChange,
  onImageSize,
  className,
}: ImageCropperProps) {
  const { t } = useTranslation()
  const frameRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState<Size | null>(null)
  const [image, setImage] = useState<Size | null>(null)
  const [dragging, setDragging] = useState(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  // Latest values for event handlers. Pointer and wheel events can fire
  // several times before the parent re-renders with the new crop, so each
  // step builds on the crop last emitted, not the one last rendered.
  const latest = useRef({ crop, frame, image, onChange })
  useEffect(() => {
    latest.current = { crop, frame, image, onChange }
  })
  const emit = (next: Crop) => {
    latest.current.crop = next
    onChange(next)
  }

  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setFrame({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  // React's onWheel is passive, so it cannot stop the drawer from
  // scrolling while the photo zooms — hence a native listener.
  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      const { crop: current, frame: f, image: i, onChange: change } = latest.current
      if (!f || !i) return
      event.preventDefault()
      const zoom = current.zoom * Math.exp(-event.deltaY * WHEEL_SENSITIVITY)
      const next = clampCrop({ ...current, zoom }, f, i)
      latest.current.crop = next
      change(next)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      element.removeEventListener('wheel', onWheel)
    }
  }, [])

  const ready = frame !== null && image !== null
  const place = ready ? placeImage(crop, frame, image) : null
  const lowest = ready ? minZoom(frame, image) : 1

  const zoomTo = (zoom: number) => {
    if (ready) emit(clampCrop({ ...latest.current.crop, zoom }, frame, image))
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    last.current = { x: event.clientX, y: event.clientY }
    setDragging(true)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!last.current || !ready) return
    const dx = event.clientX - last.current.x
    const dy = event.clientY - last.current.y
    last.current = { x: event.clientX, y: event.clientY }
    emit(panCrop(latest.current.crop, dx, dy, frame, image))
  }
  const endDrag = () => {
    last.current = null
    setDragging(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!ready) return
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [KEY_STEP, 0],
      ArrowRight: [-KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
      ArrowDown: [0, -KEY_STEP],
    }
    const move = moves[event.key] as [number, number] | undefined
    if (move) {
      event.preventDefault()
      emit(panCrop(latest.current.crop, move[0], move[1], frame, image))
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomTo(latest.current.crop.zoom * 1.1)
    } else if (event.key === '-') {
      event.preventDefault()
      zoomTo(latest.current.crop.zoom / 1.1)
    }
  }

  return (
    <div className={cn('grid gap-3', className)}>
      <div
        ref={frameRef}
        role="application"
        tabIndex={0}
        aria-label={t('cropper.frame')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          // White like the file it produces: zooming out shows the bands
          // the uploaded photo will really have.
          'relative w-full touch-none overflow-hidden rounded-inner bg-white ring-1 ring-border select-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ aspectRatio: String(aspect) }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(event) => {
            const size = {
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            }
            setImage(size)
            onImageSize?.(size)
          }}
          className={cn('pointer-events-none absolute max-w-none', !place && 'invisible')}
          style={
            place
              ? { left: place.left, top: place.top, width: place.width, height: place.height }
              : undefined
          }
        />
        {/* Rule of thirds, to help put the prize where the eye goes. */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 transition-opacity',
            dragging ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            backgroundImage:
              'linear-gradient(to right, transparent calc(33.33% - 0.5px), rgb(255 255 255 / 0.8) calc(33.33% - 0.5px), rgb(255 255 255 / 0.8) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgb(255 255 255 / 0.8) calc(66.66% - 0.5px), rgb(255 255 255 / 0.8) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgb(255 255 255 / 0.8) calc(33.33% - 0.5px), rgb(255 255 255 / 0.8) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgb(255 255 255 / 0.8) calc(66.66% - 0.5px), rgb(255 255 255 / 0.8) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))',
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            zoomTo(lowest)
          }}
          className="rounded-chip bg-field px-3 py-2 text-xs font-bold hover:bg-line"
        >
          {t('cropper.fit')}
        </button>
        <input
          type="range"
          aria-label={t('cropper.zoom')}
          min={lowest}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          disabled={!ready}
          onChange={(event) => {
            zoomTo(Number(event.target.value))
          }}
          className="min-w-0 flex-1 accent-brand-red"
        />
        <button
          type="button"
          onClick={() => {
            zoomTo(1)
          }}
          className="rounded-chip bg-field px-3 py-2 text-xs font-bold hover:bg-line"
        >
          {t('cropper.fill')}
        </button>
      </div>
    </div>
  )
}
