// A frame of the town for a terminal: the game's pixels shrunk to a grid of cells, each cell two pixels tall
// (drawn as '▀': the top pixel is the glyph's colour, the bottom one the background). Colours are 12-bit, two
// characters each, so a whole frame is one short string the view module (view.tsx) can unpack.

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export type Frame = {
  /** Cells across and down; the picture is `cols` × `rows * 2` pixels. */
  cols: number;
  rows: number;
  /** Two characters per pixel, row by row: 12-bit colour (4 bits each of red, green, blue). */
  px: string;
};

type Pixels = { readonly width: number; readonly height: number; data: Uint8ClampedArray };

/**
 * The region (x0, y0, w, h) of `src` averaged down to `cols` × `rows * 2` pixels.
 * Averaging keeps the sky, grass and road honest; little things blur, which is why the panel draws bigger.
 */
export function encode(src: Pixels, x0: number, y0: number, w: number, h: number, cols: number, rows: number): Frame {
  const out: string[] = [];
  const ph = rows * 2;
  const d = src.data;
  const W = src.width;
  for (let py = 0; py < ph; py++) {
    const sy0 = Math.floor(y0 + (py * h) / ph);
    const sy1 = Math.max(sy0 + 1, Math.floor(y0 + ((py + 1) * h) / ph));
    for (let px = 0; px < cols; px++) {
      const sx0 = Math.floor(x0 + (px * w) / cols);
      const sx1 = Math.max(sx0 + 1, Math.floor(x0 + ((px + 1) * w) / cols));
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = Math.max(0, sy0); y < Math.min(src.height, sy1); y++)
        for (let x = Math.max(0, sx0); x < Math.min(W, sx1); x++) {
          const i = (y * W + x) * 4;
          r += d[i] ?? 0;
          g += d[i + 1] ?? 0;
          b += d[i + 2] ?? 0;
          n++;
        }
      const c = n ? (((r / n) >> 4) << 8) | (((g / n) >> 4) << 4) | ((b / n) >> 4) : 0;
      out.push(ALPHABET.charAt(c >> 6), ALPHABET.charAt(c & 63));
    }
  }
  return { cols, rows, px: out.join('') };
}
