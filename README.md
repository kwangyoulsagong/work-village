# 작은 마을 (work-village)

Claude·Codex로 일한 만큼 자라는 2D 픽셀 마을 시뮬레이션. [Aquila Agents](https://github.com/kwangyoulsagong/aquila-agents) 확장 패널과 Chrome 사이드 패널에서 돌아갑니다. 서버 없음, 빌드 없음, 순수 HTML/JS.

- **인생 모드**: 성별만 고르면 캐릭터가 알아서 농사짓고 집 짓고 결혼하고 원시 시대에서 미래 도시까지 키웁니다. 짓기 탭에서 코인으로 직접 사도 됩니다. 죽으면 게임 끝, 다음 마을은 유산을 받고 시작.
- **인성 파탄 모드**: 완성된 마을을 받아 도구 10가지(핵, 전염병, 토네이도, 좀비 …)로 부숩니다. 인생 모드 저장은 건드리지 않습니다.

## 설치

**Aquila** (`aquila/`): `./install-aquila.sh`로 `~/.aquila/extensions/work-village/`에 복사한 뒤 확장 패널에서 켭니다(게임을 고칠 때마다 다시 실행하고 패널의 ↻). 권한: 사용량, 저장.

**Chrome** (`chrome/`): `./build-chrome.sh` → `chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램 로드" → `chrome/` 폴더. Chrome판은 브라우저를 켜 둔 시간으로 자랍니다(1시간 = 10코인).

## 폴더

- `aquila/` — 게임 원본 + Aquila 확장(매니페스트, `aquila.js` 클라이언트). **게임은 여기서 고칩니다.**
- `chrome/` — Chrome MV3 사이드 패널판. `build-chrome.sh`가 `aquila/`의 게임 파일을 복사하고, `chrome-shim.js`가 같은 `window.aquila` API를 브라우저 시간으로 흉내 냅니다.

## 파일 (`aquila/`)

| 파일 | 내용 |
|---|---|
| `art.js` | 픽셀 스프라이트: 사람, 동물, 나무, 지형 |
| `ai.js` | 길찾기(A*), 유틸리티 AI(필요·점수), 동물 |
| `layout.js` | 매 판 랜덤 지도(225타일), 카메라, 집터, 숲 개간 |
| `extras.js` | 날씨, 재료, 도감, 상인, 하늘, 농장 업그레이드 |
| `jobs.js` | 직업 24가지와 능력치 맞춤 |
| `life.js` | 시대별 탈것, 동물 추가, 주민 외모, 직업 수입, 짓기 메뉴, 타임라인 |
| `fun.js` | 자리 비운 사이, 황금 손님, 연대기, 마을 분위기, 유산, 붕괴 모션, RIP 비석 |
| `chaos.js` | 인성 파탄 모드 |
| `game.js` | 상태, 경제, 그리기 루프(30fps), UI |
| `index.html` | 패널(토스 스타일, 반응형) |

`index.html`에서 스크립트 순서가 중요합니다: `game.js`보다 먼저 로드되는 파일은 최상위에서 `game.js`의 상수를 쓰면 안 됩니다(함수 안에서만).
