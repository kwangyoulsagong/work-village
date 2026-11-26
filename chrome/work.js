// 작은 마을 — work scenes: going to work takes you inside the workplace (a 120 × 96 scene, like the house), and every
// job has its one telling moment: a goal, a home run, a buzzer-beater, a take that's OK or NG, an encore, a gavel.
// A scene lasts 12 s; the result (great ~20 % / ok ~65 % / oops ~15 %, nudged by how well you fit the job and your
// fame) shows as a banner. Tap the scene before the moment for a chance to do one better. Results move only XP,
// happiness and fame (S.fame[job]: 신인 → 주전 → 스타 → 전설), never coins. Ruling, 30 % of work days are at the throne
// or the office desk instead. A servant is freed after eight days of work. Nobody gets hurt: a miss is just a miss.
// Research (TODO.md): The Sims 4 Get to Work, Kairosoft (short, skippable), Idol Manager, Tomodachi Life (no repeats).
// Life mode only. Loaded before game.js: game.js names are used only inside functions.
'use strict';

const WORK_N = 96; // 12 s at 8 ticks a second
const WORK_HIT = 0.55; // when the moment comes (share of the scene)
let workStay = null; // { id, name, kind, out, line, banner, t, n, tapped, rule }
const workView = () => MODE === 'life' && !!workStay && !lifeCam;

// Which scene a job plays; a list is by era (a stage actor in the old days, a film set later).
const SCENE_OF = {
  hunter: 'woods', gatherer: 'woods', fisher: 'lake', shaman: 'temple', storyteller: 'stage', wrestler: 'ring',
  firekeeper: 'woods', potter: 'forge', herder: 'farm', doctor: 'clinic', teacher: 'school', builder: 'build',
  painter: 'studio', dancer: 'stage', toolmaker: 'forge', farmer: 'farm', smith: 'forge', athlete: 'track',
  merchant: 'shop', actor: ['stage', 'stage', 'stage', 'stage', 'film'], judge: 'court', scribe: 'office',
  gladiator: 'ring', servant: 'yard', police: 'street', nurse: 'clinic', chef: 'kitchen', soldier: 'dojo',
  tailor: 'shop', astronomer: 'lab', sailor: 'lake', priest: 'temple', musician: 'stage', knight: 'dojo',
  bard: 'stage', baker: 'kitchen', monk: 'temple', jester: 'stage', samurai: 'dojo', falconer: 'woods',
  firefighter: 'fire', alchemist: 'lab', innkeeper: 'kitchen', barber: 'shop', miner: 'mine', worker: 'factory',
  mail: 'street', baseball: 'baseball', circus: 'stage', lawyer: 'court', inventor: 'lab', soccer: 'soccer',
  basketball: 'basketball', photographer: 'studio', detective: 'street', reporter: ['office', 'office', 'office', 'office', 'booth'],
  driver: ['track', 'track', 'track', 'street', 'street', 'office'], banker: 'office', office: 'office', star: 'stage',
  volleyball: 'volleyball', programmer: 'office', pilot: 'launch', webtoon: 'studio', barista: 'kitchen', vet: 'clinic',
  attendant: 'launch', zookeeper: 'farm', gamer: 'booth', creator: 'booth', robotics: 'lab', astronaut: 'launch',
  holoidol: 'stage', zerog: 'zerog', aitrainer: 'office', terraformer: 'farm', vrdesigner: 'office', mecha: 'ring',
  robopet: 'factory',
};
const sceneOf = (j) => atEra(SCENE_OF[j.id]) ?? 'office';

/** Per scene: banners [great, ok, oops] (a list: one at random) and lines per result (never the same twice running). */
const WORK_TEXT = {
  soccer: { b: ['골!!', '어시스트!', '골대 맞았어요'], great: ['후반 막판 결승골! 관중이 내 이름을 외쳐요', '바이시클 킥이 그대로 골망을 흔들었어요', '수비 셋을 제치고 골! 오늘의 선수예요'], ok: ['내 패스로 동료가 골을 넣었어요', '90분 내내 뛰었어요. 무승부지만 뿌듯해요'], oops: ['슛이 골대를 맞고 나왔어요. 다음엔 들어갈 거예요', '공이 하늘 높이 날아갔어요. 관중석이 웃어요'] },
  zerog: { b: ['무중력 골!', '패스 성공', '빙글빙글…'], great: ['세 바퀴 돌며 골! 해설자가 소리 질러요', '벽을 차고 날아올라 골을 넣었어요'], ok: ['떠다니는 공을 동료에게 정확히 보냈어요', '오늘 경기는 무승부예요. 둥둥 떠서 인사했어요'], oops: ['빙글빙글 돌다가 공을 놓쳤어요', '방향을 잃고 천장에 닿았어요. 다들 웃어요'] },
  baseball: { b: ['홈런!!', '안타!', '삼진…'], great: ['9회 말 역전 홈런! 공이 담장 밖으로 사라졌어요', '만루 홈런! 더그아웃이 뛰쳐나와요'], ok: ['깔끔한 안타로 1루에 나갔어요', '희생 플라이로 점수를 냈어요'], oops: ['헛스윙 삼진이에요. 다음 타석을 기다려요', '공이 너무 빨랐어요. 배트가 늦었어요'] },
  basketball: { b: ['버저비터!!', '2점!', '림 맞고 나왔어요'], great: ['종료 버저와 함께 3점 슛! 체육관이 떠나갈 듯해요', '하프라인에서 던진 공이 그대로 들어갔어요'], ok: ['레이업으로 2점을 넣었어요', '리바운드를 잡아 동료에게 넘겼어요'], oops: ['공이 림을 한 바퀴 돌고 나왔어요', '에어볼이에요. 다음엔 꼭 넣을래요'] },
  volleyball: { b: ['스파이크!!', '받아냈어요', '네트에 걸렸어요'], great: ['강스파이크가 코트에 꽂혔어요! 매치 포인트예요', '블로킹 셋을 뚫고 득점했어요'], ok: ['몸을 날려 공을 받아냈어요', '서브가 깔끔하게 들어갔어요'], oops: ['공이 네트에 걸렸어요', '서브가 살짝 길었어요. 아웃이에요'] },
  ring: { b: ['한판승!', '판정승', '아쉬운 패'], great: ['한 번에 넘겼어요! 관중이 일어나 박수쳐요', '마지막 순간 역전승! 챔피언 벨트를 들었어요'], ok: ['끝까지 버텨 판정승을 거뒀어요', '팽팽했어요. 서로 손을 맞잡고 인사했어요'], oops: ['아쉽게 졌어요. 상대가 손을 내밀어 일으켜 줬어요', '이번엔 상대가 한 수 위였어요'] },
  track: { b: ['신기록!', '완주!', '조금 늦었어요'], great: ['결승선을 가장 먼저 끊었어요! 마을 신기록이에요', '마지막 직선에서 모두 제쳤어요'], ok: ['끝까지 달려 완주했어요', '2등이에요. 숨이 차지만 기분 좋아요'], oops: ['출발이 늦었어요. 그래도 끝까지 달렸어요', '발이 꼬일 뻔했어요. 다음엔 더 빨리요'] },
  stage: { b: ['앙코르!!', '박수 갈채', '음이탈…'], great: ['앙코르가 세 번 나왔어요! 무대가 빛났어요', '관객이 다 같이 따라 불렀어요'], ok: ['무대가 끝나자 따뜻한 박수가 나왔어요', '실수 없이 끝까지 해냈어요'], oops: ['높은 음에서 살짝 삐끗했어요. 관객이 웃으며 응원해요', '가사를 잊어서 관객이 대신 불러 줬어요'] },
  film: { b: ['OK! 한 번에', 'OK', 'NG! 다시 갈게요'], great: ['한 번에 OK! 감독님이 엄지를 들었어요', '눈물 연기에 스태프들이 같이 울었어요'], ok: ['몇 번 만에 OK가 났어요', '오늘 촬영 분량을 다 찍었어요'], oops: ['대사가 꼬였어요. NG! 다들 웃었어요', '웃음이 터져서 NG가 났어요'] },
  court: { b: [['무죄!', '유죄!'], '판결 끝', '정숙! 정숙!'], great: ['명판결이에요. 마을 사람들이 고개를 끄덕여요', '억울한 사람이 웃으며 법정을 나갔어요'], ok: ['오늘 사건을 차분히 마무리했어요', '서류를 꼼꼼히 읽고 판결했어요'], oops: ['방청석이 시끄러워서 망치를 여러 번 두드렸어요', '재판이 다음 주로 미뤄졌어요'] },
  clinic: { b: ['완치!', '치료 끝', '주사 무서워요…'], great: ['환자가 벌떡 일어나 고맙다고 해요', '어려운 병을 고쳤어요. 마을에 소문이 났어요'], ok: ['오늘 환자들을 모두 돌봤어요', '약을 지어 주고 푹 쉬라고 했어요'], oops: ['환자가 주사가 무섭다며 숨었어요. 내일 다시 오기로 했어요', '약이 써서 환자가 얼굴을 찡그려요'] },
  school: { b: ['모두 백 점!', '수업 끝', '다들 졸아요…'], great: ['아이들이 모두 백 점을 받았어요', '질문이 쏟아졌어요. 다들 눈이 반짝여요'], ok: ['오늘 수업을 무사히 마쳤어요', '숙제를 내 주고 인사했어요'], oops: ['점심 뒤라 다들 꾸벅꾸벅 졸아요', '분필이 부러져서 다들 웃었어요'] },
  build: { b: ['완공!', '오늘 몫 끝', '다시 쌓아요'], great: ['하루 만에 지붕까지 올렸어요! 깃발을 꽂았어요', '튼튼하고 반듯해요. 집주인이 감탄해요'], ok: ['벽을 한 층 더 올렸어요', '기둥을 반듯하게 세웠어요'], oops: ['돌 하나가 삐뚤어서 다시 쌓았어요', '비가 와서 일을 일찍 접었어요'] },
  studio: { b: ['걸작!', '완성', '물감을 쏟았어요'], great: ['걸작이 나왔어요! 마을 사람들이 보러 와요', '그림이 살아 움직일 것 같대요'], ok: ['오늘 작품을 하나 완성했어요', '스케치를 마쳤어요. 내일 색을 칠해요'], oops: ['물감을 엎질렀어요. 그것도 무늬가 됐어요', '마음에 안 들어서 다시 그려요'] },
  forge: { b: ['명품 완성!', '완성', '휘었어요'], great: ['반짝이는 명품이 나왔어요! 다들 탐내요', '불 조절이 완벽했어요'], ok: ['튼튼한 물건을 하나 만들었어요', '오늘 몫을 다 두드렸어요'], oops: ['조금 휘었어요. 다시 녹여서 만들어요', '불이 약해서 내일 마저 해요'] },
  farm: { b: ['풍작!', '밭일 끝', '잡초만…'], great: ['커다란 작물이 나왔어요! 마을 자랑거리예요', '밭이 온통 초록빛이에요'], ok: ['김을 매고 물을 줬어요', '오늘 밭일을 마쳤어요'], oops: ['잡초가 더 빨리 자라요. 내일 또 뽑아요', '새들이 씨앗을 먼저 먹었어요'] },
  woods: { b: ['대박!', '가득 담았어요', '빈손이에요'], great: ['숲 깊은 곳에서 귀한 것을 찾았어요!', '바구니가 넘치도록 담았어요'], ok: ['오늘 몫을 넉넉히 챙겼어요', '숲길을 한 바퀴 돌고 왔어요'], oops: ['다람쥐가 먼저 다 가져갔어요', '오늘은 숲이 조용했어요. 내일 다시 와요'] },
  lake: { b: ['월척!!', '몇 마리', '놓쳤어요!'], great: ['팔뚝만 한 물고기를 낚았어요!', '그물이 묵직해요. 오늘은 풍어예요'], ok: ['몇 마리 낚았어요', '물결이 잔잔해서 기분 좋은 하루였어요'], oops: ['큰 놈이 줄을 끊고 달아났어요', '찌가 한 번도 안 움직였어요'] },
  temple: { b: ['깨달음!', '기도 끝', '꾸벅…'], great: ['빛이 들어오며 마음이 맑아졌어요', '마을 사람들이 축복을 받고 웃어요'], ok: ['조용히 기도를 마쳤어요', '향을 피우고 마당을 쓸었어요'], oops: ['기도하다 꾸벅 졸았어요', '촛불이 바람에 꺼져서 다시 붙였어요'] },
  shop: { b: ['완판!', '장사 잘됐어요', '손님이 없어요'], great: ['물건이 다 팔렸어요! 줄이 길게 섰어요', '단골이 친구들을 데려왔어요'], ok: ['오늘 장사가 괜찮았어요', '손님마다 웃으며 나갔어요'], oops: ['손님이 한 명도 안 왔어요. 내일은 올 거예요', '흥정하다가 하나 깎아 줬어요'] },
  kitchen: { b: ['최고의 맛!', '맛있대요', '조금 탔어요'], great: ['한입 먹은 손님이 감동했어요!', '오늘의 요리가 마을 명물이 됐어요'], ok: ['손님들이 맛있다며 그릇을 비웠어요', '주문을 다 받아 냈어요'], oops: ['살짝 탔어요. 그래도 손님이 다 먹었어요', '소금을 깜빡했어요. 다음엔 안 잊을래요'] },
  yard: { b: ['고맙다고 해요', '일을 마쳤어요', '조금 늦었어요'], great: ['마당이 반짝반짝해요. 고맙다는 인사를 받았어요', '일을 빨리 끝내고 쉬는 시간이 생겼어요'], ok: ['오늘 맡은 일을 다 했어요', '마당을 쓸고 물을 길어 왔어요'], oops: ['바람이 불어 낙엽을 다시 쓸었어요', '조금 늦었지만 끝까지 해냈어요'] },
  dojo: { b: ['일격!', '훈련 끝', '헛손질'], great: ['단번에 과녁 한가운데를 맞혔어요!', '스승님이 고개를 끄덕였어요'], ok: ['땀 흘려 훈련을 마쳤어요', '기본기를 백 번 연습했어요'], oops: ['헛손질했어요. 다시 자세를 잡아요', '과녁이 살짝 빗나갔어요'] },
  street: { b: ['해결!', '한 바퀴 돌았어요', '길을 헤맸어요'], great: ['길 잃은 아이를 집에 데려다줬어요!', '골목의 일을 시원하게 해결했어요'], ok: ['동네를 한 바퀴 돌았어요. 오늘도 평화로워요', '맡은 일을 차례차례 끝냈어요'], oops: ['길을 잘못 들어 한참 돌아갔어요', '지도를 거꾸로 들고 있었어요'] },
  fire: { b: ['모두 구했어요!', '불을 껐어요', '물벼락…'], great: ['불을 끄고 지붕 위 고양이까지 구했어요!', '연기 한 줄 없이 깔끔하게 껐어요'], ok: ['불을 무사히 껐어요', '훈련을 마쳤어요. 언제든 준비돼 있어요'], oops: ['물줄기가 튀어서 흠뻑 젖었어요. 불은 꺼졌어요', '호스가 꼬여서 시간이 좀 걸렸어요'] },
  lab: { b: ['발견!', '실험 기록', '펑!'], great: ['새로운 걸 발견했어요! 이름을 붙여야 해요', '실험이 한 번에 성공했어요'], ok: ['실험 결과를 꼼꼼히 적었어요', '오늘은 측정만 했어요. 내일 이어서 해요'], oops: ['펑! 얼굴에 그을음이 묻었어요', '플라스크가 넘쳤어요. 다시 해요'] },
  mine: { b: ['보석 발견!', '가득 캤어요', '허탕'], great: ['벽 속에서 반짝이는 보석이 나왔어요!', '새 광맥을 찾았어요'], ok: ['수레를 가득 채웠어요', '오늘 몫을 다 캤어요'], oops: ['돌만 잔뜩 나왔어요', '등불이 꺼져서 일찍 나왔어요'] },
  factory: { b: ['생산 신기록!', '할당량 끝', '라인이 멈췄어요'], great: ['오늘 생산 신기록이에요!', '고장 난 기계를 고쳐서 칭찬받았어요'], ok: ['할당량을 다 채웠어요', '기계 소리에 맞춰 차근차근 일했어요'], oops: ['라인이 잠깐 멈췄어요. 곧 다시 돌아가요', '부품 하나를 거꾸로 끼웠어요'] },
  office: { b: ['칭찬받았어요!', '퇴근!', '야근…'], great: ['오늘 낸 아이디어가 채택됐어요!', '일을 일찍 끝내고 칭찬까지 받았어요'], ok: ['오늘 일을 다 하고 퇴근해요', '회의를 무사히 마쳤어요'], oops: ['일이 밀려서 야근해요', '파일을 저장 안 해서 다시 했어요'] },
  booth: { b: ['구독자 폭발!', '방송 끝', '렉 걸렸어요'], great: ['하트가 쏟아졌어요! 구독자가 확 늘었어요', '오늘 방송이 마을 화제예요'], ok: ['오늘 방송을 무사히 마쳤어요', '시청자들과 즐겁게 이야기했어요'], oops: ['화면이 멈췄어요. 다들 기다려 줬어요', '마이크가 꺼진 줄 모르고 한참 말했어요'] },
  launch: { b: ['발사 성공!', '비행 끝', '발사 연기'], great: ['하늘을 가르며 날아올랐어요!', '완벽한 착륙! 박수가 터졌어요'], ok: ['무사히 다녀왔어요', '오늘 비행을 마쳤어요'], oops: ['날씨가 나빠 발사를 미뤘어요', '점검이 길어져서 내일 떠나요'] },
  throne: { b: ['만세!', '결재 끝', '하품…'], great: ['마을 사람들이 만세를 불러요!', '오늘 결정에 모두가 박수쳐요'], ok: ['오늘 올라온 일을 다 처리했어요', '신하들과 차분히 의논했어요'], oops: ['회의가 길어져 다들 하품해요', '도장을 거꾸로 찍었어요'] },
};
/** Banners that differ for one job in a shared scene. */
const WORK_BANNER = { lawyer: ['승소!', '합의했어요', '패소…'], mail: ['감사 인사!', '배달 끝', '주소가 틀렸어요'], driver: ['일등!', '도착!', '조금 늦었어요'], photographer: ['인생 사진!', '찰칵', '흔들렸어요'] };

