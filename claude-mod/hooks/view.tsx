// The town as text: a surface module drawn wherever the mod places a `Client` (the corner window, the /village panel).
// It asks the hooks module for a fresh frame a few times a second (only while it is mounted, so a hidden town costs
// nothing), draws it with '▀' cells, and passes clicks back (to look somewhere, or to use a chaos tool there).
import type { ClientModule } from 'claude-code'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const VALUE: Record<string, number> = {}
for (let i = 0; i < ALPHABET.length; i++) VALUE[ALPHABET.charAt(i)] = i
const HEX = '0123456789abcdef'

type ViewProps = {
  /** Which view this is: 'corner' or 'panel'. */
  id: string
  /** How often to ask for a frame, in ms. */
  ms: number
  frame: { cols: number; rows: number; px: string } | null
}

const colorAt = (px: string, i: number) => {
  const c = ((VALUE[px.charAt(i * 2)] ?? 0) << 6) | (VALUE[px.charAt(i * 2 + 1)] ?? 0)
  return `#${HEX.charAt(c >> 8)}${HEX.charAt((c >> 4) & 15)}${HEX.charAt(c & 15)}`
}

const View: ClientModule<ViewProps, { on: true }> = (props, surface) => {
  const { Box, Text } = surface.elements
  if (!surface.state) {
    surface.setState({ on: true })
    const ask = () =>
      surface.post({ kind: 'frame', id: props.id, cols: surface.columns, rows: surface.rows })
    ask()
    surface.every(props.ms, ask)
    surface.onPointer(p => {
      if (p.type !== 'down') return
      surface.post({
        kind: 'click',
        id: props.id,
        x: p.fine?.x ?? p.x + 0.5,
        y: p.fine?.y ?? p.y + 0.5,
        cols: surface.columns,
        rows: surface.rows,
      })
    })
  }
  const f = props.frame
  if (!f) return <Text dimColor>마을을 불러오는 중이에요…</Text>
  const lines = []
  for (let r = 0; r < f.rows; r++) {
    const runs = []
    let c = 0
    while (c < f.cols) {
      const top = colorAt(f.px, r * 2 * f.cols + c)
      const bottom = colorAt(f.px, (r * 2 + 1) * f.cols + c)
      let n = 1
      while (
        c + n < f.cols &&
        colorAt(f.px, r * 2 * f.cols + c + n) === top &&
        colorAt(f.px, (r * 2 + 1) * f.cols + c + n) === bottom
      )
        n++
      runs.push(
        top === bottom ? (
          <Text backgroundColor={bottom}>{' '.repeat(n)}</Text>
        ) : (
          <Text color={top} backgroundColor={bottom}>
            {'▀'.repeat(n)}
          </Text>
        ),
      )
      c += n
    }
    lines.push(<Box flexDirection="row">{runs}</Box>)
  }
  return <Box flexDirection="column">{lines}</Box>
}

export default View
