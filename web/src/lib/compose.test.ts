import { computeBoundingBox, computePlacement, shadowEllipse } from './compose'

function maskWithRect(w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const data = new Uint8ClampedArray(w * h)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[y * w + x] = 255
  return { data, width: w, height: h }
}

describe('computeBoundingBox', () => {
  it('finds the tight box of foreground pixels', () => {
    const box = computeBoundingBox(maskWithRect(20, 10, 3, 2, 8, 9))
    expect(box).toEqual({ x: 3, y: 2, width: 5, height: 7 })
  })

  it('ignores pixels below the threshold', () => {
    const m = maskWithRect(10, 10, 2, 2, 4, 4)
    m.data[99] = 30
    expect(computeBoundingBox(m)).toEqual({ x: 2, y: 2, width: 2, height: 2 })
  })

  it('returns null for an empty mask', () => {
    expect(computeBoundingBox({ data: new Uint8ClampedArray(4), width: 2, height: 2 })).toBeNull()
  })
})

describe('computePlacement', () => {
  it('fits a wide product to the fill ratio and centers it', () => {
    const p = computePlacement({ x: 0, y: 0, width: 400, height: 100 }, 1000, 1000, 0.85)
    expect(p.width).toBeCloseTo(850)
    expect(p.height).toBeCloseTo(212.5)
    expect(p.x).toBeCloseTo(75)
    expect(p.y).toBeCloseTo((1000 - 212.5) / 2)
  })

  it('fits a tall product by height', () => {
    const p = computePlacement({ x: 5, y: 5, width: 100, height: 300 }, 1200, 1200, 0.8)
    expect(p.height).toBeCloseTo(960)
    expect(p.width).toBeCloseTo(320)
  })

  it('rejects invalid fill ratio', () => {
    expect(() => computePlacement({ x: 0, y: 0, width: 1, height: 1 }, 10, 10, 0)).toThrow()
    expect(() => computePlacement({ x: 0, y: 0, width: 1, height: 1 }, 10, 10, 1.2)).toThrow()
  })
})

describe('shadowEllipse', () => {
  it('sits at the bottom center of the placement', () => {
    const s = shadowEllipse({ x: 100, y: 100, width: 400, height: 600 })
    expect(s.cx).toBe(300)
    expect(s.cy).toBeGreaterThan(690)
    expect(s.rx).toBeCloseTo(168)
    expect(s.ry).toBeGreaterThanOrEqual(4)
  })
})
