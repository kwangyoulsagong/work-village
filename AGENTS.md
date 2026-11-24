# 작은 마을 (work-village) — agent guide

Rules for every coding agent working on this repo (Claude Code reads it through CLAUDE.md).

## What this is

An idle 2D pixel town that grows with the user's real work: Claude / Codex usage (Aquila extension; Chrome through the
local helper) or, with neither, the minutes the browser is open. Plain HTML/JS, no build step, no server.

- `aquila/` — the game (source of truth) + the Aquila extension. Edit the game here.
- `chrome/` — Chrome MV3 side panel. `./build-chrome.sh` copies the game in; `chrome-shim.js` answers `window.aquila`;
  `background.js` polls the native helper (`chrome/host/`) or counts minutes. Without the helper, `helper-setup.js`
  (Chrome only, added by `build-chrome.sh`) offers a one-paste installer for macOS / Linux / Windows; there are Windows
  users, so keep the helper and installer working there (`npm run test:chrome` checks the generated PowerShell).
- `claude-mod/` — the Claude Code mod: `./build-claude-mod.sh` bundles the game into `hooks/game.gen.js`, run on
  browser stand-ins (`hooks/host.js`: a software canvas, a remembering DOM, our own timers; `hooks/zip.js` for codes).
  Floats a small town in the terminal's top right corner and opens a `/village` panel; grows with Claude's usage windows.
- `./install-aquila.sh` copies `aquila/` into `~/.aquila/extensions/work-village/` (Aquila doesn't follow symlinks).

## Rules

1. **Zombies only in 인성 파탄 모드 (chaos mode).** Never in 인생 모드 (life mode) — no zombie events, outbreaks or
   sprites there. Life mode has illness, crime, war, plague, weather; the zombie is a chaos tool and stays one.
2. **The two modes never share a save.** Chaos mode works on a copy; leaving it restores the life town untouched.
   Visiting a friend's town (`visit.js`, MODE 'visit' or chaos with `VISIT` set) is never saved either: only a
   guestbook note pasted at home changes the life town.
3. **Verify offscreen only.** The user works at an office: never open a visible window (no `npm run dev`, no visible
   Electron/Chrome). Use Electron with `show: false` + `webPreferences.offscreen: true` and capture with
   `capturePage()` / `canvas.toDataURL()` — the scripts in `tools/` do this (`npm test`; see tools/README.md). Say
   plainly when something could only be checked offscreen.
4. **Battery first.** 30 fps everywhere (minds tick 8×/s, drawing interpolates). Static scenery is cached; draw only
   what's on screen; stop when the panel is hidden. Check frame time after adding anything that draws every frame.
5. **Serverless, local only.** No network calls. Saves go through `aquila.storage` (Aquila: 512 KB in all; the photo
   album has its own key and stays small) or `chrome.storage`. The native helper only reads ~/.claude / ~/.codex.
6. **Load order.** Scripts load in the order in `aquila/index.html`; files before `game.js` must not use `game.js`
   constants at top level, only inside functions.
7. **Korean UI copy, written from the player's side** (Toss style: short, plain, polite). Code, comments, commits in
   English. Conventional Commits, one change per commit.
8. **Balance with the simulator, not by feel.** After changing income or costs, run `npm run sim` (200 lives, all game
   files in a `vm` with stubs, 7 % usage a day). A new game file must be added to its file list in `tools/sim.js`. Target: most towns reach the future era in ~5–7 weeks.
9. After editing `aquila/`: run `./build-chrome.sh` and `./build-claude-mod.sh` (and `./install-aquila.sh` to try it in
   Aquila). The game must keep running on the mod's stand-ins: new canvas calls go in `claude-mod/hooks/host.js`.
10. **Open work lives in `TODO.md`.** Read it at the start; tick items and add new ones as you go.
