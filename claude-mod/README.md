# 작은 마을 — Claude Code 모드

Claude를 쓰는 만큼 자라는 픽셀 마을을 Claude Code 안에서 키워요. 게임은 Aquila·Chrome판과 같고(`aquila/`가 원본),
마을은 따로 저장돼요.

- **오른쪽 위 창**: 터미널 오른쪽 위(채팅 위)에 마을이 떠 있어요. 누르면 패널이 열려요. `/village corner`로 켜고 꺼요.
  터미널 전체 화면 레이아웃에서 보여요.
- **`/village` 패널**: 마을을 크게 보고, ◀ ▶로 둘러보고, 이야기를 읽어요. 놀러가기(초대 코드·방명록 코드, Aquila·Chrome
  친구와도 통해요)와 인성 파탄 모드(마을을 눌러 도구를 써요)도 여기서 해요.
- **사용량**: Claude Code가 알려 주는 주간·5시간 사용률로 자라요. 주간 1% = 🪙10. 도우미 설치가 필요 없어요.
- **배터리**: 창이나 패널이 화면에 있을 때만 마을이 움직이고, 아니면 쉬었다가 돌아오면 밀린 일을 한꺼번에 해요.

## 설치

```sh
claude --plugin-dir /path/to/work-village/claude-mod
```

## 개발

- 게임을 고친 뒤 저장소 루트에서 `./build-claude-mod.sh` (게임을 `hooks/game.gen.js`로 묶어요).
- `hooks/host.js`: 브라우저 없이 게임을 돌리는 대역(소프트웨어 캔버스, DOM, 타이머). `hooks/zip.js`: 초대 코드용 deflate.
- `hooks/register.tsx`: 사용량·저장·창·패널. `hooks/view.tsx`: 마을을 `▀` 글자로 그리는 Client 모듈.
- 검사: `claude plugin validate claude-mod`, `claude plugin test claude-mod`, `node tools/mod-engine-test.mjs`.
