// 작은 마을 (work-village) as a Claude Code mod.
// The game (aquila/, bundled into game.gen.js by build-claude-mod.sh) runs here on browser stand-ins (host.js).
// It grows with this account's Claude usage (the weekly and 5-hour windows the session reports), saves in $.store,
// and is drawn in two places: a small window floating in the terminal's top right corner, and the /village panel
// with everything else (looking around, the story, visiting friends by code, chaos mode).
// The game only moves while one of those is on screen asking for frames; otherwise it rests and catches up later.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { VillageInfo, VillagePanel } from '../types'
import { encode, type Frame } from './frame'
import { HIDDEN_IDS, makeGame, type Game } from './game.gen.js'
import { makeHost, type Host, type UsageRow } from './host.js'

type Dollar = EngineInterface

const PANE = 'village'
const STORE_KEYS = ['save', 'nick', 'album']
const CORNER = { cols: 56, rows: 14 } // cells; the picture is a band across the middle of the view
const CORNER_BAND = { y0: 24, h: 128 } // view pixels: rooftops to the field below the road

const START_INFO: VillageInfo = {
  mode: 'start',
  pick: 'mode',
  over: null,
  coins: '0',
  level: 1,
  era: '',
  day: 1,
  season: '',
  weather: '',
  now: '',
  goal: '',
  house: '',
  pop: 1,
  story: [],
  chaosStats: '',
  tool: 'smash',
  signing: false,
  visitHost: '',
}
const info = atom({ plugin: 'work-village', key: 'info' } as const, START_INFO, { shape: 'info-1' })
const panel = atom(
  { plugin: 'work-village', key: 'panel' } as const,
  { showVisit: false, codeTitle: '', codeNote: '', myCode: '', nick: '', corner: true } as VillagePanel,
  { shape: 'panel-1' },
)

// ── The game and its host (module variables: a reload starts them again from the store) ─────────────────────────

let game: Game | null = null
let host: Host | null = null
let booting: Promise<void> | null = null
let usageRows: UsageRow[] = []
const stored: Record<string, unknown> = {}
const unsaved = new Map<string, unknown>() // the game's writes, handed to $.store by the next hook that runs
let lastPoll = 0
let lastInfo = ''
let lastInfoAt = 0

/** Claude's windows in the shape the game reads (Aquila's usage rows). */
function usageFrom(limits: readonly { kind: string; percentUsed: number }[]): UsageRow[] {
  const weekly = limits.find(l => l.kind === 'seven_day')?.percentUsed ?? null
  const fiveHour = limits.find(l => l.kind === 'five_hour')?.percentUsed ?? null
  return weekly == null && fiveHour == null ? [] : [{ account: 'claude-code', kind: 'claude', weekly, fiveHour, near: false }]
}

async function flush($: Dollar) {
  for (const [k, v] of unsaved) {
    unsaved.delete(k)
    if (v === undefined) await $.store.delete(k)
    else await $.store.set(k, v)
  }
}

/** The game, made once per load: the save read first, so it starts where it left off. */
function ensureGame($: Dollar): Promise<void> {
  if (game) return Promise.resolve()
  booting ??= (async () => {
    for (const k of STORE_KEYS) stored[k] = await $.store.get(k)
    try {
      usageRows = usageFrom((await $.session.usage()).rateLimits ?? [])
    } catch {
      usageRows = []
    }
    host = makeHost({
      store: {
        get: async k => stored[k],
        set: async (k, v) => {
          stored[k] = v
          unsaved.set(k, v)
        },
      },
      usage: () => usageRows,
      hidden: HIDDEN_IDS,
    })
    game = makeGame(host.env)
    // Let start() read the save and settle before anyone draws.
    const t = Date.now()
    for (let i = 1; i <= 4; i++) {
      host.advance(t + i)
      await Promise.resolve()
    }
    game.nick = typeof stored.nick === 'string' ? stored.nick : ''
    lastPoll = 0
  })()
  return booting
}

/** Move the town on to now; after a long rest, let it catch up first (as a panel coming back would). */
function advance() {
  if (!host) return
  const now = Date.now()
  if (now - lastPoll > 5000) {
    host.emit('visible', { visible: false })
    host.emit('visible', { visible: true })
  }
  lastPoll = now
  host.advance(now)
}

