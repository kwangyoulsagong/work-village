# tools — offscreen checks

Everything here runs **offscreen**: Electron with `show: false` + `offscreen: true`, no window ever appears.
Install once with `npm install` (Electron, dev only). Screenshots go to `tools/out/` (git-ignored).

| Command | What it checks |
|---|---|
| `npm run sim` | 200 lives of the economy (all game files in a `vm`, 7 % usage a day): deaths, share reaching the future, days |
| `npm run perf` | Frame time at 45 fps: a big town, with repaints, chaos mode with everything going |
| `npm run test:life` | Traffic per era, people, wildlife, build menu (buy, place decor, move blocks), jobs tab, save |
| `npm run test:fx` | Collapse motion, graves, green faces (chaos smash / nuke / plague, a lost war, a plague) |
| `npm run test:more` | Album, awards, wishes, holidays, rare colours |
| `npm run test:visit` | 놀러가기: invite code → visit (walk, guestbook note) → note back home; a chaos town wrecked in turns; neither life town changes |
| `npm run test:chaos` | Every chaos tool, then back to the untouched life town |
| `npm run test:chrome` | `background.js` with a fake Chrome (helper / no helper / check now), the side panel growing from minutes and from usage, and the helper setup card: the macOS installer run for real in a temp HOME, the Windows PowerShell installer checked as text |
| `npm run test:mod` | The Claude Code mod: the game on its browser stand-ins in Node (frames, usage, chaos, codes), then `claude plugin validate` and `claude plugin test` (panel, corner window, terminal and desktop) |
| `npm test` | All of the above |
| `npx electron tools/ui.js` | The panel at several sizes, light and dark |
| `npx electron tools/maps.js` / `houses.js` / `jobs-sheet.js` / `vehicles.js` | Sheets: whole maps, house looks, the 24 jobs, every vehicle |

`preload.js` stands in for Aquila (`window.aquila`, saves in memory); `chrome-preload.js` for Chrome's storage and badge.
Each script takes optional `[game dir] [out dir]`.
