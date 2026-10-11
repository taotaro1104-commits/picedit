import { canRedo, canUndo, createHistory, current, jumpTo, push, redo, undo } from './history'

describe('history', () => {
  const base = createHistory({ label: '元画像', value: 'a' })

  it('starts with the initial entry', () => {
    expect(current(base).value).toBe('a')
    expect(canUndo(base)).toBe(false)
    expect(canRedo(base)).toBe(false)
  })

  it('push appends and moves the cursor without mutating', () => {
    const h = push(base, { label: '補正', value: 'b' })
    expect(current(h).value).toBe('b')
    expect(base.entries).toHaveLength(1)
    expect(h.entries).toHaveLength(2)
  })

  it('undo / redo move within bounds', () => {
    const h = push(push(base, { label: '1', value: 'b' }), { label: '2', value: 'c' })
    const u = undo(undo(undo(h)))
    expect(current(u).value).toBe('a')
    const r = redo(redo(redo(u)))
    expect(current(r).value).toBe('c')
  })

  it('push after undo drops the future and reports it', () => {
    const h = push(push(base, { label: '1', value: 'b' }), { label: '2', value: 'c' })
    const u = undo(undo(h))
    const dropped: string[] = []
    const next = push(u, { label: '3', value: 'd' }, (e) => dropped.push(e.value))
    expect(next.entries.map((e) => e.value)).toEqual(['a', 'd'])
    expect(dropped).toEqual(['b', 'c'])
  })

  it('jumpTo clamps the index', () => {
    const h = push(base, { label: '1', value: 'b' })
    expect(jumpTo(h, 0).index).toBe(0)
    expect(jumpTo(h, 99).index).toBe(1)
    expect(jumpTo(h, -3).index).toBe(0)
  })
})