// ── Fame ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const FAME_AT = [0, 10, 30, 80];
const FAME_NAMES = ['신인', '주전', '스타', '전설'];
const fameOf = (id) => S.fame?.[id] ?? 0;
const fameTier = (id) => FAME_AT.reduce((k, at, i) => (fameOf(id) >= at ? i : k), 0);
/** Known for your job pays: a star +3 %, a legend +6 % (on your own job's pay). */
const fameMul = (id) => [1, 1, 1.03, 1.06][fameTier(id)];
/** The jobs you're a legend at: a trophy each on the wall at home. */
const legends = () => Object.keys(S.fame ?? {}).filter((id) => fameTier(id) >= 3);
function drawTrophies(g) {
  legends().slice(0, 4).forEach((id, i) => {
    const x = 6 + i * 8;
    R(g, x, 10, 6, 1, '#8a5a32');
    R(g, x + 1, 5, 4, 3, '#e8c050');
    R(g, x + 2, 8, 2, 2, '#c9921a');
    R(g, x, 5, 1, 2, '#e8c050');
    R(g, x + 5, 5, 1, 2, '#e8c050');
  });
}

// ── Going to work ─────────────────────────────────────────────────────────────────────────────────────────────────

/** great / ok / oops: ~20 / 65 / 15 %, better when the job fits you and you're known for it. */
function workRoll(j) {
  const fit = S.traits ? jobFit(j, S.traits) : 0.6;
  const tier = fameTier(j.id);
  const great = Math.max(0.08, Math.min(0.4, 0.2 + (fit - 0.6) * 0.15 + tier * 0.03));
  const oops = Math.max(0.05, Math.min(0.25, 0.15 - (fit - 0.6) * 0.1 - tier * 0.02));
  const r = Math.random();
  return r < great ? 'great' : r < great + oops ? 'oops' : 'ok';
}
let lastWorkLine = '';
function workLine(kind, out) {
  const all = WORK_TEXT[kind][out];
  const pool = all.filter((l) => l !== lastWorkLine);
  return (lastWorkLine = pool[rand(0, pool.length - 1)] ?? all[0]);
}
function workBanner(id, kind, out) {
  const b = (WORK_BANNER[id] ?? WORK_TEXT[kind].b)[['great', 'ok', 'oops'].indexOf(out)];
  return Array.isArray(b) ? b[rand(0, b.length - 1)] : b;
}
/** At the workplace: in you go (the job's errand calls this when you arrive). */
function startWork(j) {
  if (MODE !== 'life' || !j) return;
  const rule = typeof youRule === 'function' && youRule() && Math.random() < 0.3;
  const kind = rule ? 'throne' : sceneOf(j);
  const out = workRoll(j);
  workStay = { id: j.id, job: j.name, name: rule ? SEATS[S.era] : j.name, kind, out, t: WORK_N, n: WORK_N, tapped: false, rule };
  me.hidden = true;
  rest = Math.max(rest, 2);
  $('now').textContent = rule ? `${josa(SEATS[S.era], '으로서', '로서')} 일하는 중 · 화면을 누르면 힘을 내요` : `${josa(j.name, '으로', '로')} 일하는 중 · 화면을 누르면 힘을 내요`;
}
/** Each tick while at work. */
function workTick() {
  if (!workStay) return false;
  if (MODE !== 'life' || S.over) return (workStay = null), (me.hidden = false), false;
  if (!workStay.watch) {
    rest = Math.max(rest, 2);
    me.hidden = true;
  }
  if (workStay.t === Math.round(WORK_N * (1 - WORK_HIT))) {
    workStay.banner = workBanner(workStay.id, workStay.kind, workStay.out);
    workStay.line = workLine(workStay.kind, workStay.out);
  }
  if (--workStay.t > 0) return true;
  workDone();
  return true;
}
/** Tap the scene before the moment: a chance to do one better (an oops to ok, an ok to great). */
function workTap() {
  const s = workStay;
  if (!s || s.tapped || s.t < Math.round(WORK_N * (1 - WORK_HIT))) return;
  s.tapped = true;
  s.cheer = 12;
  if (s.out === 'oops' && Math.random() < 0.6) s.out = 'ok';
  else if (s.out === 'ok' && Math.random() < 0.35) s.out = 'great';
}
function workDone() {
  const s = workStay;
  workStay = null;
  const line = s.line ?? workLine(s.kind, s.out);
  if (s.watch) {
    // Only watching: their words, and a smile.
    $('now').textContent = `${s.who}: "${line}"`;
    toast(`${s.who}: ${s.banner ?? ''}`);
    return;
  }
  me.hidden = false;
  S.fame ??= {};
  const before = fameTier(s.id);
  S.fame[s.id] = fameOf(s.id) + (s.out === 'great' ? 2 : s.out === 'ok' ? 1 : 0);
  const after = fameTier(s.id);
  gainXp(s.out === 'great' ? 6 : s.out === 'ok' ? 3 : 1);
  S.happy = Math.max(0, Math.min(100, S.happy + (s.out === 'great' ? 3 : s.out === 'ok' ? 1 : -1)));
  if (s.rule && s.out === 'great') {
    const fs = factions();
    const f = fs[rand(0, fs.length - 1)];
    gov().mood[f.id] = Math.min(5, (gov().mood[f.id] ?? 0) + 1);
  }
  if (after > before)
    story(`🌟 ${josa(s.job ?? s.name, '으로', '로')} 이름이 났어요. 이제 '${FAME_NAMES[after]}'예요.${after === 3 ? ' 집에 트로피를 걸었어요. 직업 수입 +6%' : after === 2 ? ' 직업 수입 +3%' : ''}`);
  else if (s.out === 'great' && Math.random() < 0.5) story(`💼 ${line}.`);
  if (s.id === 'servant' && !S.freed && !s.rule && S.servantDay !== S.days) {
    S.servantDay = S.days; // a day's work counts once
    S.servantDays = (S.servantDays ?? 0) + 1;
    if (S.servantDays >= 8) {
      S.freed = true;
      story('🕊️ 성실하게 일한 끝에 노비 문서를 돌려받았어요. 이제 자유예요!');
      updateMyJob();
    }
  }
  $('now').textContent = line;
  popAt(me.x, me.y);
  save();
  paintUi();
}
/** From a neighbour's card: watch them at work (their scene, their result; nothing changes for you). */
function watchWorkWhy(e) {
  if (MODE !== 'life' || !e?.job || e.zombie || e.small) return '볼 수 없어요';
  if (workStay || homeStay || guestStay) return '지금은 볼 수 없어요';
  return '';
}
function watchWork(e, name, traits) {
  if (watchWorkWhy(e)) return;
  const j = e.job;
  const kind = sceneOf(j);
  const fit = traits ? jobFit(j, traits) : 0.6;
  const r = Math.random();
  const out = r < 0.2 + (fit - 0.6) * 0.15 ? 'great' : r > 0.85 + (fit - 0.6) * 0.1 ? 'oops' : 'ok';
  workStay = { id: j.id, name: `${name} · ${j.name}`, who: name, kind, out, t: WORK_N, n: WORK_N, tapped: false, watch: { look: e.look, job: j, gender: e.gender, who: e.who } };
  lifeCam = null;
}
/** Off to chaos or a friend's town: whatever you were in the middle of in your own town (work, a call, a pastime,
 * a boat trip) ends, so nothing brings you back on their map. */
