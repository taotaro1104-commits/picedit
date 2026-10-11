import { colorKeyMask, estimateBorderColor } from './colorKey'

function image(w: number, h: number, bg: number[], fg: number[], rect: number[]) {
  const data = new Uint8ClampedArray(w * h * 4)
  const [x0, y0, x1, y1] = rect
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = x >= x0 && x < x1 && y >= y0 && y < y1
      const c = inside ? fg : bg
      data.set([c[0], c[1], c[2], 255], (y * w + x) * 4)
    }
  }
  return { data, width: w, height: h }
}

describe('colorKey', () => {
  it('estimates the border color', () => {
    const img = image(10, 10, [240, 240, 235], [10, 20, 30], [3, 3, 7, 7])
    expect(estimateBorderColor(img)).toEqual([240, 240, 235])
  })

  it('separates the object from a uniform background', () => {
    const img = image(20, 20, [250, 250, 250], [200, 30, 30], [5, 5, 15, 15])
    const mask = colorKeyMask(img)
    expect(mask.width).toBe(20)
    expect(mask.data[10 * 20 + 10]).toBe(255)
    expect(mask.data[0]).toBe(0)
  })
})
