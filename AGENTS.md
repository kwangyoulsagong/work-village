# Aquila extension `work-village`

A small panel that runs inside Aquila (a macOS app for terminal agent sessions). Plain HTML/CSS/JS in this folder —
no build step, no Node, no npm packages at runtime. Aquila shows `entry` in its right panel; reload it with the
panel's ↻ button after editing.

## Files

- `manifest.json` — name, permissions, commands (below).
- `index.html` — the page (`entry`). Other files load by relative path (`./app.js`, `./style.css`).
- `aquila.js` — the client; include it with `<script src="aquila.js"></script>`. Don't edit it.

## manifest.json

```json
{
  "name": "Shown in the panel and ⌘K",
  "description": "One line",
  "version": "0.1.0",
  "glyph": "◇",
  "entry": "index.html",
  "permissions": ["system", "sessions:status", "usage", "storage", "notify", "background", "network:api.example.com"],
  "commands": [{ "id": "start", "title": "Start timer" }]
}
```

Ask only for what the page uses: the user sees the list before enabling it, and a changed list needs a reload.

| Permission | Gives |
|---|---|
| `system` | `aquila.system()` and the `system` event: `{ cpu, cores, load, memory: { used, total }, appMemory, onBattery, saver, at }` (cpu in %, bytes) |
| `sessions:status` | `aquila.sessions()` and the `sessions` event: `{ counts: { working, waiting, done, error, idle, stopped }, total }`; the `waiting` event `{ count }` when a session starts waiting |
| `usage` | `aquila.usage()` and the `usage` event: `[{ account, kind, fiveHour, weekly, near }]` (percent or null) |
| `storage` | `aquila.storage.get/set/remove/keys` — JSON values, 512 KB in all |
| `notify` | `aquila.notify(title, body)` — a macOS banner, at most one per 10 s |
| `background` | may keep running while the panel is closed, if the user allows it; otherwise a hidden page is closed after 5 minutes |
| `network:<domain>` | `fetch`/WebSocket to `https://<domain>` (`*.example.com` for subdomains). Nothing else reaches the network |

Always available: `aquila.info()`, `aquila.power()` (`{ saver, onBattery }`), `aquila.chip(text)` (up to 16
characters shown in the sidebar; `''` clears it), and the events `power`, `visible` (`{ visible }`) and `command`
(`{ id }` of a manifest command run from ⌘K).

```js
aquila.on('system', (s) => render(s));
aquila.on('power', ({ saver }) => slowDown(saver));
aquila.on('command', ({ id }) => id === 'start' && start());
```

## Rules

- There is no access to terminal output, prompts or session contents, and no way to type into a session.
- The CSP allows scripts and styles from this folder (inline too), images from here, `data:` and the declared domains.
  No other origins, no iframes, no popups, no downloads, no camera/microphone/location/clipboard permissions.
- Be light: stop timers and animations on `visible: false` and in power saver; no busy loops.
- Follow the system colour scheme (`color-scheme: light dark`), keep text 12–14 px, padding 16 px.