function dropLifeStays() {
  workStay = null;
  guestStay = null;
  wantCall = null;
  homeStay = null;
  houseView = false;
  seaTrip = 0;
}
/** Taps on the scene go to the scene, not to the town underneath. */
function wireWork() {
  canvas.addEventListener(
    'click',
    (ev) => {
      if (!workView()) return;
      ev.stopImmediatePropagation();
      workTap();
    },
    { capture: true },
  );
}

// ── Drawing ───────────────────────────────────────────────────────────────────────────────────────────────────────

const FOLK = [
  { hair: '#3a2418', top: '#e8505b', legs: '#4b4560' },
  { hair: '#7a4a2a', top: '#3a7ad0', legs: '#2f3a52' },
  { hair: '#1f1b2b', top: '#5aa04a', legs: '#4b4560' },
  { hair: '#5a3022', top: '#e8c050', legs: '#5a3d2b' },
  { hair: '#2a2a33', top: '#8a6cc9', legs: '#2f2f3a' },
  { hair: '#8a5a32', top: '#f4efe6', legs: '#6b4428' },
];
const lerp = (a, b, q) => a + (b - a) * Math.max(0, Math.min(1, q));
/** A point on an arc from (x0, y0) to (x1, y1), h pixels high at the top. */
const arcAt = (x0, y0, x1, y1, h, q) => [lerp(x0, x1, q), lerp(y0, y1, q) - h * 4 * q * (1 - q)];
function wMe(g, c, x, y, dir = 'r', walk = false, hop = 0) {
  const w = c.s.watch;
  if (w) return person(g, { kind: 'villager', job: w.job, who: w.who, x: Math.round(x), y: Math.round(y + hop), dir, path: walk ? [1] : [], frame: walk ? c.t : 0, seed: 1, gender: w.gender }, w.look);
  person(g, { kind: 'me', x: Math.round(x), y: Math.round(y + hop), dir, path: walk ? [1] : [], frame: walk ? c.t : 0, seed: 1, gender: S.gender }, OUTFIT[c.E]);
}
function wFolk(g, c, x, y, dir, k, o = {}) {
  person(g, { kind: 'villager', x: Math.round(x), y: Math.round(y + (o.hop ?? 0)), dir, path: o.walk ? [1] : [], frame: o.walk ? c.t + k : 0, seed: k, gender: k % 2 ? 'm' : 'f', small: o.small }, o.look ?? FOLK[k % FOLK.length]);
}
/** A row of heads (an audience); they jump when cheering. */
function wCrowd(g, c, y, n, cheer, x0 = 4, x1 = 116) {
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + step * i + step / 2);
    const up = cheer && (c.t + i * 3) % 6 < 3 ? -2 : 0;
    disc(g, x, y + up, 3, FOLK[i % FOLK.length].hair);
    R(g, x - 3, y + 3 + up, 7, 5, FOLK[(i + 2) % FOLK.length].top);
    if (cheer && i % 2) R(g, x + 3, y - 4 + up, 1, 4, '#ffd9b8');
  }
}
function wSky(g, c, ground, gy = 60) {
  R(g, 0, 0, 120, gy, night ? '#1c2448' : raining() ? '#8a9aa8' : '#8fd3f4');
  if (night) for (const [sx, sy] of [[14, 8], [40, 14], [78, 6], [104, 18]]) R(g, sx, sy, 1, 1, '#ffe9a8');
  R(g, 0, gy, 120, 96 - gy, ground);
}
function wRoom(g, c, gy = 60) {
  const r = ROOM[c.E];
  R(g, 0, 0, 120, gy, r.wall);
  R(g, 0, gy - 3, 120, 3, r.trim);
  R(g, 0, gy, 120, 96 - gy, r.floor);
  for (let y = gy + 4; y < 96; y += 6) R(g, 0, y, 120, 1, r.floor2);
  return r;
}
function wText(g, text, x, y, size, color, back) {
  g.font = `bold ${size}px sans-serif`;
  const w = Math.ceil(g.measureText(text).width);
  const left = Math.round(x - w / 2);
  if (back) {
    g.fillStyle = back;
    g.fillRect(left - 3, y - size, w + 6, size + 3);
  }
  g.fillStyle = color;
  g.fillText(text, left, y);
}
function wSparkles(g, c, x, y, n = 6, color = '#ffe066') {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + c.t * 0.2;
    const d = 6 + ((c.t + i * 2) % 8);
    R(g, Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 1, 1, color);
  }
}
function wConfetti(g, c) {
  for (let i = 0; i < 24; i++) R(g, (i * 37 + c.t * (1 + (i % 3))) % 120, (i * 23 + c.t * 2) % 70, 2, 1, ['#e8505b', '#ffd23f', '#5ad7e8', '#5aa04a', '#ff9ec2'][i % 5]);
}
function wSweat(g, x, y) {
  R(g, x, y, 1, 2, '#8fd0f0');
  R(g, x + 1, y + 2, 1, 1, '#8fd0f0');
}

