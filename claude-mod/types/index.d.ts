// 작은 마을 (work-village) mod: the values its drawings read. The town itself (the game) lives in the hooks module
// and its save in $.store; these are what the panel shows, refreshed as the town changes.

/** What the /village panel and the corner window show besides the picture. */
export type VillageInfo = {
  /** 'start': choosing a mode or a character; then which town is on screen. */
  mode: 'start' | 'life' | 'chaos' | 'visit';
  /** Which first-run question is open, if any. */
  pick: 'mode' | 'gender' | 'era' | null;
  /** The end-of-life text when the protagonist has died, else null. */
  over: string | null;
  coins: string;
  level: number;
  era: string;
  day: number;
  season: string;
  weather: string;
  /** What your character is doing now, and the next goal. */
  now: string;
  goal: string;
  house: string;
  pop: number;
  /** The newest story lines, newest first, with their day. */
  story: string[];
  /** Chaos mode: the tally line, the tool in hand, whether a sign is being written. */
  chaosStats: string;
  tool: string;
  signing: boolean;
  /** Visiting: whose town. */
  visitHost: string;
};

/** The panel's own controls. */
export type VillagePanel = {
  /** The visit section open, and the code shown in it (yours, or a reply / chaos code to send back). */
  showVisit: boolean;
  codeTitle: string;
  codeNote: string;
  myCode: string;
  nick: string;
  /** The window in the terminal's top right corner. */
  corner: boolean;
};

declare module 'claude-code' {
  interface PluginState {
    'work-village': {
      info: Shaped<VillageInfo>;
      panel: Shaped<VillagePanel>;
    };
  }
}
