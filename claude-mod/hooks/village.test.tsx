// The mod against the engine's test kit: the panel's first run, a life town growing a frame, chaos from a click,
// on the terminal and the desktop. Run with: claude plugin test claude-mod
import { expect, test } from 'claude-code/testing'

/** Real time: the game runs on the clock, the kit's `advance` moves only the view. */
const sleep = (ms: number) => new Promise<void>(r => (globalThis as unknown as { setTimeout: (f: () => void, ms: number) => void }).setTimeout(r, ms))

const PANE = {
  plugin: 'work-village',
  component: 'Pane',
  requestId: 'village',
  props: {
    title: '작은 마을',
    isFocused: false,
    bodyColumns: 64,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 60 },
    view: {},
  },
} as const

/** The engine's side: commands, panes, an in-memory store, Claude's usage windows. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function engine(on: any, weekly = 10) {
  const store = new Map<string, unknown>()
  on('command.register', () => ({ value: { command: 'village' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('store.get', (_: unknown, e: { key: string }) => ({ value: store.get(e.key) }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => (store.set(e.key, e.value), { value: undefined }))
  on('store.delete', (_: unknown, e: { key: string }) => (store.delete(e.key), { value: undefined }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: {}, rateLimits: [{ kind: 'seven_day', percentUsed: weekly }], cost: undefined },
  }))
  return store
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`first run, a life town and chaos (${surface})`, async ($, on) => {
    const store = engine(on)
    await $.session.start({ cwd: '/', surface, isInteractive: true })
    const ui = await $.ui.mount({ ...PANE, surface })

    // Which game, then who.
    expect((await ui.find({ type: 'Text', text: /어떻게 즐길까요/ }))?.text).toBeTruthy()
    await ui.press({ key: 'modeLife' })
    expect((await ui.find({ type: 'Text', text: /누구로 살아볼까요/ }))?.text).toBeTruthy()
    await ui.press({ key: 'f' })
    expect((await ui.find({ type: 'Text', text: /🪙/ }))?.text).toBeTruthy()

    // The view asks for frames and gets the town in cells.
    // The game saves 0.8 s after a change (real time here): wait, then let the next frame ask hand it to the store.
    await sleep(900)
    // A surface lays the region out before the view asks; the kit does it on request.
    await ui.advance(600)
    await ui.resize({ columns: 64, rows: 26, in: 'panel' })
    await ui.advance(600)
    const cells = await ui.findAll({ type: 'Text', in: 'panel' })
    expect(cells.length).toBeGreaterThan(20)
    expect(store.has('save')).toBe(true)

    // Chaos: pick an era, click the town with the hammer.
    await ui.press({ key: 'toChaos' })
    await ui.press({ key: 'era-3' })
    expect((await ui.find({ type: 'Button', text: /집 부수기/ }))?.text).toBeTruthy()
    await ui.press({ key: 'tool-nuke' })
    await ui.pointer({ type: 'down', x: 32, y: 12, button: 'left', in: 'panel' })
    // The game runs on real time (the kit's clock moves only the view): let the blast play out, frame by frame.
    for (let i = 0; i < 10; i++) {
      await sleep(200)
      await ui.advance(200)
    }
    expect((await ui.find({ type: 'Text', text: /쓰러진 주민 [1-9]/ }))?.text).toBeTruthy()

    // Back home: the life town as it was.
    await ui.press({ key: 'chaosExit' })
    expect((await ui.find({ type: 'Text', text: /다음 목표|🪙/ }))?.text).toBeTruthy()
    await ui.unmount()
  })
}

test('a visit code from the panel', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'modeLife' })
  await ui.press({ key: 'm' })
  await ui.press({ key: 'visit' })
  await ui.input({ key: 'nick', text: '모드친구' })
  const code = await ui.find({ type: 'Code' })
  expect(code?.text.startsWith('작은마을1:')).toBe(true)
  await ui.unmount()
})

test('the window in the top right corner', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const corner = {
    plugin: 'work-village',
    component: 'BesidePrompt',
    props: { maxColumns: 0, floatRows: 40, floatColumns: 120, isWorking: false, view: {} },
  } as const
  const ui = await $.ui.mount({ ...corner, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /작은 마을/ }))?.text).toBeTruthy()
  await ui.advance(400)
  await ui.resize({ columns: 56, rows: 14, in: 'corner' })
  await ui.advance(700)
  expect((await ui.findAll({ type: 'Text', in: 'corner' })).length).toBeGreaterThan(20)
  await ui.unmount()

  // Too little room: nothing floats.
  const small = await $.ui.mount({ ...corner, props: { ...corner.props, floatColumns: 30 }, surface: 'terminal' })
  expect(await small.find({ type: 'Client' })).toBeUndefined()
  await small.unmount()
})
