import JSZip from 'jszip'
import { buildFileName, createZip, extensionFor } from './export'

describe('export helpers', () => {
  it('maps formats to extensions', () => {
    expect(extensionFor('jpeg')).toBe('jpg')
    expect(extensionFor('png')).toBe('png')
    expect(extensionFor('webp')).toBe('webp')
  })

  it('builds a safe file name from the original', () => {
    expect(buildFileName('IMG 001.HEIC', 'amazon', 'jpeg')).toBe('IMG_001_amazon.jpg')
    expect(buildFileName('../../evil<>.png', 'rakuten', 'png')).toBe('evil_rakuten.png')
    expect(buildFileName('', 'mercari', 'jpeg')).toBe('image_mercari.jpg')
  })

  it('creates a zip with unique names', async () => {
    const files = [
      { name: 'a.jpg', blob: new Blob(['1']) },
      { name: 'a.jpg', blob: new Blob(['2']) },
    ]
    const zipBlob = await createZip(files)
    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer())
    expect(Object.keys(zip.files).sort()).toEqual(['a.jpg', 'a_2.jpg'])
    expect(await zip.file('a_2.jpg')!.async('string')).toBe('2')
  })
})