const SCENES = {
  soccer(g, c) {
    wSky(g, c, '#5aa04a', 34);
    wCrowd(g, c, 20, 14, c.hit && c.out !== 'oops');
    for (let x = 0; x < 120; x += 16) R(g, x, 34, 8, 62, '#64ad52');
    R(g, 0, 60, 120, 1, '#f4f6f8');
    // The goal on the right, a keeper in it.
    for (let y = 48; y < 72; y += 3) R(g, 106, y, 12, 1, 'rgba(255,255,255,0.45)');
    for (let x = 108; x < 120; x += 3) R(g, x, 46, 1, 26, 'rgba(255,255,255,0.45)');
    R(g, 104, 46, 2, 26, '#f4f6f8');
    R(g, 104, 46, 16, 2, '#f4f6f8');
    const keepY = c.hit && c.out === 'great' ? 70 : 72;
    wFolk(g, c, c.out === 'great' && c.hit ? 112 : 108, keepY, 'l', 3, { look: { hair: '#1f1b2b', top: '#e8c050', legs: '#2f2f3a' }, hop: c.hit ? -2 : 0 });
    wFolk(g, c, 72, 82, 'l', 1, { walk: true });
    const kick = Math.min(1, c.p / WORK_HIT);
    wMe(g, c, lerp(16, 46, kick), 80, 'r', kick < 1);
    const q = (c.p - WORK_HIT) / 0.15;
    let [bx, by] = c.p < WORK_HIT ? [lerp(22, 52, kick), 79] : c.out === 'great' ? arcAt(52, 79, 112, 54, 14, q) : c.out === 'ok' ? arcAt(52, 79, 82, 76, 6, q) : arcAt(52, 79, 104, 46, 18, q);
    if (c.out === 'oops' && q > 1) [bx, by] = arcAt(104, 46, 90, 82, 10, (q - 1) / 0.8);
    if (c.out === 'ok' && q > 1) [bx, by] = arcAt(82, 76, 112, 60, 6, Math.min(1, (q - 1) / 0.6));
    disc(g, Math.round(bx), Math.round(by), 2, '#ffffff');
    R(g, Math.round(bx), Math.round(by), 1, 1, '#2a2a30');
  },
  zerog(g, c) {
    R(g, 0, 0, 120, 96, '#141a3a');
    for (let i = 0; i < 30; i++) R(g, (i * 41) % 120, (i * 29) % 96, 1, 1, i % 3 ? '#ffffff' : '#9ab0ff');
    box(g, 2, 30, 6, 36, '#5ad7e8', '#2a3a6a');
    box(g, 112, 30, 6, 36, '#ff8ac0', '#2a3a6a');
    const bob = (k) => Math.round(Math.sin((c.t + k * 9) / 6) * 3);
    wFolk(g, c, 86, 56 + bob(2), 'l', 2, { look: { hair: '#1f1b2b', top: '#ff8ac0', legs: '#8a9bb0' } });
    wFolk(g, c, 60, 30 + bob(4), 'l', 4, { look: { hair: '#5a3022', top: '#5ad7e8', legs: '#8a9bb0' } });
    const spin = c.out === 'oops' && c.hit;
    wMe(g, c, lerp(20, 50, c.p / WORK_HIT), 62 + bob(1), spin ? ['l', 'u', 'r', 'd'][Math.floor(c.t / 2) % 4] : 'r');
    const q = (c.p - WORK_HIT) / 0.2;
    const [bx, by] = c.p < WORK_HIT ? [lerp(26, 56, c.p / WORK_HIT), 58 + bob(1)] : c.out === 'great' ? arcAt(56, 58, 114, 46, -20, q) : c.out === 'ok' ? arcAt(56, 58, 60, 34, 8, q) : arcAt(56, 58, 70, 8, 4, q);
    disc(g, Math.round(bx), Math.round(by), 2, '#ffe066');
  },
  baseball(g, c) {
    wSky(g, c, '#5aa04a', 30);
    wCrowd(g, c, 16, 14, c.hit && c.out === 'great');
    R(g, 0, 30, 120, 2, '#2a6a3a');
    R(g, 10, 74, 100, 14, '#c8956a');
    R(g, 24, 70, 8, 3, '#d8b080'); // the mound
    wFolk(g, c, 28, 72, 'r', 2, { look: { hair: '#1f1b2b', top: '#3a5a8a', legs: '#f4f6f8' } });
    wFolk(g, c, 104, 84, 'l', 5, { look: { hair: '#2a2a33', top: '#3a5a8a', legs: '#2f2f3a' } }); // the catcher
    R(g, 92, 80, 6, 2, '#f4f6f8'); // home plate
    wMe(g, c, 94, 80, 'l');
    const swing = c.p > WORK_HIT - 0.04 && c.p < WORK_HIT + 0.06;
    if (swing) R(g, 80, 70, 12, 2, '#c98d4b');
    else R(g, 98, 62, 2, 12, '#c98d4b');
    const pitch = (c.p - 0.3) / (WORK_HIT - 0.3);
    const q = (c.p - WORK_HIT) / 0.25;
    let ball = null;
    if (c.p > 0.3 && c.p < WORK_HIT) ball = arcAt(32, 64, 90, 72, 3, pitch);
    else if (c.p >= WORK_HIT) ball = c.out === 'great' ? arcAt(90, 72, -10, -4, 50, q) : c.out === 'ok' ? arcAt(90, 72, 20, 84, 4, q) : arcAt(90, 72, 104, 74, 0, Math.min(1, q * 4));
    if (ball) disc(g, Math.round(ball[0]), Math.round(ball[1]), 1, '#ffffff');
  },
  basketball(g, c) {
    const r = wRoom(g, c, 58);
    R(g, 0, 58, 120, 38, '#d8a060');
    for (let x = 0; x < 120; x += 10) R(g, x, 58, 1, 38, '#c89050');
    wCrowd(g, c, 18, 14, c.hit && c.out !== 'oops');
    R(g, 112, 18, 2, 50, '#5a5e66');
    box(g, 100, 18, 14, 10, '#ffffff', '#3a3f4a');
    R(g, 96, 30, 10, 2, '#e8503a'); // the rim
    for (let i = 0; i < 4; i++) R(g, 97 + i * 2, 32, 1, 5, '#f4f6f8');
    // The shot clock.
    const left = Math.max(0, Math.ceil(3 - c.p * 5));
    box(g, 4, 6, 18, 10, '#1a1a20', OL);
    wText(g, String(left), 13, 14, 7, left ? '#ff6a6a' : '#ffe066');
    wFolk(g, c, 60, 82, 'l', 3, { hop: c.p > 0.45 && c.p < 0.55 ? -4 : 0, look: { hair: '#1f1b2b', top: '#3a5a8a', legs: '#3a5a8a' } });
    const jump = c.p > 0.42 && c.p < 0.55 ? -5 : 0;
    wMe(g, c, lerp(20, 40, c.p / 0.45), 82, 'r', c.p < 0.42, jump);
    const q = (c.p - 0.45) / 0.15;
    let [bx, by] = c.p < 0.45 ? [lerp(24, 46, c.p / 0.45), 76 - (c.t % 4 < 2 ? 6 : 0)] : arcAt(46, 64, 101, c.out === 'oops' ? 28 : 31, 34, q);
    if (q > 1) [bx, by] = c.out === 'oops' ? arcAt(101, 28, 84, 86, 10, (q - 1) / 0.6) : [101, lerp(31, 86, (q - 1) / 0.6)];
    disc(g, Math.round(bx), Math.round(by), 2, '#e8892a');
    void r;
  },
  volleyball(g, c) {
    const r = wRoom(g, c, 58);
    R(g, 0, 58, 120, 38, '#e8a050');
    wCrowd(g, c, 18, 12, c.hit && c.out !== 'oops');
    R(g, 59, 44, 2, 40, '#5a5e66');
    for (let y = 44; y < 56; y += 2) R(g, 40, y, 40, 1, '#f4f6f8');
    wFolk(g, c, 90, 82, 'l', 2, { hop: c.hit ? -3 : 0, look: { hair: '#1f1b2b', top: '#e8505b', legs: '#2f2f3a' } });
    wFolk(g, c, 24, 84, 'r', 4, { look: { hair: '#5a3022', top: '#3a7ad0', legs: '#2f3a52' } });
    const jump = c.p > 0.45 && c.p < 0.62 ? -10 : 0;
    wMe(g, c, 48, 82, 'r', false, jump);
    const q = (c.p - WORK_HIT) / 0.15;
    let [bx, by] = c.p < 0.3 ? arcAt(24, 70, 44, 40, 20, c.p / 0.3) : c.p < WORK_HIT ? [lerp(44, 50, (c.p - 0.3) / 0.25), lerp(40, 58, (c.p - 0.3) / 0.25)] : c.out === 'oops' ? [lerp(50, 59, q), lerp(58, 52, q)] : arcAt(50, 58, c.out === 'great' ? 100 : 80, 86, -4, q);
    if (c.out === 'oops' && q > 1) [bx, by] = [58, lerp(52, 86, (q - 1) / 0.5)];
    disc(g, Math.round(bx), Math.round(by), 2, '#f4f6f8');
    void r;
  },
  ring(g, c) {
    const E = c.E;
    if (E >= 3) {
      R(g, 0, 0, 120, 96, '#1a1a26');
      wCrowd(g, c, 30, 14, c.hit);
      R(g, 6, 58, 108, 30, '#3a7ad0');
      for (const y of [46, 52, 58]) R(g, 6, y, 108, 1, '#e8505b');
      R(g, 6, 44, 2, 44, '#c9cdd4');
      R(g, 112, 44, 2, 44, '#c9cdd4');
      for (let i = 0; i < 3; i++) R(g, 30 + i * 30, 0, 6, 40, 'rgba(255,240,180,0.08)');
    } else {
      wSky(g, c, '#d8b880', 46);
      wCrowd(g, c, 36, 12, c.hit);
      for (let a = 0; a < 40; a++) R(g, Math.round(60 + Math.cos(a / 6.4) * 46), Math.round(74 + Math.sin(a / 6.4) * 14), 2, 1, '#a88a5a');
    }
    const close = Math.min(1, c.p / 0.4);
    const shake = c.p > 0.4 && c.p < WORK_HIT ? (c.t % 2 ? 1 : -1) : 0;
    const meDown = c.hit && c.out === 'oops';
    const themDown = c.hit && c.out === 'great';
    const rival = { hair: '#1f1b2b', top: c.E >= 5 ? '#b8bcc4' : '#e8505b', legs: '#2f2f3a' };
    wFolk(g, c, lerp(92, 66, close) + shake, themDown ? 84 : 78, themDown ? 'u' : 'l', 4, { look: rival });
    wMe(g, c, lerp(28, 54, close) - shake, meDown ? 84 : 78, meDown ? 'u' : 'r', false, c.hit && !meDown ? (c.t % 6 < 3 ? -2 : 0) : 0);
    if (themDown) wSparkles(g, c, 66, 64, 5);
    if (meDown) wSparkles(g, c, 54, 64, 5);
    if (c.hit && c.out === 'ok') wSparkles(g, c, 60, 56, 4, '#ffffff');
  },
  track(g, c) {
    wSky(g, c, '#c8503a', 40);
    wCrowd(g, c, 30, 14, c.hit);
    for (const y of [56, 70, 84]) R(g, 0, y, 120, 1, '#f4f6f8');
    R(g, 104, 40, 2, 56, '#f4f6f8');
    const chariot = c.E <= 2 && workStay?.id === 'driver';
    const place = c.out === 'great' ? 0 : c.out === 'ok' ? 1 : 2;
    const speeds = [[1.0, 0.92, 0.86], [0.92, 1.0, 0.86], [0.92, 0.86, 1.0]][place];
    const run = (k) => Math.min(1, (c.p / 0.72) * speeds[k]);
    const xAt = (k) => lerp(6, 108, run(k) * (k === 0 ? 1 : 0.98));
    const lanes = [64, 78, 92];
    wFolk(g, c, xAt(1), lanes[0], 'r', 2, { walk: run(1) < 1 });
    wFolk(g, c, xAt(2), lanes[2], 'r', 5, { walk: run(2) < 1 });
    if (chariot) {
      box(g, Math.round(xAt(0)) - 14, lanes[1] - 8, 10, 6, '#a8743a', OL);
      drawAnimal(g, { x: xAt(0) + 4, y: lanes[1], dir: 'r', frame: c.t, path: [1] }, HORSE, HORSE_PAL, 16, 11, 14);
    }
    wMe(g, c, chariot ? xAt(0) - 10 : xAt(0), lanes[1], 'r', run(0) < 1);
    if (run(0) >= 1 && place === 0) R(g, 104, lanes[1] - 10, 2, 1, '#e8505b');
    else R(g, 104, lanes[1] - 10, 1, 8, '#e8505b'); // the tape
  },
  stage(g, c) {
    const old = c.E <= 2;
    R(g, 0, 0, 120, 96, old ? (night ? '#1c2448' : '#6a8ab8') : '#16121f');
    if (!old) for (let i = 0; i < 3; i++) {
      g.fillStyle = ['rgba(255,138,192,0.18)', 'rgba(90,215,232,0.18)', 'rgba(255,224,102,0.18)'][i];
      g.beginPath();
      g.moveTo(20 + i * 40, 0);
      g.lineTo(40 + i * 10 + Math.sin(c.t / 8 + i) * 14, 64);
      g.lineTo(70 + i * 10 + Math.sin(c.t / 8 + i) * 14, 64);
      g.fill();
    }
    R(g, 8, 46, 104, 20, old ? '#8a5a3a' : '#2a2a36');
    R(g, 8, 46, 104, 2, old ? '#a8743a' : '#5ad7e8');
    if (old) {
      R(g, 4, 0, 10, 46, '#a8323a');
      R(g, 106, 0, 10, 46, '#a8323a');
      for (const x of [10, 110]) disc(g, x, 40, 2, '#f08a2e');
    }
    const jump = c.hit && c.out === 'great' && c.t % 8 < 4 ? -3 : 0;
    const id = workStay?.id;
    if (id === 'circus') R(g, 40, 10, 40, 1, '#c9cdd4');
    if (id === 'musician' || id === 'bard') wFolk(g, c, 86, 60, 'l', 4);
    wMe(g, c, id === 'circus' && c.p < WORK_HIT ? lerp(42, 78, c.p / WORK_HIT) : 60, id === 'circus' && c.p < WORK_HIT ? 10 : 60, id === 'dancer' && c.t % 8 < 4 ? 'l' : 'd', id === 'dancer' && !c.hit, jump);
    if (c.p < WORK_HIT || c.out !== 'oops') for (let i = 0; i < 3; i++) {
      const nx = 66 + i * 8 + ((c.t + i * 5) % 10);
      const ny = 40 - ((c.t * 2 + i * 9) % 30);
      R(g, nx, ny, 2, 2, '#ffe066');
      R(g, nx + 1, ny - 3, 1, 3, '#ffe066');
    } else {
      for (let i = 0; i < 8; i++) R(g, 66 + i * 2, 36 + (i % 2 ? 2 : 0), 1, 1, '#ff8ac0');
      wSweat(g, 66, 40);
    }
    wCrowd(g, c, 80, 12, c.hit && c.out !== 'oops');
    if (!old) for (let i = 0; i < 12; i += 2) R(g, 9 + i * 9.3, 70 - (c.t % 6 < 3 ? 2 : 0), 1, 4, ['#ff8ac0', '#5ad7e8', '#ffe066'][i % 3]);
    if (c.hit && c.out === 'great') wConfetti(g, c);
  },
  film(g, c) {
    const r = wRoom(g, c, 62);
    R(g, 40, 10, 76, 52, '#c8d8e8'); // the set: a room in a room
    box(g, 70, 18, 20, 16, '#8a5a3a');
    R(g, 72, 20, 16, 12, '#8fd3f4');
    // Camera, director, lights.
    R(g, 14, 60, 2, 22, '#2a2a30');
    box(g, 6, 46, 18, 12, '#2a2a30', OL);
    disc(g, 26, 52, 3, '#5a6a8a');
    if (c.t % 8 < 4) R(g, 8, 48, 2, 2, '#e8505b');
    wFolk(g, c, 30, 86, 'r', 5, { look: { hair: '#1f1b2b', top: '#2a2a33', legs: '#2f2f3a' } });
    R(g, 22, 76, 10, 2, '#8a5a3a'); // the director's chair
    // The slate at the start.
    if (c.p < 0.18) {
      box(g, 44, 30, 24, 16, '#2a2a30', '#f4f6f8');
      for (let i = 0; i < 4; i++) R(g, 45 + i * 6, c.p < 0.1 ? 26 : 29, 3, 3, i % 2 ? '#f4f6f8' : '#2a2a30');
      g.font = '4px sans-serif';
      g.fillStyle = '#f4f6f8';
      g.fillText(`S#${(S.days % 40) + 1} T${(fameOf(workStay?.id) % 5) + 1}`, 47, 40);
    }
    wFolk(g, c, 84, 78, 'l', 2);
    wMe(g, c, 62, 78, 'r', false, c.p > 0.3 && c.p < WORK_HIT && c.t % 6 < 2 ? -1 : 0);
    if (c.out === 'great' && c.hit) for (let i = 0; i < 3; i++) R(g, 58 + i * 3, 64 + ((c.t + i * 3) % 6), 1, 2, '#8fd0f0');
    if (c.out === 'oops' && c.hit) wSweat(g, 66, 62);
    void r;
  },
  court(g, c) {
    const r = wRoom(g, c, 60);
    box(g, 36, 30, 48, 26, c.E >= 5 ? '#3a4a66' : '#6b4428', OL);
    R(g, 38, 32, 44, 2, c.E >= 5 ? '#5ad7e8' : '#8a5a3a');
    disc(g, 60, 14, 6, '#e8c050'); // the emblem
    R(g, 59, 10, 2, 8, '#8a5a32');
    const judge = workStay?.id === 'judge' && !workStay.rule;
    if (judge) wMe(g, c, 60, 34, 'd');
    else wFolk(g, c, 60, 34, 'd', 5, { look: { hair: '#f4f4f0', top: '#2a2a33', legs: '#2a2a33' } });
    // The gavel: up, then down on the moment (again and again for "정숙").
    const hits = c.out === 'oops' ? c.hit && c.t % 4 < 2 : c.p > WORK_HIT && c.p < WORK_HIT + 0.05;
    R(g, 68, hits ? 30 : 24, 6, 3, '#8a5a32');
    R(g, 70, hits ? 33 : 27, 2, 4, '#6b4428');
    if (hits) for (const [dx, dy] of [[-2, -2], [8, -2], [-3, 2], [9, 2]]) R(g, 68 + dx, 30 + dy, 1, 1, '#ffe066');
    // The two sides, and the public behind.
    box(g, 6, 62, 26, 8, '#8a5a3a', OL);
    box(g, 88, 62, 26, 8, '#8a5a3a', OL);
    if (judge) wFolk(g, c, 18, 66, 'u', 3, { look: { hair: '#3a2418', top: '#3a3f4a', legs: '#2f2f3a' } });
    else wMe(g, c, 18, 66, 'u');
    wFolk(g, c, 100, 66, 'u', 1, { look: { hair: '#5a3022', top: '#3a3f4a', legs: '#2f2f3a' } });
    wFolk(g, c, 60, 74, 'u', 2, { look: { hair: '#8a5a32', top: '#9a8a74', legs: '#6b4428' } });
    wCrowd(g, c, 88, 10, c.hit && (c.out === 'great' || (c.out === 'oops' && c.t % 3 === 0)));
    void r;
  },
  clinic(g, c) {
    const r = wRoom(g, c, 58);
    if (c.E === 0) for (let i = 0; i < 6; i++) R(g, 10 + i * 6, 8, 2, 8 + (i % 2) * 3, ['#7a9a4a', '#a8a04a'][i % 2]);
    else if (c.E >= 3) {
      box(g, 8, 10, 14, 14, '#ffffff', OL);
      R(g, 14, 13, 2, 8, '#e8505b');
      R(g, 11, 16, 8, 2, '#e8505b');
    }
    const vet = workStay?.id === 'vet';
    // The bed (or a mat), the patient.
    box(g, 52, 62, 46, 10, c.E === 0 ? '#a8784a' : '#f4f6f8', OL);
    R(g, 54, 72, 2, 10, r.trim);
    R(g, 94, 72, 2, 10, r.trim);
    const up = c.hit && c.out === 'great';
    if (vet) drawAnimal(g, { x: 76, y: up ? 60 : 64, dir: 'l', frame: up ? c.t : 0, path: up ? [1] : [] }, CAT, CAT_PAL, 10, 7, 8);
    else if (c.hit && c.out === 'oops') R(g, 58, 56, 30, 8, '#8fb0d8'); // under the blanket
    else wFolk(g, c, 76, up ? 62 : 64, up ? 'd' : 'l', 3, { hop: up && c.t % 6 < 3 ? -2 : 0, look: { hair: '#5a3022', top: '#cfe8f5', legs: '#cfe8f5' } });
    if (!vet && !(c.hit && c.out === 'oops')) R(g, 64, 62, 26, 4, '#8fb0d8');
    if (c.E >= 5) {
      R(g, 100, 30, 2, 30, '#c9cdd4');
      R(g, 90 + Math.round(Math.sin(c.t / 4) * 4), 30, 12, 2, '#c9cdd4');
      R(g, 88 + Math.round(Math.sin(c.t / 4) * 4), 32, 2, 4, '#5ad7e8');
    }
    wMe(g, c, 40, 80, 'r');
    if (c.p > 0.3 && c.p < WORK_HIT) R(g, 47, 70, 4, 2, c.E === 0 ? '#7a9a4a' : '#c9cdd4');
    if (up) wSparkles(g, c, 76, 50, 6);
    if (c.hit && c.out === 'ok') spr(g, ['.rr.rr.', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff8aa8' }, 72, 40);
  },
  school(g, c) {
    const r = wRoom(g, c, 60);
    box(g, 20, 10, 80, 32, c.E === 0 ? '#8a7a6a' : c.E >= 5 ? '#2a3a6a' : '#2a5a3a', r.trim);
    g.font = '5px sans-serif';
    g.fillStyle = c.E >= 5 ? '#5ad7e8' : '#f4f6f8';
    const lesson = ['🦌 = 🍖', '가 나 다', 'A B C', '2 × 3 = 6', 'E = mc²', '♾ + AI'][c.E];
    g.fillText(lesson.slice(0, Math.max(1, Math.ceil(lesson.length * Math.min(1, c.p * 2)))), 30, 28);
    wMe(g, c, 62, 58, 'd');
    for (let i = 0; i < 3; i++) {
      const x = 30 + i * 30;
      box(g, x - 8, 78, 16, 4, r.trim);
      const raise = c.hit && c.out === 'great';
      wFolk(g, c, x, 80, 'u', i + 1, { small: true, hop: raise && (c.t + i) % 6 < 3 ? -2 : 0 });
      if (raise) R(g, x + 3, 64, 1, 5, '#ffd9b8');
      if (c.hit && c.out === 'oops') {
        g.font = '4px sans-serif';
        g.fillStyle = '#5a6a8a';
        g.fillText('z', x + 4, 66 - ((c.t + i * 3) % 6));
      }
    }
    if (c.hit && c.out === 'great') {
      disc(g, 98, 50, 6, '#e8505b');
      wText(g, '100', 98, 52, 4, '#ffffff');
    }
  },
  build(g, c) {
    wSky(g, c, '#86c06a', 70);
    const rows = Math.min(6, Math.floor(c.p * 9));
    const stone = ['#a8784a', '#c8a878', '#9aa0aa', '#a8643a', '#c9cdd4', '#e8eef4'][c.E];
    for (let y = 0; y < rows; y++) for (let x = 0; x < 5; x++) {
      const tilt = c.hit && c.out === 'oops' && y === rows - 1 && x === 2 ? -2 : 0;
      box(g, 42 + x * 8 + (y % 2) * 2, 66 - y * 6 + tilt, 8, 6, stone, OL);
    }
    if (c.hit && c.out !== 'oops') {
      gable(g, 38, 22, 48, 12, c.E >= 4 ? '#3a4a66' : '#a8323a', OL);
      if (c.out === 'great') {
        R(g, 62, 6, 1, 14, '#5a4a42');
        R(g, 63, 6, 8, 5, '#e8505b');
        wSparkles(g, c, 62, 30, 6);
      }
    }
    if (c.E >= 5) {
      R(g, 30, 10, 60, 2, '#5a5e66');
      R(g, 42 + ((c.t * 2) % 40), 12, 4, 6, '#5ad7e8');
    }
    wMe(g, c, 26, 84, 'r', false, c.t % 6 < 2 ? -1 : 0);
    wFolk(g, c, 96, 84, 'l', 3);
  },
  studio(g, c) {
    const r = wRoom(g, c, 60);
    const photo = workStay?.id === 'photographer';
    if (photo) {
      R(g, 70, 10, 44, 50, '#e8e0d0');
      wFolk(g, c, 92, 76, 'd', 2, { hop: c.hit && c.out === 'great' ? -1 : 0 });
      R(g, 36, 62, 2, 20, '#2a2a30');
      box(g, 30, 54, 14, 9, '#2a2a30', OL);
      disc(g, 44, 58, 2, '#5a6a8a');
      if (c.p > WORK_HIT && c.p < WORK_HIT + 0.04) R(g, 0, 0, 120, 96, 'rgba(255,255,255,0.7)');
      wMe(g, c, 24, 80, 'r');
      if (c.hit) {
        box(g, 50, 26, 16, 14, '#ffffff', OL);
        R(g, 52, 28, 12, 9, c.out === 'oops' ? '#b8bcc4' : '#8fd3f4');
        if (c.out === 'great') wSparkles(g, c, 58, 32, 6);
      }
      return;
    }
    // An easel; the picture fills in stroke by stroke.
    R(g, 66, 40, 2, 44, '#8a5a3a');
    R(g, 82, 40, 2, 44, '#8a5a3a');
    box(g, 58, 16, 34, 28, c.out === 'great' && c.hit ? '#e8c050' : '#8a5a3a', OL);
    R(g, 60, 18, 30, 24, '#f4efe6');
    const strokes = Math.floor(Math.min(1, c.p * 1.6) * 12);
    for (let i = 0; i < strokes; i++) R(g, 61 + ((i * 7) % 26), 19 + ((i * 5) % 20), 4, 2, ['#5aa04a', '#3a7ad0', '#e8505b', '#e8c050', '#8a6cc9'][i % 5]);
    if (c.E === 0) R(g, 60, 18, 30, 24, 'rgba(138,90,58,0.35)'); // on a cave wall
    wMe(g, c, 44, 82, 'r');
    R(g, 50, 70, 6, 1, '#8a5a3a');
    if (c.hit && c.out === 'oops') disc(g, 54, 88, 4, '#3a7ad0');
    if (c.hit && c.out === 'great') wSparkles(g, c, 75, 30, 8);
    void r;
  },
  forge(g, c) {
    const r = wRoom(g, c, 60);
    box(g, 6, 24, 30, 36, '#5a4a42', OL);
    R(g, 12, 34, 18, 16, '#2a2028');
    disc(g, 21, 44, 5, c.t % 4 < 2 ? '#f08a2e' : '#e86a2a');
    box(g, 54, 72, 22, 8, '#3a3a42', OL);
    R(g, 60, 80, 10, 6, '#3a3a42');
    const id = workStay?.id;
    const hot = c.hit ? (c.out === 'great' ? '#e8eef4' : '#b8bcc4') : '#f08a2e';
    if (id === 'potter') {
      disc(g, 65, 66, 6, '#a8643a');
      R(g, 60, 62 - (c.hit ? 4 : 0), 10, 6, '#c8844a');
    } else R(g, 58, c.out === 'oops' && c.hit ? 68 : 70, 14, 2, hot);
    const strike = !c.hit && c.t % 6 < 3;
    wMe(g, c, 46, 84, 'r');
    R(g, 52, strike ? 64 : 58, 2, 8, '#8a5a3a');
    R(g, 50, strike ? 62 : 56, 6, 3, '#5a5e66');
    if (strike) for (let i = 0; i < 4; i++) R(g, 58 + i * 3, 66 - ((c.t + i) % 5), 1, 1, c.E >= 5 ? '#5ad7e8' : '#ffe066');
    if (c.E >= 5 && !c.hit) R(g, 64, 20, 1, 50, 'rgba(90,215,232,0.7)'); // a laser from above
    if (c.E >= 3 && c.E <= 4) for (let i = 0; i < 2; i++) disc(g, 22 + i * 4, 20 - ((c.t + i * 5) % 16), 3, 'rgba(90,90,98,0.5)'); // smoke from the stack
    if (c.hit && c.out === 'great') wSparkles(g, c, 65, 66, 7);
    void r;
  },
  farm(g, c) {
    const red = c.E >= 5 && workStay?.id === 'terraformer';
    wSky(g, c, red ? '#c86a3a' : '#8a6a3a', 52);
    if (red) R(g, 0, 0, 120, 52, '#e8a070');
    const animals = workStay?.id === 'herder' || workStay?.id === 'zookeeper';
    if (animals) {
      R(g, 0, 52, 120, 44, '#86c06a');
      for (let x = 0; x < 120; x += 10) R(g, x, 56, 2, 8, '#a8743a');
      R(g, 0, 58, 120, 1, '#a8743a');
      const n = c.hit && c.out === 'oops' ? 2 : 4;
      for (let i = 0; i < n; i++) drawAnimal(g, { x: 30 + i * 18 + Math.sin((c.t + i * 7) / 5) * 3, y: 80 + (i % 2) * 6, dir: i % 2 ? 'l' : 'r', frame: c.t, path: [] }, SHEEP, SHEEP_PAL, 12, 7, 11);
      if (c.hit && c.out === 'great') for (let i = 0; i < 2; i++) drawAnimal(g, { x: 90 + i * 8, y: 88, dir: 'l', frame: c.t, path: [] }, SHEEP, SHEEP_PAL, 12, 7, 11);
      wMe(g, c, 18, 80, 'r');
      return;
    }
    for (let row = 0; row < 3; row++) {
      R(g, 8, 62 + row * 10, 104, 4, '#6b4c34');
      for (let x = 14; x < 110; x += 12) {
        const h = Math.min(6, Math.floor(c.p * 10) - row);
        if (h > 0) {
          R(g, x, 62 + row * 10 - h, 2, h, red ? '#8ad0a0' : '#5aa04a');
          R(g, x - 1, 62 + row * 10 - h, 4, 2, red ? '#5ad7e8' : '#6cbf4a');
        }
        if (c.hit && c.out === 'oops' && (x + row) % 3 === 0) R(g, x + 4, 58 + row * 10, 3, 4, '#3a6a2a');
      }
    }
    if (c.hit && c.out === 'great') {
      disc(g, 86, 70, 7, ['#e8503a', '#e8c050', '#7a3a8a', '#f2c24a', '#e8503a', '#9a7aff'][c.E]);
      R(g, 85, 61, 3, 3, '#5aa04a');
      wSparkles(g, c, 86, 70, 6);
    }
    if (c.E >= 5) for (const x of [10, 96]) {
      g.fillStyle = 'rgba(200,240,255,0.35)';
      g.beginPath();
      g.arc(x + 8, 60, 12, Math.PI, 0);
      g.fill();
    }
    const fx = lerp(14, 70, c.p / WORK_HIT);
    if (c.E === 1 || c.E === 2) drawAnimal(g, { x: fx + 16, y: 88, dir: 'r', frame: c.t, path: c.hit ? [] : [1] }, COW, COW_PAL, 16, 10, 14);
    if (c.E === 3 || c.E === 4) {
      box(g, Math.round(fx) + 8, 78, 18, 8, '#c0402e', OL); // a tractor
      disc(g, Math.round(fx) + 12, 88, 3, '#2a2a30');
      disc(g, Math.round(fx) + 22, 88, 2, '#2a2a30');
    }
    wMe(g, c, fx, 88, 'r', !c.hit);
  },
  woods(g, c) {
    wSky(g, c, '#4a8a3a', 56);
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 22;
      R(g, x + 4, 30, 4, 30, '#6b4428');
      disc(g, x + 6, 26, 10, i % 2 ? '#3a7a3a' : '#4a8a3a');
    }
    const fire = workStay?.id === 'firekeeper';
    if (fire) {
      R(g, 52, 84, 16, 3, '#5a4a40');
      disc(g, 60, 80, c.hit && c.out === 'great' ? 7 : 5, '#f08a2e');
      disc(g, 60 + ((c.t % 3) - 1), 77, 3, '#ffe066');
      wMe(g, c, 40, 86, 'r');
      wFolk(g, c, 80, 86, 'l', 2);
      if (c.hit && c.out === 'oops') for (let i = 0; i < 3; i++) R(g, 58 + i * 2, 70 - ((c.t + i * 4) % 12), 2, 2, '#9a9aa4');
      return;
    }
    const bird = workStay?.id === 'falconer';
    wMe(g, c, lerp(14, 54, c.p / WORK_HIT), 84, 'r', !c.hit);
    box(g, Math.round(lerp(20, 60, c.p / WORK_HIT)), 76, 8, 6, '#c98d4b', OL); // the basket
    if (bird) {
      const [bx, by] = c.p < WORK_HIT ? [20 + ((c.t * 3) % 90), 12 + Math.sin(c.t / 3) * 4] : arcAt(100, 12, 62, 70, -10, (c.p - WORK_HIT) / 0.2);
      R(g, Math.round(bx) - 3, Math.round(by), 7, 1, '#5a4a42');
      R(g, Math.round(bx), Math.round(by) - 1, 2, 3, '#5a4a42');
    }
    if (c.hit && c.out !== 'oops') for (let i = 0; i < (c.out === 'great' ? 5 : 3); i++) disc(g, 61 + i * 2, 74 - (i % 2) * 2, 1, ['#e8505b', '#7a3a8a', '#e8c050'][i % 3]);
    if (c.hit && c.out === 'great') {
      disc(g, 86, 80, 3, '#e8c050');
      R(g, 85, 82, 2, 4, '#f4efe6');
      wSparkles(g, c, 86, 80, 6);
    }
    if (c.hit && c.out === 'oops') drawAnimal(g, { x: 96 - ((c.t * 2) % 30), y: 88, dir: 'l', frame: c.t, path: [1] }, SQUIRREL, SQUIRREL_PAL, 8, 7, 6);
  },
  lake(g, c) {
    wSky(g, c, '#3a7ad0', 44);
    for (let i = 0; i < 8; i++) R(g, (i * 17 + c.t) % 120, 52 + (i % 4) * 10, 6, 1, '#8fd0f0');
    const sea = workStay?.id === 'sailor' || c.E >= 4;
    if (sea) {
      // A boat, rocking.
      const rock = Math.round(Math.sin(c.t / 5) * 1.5);
      box(g, 14, 50 + rock, 44, 8, c.E >= 5 ? '#e8eef4' : '#8a5a3a', OL);
      R(g, 32, 20 + rock, 2, 30, '#6b4428');
      if (c.E <= 3) R(g, 34, 22 + rock, 16, 18, '#f4efe6');
      wMe(g, c, 44, 50 + rock, 'r');
    } else {
      box(g, 0, 50, 46, 4, '#8a5a3a', OL);
      R(g, 10, 54, 2, 20, '#6b4428');
      R(g, 34, 54, 2, 20, '#6b4428');
      wMe(g, c, 36, 50, 'r');
    }
    // The line, the float, the fish.
    const fx = 84;
    const bite = c.p > 0.4 && c.p < WORK_HIT;
    R(g, 44, 32, 1, 1, '#8a5a3a');
    g.strokeStyle = '#e8e0d0';
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(48, 34);
    g.lineTo(fx, 56 + (bite && c.t % 2 ? 2 : 0));
    g.stroke();
    R(g, fx - 1, 55 + (bite && c.t % 2 ? 2 : 0), 3, 2, '#e8505b');
    if (c.hit) {
      const q = (c.p - WORK_HIT) / 0.2;
      if (c.out === 'oops') {
        const [x, y] = arcAt(fx, 58, 104, 60, 16, q);
        R(g, Math.round(x) - 4, Math.round(y), 8, 3, '#8a9aa8');
        for (let i = 0; i < 4; i++) R(g, 100 + i * 3, 60 - ((c.t + i * 2) % 5), 1, 1, '#ffffff');
      } else {
        const big = c.out === 'great' ? 2 : 1;
        const [x, y] = arcAt(fx, 58, 50, 30, 20, q);
        R(g, Math.round(x) - 4 * big, Math.round(y), 8 * big, 3 * big, big > 1 ? '#c0a060' : '#8a9aa8');
        R(g, Math.round(x) + 4 * big, Math.round(y), 2 * big, 3 * big, big > 1 ? '#a88a4a' : '#6a7a88');
        if (big > 1) wSparkles(g, c, Math.round(x), Math.round(y), 6);
      }
    }
  },
  temple(g, c) {
    const r = wRoom(g, c, 62);
    R(g, 0, 0, 120, 62, c.E === 0 ? '#3a3040' : c.E >= 5 ? '#2a3050' : '#5a4a6a');
    box(g, 44, 34, 32, 18, c.E >= 5 ? '#5ad7e8' : '#8a5a3a', OL);
    for (const x of [48, 72]) {
      R(g, x, 26, 2, 8, '#f4efe6');
      if (!(c.hit && c.out === 'oops' && x === 72)) disc(g, x + 1, 24 - (c.t % 4 < 2 ? 0 : 1), 1, '#ffe066');
    }
    if (c.E === 0) {
      R(g, 54, 76, 12, 3, '#5a4a40');
      disc(g, 60, 72, 4, '#f08a2e');
    }
    if (c.hit && c.out === 'great') for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(255,240,180,0.18)';
      g.fillRect(36 + i * 10, 0, 4, 90);
    }
    wMe(g, c, 60, 86, 'u', false, c.hit && c.out === 'oops' && c.t % 8 < 4 ? 1 : 0);
    if (c.hit && c.out === 'oops') {
      g.font = '5px sans-serif';
      g.fillStyle = '#c9cdd4';
      g.fillText('Zzz', 64, 66 - ((c.t / 2) % 6));
    }
    wFolk(g, c, 30, 90, 'u', 2);
    wFolk(g, c, 90, 90, 'u', 4);
    void r;
  },
  shop(g, c) {
    const r = wRoom(g, c, 58);
    if (c.E <= 2) {
      R(g, 0, 0, 120, 58, night ? '#1c2448' : '#8fd3f4');
      for (let x = 14; x < 106; x += 12) R(g, x, 34, 12, 8, (x / 12) % 2 ? '#e8505b' : '#f4efe6'); // the awning
      R(g, 14, 42, 2, 20, '#8a5a3a');
      R(g, 104, 42, 2, 20, '#8a5a3a');
    } else if (c.E === 4) {
      box(g, 92, 20, 24, 38, '#e8eef4', OL); // a fridge of drinks
      for (let y = 24; y < 54; y += 8) for (let x = 95; x < 113; x += 5) R(g, x, y, 3, 5, ['#e8505b', '#5aa04a', '#3a7ad0'][(x + y) % 3]);
    } else if (c.E >= 5) for (let i = 0; i < 3; i++) R(g, 8 + i * 4, 10 + ((c.t + i * 6) % 30), 2, 6, '#9a7aff');
    box(g, 20, 62, 80, 12, r.trim, OL);
    const id = workStay?.id;
    const goods = id === 'barber' ? ['#c9cdd4', '#8fd0f0'] : id === 'tailor' ? ['#e8505b', '#3a7ad0', '#e8c050'] : ['#e8505b', '#e8c050', '#5aa04a', '#8a6cc9'];
    const left = c.hit && c.out === 'great' ? 0 : 8;
    for (let i = 0; i < left; i++) box(g, 24 + i * 9, 54, 6, 8, goods[i % goods.length], OL);
    box(g, 30, 14, 60, 12, '#f4efe6', OL);
    wText(g, c.hit && c.out === 'great' ? '완판!' : id === 'barber' ? '이발' : id === 'tailor' ? '옷' : '가게', 60, 23, 6, '#e8505b');
    wMe(g, c, 60, 62, 'd');
    const n = c.hit ? (c.out === 'great' ? 5 : c.out === 'ok' ? 3 : 0) : Math.min(3, Math.floor(c.p * 6));
    for (let i = 0; i < n; i++) wFolk(g, c, 20 + i * 18, 88, 'u', i + 1, { hop: c.hit && c.out === 'great' && (c.t + i) % 6 < 3 ? -1 : 0 });
    if (c.hit && c.out === 'oops') {
      disc(g, 100 - ((c.t * 2) % 90), 86, 3, '#c8a060'); // a tumbleweed
      R(g, 98 - ((c.t * 2) % 90), 85, 4, 1, '#a88a4a');
    }
    if (c.hit && c.out !== 'oops') for (let i = 0; i < 3; i++) disc(g, 50 + i * 10, 44 - ((c.t + i * 3) % 8), 1, '#e8c050');
  },
  kitchen(g, c) {
    const r = wRoom(g, c, 60);
    box(g, 8, 60, 104, 14, r.trim, OL);
    if (c.E <= 2) {
      disc(g, 32, 50, 12, '#b8743a'); // a clay oven
      R(g, 26, 52, 12, 8, '#2a2028');
      disc(g, 32, 58, 3, '#f08a2e');
    } else box(g, 20, 48, 24, 12, c.E >= 5 ? '#e8eef4' : c.E >= 4 ? '#c9cdd4' : '#3a3a42', OL);
    if (c.E >= 5) R(g, 22, 46, 20, 1, '#5ad7e8');
    else if (c.E > 2) disc(g, 32, 60, 3, '#f08a2e');
    box(g, 24, 40, 16, 8, '#5a5e66', OL);
    for (let i = 0; i < 3; i++) R(g, 28 + i * 4, 36 - ((c.t + i * 3) % 10), 1, 3, c.hit && c.out === 'oops' ? '#5a5a62' : 'rgba(255,255,255,0.8)');
    if (c.hit && c.out === 'oops') for (let i = 0; i < 4; i++) disc(g, 30 + i * 4, 28 - ((c.t + i * 2) % 12), 3, 'rgba(90,90,98,0.6)');
    wMe(g, c, 54, 60, 'l');
    if (c.hit) {
      box(g, 72, 54, 14, 6, '#f4f6f8', OL);
      disc(g, 79, 54, 3, c.out === 'oops' ? '#5a4030' : ['#c98d4b', '#d9a05a', '#e8a050', '#c8503a', '#e8503a', '#9a7aff'][c.E]);
      if (c.out === 'great') wSparkles(g, c, 79, 52, 6);
    }
    wFolk(g, c, 90, 88, 'u', 3);
    wFolk(g, c, 104, 88, 'u', 1);
    if (c.hit && c.out !== 'oops') spr(g, ['.rr.rr.', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff8aa8' }, 92, 66 - (c.t % 4));
  },
  yard(g, c) {
    wSky(g, c, '#c8b080', 50);
    box(g, 10, 14, 100, 36, '#efe2c4', OL);
    gable(g, 6, 2, 108, 14, '#5a4a42', OL);
    box(g, 50, 30, 18, 20, '#8a5a3a', OL);
    const left = c.hit && c.out !== 'oops' ? 0 : c.hit ? 6 : Math.max(0, 10 - Math.floor(c.p * 14));
    for (let i = 0; i < left; i++) R(g, 14 + ((i * 23) % 92), 66 + ((i * 7) % 24), 3, 2, ['#c8843a', '#a8643a', '#e8a030'][i % 3]);
    const x = lerp(20, 90, (Math.sin(c.t / 10) + 1) / 2);
    wMe(g, c, x, 84, Math.cos(c.t / 10) > 0 ? 'r' : 'l', !c.hit);
    R(g, Math.round(x) + 5, 76, 1, 10, '#a8743a');
    R(g, Math.round(x) + 3, 85, 5, 2, '#c8a060');
    if (c.hit && c.out === 'great') {
      wFolk(g, c, 58, 58, 'd', 5, { look: { hair: '#c8c8c8', top: '#6a4a8a', legs: '#4b4560' } });
      spr(g, ['.rr.rr.', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff8aa8' }, 55, 32);
    }
  },
  dojo(g, c) {
    const r = wRoom(g, c, 60);
    if (c.E <= 2) for (let x = 0; x < 120; x += 20) R(g, x, 0, 3, 60, r.wall2);
    const archery = workStay?.id === 'soldier' && c.E === 2;
    // The target: a straw post, or rings.
    const tx = 92;
    if (archery) {
      disc(g, tx, 52, 10, '#f4efe6');
      disc(g, tx, 52, 7, '#e8505b');
      disc(g, tx, 52, 3, '#ffd23f');
    } else {
      R(g, tx - 1, 50, 3, 34, '#8a5a3a');
      box(g, tx - 6, c.hit && c.out === 'great' ? 70 : 50, 12, 16, '#d8b880', OL);
    }
    wMe(g, c, 40, 84, 'r', false, c.p > 0.45 && c.p < WORK_HIT ? -1 : 0);
    const strike = c.p > WORK_HIT - 0.05 && c.p < WORK_HIT + 0.05;
    if (!archery) R(g, strike ? 46 : 44, strike ? 72 : 62, strike ? 14 : 1, strike ? 1 : 12, '#d8dce4');
    else if (c.p > 0.4) {
      const q = (c.p - 0.4) / (WORK_HIT - 0.4);
      const ty = c.out === 'great' ? 52 : c.out === 'ok' ? 56 : 34;
      R(g, Math.round(lerp(48, tx - 2, q)), Math.round(lerp(70, ty, q)), 6, 1, '#6b4428');
    }
    if (c.hit && c.out === 'great') wSparkles(g, c, tx, 60, 6);
    if (c.hit && c.out === 'oops') wSweat(g, 44, 64);
    wFolk(g, c, 14, 86, 'r', 5, { look: { hair: '#c8c8c8', top: '#3a3a5a', legs: '#2f2f3a' } });
  },
  street(g, c) {
    const old = c.E <= 2;
    wSky(g, c, old ? '#b89a6a' : c.E >= 5 ? '#c8d4e0' : '#9a9aa4', 54);
    for (let i = 0; i < 4; i++) {
      const x = 4 + i * 30;
      if (c.E >= 5) {
        box(g, x + 2, 8, 24, 46, ['#e8eef4', '#d7e3ee', '#cfdbe8', '#e4ecf4'][i], OL);
        for (let y = 12; y < 46; y += 8) R(g, x + 5, y, 18, 3, '#5ad7e8');
        continue;
      }
      box(g, x, 22, 26, 32, old ? ['#c8a878', '#d8b880', '#b89870', '#c8a878'][i] : ['#e8d4b8', '#c8d8e8', '#e8c8c8', '#d8e8c8'][i], OL);
      gable(g, x - 2, 12, 30, 10, old ? '#c8a050' : ['#a8323a', '#3a5a8a', '#5a4a42', '#2a6a3a'][i], OL);
      box(g, x + 10, 40, 7, 14, '#8a5a3a', OL);
    }
    if (!old) R(g, 0, 70, 120, 2, '#c9cdd4');
    else for (let i = 0; i < 10; i++) R(g, (i * 23) % 120, 74 + (i % 3) * 6, 3, 1, '#a88a5a');
    const id = workStay?.id;
    const walkTo = c.hit ? 76 : lerp(8, 76, c.p / WORK_HIT);
    wMe(g, c, walkTo, 66, 'r', !c.hit);
    if (id === 'mail' && c.hit) box(g, 82, 54, 6, 4, '#ffffff', '#8a8e96');
    if (c.hit && c.out === 'great') {
      wFolk(g, c, 92, 66, 'l', 2, { small: true, hop: c.t % 6 < 3 ? -2 : 0 });
      wFolk(g, c, 104, 66, 'l', 3);
      spr(g, ['.rr.rr.', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff8aa8' }, 94, 40);
    }
    if (c.hit && c.out === 'oops') {
      g.font = 'bold 7px sans-serif';
      g.fillStyle = '#ffffff';
      g.fillText('?', 74, 44 - (c.t % 4 < 2 ? 1 : 0));
    }
    const cx = ((c.t * 3) % 160) - 20;
    if (c.E >= 5) {
      box(g, cx, 76, 18, 5, '#e8eef4', OL);
      R(g, cx + 2, 83, 14, 1, '#5ad7e8');
    } else if (c.E >= 3) {
      box(g, cx, 78, 16, 6, c.E === 3 ? '#2a2a30' : '#3a7ad0', OL);
      for (const dx of [3, 12]) disc(g, cx + dx, 85, 1, '#2a2a30');
    } else {
      box(g, cx, 78, 12, 6, '#a8743a', OL); // a cart
      disc(g, cx + 6, 85, 2, '#6b4428');
    }
  },
  fire(g, c) {
    wSky(g, c, '#9a9aa4', 70);
    box(g, 50, 16, 50, 54, '#c8a878', OL);
    gable(g, 46, 4, 58, 12, '#5a4a42', OL);
    const flames = c.hit ? (c.out === 'oops' ? 1 : 0) : Math.max(0, Math.ceil(4 * (1 - c.p / WORK_HIT)));
    const wins = [[56, 24], [80, 24], [56, 46], [80, 46]];
    wins.forEach(([x, y], i) => {
      box(g, x, y, 12, 12, '#2a2028', OL);
      if (i < flames) {
        disc(g, x + 6, y + 6, 5, '#f08a2e');
        disc(g, x + 6 + ((c.t % 3) - 1), y + 3, 3, '#ffe066');
      }
    });
    const drone = c.E >= 5;
    if (drone) {
      R(g, 20, 20 + Math.round(Math.sin(c.t / 3) * 2), 12, 2, '#c9cdd4');
      R(g, 18, 18, 4, 1, '#5a5e66');
      R(g, 30, 18, 4, 1, '#5a5e66');
    }
    wMe(g, c, 22, 86, 'r');
    if (c.E <= 2) {
      // A bucket line: neighbours pass the water along.
      wFolk(g, c, 8, 88, 'r', 2);
      for (let i = 0; i < 2; i++) box(g, 10 + ((c.t * 2 + i * 12) % 14), 74, 4, 4, '#8a5a3a', OL);
      if (!c.hit || c.out === 'oops') for (let i = 0; i < 5; i++) R(g, 30 + i * 6, 70 - i * 6 - (c.t % 3), 2, 2, '#8fd0f0');
    } else if (!c.hit || c.out === 'oops') {
      g.strokeStyle = '#8fd0f0';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(drone ? 26 : 28, drone ? 22 : 76);
      g.quadraticCurveTo(48, drone ? 10 : 20, 62 + (c.t % 3) * 6, 30 + (c.t % 2) * 16);
      g.stroke();
    }
    if (c.hit && c.out === 'oops') for (let i = 0; i < 6; i++) R(g, 16 + i * 3, 64 + ((c.t + i * 2) % 8), 1, 2, '#8fd0f0');
    if (c.hit && c.out === 'great') {
      drawAnimal(g, { x: 36, y: 88, dir: 'r', frame: c.t, path: [] }, CAT, CAT_PAL, 10, 7, 8);
      spr(g, ['.rr.rr.', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff8aa8' }, 33, 68);
    }
  },
  lab(g, c) {
    const r = wRoom(g, c, 60);
    box(g, 30, 60, 70, 10, r.trim, OL);
    const cols = ['#5aa04a', '#3a7ad0', '#e8505b', '#8a6cc9'];
    for (let i = 0; i < 4; i++) {
      box(g, 36 + i * 14, 48, 8, 12, '#e8eef4', OL);
      R(g, 37 + i * 14, 52, 6, 7, cols[i]);
      if (!c.hit) R(g, 39 + i * 14, 44 - ((c.t + i * 3) % 6), 1, 1, cols[i]);
    }
    if (c.E <= 2 && workStay?.id === 'alchemist') {
      disc(g, 84, 80, 8, '#3a3a42');
      R(g, 78, 72, 12, 2, '#5a5e66');
      for (let i = 0; i < 3; i++) disc(g, 80 + i * 4, 70 - ((c.t + i * 3) % 8), 1, '#5ee0b0');
    }
    if (workStay?.id === 'astronomer') {
      R(g, 0, 0, 120, 40, '#1c2448');
      for (let i = 0; i < 14; i++) R(g, (i * 37) % 120, (i * 13) % 38, 1, 1, '#ffe9a8');
      R(g, 14, 30, 22, 4, '#8a8e96');
    }
    wMe(g, c, 20, 84, 'r');
    if (c.hit && c.out === 'great') {
      disc(g, 64, 30, 6, '#ffe066');
      R(g, 62, 36, 4, 4, '#c9cdd4');
      wSparkles(g, c, 64, 30, 8);
    }
    if (c.hit && c.out === 'oops') {
      for (let i = 0; i < 5; i++) disc(g, 50 + i * 4, 38 - ((c.t + i * 3) % 14), 4, 'rgba(90,90,98,0.55)');
      R(g, 18, 70, 2, 1, '#2a2a30');
      R(g, 22, 72, 1, 1, '#2a2a30');
    }
  },
  mine(g, c) {
    R(g, 0, 0, 120, 96, '#2a2420');
    for (let i = 0; i < 20; i++) R(g, (i * 41) % 120, (i * 23) % 70, 4, 2, '#3a3028');
    R(g, 0, 78, 120, 18, '#3a3028');
    for (let x = 8; x < 120; x += 36) {
      R(g, x, 10, 4, 68, '#6b4428');
      R(g, x - 4, 10, 32, 4, '#6b4428');
    }
    const space = c.E >= 5;
    if (space) for (let i = 0; i < 12; i++) R(g, (i * 29) % 120, (i * 17) % 40, 1, 1, '#ffffff');
    g.fillStyle = 'rgba(255,230,150,0.12)';
    g.beginPath();
    g.arc(56, 66, 26, 0, Math.PI * 2);
    g.fill();
    box(g, 74, 48, 34, 30, '#5a4a40', OL);
    if (c.hit && c.out === 'great') {
      for (const [dx, dy, k] of [[8, 8, '#5ad7e8'], [16, 14, '#e8505b'], [22, 6, '#9a7aff']]) {
        R(g, 74 + dx, 48 + dy, 4, 4, k);
        R(g, 75 + dx, 49 + dy, 1, 1, '#ffffff');
      }
      wSparkles(g, c, 92, 60, 6);
    }
    if (c.hit && c.out === 'ok') for (let i = 0; i < 5; i++) R(g, 30 + i * 5, 84, 4, 3, '#1a1a20');
    const swing = !c.hit && c.t % 6 < 3;
    wMe(g, c, 60, 86, 'r');
    R(g, 66, swing ? 70 : 62, 2, 10, '#8a5a3a');
    R(g, 64, swing ? 68 : 60, 8, 2, '#8a8e96');
    if (swing) for (let i = 0; i < 3; i++) R(g, 74 + i * 2, 68 - i, 1, 1, '#c9cdd4');
    if (c.hit && c.out === 'oops') wSweat(g, 64, 66);
  },
  factory(g, c) {
    const r = wRoom(g, c, 56);
    R(g, 0, 70, 120, 6, '#5a5e66');
    for (let x = 0; x < 120; x += 8) disc(g, x + ((c.hit && c.out === 'oops') ? 0 : c.t % 8), 76, 2, '#3a3a42');
    const stop = c.hit && c.out === 'oops';
    for (let i = 0; i < 6; i++) box(g, ((i * 22 + (stop ? 0 : c.t * 2)) % 140) - 10, 62, 10, 8, c.E >= 5 ? '#c9cdd4' : '#c98d4b', OL);
    box(g, 6, 14, 30, 14, '#1a1a20', OL);
    const count = Math.floor(c.p * (c.out === 'great' ? 140 : 100));
    wText(g, String(count), 21, 25, 7, c.hit && c.out === 'great' ? '#ffe066' : '#5ee0b0');
    if (stop) {
      disc(g, 100, 20, 6, c.t % 4 < 2 ? '#e8505b' : '#a8323a');
      wText(g, '!', 100, 24, 7, '#ffffff');
    }
    if (c.E >= 5) R(g, 70 + Math.round(Math.sin(c.t / 3) * 8), 40, 2, 22, '#c9cdd4');
    wMe(g, c, 54, 92, 'u');
    wFolk(g, c, 86, 92, 'u', 2);
    void r;
  },
  office(g, c) {
    const r = wRoom(g, c, 60);
    // The window: later and later outside on a bad day.
    box(g, 80, 10, 30, 24, r.trim);
    R(g, 82, 12, 26, 20, c.hit && c.out === 'oops' ? '#1c2448' : '#8fd3f4');
    if (c.hit && c.out === 'oops') disc(g, 100, 18, 2, '#ffe9a8');
    box(g, 30, 64, 46, 6, r.trim, OL);
    R(g, 34, 70, 2, 14, r.trim);
    R(g, 70, 70, 2, 14, r.trim);
    if (c.E >= 3) {
      box(g, 42, 50, 20, 14, '#2a2e36', OL);
      const scr = c.E >= 5 ? '#5ad7e8' : '#8fd0f0';
      R(g, 44, 52, 16, 10, scr);
      for (let i = 0; i < Math.floor(c.p * 8); i++) R(g, 45, 53 + i, 2 + ((i * 5) % 12), 1, '#2a3a6a');
    } else {
      R(g, 40, 60, 24, 4, '#f4efe6');
      for (let i = 0; i < Math.floor(c.p * 6); i++) R(g, 42 + i * 3, 61, 2, 2, '#2a2a33');
    }
    wMe(g, c, 52, 86, 'u');
    if (c.hit && c.out === 'great') {
      wFolk(g, c, 90, 86, 'l', 5, { look: { hair: '#c8c8c8', top: '#3a3f4a', legs: '#2f2f3a' } });
      R(g, 82, 70, 2, 3, '#ffd9b8');
      R(g, 82, 68, 1, 2, '#ffd9b8');
      wSparkles(g, c, 52, 66, 5);
    }
    if (c.hit && c.out === 'oops') wSweat(g, 56, 70);
  },
  booth(g, c) {
    const r = wRoom(g, c, 60);
    R(g, 0, 0, 120, 60, '#2a2440');
    for (let i = 0; i < 6; i++) R(g, i * 20, 0, 10, 60, '#322a4c');
    box(g, 26, 30, 44, 28, '#1a1a20', OL);
    const frozen = c.hit && c.out === 'oops';
    R(g, 28, 32, 40, 24, frozen ? '#5a5e66' : ['#5ad7e8', '#ff8ac0', '#9a7aff'][Math.floor(c.t / 6) % 3]);
    if (frozen) wText(g, '...', 48, 46, 6, '#ffffff');
    // The chat and the viewers.
    box(g, 78, 10, 36, 48, '#1a1a20', OL);
    for (let i = 0; i < 6; i++) R(g, 80, 14 + ((i * 8 + (frozen ? 0 : c.t)) % 40), 6 + ((i * 7) % 24), 2, ['#ffffff', '#ffe066', '#5ee0b0'][i % 3]);
    const viewers = Math.floor((10 + fameOf(workStay?.id) * 3) * (1 + c.p * (c.out === 'great' && c.hit ? 4 : 1)));
    wText(g, `👀 ${viewers}`, 30, 10, 5, '#ffffff', 'rgba(0,0,0,0.4)');
    box(g, 20, 66, 56, 6, r.trim, OL);
    wMe(g, c, 48, 88, 'u');
    if (c.hit && c.out === 'great') for (let i = 0; i < 8; i++) spr(g, ['r.r', 'rrr', '.r.'], { r: '#ff6a8a' }, 80 + ((i * 11) % 30), 58 - ((c.t * 2 + i * 7) % 50));
  },
  launch(g, c) {
    const plane = c.E === 4;
    wSky(g, c, '#9a9aa4', 76);
    const go = c.hit && c.out !== 'oops';
    const q = go ? (c.p - WORK_HIT) / 0.4 : 0;
    // A countdown on the board.
    box(g, 4, 6, 26, 12, '#1a1a20', OL);
    const cd = c.hit ? (go ? 'GO' : '연기') : String(Math.max(1, 3 - Math.floor((c.p / WORK_HIT) * 3)));
    wText(g, cd, 17, 15, 6, c.hit ? (go ? '#5ee0b0' : '#ff6a6a') : '#ffe066');
    if (plane) {
      R(g, 0, 76, 120, 4, '#3a3a42');
      for (let x = 4; x < 120; x += 16) R(g, x, 77, 8, 1, '#f4f6f8');
      const x = go ? lerp(20, 140, q) : lerp(0, 20, c.p / WORK_HIT);
      const y = go ? lerp(70, 10, Math.max(0, q - 0.3)) : 70;
      box(g, Math.round(x), Math.round(y), 30, 6, '#f4f6f8', OL);
      R(g, Math.round(x) + 10, Math.round(y) + 3, 10, 2, '#3a5a8a');
      R(g, Math.round(x), Math.round(y) - 5, 4, 5, '#3a5a8a');
    } else {
      R(g, 40, 76, 40, 4, '#5a5e66');
      R(g, 76, 20, 4, 56, '#8a8e96');
      const y = go ? lerp(26, -60, q * q) : 26;
      box(g, 52, Math.round(y), 16, 40, '#f2f4f6', OL);
      gable(g, 50, Math.round(y) - 10, 20, 10, '#e8505b', OL);
      disc(g, 60, Math.round(y) + 12, 3, '#5ad7e8');
      if (go || (c.p > 0.4 && !c.hit)) for (let i = 0; i < 6; i++) disc(g, 56 + (i % 3) * 4, Math.round(y) + 42 + ((c.t + i * 2) % 8), 3, i % 2 ? '#f08a2e' : '#ffe066');
      if (c.hit && !go) for (let i = 0; i < 6; i++) disc(g, 48 + i * 5, 72 - ((c.t + i * 3) % 10), 4, 'rgba(200,200,210,0.6)');
    }
    if (!go) wMe(g, c, 100, 88, 'l');
    wFolk(g, c, 20, 90, 'r', 3, { hop: go && c.t % 6 < 3 ? -2 : 0 });
  },
  throne(g, c) {
    const r = wRoom(g, c, 60);
    const modern = c.E >= 3;
    if (modern) {
      for (const x of [20, 96]) {
        R(g, x, 10, 1, 50, '#8a8e96');
        R(g, x + 1, 10, 10, 7, x < 60 ? '#3a5a8a' : '#e8505b');
      }
      box(g, 36, 62, 48, 8, '#6b4428', OL);
      wMe(g, c, 60, 64, 'd');
      R(g, 50, 60, 6, 3, '#f4efe6');
      if (c.p > WORK_HIT - 0.04 && c.p < WORK_HIT + 0.04) R(g, 54, 58, 3, 3, '#e8505b'); // the stamp
    } else {
      R(g, 40, 60, 40, 36, '#a8323a'); // the carpet
      box(g, 50, 24, 20, 32, c.E === 0 ? '#8a5a3a' : '#e8c050', OL);
      R(g, 54, 28, 12, 18, '#a8323a');
      wMe(g, c, 60, 56, 'd');
      if (c.E === 0) R(g, 52, 20, 16, 4, '#f4efe6'); // a necklace of teeth over the seat
    }
    const cheer = c.hit && c.out === 'great';
    for (let i = 0; i < 4; i++) {
      const x = i < 2 ? 20 + i * 14 : 86 + (i - 2) * 14;
      wFolk(g, c, x, 86, i < 2 ? 'r' : 'l', i + 1, { hop: cheer && (c.t + i) % 6 < 3 ? -2 : 0 });
      if (cheer) R(g, x + 3, 68, 1, 4, '#ffd9b8');
    }
    if (c.hit && c.out === 'oops') {
      g.font = '5px sans-serif';
      g.fillStyle = '#5a6a8a';
      g.fillText('하암', 92, 66 - (c.t % 4));
    }
    if (cheer) wConfetti(g, c);
    void r;
  },
};

/** The scene, drawn at twice the town's pixel size (120 × 96 on the 240 × 192 view), like the house. */
function drawWorkScene(g) {
  const s = workStay;
  const k = scale * 2;
  g.setTransform(k, 0, 0, k, 0, 0);
  g.imageSmoothingEnabled = false;
  const p = Math.min(1, (s.n - s.t + alpha) / s.n);
  const c = { p, t: clockTick(), E: Math.max(0, Math.min(5, S.era)), out: s.out, hit: p >= WORK_HIT, s };
  g.fillStyle = '#86c06a';
  g.fillRect(0, 0, 120, 96);
  (SCENES[s.kind] ?? SCENES.office)(g, c);
  // The moment: a banner, big, along the top (clear of the people below).
  if (p >= WORK_HIT + 0.07 && s.banner) {
    const pop = Math.min(1, (p - WORK_HIT - 0.07) / 0.05);
    const size = Math.round(6 + pop * 4);
    wText(g, s.banner, 60, 13 + size, size, s.out === 'great' ? '#ffe066' : s.out === 'ok' ? '#ffffff' : '#cfe8f5', 'rgba(25, 31, 40, 0.72)');
  }
  // Cheering from you (a tap): little stars over the scene.
  if (s.cheer > 0) {
    s.cheer -= 0.25;
    wSparkles(g, c, 60, 40, 8, '#ffffff');
  }
  // A label, top left: the job and its fame; a tap hint until the moment.
  g.font = '5px sans-serif';
  const label = s.rule || s.watch ? s.name : `${s.name} · ${FAME_NAMES[fameTier(s.id)]}`;
  const w = Math.ceil(g.measureText(label).width) + 6;
  g.fillStyle = 'rgba(25, 31, 40, 0.7)';
  g.fillRect(2, 86, w, 8);
  g.fillStyle = '#ffffff';
  g.fillText(label, 5, 92);
  if (!s.tapped && !c.hit) {
    const hint = s.watch ? '눌러서 응원하기' : '눌러서 힘내기';
    const hw = Math.ceil(g.measureText(hint).width) + 6;
    g.fillStyle = 'rgba(49, 130, 246, 0.85)';
    g.fillRect(118 - hw, 86, hw, 8);
    g.fillStyle = '#ffffff';
    g.fillText(hint, 121 - hw, 92);
  }
}
