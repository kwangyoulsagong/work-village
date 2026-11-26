// Native messaging host for the Chrome build of 작은 마을: reads this Mac's Claude and Codex usage, the same way
// Aquila does, and answers Chrome. Local only: no network, no writes, read-only under ~/.claude and ~/.codex.
//
// Claude: `claude -p /usage` prints "Current week (all models): 12% used" (a local command, no model call).
// Codex: the newest session file (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl) records `rate_limits`.
// Protocol (Chrome native messaging): 4-byte little-endian length + JSON, one request, one answer, then exit.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CONFIG = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  } catch {
    return {};
  }
})();

function read() {
  return new Promise((resolve) => {
    let buf = Buffer.alloc(0);
    process.stdin.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (buf.length >= 4) {
        const n = buf.readUInt32LE(0);
        if (buf.length >= 4 + n) {
          try {
            resolve(JSON.parse(buf.subarray(4, 4 + n).toString('utf8')));
          } catch {
            resolve({});
          }
        }
      }
    });
    process.stdin.on('end', () => resolve({}));
  });
}
function write(obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([head, body]));
}

/** `claude -p /usage` → { weekly, fiveHour } in %, or null. */
function claudeUsage() {
  const bin = CONFIG.claude || 'claude';
  return new Promise((resolve) => {
    const env = { ...process.env };
    delete env.CLAUDE_CONFIG_DIR;
    delete env.CLAUDECODE;
    // Chrome may start us with a bare environment; Claude needs to know who it is to find its login.
    env.USER ||= os.userInfo().username;
    env.LOGNAME ||= env.USER;
    let out = '';
    let child;
    try {
      // Windows: npm installs claude.cmd, which only runs through the shell (a native claude.exe doesn't need it).
      const shell = process.platform === 'win32' && !/\.exe$/i.test(bin);
      child = spawn(shell ? `"${bin}"` : bin, ['-p', '/usage', '--no-session-persistence'], { cwd: os.homedir(), env, stdio: ['ignore', 'pipe', 'ignore'], shell, windowsHide: true });
    } catch {
      return resolve(null);
    }
    const timer = setTimeout(() => child.kill(), 30_000);
    child.stdout.on('data', (d) => (out += d));
    child.on('error', () => resolve(null));
    child.on('close', () => {
      clearTimeout(timer);
      const pct = (label) => {
        const m = new RegExp(`^\\s*${label}\\s*:\\s*(\\d+(?:\\.\\d+)?)%\\s*used`, 'im').exec(out);
        return m ? Math.min(100, Number(m[1])) : null;
      };
      const weekly = pct('Current week \\(all models\\)');
      const fiveHour = pct('Current session');
      resolve(weekly == null && fiveHour == null ? null : { weekly, fiveHour });
    });
  });
}

/** The latest `rate_limits` Codex wrote → { weekly, fiveHour } in %, or null. */
function codexUsage() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const dirs = (d) => {
    try {
      return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && /^\d+$/.test(e.name)).map((e) => e.name).sort().reverse();
    } catch {
      return [];
    }
  };
  const root = path.join(home, 'sessions');
  const files = [];
  // Newest day folders first; stop as soon as there are enough (not one more folder per month).
  walk: for (const y of dirs(root))
    for (const m of dirs(path.join(root, y)))
      for (const d of dirs(path.join(root, y, m))) {
        const dir = path.join(root, y, m, d);
        try {
          for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) files.push(path.join(dir, f));
        } catch {}
        if (files.length >= 5) break walk;
      }
  const mtime = (f) => {
    try {
      return fs.statSync(f).mtimeMs; // Codex may rotate a file away mid-scan
    } catch {
      return 0;
    }
  };
  const stamped = files.map((f) => [f, mtime(f)]).filter(([, t]) => t > 0).sort((a, b) => b[1] - a[1]);
  // Older than a week: that window is long over, so it's not live usage any more.
  if (!stamped.length || Date.now() - stamped[0][1] > 7 * 24 * 60 * 60_000) return null;
  for (const [file] of stamped.slice(0, 5)) {
    let text;
    try {
      const size = fs.statSync(file).size;
      const fd = fs.openSync(file, 'r');
      const len = Math.min(size, 512 * 1024);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      fs.closeSync(fd);
      text = buf.toString('utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].includes('"rate_limits"')) continue;
      let rl = null;
      try {
        const find = (v, depth = 0) => {
          if (!v || typeof v !== 'object' || depth > 4) return null;
          if (v.rate_limits && typeof v.rate_limits === 'object') return v.rate_limits;
          for (const c of Object.values(v)) {
            const f = find(c, depth + 1);
            if (f) return f;
          }
          return null;
        };
        rl = find(JSON.parse(lines[i]));
      } catch {
        continue;
      }
      if (!rl) continue;
      const win = (w) => (w && typeof w.used_percent === 'number' ? { pct: w.used_percent, mins: w.window_minutes } : null);
      const ws = [win(rl.primary), win(rl.secondary)].filter(Boolean);
      const weekly = ws.find((w) => w.mins >= 7 * 24 * 60 - 60)?.pct ?? null;
      const fiveHour = ws.find((w) => w.mins && w.mins <= 300)?.pct ?? null;
      if (weekly != null || fiveHour != null) return { weekly, fiveHour };
    }
  }
  return null;
}

(async () => {
  const req = await read();
  const [claude, codex] = await Promise.all([req.claude === false ? Promise.resolve(undefined) : claudeUsage(), Promise.resolve(codexUsage())]);
  write({ ok: true, claude, codex });
  process.exit(0);
})();
