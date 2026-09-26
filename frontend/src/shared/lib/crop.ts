/**
 * Framing an image into a fixed-aspect frame — the maths behind the photo
 * cropper, kept apart from the DOM so it can be tested.
 *
 * A crop is stored independently of how big the frame happens to be on
 * screen: `zoom` is relative to "cover" (1 = the image just fills the
 * frame), and `x`/`y` is the point of the image, as a fraction of its
 * width and height, that sits in the middle of the frame. The same crop
 * therefore renders identically in the 300px editor and in the 1200px
 * file that gets uploaded.
 */
export interface Crop {
  zoom: number
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** How far past "cover" the editor lets you zoom in. */
export const MAX_ZOOM = 4

/** Scale at which the image just covers the frame. */
function coverScale(frame: Size, image: Size): number {
  return Math.max(frame.width / image.width, frame.height / image.height)
}

/**
 * The smallest zoom: the whole image fits inside the frame, with empty
 * bands on two sides. Below 1 because "cover" is the reference.
 */
export function minZoom(frame: Size, image: Size): number {
  const contain = Math.min(frame.width / image.width, frame.height / image.height)
  return contain / coverScale(frame, image)
}

/** The image centred and just covering the frame. */
export const INITIAL_CROP: Crop = { zoom: 1, x: 0.5, y: 0.5 }

/**
 * Keeps one axis in range. `half` is half the frame, as a fraction of the
 * displayed image: when the image overflows the frame, the centre may not
 * move so far that a gap opens at an edge; when it is smaller than the
 * frame, it may not leave the frame.
 */
function clampAxis(value: number, half: number): number {
  const lo = Math.min(half, 1 - half)
  const hi = Math.max(half, 1 - half)
  return Math.min(hi, Math.max(lo, value))
}

/** Brings a crop back into bounds after a drag or a zoom. */
export function clampCrop(crop: Crop, frame: Size, image: Size): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(minZoom(frame, image), crop.zoom))
  const scale = coverScale(frame, image) * zoom
  return {
    zoom,
    x: clampAxis(crop.x, frame.width / (2 * image.width * scale)),
    y: clampAxis(crop.y, frame.height / (2 * image.height * scale)),
  }
}

/** Where the image goes inside a frame of the given size, in its pixels. */
export function placeImage(
  crop: Crop,
  frame: Size,
  image: Size,
): { left: number; top: number; width: number; height: number } {
  const scale = coverScale(frame, image) * crop.zoom
  const width = image.width * scale
  const height = image.height * scale
  return {
    left: frame.width / 2 - crop.x * width,
    top: frame.height / 2 - crop.y * height,
    width,
    height,
  }
}

/** A drag of (dx, dy) screen pixels, as a new crop. */
export function panCrop(crop: Crop, dx: number, dy: number, frame: Size, image: Size): Crop {
  const { width, height } = placeImage(crop, frame, image)
  return clampCrop({ ...crop, x: crop.x - dx / width, y: crop.y - dy / height }, frame, image)
}

/**
 * How much the crop enlarges the source when drawn at `output` size: 1
 * is pixel for pixel, 3 means every source pixel becomes three — a photo
 * that small will look soft on the card, which is worth a warning.
 */
export function upscaleFactor(crop: Crop, output: Size, image: Size): number {
  return placeImage(crop, output, image).width / image.width
}

/** Loads an image (an object URL or a same-origin path) for drawing. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.onerror = () => {
      reject(new Error(`could not load image ${src}`))
    }
    image.src = src
  })
}

/**
 * Draws the crop onto a canvas of `output` size and returns it as a file.
 * The background is filled first, so a zoomed-out photo or a transparent
 * PNG comes out on white rather than black.
 */
export async function renderCrop(
  image: HTMLImageElement,
  crop: Crop,
  output: Size,
  { type = 'image/jpeg', quality = 0.88, background = '#ffffff' } = {},
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = output.width
  canvas.height = output.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 2d context is unavailable')

  context.fillStyle = background
  context.fillRect(0, 0, output.width, output.height)
  context.imageSmoothingQuality = 'high'

  const natural = { width: image.naturalWidth, height: image.naturalHeight }
  const place = placeImage(crop, output, natural)
  context.drawImage(image, place.left, place.top, place.width, place.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('could not encode the cropped image'))
      },
      type,
      quality,
    )
  })
}