const txt = (id: string) => String(game?.$(id).textContent ?? '')

function infoNow(): VillageInfo {
  const g = game
  if (!g) return START_INFO
  const S = g.S
  const pick = !g.$('mode').hidden ? 'mode' : !g.$('eraPick').hidden ? 'era' : !g.$('pick').hidden || !S.gender ? 'gender' : null
  const mode = g.MODE === 'life' && (pick === 'mode' || pick === 'gender') ? 'start' : g.MODE
  return {
    mode,
    pick: g.MODE === 'life' ? pick : pick === 'era' ? 'era' : null,
    over: S.over && !g.$('over').hidden ? txt('overText') : null,
    coins: g.fmt(S.coins),
    level: g.levelOf(S.xp),
    era: g.ERAS[S.era]?.name ?? '',
    day: S.days,
    season: g.SEASONS[Math.max(0, S.season)] ?? '',
    weather: txt('weather'),
    now: txt('now'),
    goal: txt('goal'),
    house: txt('house'),
    pop: g.population(),
    story: (S.story ?? []).slice(0, 6).map((s: { day: number; text: string }) => `${s.day}일차  ${s.text}`),
    chaosStats: txt('chaosStats'),
    tool: g.chaosTool,
    signing: !g.$('signBox').hidden,
    visitHost: g.VISIT?.host?.name ?? '',
  }
}

/** Publish what the panel shows when it changed (a few times a second at most while playing). */
async function refresh($: Dollar, force = false) {
  await flush($)
  if (!game) return
  const now = Date.now()
  if (!force && now - lastInfoAt < 400) return
  lastInfoAt = now
  const next = infoNow()
  const json = JSON.stringify(next)
  if (json === lastInfo) return
  lastInfo = json
  await update($, info, () => next)
}

/** Do something to the town from a button, then show the result. */
async function act($: Dollar, fn: (g: Game) => unknown) {
  await ensureGame($)
  if (!game) return
  await fn(game)
  host?.advance(Date.now())
  await refresh($, true)
}

// ── Frames ────────────────────────────────────────────────────────────────────────────────────────────────────────

function cornerFrame(): Frame | null {
  if (!host) return null
  const w = CORNER.cols * 4
  const x0 = Math.max(0, Math.floor((host.world.width - w) / 2))
  return encode(host.world, x0, CORNER_BAND.y0, w, CORNER_BAND.h, CORNER.cols, CORNER.rows)
}
function panelFrame(cols: number): Frame | null {
  if (!host) return null
  const c = Math.max(20, Math.min(120, Math.floor(cols)))
  const rows = Math.max(6, Math.round((c * host.world.height) / host.world.width / 2))
  return encode(host.world, 0, 0, host.world.width, host.world.height, c, rows)
}
/** Cells of a view → a point in the world (pixels), for a click. */
function worldPoint(id: string, x: number, y: number, cols: number, rows: number): [number, number] | null {
  if (!game || !host || cols <= 0 || rows <= 0) return null
  const viewX = game.MODE === 'chaos' ? game.chaosCam : game.camX
  if (id === 'corner') {
    const w = CORNER.cols * 4
    const x0 = Math.max(0, Math.floor((host.world.width - w) / 2))
    return [viewX + x0 + (x / cols) * w, CORNER_BAND.y0 + (y / rows) * CORNER_BAND.h]
  }
  return [viewX + (x / cols) * host.world.width, (y / rows) * host.world.height]
}

