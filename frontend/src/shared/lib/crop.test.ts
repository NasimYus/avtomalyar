import { describe, expect, it } from 'vitest'
import {
  INITIAL_CROP,
  MAX_ZOOM,
  clampCrop,
  minZoom,
  panCrop,
  placeImage,
  upscaleFactor,
} from './crop'

const frame = { width: 400, height: 300 } // 4:3
const wide = { width: 1600, height: 900 } // 16:9
const tall = { width: 900, height: 1600 }

describe('placeImage', () => {
  it('covers the frame at zoom 1, centred', () => {
    // A 16:9 image fills a 4:3 frame by height and overflows sideways.
    const place = placeImage(INITIAL_CROP, frame, wide)
    expect(place.height).toBeCloseTo(300)
    expect(place.width).toBeCloseTo(533.33, 1)
    expect(place.top).toBeCloseTo(0)
    expect(place.left).toBeCloseTo((400 - 533.33) / 2, 1)
  })

  it('does not depend on the frame size', () => {
    const crop = { zoom: 1.7, x: 0.3, y: 0.6 }
    const small = placeImage(crop, frame, tall)
    const big = placeImage(crop, { width: 1200, height: 900 }, tall)
    expect(big.left).toBeCloseTo(small.left * 3)
    expect(big.top).toBeCloseTo(small.top * 3)
    expect(big.width).toBeCloseTo(small.width * 3)
  })
})

describe('minZoom', () => {
  it('lets the whole image fit inside the frame', () => {
    const zoom = minZoom(frame, tall)
    const place = placeImage({ zoom, x: 0.5, y: 0.5 }, frame, tall)
    expect(place.height).toBeCloseTo(300)
    expect(place.width).toBeLessThan(400)
  })

  it('is 1 when the image already has the frame shape', () => {
    expect(minZoom(frame, { width: 800, height: 600 })).toBeCloseTo(1)
  })
})

describe('clampCrop', () => {
  it('keeps the zoom within bounds', () => {
    expect(clampCrop({ zoom: 99, x: 0.5, y: 0.5 }, frame, wide).zoom).toBe(MAX_ZOOM)
    expect(clampCrop({ zoom: 0.01, x: 0.5, y: 0.5 }, frame, wide).zoom).toBeCloseTo(
      minZoom(frame, wide),
    )
  })

  it('never opens a gap at the edge of a covering image', () => {
    const crop = clampCrop({ zoom: 1, x: 0, y: 0.5 }, frame, wide)
    expect(placeImage(crop, frame, wide).left).toBeCloseTo(0)
    const other = clampCrop({ zoom: 1, x: 1, y: 0.5 }, frame, wide)
    const place = placeImage(other, frame, wide)
    expect(place.left + place.width).toBeCloseTo(400)
  })

  it('pins the axis the image exactly fills', () => {
    expect(clampCrop({ zoom: 1, x: 0.5, y: 0.1 }, frame, wide).y).toBeCloseTo(0.5)
  })

  it('keeps a zoomed-out image inside the frame', () => {
    const zoom = minZoom(frame, tall)
    const crop = clampCrop({ zoom, x: 5, y: 0.5 }, frame, tall)
    const place = placeImage(crop, frame, tall)
    expect(place.left + place.width).toBeLessThanOrEqual(400.0001)
    expect(place.left).toBeGreaterThanOrEqual(0)
  })
})

describe('panCrop', () => {
  it('moves the image with the pointer', () => {
    const start = { zoom: 2, x: 0.5, y: 0.5 }
    const before = placeImage(start, frame, wide)
    const after = placeImage(panCrop(start, 40, -20, frame, wide), frame, wide)
    expect(after.left - before.left).toBeCloseTo(40)
    expect(after.top - before.top).toBeCloseTo(-20)
  })

  it('stops at the edge', () => {
    const crop = panCrop(INITIAL_CROP, 10_000, 0, frame, wide)
    expect(placeImage(crop, frame, wide).left).toBeCloseTo(0)
  })
})

describe('upscaleFactor', () => {
  const output = { width: 1200, height: 900 }

  it('is below 1 for a big photo', () => {
    expect(upscaleFactor(INITIAL_CROP, output, { width: 4000, height: 3000 })).toBeCloseTo(0.3)
  })

  it('grows with a small photo and with zoom', () => {
    const small = { width: 400, height: 300 }
    expect(upscaleFactor(INITIAL_CROP, output, small)).toBeCloseTo(3)
    expect(upscaleFactor({ zoom: 2, x: 0.5, y: 0.5 }, output, small)).toBeCloseTo(6)
  })
})
