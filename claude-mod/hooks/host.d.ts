// Types for host.js (plain JS, shared shape with the game's browser stand-ins).
export type SoftCanvas = { readonly width: number; readonly height: number; data: Uint8ClampedArray };
export type Host = {
  env: Record<string, unknown>;
  world: SoftCanvas;
  el: (id: string) => any;
  emit: (name: string, data: unknown) => void;
  advance: (t: number) => void;
  readonly now: number;
};
export type UsageRow = { account: string; kind: string; weekly: number | null; fiveHour: number | null; near: boolean };
export function makeHost(o: {
  store: { get: (k: string) => Promise<unknown>; set: (k: string, v: unknown) => Promise<void> };
  usage: () => UsageRow[];
  /** Ids of the page's elements that start hidden (game.gen.js HIDDEN_IDS). */
  hidden?: readonly string[];
}): Host;
export function parseColor(c: string): [number, number, number, number];