// ── Hooks ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'village',
      description: '작은 마을 열기 (village corner: 오른쪽 위 창 켜고 끄기)',
    })
    await ensureGame($)
    await refresh($, true)
    return next(e)
  })

  on('command.run', { command: 'village' }, async ($, e) => {
    await ensureGame($)
    if (e.args.trim() === 'corner') {
      let on_ = true
      await update($, panel, p => {
        on_ = !p.corner
        return { ...p, corner: on_ }
      })
      return { text: on_ ? '오른쪽 위에 마을을 띄웠어요.' : '오른쪽 위 마을을 껐어요. /village corner로 다시 켤 수 있어요.' }
    }
    await $.ui.open({ id: PANE, title: '작은 마을', columns: 64 })
    await refresh($, true)
    return { text: '작은 마을을 열었어요.' }
  })

  // Claude's usage windows moved: the town earns from it (the same rule as Aquila: weekly 1 % = 🪙10).
  on('session.measure', async ($, e, next) => {
    const rows = usageFrom(e.rateLimits ?? [])
    if (rows.length) {
      usageRows = rows
      await ensureGame($)
      host?.emit('usage', rows)
      await refresh($)
    }
    return next(e)
  })

  // The views ask for frames and pass clicks.
  on('ui.message', async ($, e) => {
    const d = (e.data ?? {}) as { kind?: string; id?: string; x?: number; y?: number; cols?: number; rows?: number }
    await ensureGame($)
    if (!game || !host) return {}
    const id = d.id === 'corner' ? 'corner' : 'panel'
    if (d.kind === 'click') {
      if (id === 'corner') {
        await $.ui.open({ id: PANE, title: '작은 마을', columns: 64 })
      } else {
        const at = worldPoint(id, d.x ?? 0, d.y ?? 0, d.cols ?? 0, d.rows ?? 0)
        if (at && game.MODE === 'chaos') game.useTool(at[0], at[1])
        else if (at) game.moveCam(at[0] - game.VIEW_W / 2)
      }
    }
    advance()
    await refresh($)
    const frame = id === 'corner' ? cornerFrame() : panelFrame(d.cols ?? 60)
    return { props: { id, ms: id === 'corner' ? 300 : 200, frame } }
  })

  // The window in the top right corner: floats over the transcript from the cell beside the prompt.
  on('ui.render', { component: 'BesidePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const p = await read($, panel)
    const v = await read($, info)
    // (Not `h`: that name is JSX's.)
    const wide = CORNER.cols + 2
    const tall = CORNER.rows + 3
    if (!p.corner || e.props.floatColumns < wide || e.props.floatRows < tall) return next(e)
    const { Box, Text, Client } = $.ui.resolve(e)
    const title = v.mode === 'start' ? '작은 마을 · /village로 시작해요' : `작은 마을 · 🪙${v.coins} · Lv.${v.level} · ${v.era}`
    return (
      <Box width={0}>
        <Box
          position="absolute"
          anchor="above"
          right={0}
          bottom={Math.max(0, e.props.floatRows - tall)}
          flexDirection="column"
          borderStyle="round"
          borderDimColor
        >
          <Text dimColor wrap="truncate">
            {title}
          </Text>
          <Client key="corner" module="./view.tsx" props={{ id: 'corner', ms: 300, frame: null }} width={CORNER.cols} height={CORNER.rows} />
        </Box>
      </Box>
    )
  })

  // /village: the town bigger, and everything you can do with it.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await ensureGame($)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') {
      // Surfaces without a Client (VS Code, phones): the numbers and the story only.
      const { Box, Text } = $.ui.resolve(e)
      const v = await read($, info)
      return (
        <Box flexDirection="column">
          <Text bold>🪙{v.coins} · Lv.{v.level} · {v.era}</Text>
          {v.story.map(line => (
            <Text wrap="truncate">{line}</Text>
          ))}
        </Box>
      )
    }
    const { Box, Text, Button, Input, Client, Code } = $.ui.resolve(e)
    const v = await read($, info)
    const p = await read($, panel)
    const cols = Math.max(24, Math.min(120, e.props.bodyColumns))
    const viewRows = Math.max(6, Math.round((cols * 192) / 240 / 2))
    const pressed = (fn: (g: Game) => unknown) => () => act($, fn)

    const view = <Client key="panel" module="./view.tsx" props={{ id: 'panel', ms: 200, frame: null }} width={cols} height={viewRows} />

    // First run: which game, then who.
    if (v.mode === 'start' && v.pick === 'mode')
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>어떻게 즐길까요?</Text>
          <Text dimColor>언제든 바꿀 수 있어요.</Text>
          <Button key="modeLife" variant="primary" onPress={pressed(g => g.$('modeLife').click())}>
            인생 모드: 내가 일한 만큼 마을이 자라요
          </Button>
          <Button key="modeChaos" onPress={pressed(g => g.$('modeChaos').click())}>
            인성 파탄 모드: 다 지어진 마을을 마음껏 부숴요
          </Button>
        </Box>
      )
    if (v.mode === 'start')
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>누구로 살아볼까요?</Text>
          <Text dimColor>능력치는 랜덤으로 정해지고, 잘 맞는 직업을 갖게 돼요.</Text>
          <Box flexDirection="row" gap={2}>
            <Button key="f" variant="primary" onPress={pressed(g => g.pickGender('f'))}>
              여성
            </Button>
            <Button key="m" variant="primary" onPress={pressed(g => g.pickGender('m'))}>
              남성
            </Button>
          </Box>
        </Box>
      )

    const eraPick =
      v.pick === 'era' ? (
        <Box flexDirection="column">
          <Text bold>어느 시대 마을을 부술까요?</Text>
          <Box flexDirection="row" flexWrap="wrap" gap={1}>
            {(game?.ERAS ?? []).map((era, i) => (
              <Button key={`era-${i}`} onPress={pressed(g => g.$('eraButtons').children[i]?.click())}>
                {era.name}
              </Button>
            ))}
            <Button key="eraBack" dimColor onPress={pressed(g => g.$('eraBack').click())}>
              돌아가기
            </Button>
          </Box>
        </Box>
      ) : null

    const visit = p.showVisit ? (
      <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
        <Text bold>놀러가기</Text>
        <Text dimColor>서버 없이 코드로 주고받아요. Aquila·Chrome 친구와도 통해요.</Text>
        <Input
          key="nick"
          label="내 이름"
          value={p.nick}
          placeholder="이웃"
          onSubmit={async value => {
            const nick = value.trim().slice(0, 8)
            await act($, g => {
              g.nick = nick
              stored.nick = nick
              unsaved.set('nick', nick)
            })
            await showCode($, nick)
          }}
        />
        <Text>
          {p.codeTitle} <Text dimColor>{p.codeNote}</Text>
        </Text>
        {p.myCode ? <Code source={p.myCode} /> : null}
        {p.myCode ? (
          <Button key="copy" onPress={async press => {
            const r = await $.ui.copy({ text: p.myCode, surface: press.surface })
            $.ui.toast(r.isCopied ? '코드를 복사했어요' : '복사하지 못했어요. 위 코드를 직접 선택해 주세요')
          }}>
            복사
          </Button>
        ) : null}
        <Input
          key="theirCode"
          label="받은 코드"
          placeholder="친구가 보낸 초대 코드나 방명록 코드를 붙여 넣어 주세요"
          submitLabel="열기"
          onSubmit={async value => {
            await act($, async g => {
              await g.openCode(value)
            })
            const toast = txt('toast')
            if (toast && !game?.$('toast').hidden) $.ui.toast(toast)
            await update($, panel, x => ({ ...x, showVisit: false }))
          }}
        />
      </Box>
    ) : null

    const header = (
      <Text wrap="truncate">
        <Text bold>🪙{v.coins}</Text> <Text dimColor>· Lv.{v.level} · {v.era} · {v.day}일차 {v.season} · 인구 {v.pop} {v.weather}</Text>
      </Text>
    )
    const look = (
      <Box flexDirection="row" gap={1}>
        <Button key="left" hotkey="h" onPress={pressed(g => g.$('camLeft').click())}>
          ◀
        </Button>
        <Button key="right" hotkey="l" onPress={pressed(g => g.$('camRight').click())}>
          ▶
        </Button>
        {v.mode === 'life' ? (
          <Button key="me" dimColor onPress={pressed(g => g.$('camMe').click())}>
            내 캐릭터로
          </Button>
        ) : null}
        <Button key="visit" dimColor onPress={async () => {
          const open = !p.showVisit
          await update($, panel, x => ({ ...x, showVisit: open }))
          if (open) await showCode($)
        }}>
          놀러가기
        </Button>
      </Box>
    )
    const story = (
      <Box flexDirection="column">
        {v.story.map((line, i) => (
          <Text key={`s${i}`} dimColor={i > 0} wrap="truncate">
            {line}
          </Text>
        ))}
      </Box>
    )
    const sign = v.signing ? (
      <Input
        key="sign"
        label="방명록"
        placeholder="남길 말을 써 주세요"
        submitLabel="남기기"
        onSubmit={async value => {
          await act($, g => {
            g.$('signText').value = value.slice(0, 24)
            g.placeSign()
          })
          if (game?.MODE === 'visit') {
            await update($, panel, x => ({ ...x, showVisit: true }))
            await showCode($)
          }
        }}
      />
    ) : null

    if (v.mode === 'chaos')
      return (
        <Box flexDirection="column">
          {view}
          {eraPick}
          <Text dimColor wrap="truncate">
            {v.visitHost ? `${v.visitHost}님이 보낸 마을 · ` : ''}마을을 누르면 고른 도구를 써요
          </Text>
          <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
            {(game?.CHAOS_TOOLS ?? []).map(([id, icon, name]) => (
              <Button key={`tool-${id}`} dimColor={v.tool !== id} onPress={pressed(g => (g.chaosTool = id))}>
                {`${icon} ${name}`}
              </Button>
            ))}
          </Box>
          {sign}
          <Text dimColor wrap="wrap">
            {v.chaosStats}
          </Text>
          {look}
          {visit}
          <Box flexDirection="row" gap={1}>
            <Button key="chaosReset" onPress={pressed(g => g.$('chaosReset').click())}>
              마을 다시 짓기
            </Button>
            <Button key="chaosExit" variant="primary" onPress={pressed(g => g.$('chaosExit').click())}>
              내 마을로 돌아가기
            </Button>
          </Box>
          {story}
        </Box>
      )

    if (v.mode === 'visit')
      return (
        <Box flexDirection="column">
          {view}
          <Text bold>{v.visitHost}님 마을에 놀러 왔어요</Text>
          <Text dimColor>코드를 만든 순간의 마을이에요. 구경만 하고, 움직임은 실시간으로 이어지지 않아요.</Text>
          {sign}
          {look}
          {visit}
          <Box flexDirection="row" gap={1}>
            <Button key="visitWrite" onPress={pressed(g => g.$('visitWrite').click())}>
              방명록 남기기
            </Button>
            <Button key="visitExit" variant="primary" onPress={pressed(g => g.$('visitExit').click())}>
              내 마을로 돌아가기
            </Button>
          </Box>
          {story}
        </Box>
      )

    return (
      <Box flexDirection="column">
        {header}
        {view}
        {v.over ? (
          <Box flexDirection="column" borderStyle="round" paddingX={1}>
            <Text bold>이번 인생은 여기까지예요</Text>
            <Text wrap="wrap">{v.over}</Text>
            <Button key="again" variant="primary" onPress={pressed(g => g.$('again').click())}>
              새 마을 시작하기
            </Button>
          </Box>
        ) : null}
        {eraPick}
        <Text wrap="truncate">
          <Text bold>{v.now}</Text> <Text dimColor>{v.goal ? `· 다음 목표 ${v.goal}` : ''}</Text>
        </Text>
        {look}
        {visit}
        {story}
        <Box flexDirection="row" gap={1}>
          <Button key="toChaos" dimColor onPress={pressed(g => g.$('toChaos').click())}>
            인성 파탄 모드
          </Button>
          <Button key="corner" dimColor onPress={() => update($, panel, x => ({ ...x, corner: !x.corner }))}>
            {p.corner ? '오른쪽 위 창 끄기' : '오른쪽 위 창 켜기'}
          </Button>
        </Box>
      </Box>
    )
  })
}

/** The code the visit section shows: your invite, a chaos town to send on, or the reply after a note. */
async function showCode($: Dollar, nick?: string) {
  await ensureGame($)
  if (!game) return
  if (nick != null) game.nick = nick
  await game.openVisitCard()
  game.$('visitCard').hidden = true // the card is the page's; the panel shows its words instead
  await update($, panel, x => ({
    ...x,
    nick: game?.nick ?? '',
    codeTitle: txt('myCodeTitle'),
    codeNote: txt('myCodeNote'),
    myCode: String(game?.$('myCode').value ?? ''),
  }))
}
