// 작은 마을 — jobs: about seventy-five, a dozen or more open in any era (research in TODO.md). Villagers take one of the two latest eras' jobs, go to its workplace,
// wear its gear and play its motion. (Life mode; the protagonist keeps their own title.)
'use strict';

// A job lasts two eras (its own and the next) unless it says `until` (a "line" lasting many eras). Any of name / at / tool /
// top / gear may be a list by era (index = era, '' before it opens, the last one holds after), so a doctor is an herbalist in
// the stone age, a monastery apothecary in the middle ages and a robot doctor in the future.
const atEra = (v) => (Array.isArray(v) ? v[Math.max(0, Math.min(v.length - 1, S.era))] || v.find(Boolean) : v);
function jobLine(o) {
  const j = { id: o.id, era: o.era, raw: o };
  if (o.until != null) j.until = o.until;
  for (const k of ['name', 'at', 'tool', 'top', 'gear']) Object.defineProperty(j, k, { get: () => atEra(o[k]) ?? null, enumerable: true });
  return j;
}
/** A job's name in a given era (for "the herbalist is now a doctor" stories). */
const jobNameAt = (j, era) => {
  const v = j.raw.name;
  return Array.isArray(v) ? v[Math.min(v.length - 1, era)] || v.find(Boolean) : v;
};
const JOBS = [
  // Stone age
  { id: 'hunter', name: '사냥꾼', era: 0, at: 'woods', tool: 'bow', top: '#6b7a3a', gear: 'band' },
  { id: 'gatherer', name: '채집꾼', era: 0, at: 'woods', tool: 'pick', top: '#8a6a3a' },
  { id: 'fisher', name: ['어부', '어부', '어부', '어부', '원양 어부', '양식장 관리자'], era: 0, until: 5, at: 'lake', tool: 'rod', top: '#4a7a9a', gear: ['straw', 'straw', 'straw', 'cap', 'cap', 'goggles'] },
  { id: 'shaman', name: '주술사', era: 0, at: 'plaza', tool: 'staff', top: '#7a3a5a', gear: 'feather' },
  { id: 'storyteller', name: '이야기꾼', era: 0, at: 'plaza', tool: 'staff', top: '#a8643a', gear: 'feather' },
  { id: 'wrestler', name: ['씨름꾼', '씨름꾼', '씨름 장사', '권투 선수', '격투기 선수', '로봇 격투 조종사'], era: 0, until: 5, at: 'plaza', tool: null, top: '#c8503a', gear: ['band', 'band', 'band', 'band', 'band', 'headset'] },
  { id: 'firekeeper', name: '불지기', era: 0, until: 0, at: 'plaza', tool: 'staff', top: '#b0503a', gear: 'band' },
  { id: 'potter', name: ['토기장이', '도공'], era: 0, at: 'store', tool: 'hammer', top: '#a8744a', gear: 'apron' },
  { id: 'herder', name: ['짐승 길들이는 이', '목동', '양치기'], era: 0, until: 2, at: 'farm', tool: 'staff', top: '#8a7a4a', gear: 'straw' },
  { id: 'doctor', name: ['약초꾼', '의원', '수도원 약사', '왕진 의사', '의사', '로봇 의사'], era: 0, until: 5, at: ['woods', 'hospital'], tool: ['pick', 'heart'],
    top: ['#5a8a4a', '#e8e0c8', '#7a5a3a', '#3a3a42', '#ffffff', '#d7e3ee'], gear: ['straw', 'turban', 'hood', 'tie', 'mirror', 'antenna'] },
  { id: 'teacher', name: ['어른 스승', '훈장', '수도원 선생', '선생님', '선생님', '홀로 선생님'], era: 0, until: 5, at: 'plaza', tool: ['staff', 'mail', 'pray', 'mail', 'laptop', 'phone'],
    top: ['#8a6a3a', '#e8e0c8', '#5a4a6a', '#5a6a8a', '#4a7a6a', '#9ab0e0'], gear: ['feather', 'topknot', 'hood', 'tie', 'tie', 'antenna'] },
  { id: 'builder', name: ['움집 짓는 이', '석공', '성 짓는 석공', '목수', '건축가', '3D 프린팅 건축가'], era: 0, until: 5, at: 'doors', tool: ['hammer', 'hammer', 'hammer', 'hammer', 'laptop', 'wrench'],
    top: ['#8a6a3a', '#a89a7a', '#7a7a82', '#8a5a3a', '#f2c24a', '#e8eef4'], gear: ['band', 'straw', 'helm', 'cap', 'cap', 'goggles'] },
  { id: 'painter', name: ['동굴 화가', '벽화가', '성화 화가', '화가', '일러스트레이터', '홀로 아티스트'], era: 0, until: 5, at: 'plaza', tool: ['staff', 'staff', 'staff', 'staff', 'laptop', 'sparkle'],
    top: ['#a8643a', '#c89a5a', '#6a4a8a', '#4a5a8a', '#e07aa0', '#9a7aff'], gear: ['feather', 'turban', 'hood', 'beret', 'beret', 'shades'] },
  { id: 'dancer', name: ['춤꾼', '무희', '궁중 무용수', '발레리나', '댄서', '홀로 댄서'], era: 0, until: 5, at: 'plaza', tool: 'sparkle',
    top: ['#c8503a', '#e8c050', '#c0402e', '#f4c8d8', '#3a3a5a', '#9a7aff'], gear: ['feather', 'band', 'band', 'band', 'cap', 'shades'] },
  { id: 'toolmaker', name: '석기 만드는 이', era: 0, until: 0, at: 'woods', tool: 'hammer', top: '#7a6a5a', gear: 'band' },
  // Ancient
  { id: 'sailor', name: ['', '뱃사공', '선원', '증기선 선원', '선장', '우주 항해사'], era: 1, until: 5, at: 'lake', tool: ['', 'rod', 'rod', 'rod', 'whistle', 'sparkle'],
    top: ['', '#4a7a9a', '#3a5a8a', '#f4f6f8', '#ffffff', '#e8eef4'], gear: ['', 'band', 'band', 'cap', 'cap', 'space'] },
  { id: 'priest', name: ['', '제사장', '신부', '목사', '목사', '디지털 명상가'], era: 1, until: 5, at: 'temple', tool: 'pray',
    top: ['', '#f4efe6', '#2a2a33', '#2a2a33', '#2a2a33', '#e8eef4'], gear: ['', 'turban', 'hood', 'tie', 'tie', 'antenna'] },
  { id: 'musician', name: ['', '악사', '궁정 악사', '오케스트라 단원', '밴드 기타리스트', '신스 연주자'], era: 1, until: 5, at: 'plaza', tool: 'lute',
    top: ['', '#a8643a', '#6a4a8a', '#2a2a33', '#3a3a42', '#5ad7e8'], gear: ['', 'turban', 'feather', 'tie', 'shades', 'headset'] },
  { id: 'farmer', name: ['', '농부', '농부', '농부', '농부', '스마트팜 농부'], era: 1, until: 5, at: 'farm', tool: 'hoe', top: '#c9a24a', gear: ['', 'straw', 'straw', 'straw', 'cap', 'goggles'] },
  { id: 'smith', name: ['', '대장장이', '대장장이', '제철공', '용접공', '나노 대장장이'], era: 1, until: 5, at: 'store', tool: ['', 'hammer', 'hammer', 'hammer', 'wrench', 'wrench'], top: '#5a4a42', gear: ['', 'apron', 'apron', 'apron', 'goggles', 'goggles'] },
  { id: 'athlete', name: '올림픽 선수', era: 1, at: 'run', tool: null, top: '#e8505b', gear: 'band' },
  { id: 'merchant', name: ['', '상인', '상인', '상점 주인', '편의점 사장', '우주 무역상'], era: 1, until: 5, at: 'stall', tool: 'coin', top: '#2f7a6a', gear: ['', 'turban', 'turban', 'apron', 'apron', 'space'] },
  { id: 'actor', name: ['', '가면 배우', '유랑 극단 배우', '연극 배우', '배우', '홀로 배우'], era: 1, until: 5, at: 'plaza', tool: 'mic', top: '#b04a8a', gear: 'shades' },
  { id: 'judge', name: ['', '판관', '판관', '판사', '판사', '판사'], era: 1, until: 5, at: 'bench', tool: 'pray', top: '#2a2a33', gear: 'wig' },
  { id: 'scribe', name: '서기관', era: 1, at: 'bench', tool: 'mail', top: '#d8c8a0', gear: 'turban' },
  { id: 'gladiator', name: '검투사', era: 1, at: 'plaza', tool: 'sword', top: '#a8743a', gear: 'helm' },
  { id: 'servant', name: '노비', era: 1, until: 2, at: 'doors', tool: 'bread', top: '#9a8a74' },
  { id: 'police', name: ['', '포졸', '경비병', '순경', '경찰', '로봇 경찰'], era: 1, until: 5, at: 'patrol', tool: ['', 'staff', 'sword', 'whistle'],
    top: ['', '#3a3a4a', '#9aa0aa', '#2a3a6a', '#2a3a6a', '#c8d4e0'], gear: ['', 'band', 'helm', 'police', 'police', 'antenna'] },
  { id: 'nurse', name: ['', '산파', '수녀 간호사', '간호사', '간호사', '케어 로봇 간호사'], era: 1, until: 5, at: 'hospital', tool: 'heart',
    top: ['', '#e8e0c8', '#3a3a42', '#f4f6f8', '#f4f6f8', '#e8eef4'], gear: ['', 'turban', 'hood', 'nurse', 'nurse', 'antenna'] },
  { id: 'chef', name: ['', '부엌 요리사', '성 주방장', '식당 요리사', '요리사', '분자 요리사'], era: 1, until: 5, at: 'stall', tool: 'bread', top: '#ffffff', gear: 'chef' },
  { id: 'soldier', name: ['', '창병', '궁수', '군인', '군인', '로봇 병사'], era: 1, until: 5, at: 'patrol', tool: ['', 'sword', 'bow', 'whistle'],
    top: ['', '#a8743a', '#6b7a3a', '#5a6a4a', '#5a6a4a', '#b8bcc4'], gear: ['', 'helm', 'hood', 'cap', 'cap', 'antenna'] },
  { id: 'tailor', name: ['', '베 짜는 이', '재단사', '재봉사', '패션 디자이너', '나노 옷 디자이너'], era: 1, until: 5, at: 'stall', tool: 'sparkle',
    top: ['', '#e8e0c8', '#8a4a6a', '#5a4a42', '#2a2a33', '#9a7aff'], gear: ['', 'turban', 'hood', 'apron', 'shades', 'goggles'] },
  { id: 'astronomer', name: ['', '별 보는 점성가', '천문학자', '천문학자', '천문학자', '우주 관측 연구원'], era: 1, until: 5, at: 'plaza', tool: 'sparkle',
    top: ['', '#3a3a6a', '#3a3a6a', '#4a4a5a', '#ffffff', '#f2f4f6'], gear: ['', 'turban', 'hood', 'goggles', 'goggles', 'space'] },
  // Middle ages
  { id: 'knight', name: '기사', era: 2, at: 'patrol', tool: 'sword', top: '#9aa0aa', gear: 'helm' },
  { id: 'bard', name: '음유시인', era: 2, at: 'plaza', tool: 'lute', top: '#8a4ab0', gear: 'feather' },
  { id: 'baker', name: '제빵사', era: 2, at: 'stall', tool: 'bread', top: '#f4efe6', gear: 'chef' },
  { id: 'monk', name: '수도사', era: 2, at: 'temple', tool: 'pray', top: '#7a5a3a', gear: 'hood' },
  { id: 'jester', name: '광대', era: 2, at: 'plaza', tool: 'staff', top: '#e8c050', gear: 'jester' },
  { id: 'samurai', name: '무사', era: 2, at: 'patrol', tool: 'sword', top: '#3a3a5a', gear: 'topknot' },
  { id: 'falconer', name: '매사냥꾼', era: 2, until: 2, at: 'woods', tool: 'bow', top: '#6a5a3a', gear: 'feather' },
  { id: 'firefighter', name: ['', '', '멸화군', '소방수', '소방관', '드론 소방대'], era: 2, until: 5, at: 'patrol', tool: 'whistle', top: '#d8503a', gear: 'fire' },
  { id: 'alchemist', name: ['', '', '연금술사', '화학자', '과학자', '양자 과학자'], era: 2, until: 5, at: 'store', tool: 'sparkle',
    top: ['', '', '#5a3a6a', '#ffffff', '#ffffff', '#e8eef4'], gear: ['', '', 'hood', 'goggles', 'goggles', 'antenna'] },
  { id: 'innkeeper', name: ['', '', '주막 주인', '여관 주인', '호텔 지배인', '우주 호텔 지배인'], era: 2, until: 5, at: 'stall', tool: 'coin',
    top: ['', '', '#8a6a4a', '#5a4a42', '#2a2a33', '#3a3a5a'], gear: ['', '', 'apron', 'apron', 'tie', 'tie'] },
  { id: 'barber', name: ['', '', '이발사', '이발사', '미용사', '홀로 헤어 디자이너'], era: 2, until: 5, at: 'stall', tool: 'sparkle',
    top: ['', '', '#f4f6f8', '#f4f6f8', '#e07aa0', '#9a7aff'], gear: ['', '', 'apron', 'apron', 'shades', 'shades'] },
  // Industrial
  { id: 'banker', name: ['', '', '', '은행원', '은행원', '코인 트레이더'], era: 3, until: 5, at: 'bench', tool: ['', '', '', 'coin', 'coin', 'laptop'], top: '#2a3a4a', gear: 'tie' },
  { id: 'miner', name: ['', '', '', '광부', '광부', '소행성 광부'], era: 3, until: 5, at: 'mine', tool: 'pickaxe', top: '#5a5a62', gear: ['', '', '', 'lamp', 'lamp', 'space'] },
  { id: 'worker', name: ['', '', '', '공장 노동자', '공장 노동자', '로봇 공장 감독관'], era: 3, until: 5, at: 'factory', tool: ['', '', '', 'wrench', 'wrench', 'laptop'], top: '#3a5a8a', gear: ['', '', '', 'cap', 'cap', 'headset'] },
  { id: 'mail', name: ['', '파발꾼', '전령', '우체부', '택배 기사', '드론 배송 관리자'], era: 1, until: 5, at: 'doors', tool: ['', 'mail', 'mail', 'mail', 'mail', 'phone'], top: ['', '#8a6a3a', '#3a5a8a', '#c0402e', '#3a6a5a', '#f2a65a'], gear: ['', 'band', 'feather', 'cap', 'cap', 'antenna'] },
  { id: 'baseball', name: '야구 선수', era: 3, until: 5, at: 'plaza', tool: 'ball', top: '#f4f6f8', gear: 'cap' },
  { id: 'circus', name: '서커스 단원', era: 3, at: 'plaza', tool: 'sparkle', top: '#e0475f', gear: 'band' },
  { id: 'lawyer', name: '변호사', era: 3, until: 5, at: 'bench', tool: 'laptop', top: '#3a3f4a', gear: 'tie' },
  { id: 'inventor', name: '발명가', era: 3, at: 'store', tool: 'wrench', top: '#8a6a4a', gear: 'goggles' },
  { id: 'soccer', name: '축구 선수', era: 3, until: 5, at: 'plaza', tool: 'ball', top: '#2a8a4a', gear: 'number' },
  { id: 'basketball', name: '농구 선수', era: 3, until: 5, at: 'plaza', tool: 'ball', top: '#e8892a', gear: 'band' },
  { id: 'photographer', name: ['', '', '', '사진사', '사진작가'], era: 3, until: 4, at: 'plaza', tool: 'sparkle', top: '#4a4a52', gear: 'beret' },
  { id: 'detective', name: '탐정', era: 3, until: 4, at: 'patrol', tool: 'mail', top: '#8a7a5a', gear: 'beret' },
  { id: 'reporter', name: ['', '', '', '신문 기자', '방송 기자', '홀로 리포터'], era: 3, until: 5, at: 'plaza', tool: ['', '', '', 'mail', 'mic', 'phone'],
    top: ['', '', '', '#6a5a4a', '#3a5a8a', '#5ad7e8'], gear: ['', '', '', 'cap', 'tie', 'antenna'] },
  { id: 'driver', name: ['', '전차 마부', '마부', '기관사', '버스 기사', '자율주행 관제사'], era: 1, until: 5, at: ['', 'patrol', 'patrol', 'patrol', 'patrol', 'bench'], tool: ['', 'staff', 'staff', 'whistle', 'whistle', 'laptop'],
    top: ['', '#a8743a', '#6a5a3a', '#2a2a33', '#3a6a5a', '#e8eef4'], gear: ['', 'helm', 'straw', 'cap', 'cap', 'headset'] },
  // Modern
  { id: 'office', name: '회사원', era: 4, at: 'bench', tool: 'laptop', top: '#3a3f4a', gear: 'tie' },
  { id: 'star', name: '가수', era: 4, at: 'plaza', tool: 'mic', top: '#e07aa0', gear: 'shades' },
  { id: 'volleyball', name: '배구 선수', era: 4, until: 5, at: 'plaza', tool: 'ball', top: '#3a7ad0', gear: 'band' },
  { id: 'programmer', name: '프로그래머', era: 4, until: 5, at: 'bench', tool: 'laptop', top: '#3a3a5a', gear: 'headset' },
  { id: 'pilot', name: ['', '', '', '', '비행기 조종사', '우주선 조종사'], era: 4, until: 5, at: 'rocket', tool: 'sparkle', top: ['', '', '', '', '#2a3a6a', '#f2f4f6'], gear: ['', '', '', '', 'cap', 'space'] },
  { id: 'webtoon', name: '웹툰 작가', era: 4, until: 5, at: 'bench', tool: 'laptop', top: '#f2a65a', gear: 'headset' },
  { id: 'barista', name: '바리스타', era: 4, at: 'stall', tool: 'bread', top: '#5a3a2a', gear: 'apron' },
  { id: 'vet', name: ['', '', '', '', '수의사', '로봇 수의사'], era: 4, until: 5, at: 'hospital', tool: 'heart', top: ['', '', '', '', '#8ad0a0', '#e8eef4'], gear: ['', '', '', '', 'mirror', 'antenna'] },
  { id: 'attendant', name: ['', '', '', '', '승무원', '우주선 승무원'], era: 4, until: 5, at: 'rocket', tool: 'heart', top: ['', '', '', '', '#2a3a6a', '#f2f4f6'], gear: ['', '', '', '', 'cap', 'space'] },
  { id: 'zookeeper', name: '사육사', era: 4, at: 'woods', tool: 'heart', top: '#6b7a3a', gear: 'cap' },
  // Future
  { id: 'robotics', name: '로봇 공학자', era: 5, at: 'factory', tool: 'wrench', top: '#d7e3ee', gear: 'goggles' },
  { id: 'astronaut', name: '우주비행사', era: 5, at: 'rocket', tool: 'sparkle', top: '#f2f4f6', gear: 'space' },
  { id: 'gamer', name: '프로게이머', era: 4, until: 5, at: 'bench', tool: 'laptop', top: '#3a2a5a', gear: 'headset' },
  { id: 'creator', name: ['', '', '', '', '유튜버', '크리에이터'], era: 4, until: 5, at: 'plaza', tool: 'phone', top: '#f2a65a', gear: 'cap' },
  { id: 'holoidol', name: '홀로 아이돌', era: 5, at: 'plaza', tool: 'mic', top: '#9a7aff', gear: 'shades' },
  { id: 'zerog', name: '무중력 구기 선수', era: 5, at: 'plaza', tool: 'ball', top: '#5ad7e8', gear: 'space' },
  { id: 'aitrainer', name: 'AI 조련사', era: 5, at: 'bench', tool: 'laptop', top: '#5a6aa0', gear: 'antenna' },
  { id: 'terraformer', name: '테라포밍 기술자', era: 5, at: 'farm', tool: 'hoe', top: '#c86a3a', gear: 'space' },
  { id: 'vrdesigner', name: '가상 세계 설계자', era: 5, at: 'bench', tool: 'laptop', top: '#2a2a4a', gear: 'goggles' },
  { id: 'mecha', name: '메카 조종사', era: 5, at: 'plaza', tool: 'sparkle', top: '#d8503a', gear: 'helm' },
  { id: 'robopet', name: '로봇 펫 정비사', era: 5, at: 'store', tool: 'wrench', top: '#8ad0a0', gear: 'goggles' },
].map(jobLine);
const jobUntil = (j) => j.until ?? Math.min(5, j.era + 1);

/** The jobs a villager can have now: those of the two latest eras reached. */
const jobPool = () => JOBS.filter((j) => j.era <= S.era && jobUntil(j) >= S.era);
/** A neighbour's job: the open job their traits fit best (see bestJob below). */
const jobFor = (i) => bestJob(villagerTraits(i), i);

/** Where a job is done (a tile), given what the town has. */
function jobPlace(e, j) {
  const plaza = [PLAZA.x + rand(0, 3), PLAZA.y + rand(0, 1)];
  switch (j.at) {
    case 'woods':
      return groveSpot(e);
    case 'lake':
      return [LAKE.x + rand(0, LAKE.w - 1), LAKE.y - 1];
    case 'farm': {
      const [px, py] = PLOT_AT[rand(0, plotCount() - 1)];
      return [px, py - 1];
    }
    case 'store':
      return [STORE.x, STORE.y - 1];
    case 'stall':
      return [STALL[0], ROAD_Y + 1];
    case 'run':
    case 'patrol':
      return [rand(Math.max(0, HOME.x - 30), Math.min(COLS - 1, HOME.x + 30)), ROAD_Y];
    case 'temple':
      return has('temple') ? landmarkSpot('temple') : plaza;
    case 'mine':
      return [MINE.x + rand(1, MINE.w - 2), MINE.y + MINE.h];
    case 'factory':
      return has('factory') ? landmarkSpot('factory') : [STORE.x, STORE.y - 1];
    case 'doors': {
      const i = rand(0, Math.max(0, S.houses - 1));
      return doorOf(i);
    }
    case 'hospital':
      return has('hospital') ? landmarkSpot('hospital') : plaza;
    case 'rocket':
      return has('rocket') ? landmarkSpot('rocket') : plaza;
    case 'bench':
      return [PLAZA.x + (Math.random() < 0.5 ? 0 : 3), PLAZA.y + 1];
    default:
      return plaza;
  }
}

/** What a job's work adds: the store, the collection book. */
function jobDone(j, e = null) {
  // Skilled hands bring back more, the lucky find more (village.js reads the worker's abilities).
  if (j.id === 'gatherer' || j.id === 'hunter') {
    stock('berries', workYield(e));
    if (Math.random() < 0.15 * findMul(e)) find('forage');
  } else if (j.id === 'fisher') {
    if (Math.random() < 0.6) stock('fish', workYield(e));
    if (Math.random() < 0.2 * findMul(e)) find('fish');
  } else if (j.id === 'miner') {
    stock('stone', workYield(e));
    if (Math.random() < 0.15 * findMul(e)) find('gem');
    if (Math.random() < 0.04 * findMul(e)) find('relic');
  } else if (j.id === 'smith' || j.id === 'worker') stock('wood', workYield(e));
}

// ── Gear and tools ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A job's hat or badge over a villager drawn at (x, y) (the sprite's top-left). */
function drawGear(g, j, x, y, side, flip) {
  const P = (rows, pal, dy, dx = 0) => spr(g, rows, { o: OL, ...pal }, x + dx, y + dy, flip);
  switch (j.gear) {
    case 'straw':
      P(['...oooooo...', '..oyyyyyyo..', 'ooyyyyyyyyoo'], { y: '#f2d27a' }, -1);
      break;
    case 'band':
      P(['............', '.rrrrrrrrrr.'], { r: '#e8404b' }, 3);
      break;
    case 'feather':
      P(['.........r..', '........rr..', '........r...'], { r: '#e8404b' }, -3);
      break;
    case 'turban':
      P(['...oooooo...', '..owwwwwwo..', '.owwwrwwwwo.'], { w: '#f4efe6', r: '#e8404b' }, -2);
      break;
    case 'helm':
      P(['...oooooo...', '..ossssssoo.', '.osssssssso.', '.osooooooso.'], { s: '#b8bcc4' }, -1);
      break;
    case 'chef':
      P(['..owwwwwwo..', '..owwwwwwo..', '...owwwwo...', '..owwwwwwo..'], { w: '#ffffff' }, -4);
      break;
    case 'hood':
      P(['..oooooooo..', '.obbbbbbbbo.', 'obb......bbo'], { b: '#7a5a3a' }, -1);
      break;
    case 'lamp':
      P(['...oooooo...', '..oyyyyyyo..', '.oyyyyyyyyo.', '.....ww.....'], { y: '#f2c24a', w: '#ffffff' }, -2);
      break;
    case 'cap':
      P(['...oooooo...', '..obbbbbbo..', '.obbbbbbbboo'], { b: j.id === 'mail' ? '#c0402e' : j.id === 'creator' ? '#3a3a42' : '#3a5a8a' }, -1);
      break;
    case 'police':
      P(['...oooooo...', '..onnnnnno..', '.onnnyynnnoo'], { n: '#2a3a6a', y: '#f2c24a' }, -1);
      break;
    case 'nurse':
      P(['....owwo....', '...owrrwo...', '...owwwwo...'], { w: '#ffffff', r: '#e8404b' }, -2);
      break;
    case 'shades':
      if (side === 'd') P(['............', '.ooooo.ooooo'], {}, 6);
      break;
    case 'goggles':
      P(['............', '.oggooooggo.'], { g: '#5ad7e8' }, 5);
      break;
    case 'space':
      P(['..oooooooo..', '.owwwwwwwwo.', 'ow........wo', 'ow........wo', 'ow........wo', 'ow........wo', '.owwwwwwwwo.'], { w: '#e8eef4' }, -1);
      break;
    case 'headset':
      P(['..oooooooo..', '.o........o.', 'oo........oo', 'oo........oo'], {}, 1);
      break;
    case 'apron':
      P(['...aaaaaa...', '...aaaaaa...', '...aaaaaa...'], { a: '#8a6a4a' }, 11);
      break;
    case 'tie':
      if (side !== 'u') P(['.....rr.....', '.....r......'], { r: '#e8404b' }, 11);
      break;
    case 'wig':
      P(['..owwwwwwo..', '.owwwwwwwwo.', 'ow.w....w.wo', 'ow........wo'], { w: '#f4f4f0' }, -1);
      break;
    case 'jester':
      P(['.r........y.', '.rr......yy.', '..rrrryyyy..', '..orrrryyyo.'], { r: '#e0475f', y: '#ffd23f' }, -3);
      break;
    case 'topknot':
      P(['.....oo.....', '.....hh.....', '..hhhhhhhh..'], { h: '#1a1a22' }, -2);
      break;
    case 'mirror':
      P(['............', '.oooooooooo.', '....oyyo....'], { y: '#e8eef4' }, 1);
      break;
    case 'fire':
      P(['...oooooo...', '..orrrrrro..', '.orryyrrrro.', 'oooooooooooo'], { r: '#d8503a', y: '#ffd23f' }, -2);
      break;
    case 'beret':
      P(['....oooooo..', '...obbbbbbo.', '..obbbbbbbbo', '...o.....oo.'], { b: j.id === 'detective' ? '#6a5a3a' : '#c0402e' }, -1);
      break;
    case 'antenna':
      P(['.....y......', '.....o......', '..oooooooo..', '..osssssso..'], { y: '#ff6a6a', s: '#c8d4e0' }, -4);
      break;
    case 'number':
      if (side === 'u') P(['.....ww.....', '.....w......', '.....ww.....'], { w: '#ffffff' }, 11);
      break;
  }
}

/** Job tools while working; true when it drew one. */
function drawJobTool(g, e, act) {
  const k = act.n - act.t;
  const beat = Math.floor(k / 4) % 2 === 0;
  const flip = faceOf(e) === 'l';
  const hx = Math.round(e.x) + (flip ? -8 : 5);
  const hy = Math.round(e.y) - 8;
  const wood = '#8a5a3a';
  const note = (dx, dy) => {
    R(g, hx + dx, hy + dy, 2, 2, '#4a3a60');
    R(g, hx + dx + 1, hy + dy - 4, 1, 4, '#4a3a60');
  };
  switch (act.tool) {
    case 'bow':
      for (let i = 0; i < 7; i++) R(g, hx + (flip ? -Math.abs(3 - i) : Math.abs(3 - i)) - (flip ? 0 : 1), hy - 6 + i, 1, 1, wood);
      R(g, hx + (flip ? 1 : -1), hy - 6, 1, 7, '#e8e0d0');
      if (!beat) R(g, hx + (flip ? -10 : 4), hy - 3, 7, 1, '#6b4428');
      return true;
    case 'staff':
      R(g, hx, hy - 10, 1, 16, wood);
      if (beat) disc(g, hx, hy - 11, 2, '#b07aff');
      R(g, hx + (beat ? 3 : -3), hy - 14, 1, 1, '#ffe066');
      return true;
    case 'sword':
      R(g, hx, hy - (beat ? 8 : 4), 1, 8, '#d8dce4');
      R(g, hx - 1, hy - (beat ? 1 : -3), 3, 1, '#c9921a');
      return true;
    case 'lute':
      disc(g, hx, hy + 1, 2, '#c98d4b');
      R(g, hx + (flip ? -5 : 1), hy - 2, 5, 1, wood);
      note(beat ? 2 : -2, -10 - (k % 8));
      return true;
    case 'bread':
      R(g, hx - 2, hy, 6, 3, '#d9a05a');
      R(g, hx - 1, hy, 4, 1, '#f2c27a');
      if (beat) R(g, hx + 1, hy - 3, 1, 2, 'rgba(255,255,255,0.7)');
      return true;
    case 'pray':
      R(g, Math.round(e.x) - 1, hy - 1, 3, 2, '#ffd9b8');
      if (beat) R(g, Math.round(e.x), hy - 22, 1, 1, '#ffe066');
      return true;
    case 'wrench':
      R(g, hx, hy - (beat ? 5 : 2), 1, 5, '#8a8e96');
      R(g, hx - 1, hy - (beat ? 7 : 4), 3, 2, '#8a8e96');
      if (!beat) R(g, hx + (flip ? -3 : 3), hy + 2, 1, 1, '#ffe066');
      return true;
    case 'mail':
      box(g, hx - 1, hy - 1, 6, 4, '#ffffff', '#8a8e96');
      R(g, hx, hy, 4, 1, '#c0402e');
      return true;
    case 'whistle':
      R(g, hx, hy - 3, 2, 2, '#c9cdd4');
      if (beat) for (const [dx, dy] of [[4, -6], [6, -4], [5, -8]]) R(g, hx + dx * (flip ? -1 : 1), hy + dy, 1, 1, '#ffffff');
      return true;
    case 'laptop':
      box(g, hx - 3, hy - 1, 8, 4, '#3a3f4a', '#2a2e36');
      R(g, hx - 2, hy, 6, 2, beat ? '#8fd0f0' : '#5ad7e8');
      return true;
    case 'ball': {
      const by = Math.round(e.y) - 2 - (beat ? 4 : 0);
      disc(g, Math.round(e.x) + (flip ? -7 : 7), by, 2, '#ffffff');
      R(g, Math.round(e.x) + (flip ? -7 : 7), by, 1, 1, '#2a2a30');
      return true;
    }
    case 'mic':
      R(g, hx, hy - 4, 1, 4, '#3a3a42');
      R(g, hx - 1, hy - 6, 3, 2, '#8a8e96');
      note(beat ? 3 : 6, -12 - (k % 6));
      if (!beat) R(g, hx - 8, hy - 14, 1, 1, '#ffe066');
      return true;
    case 'phone':
      box(g, hx - 1, hy - 6, 4, 6, '#2a2a30', '#1a1a20');
      R(g, hx, hy - 5, 2, 3, '#8fd0f0');
      if (beat) R(g, hx + 4, hy - 8, 1, 1, '#ffffff');
      return true;
  }
  return false;
}

// ── Jobs follow abilities: each job leans on two traits; whoever is best at those does it ──────────────────────────

/** [main trait, second trait] per job; fit = main × 2 + second. */
const JOB_FIT = {
  hunter: ['health', 'luck'], gatherer: ['green', 'luck'], fisher: ['luck', 'green'], shaman: ['charm', 'luck'],
  farmer: ['green', 'health'], smith: ['health', 'green'], athlete: ['health', 'charm'], merchant: ['trade', 'charm'],
  knight: ['health', 'charm'], bard: ['charm', 'luck'], baker: ['green', 'trade'], monk: ['luck', 'charm'],
  miner: ['health', 'luck'], worker: ['green', 'health'], mail: ['health', 'trade'], police: ['health', 'charm'],
  office: ['trade', 'green'], nurse: ['charm', 'health'], soccer: ['health', 'luck'], star: ['charm', 'luck'],
  robotics: ['green', 'trade'], astronaut: ['health', 'luck'], gamer: ['luck', 'green'], creator: ['charm', 'trade'],
  storyteller: ['charm', 'luck'], wrestler: ['health', 'charm'], actor: ['charm', 'luck'],
  judge: ['trade', 'charm'], scribe: ['trade', 'green'], gladiator: ['health', 'charm'], servant: ['green', 'health'],
  jester: ['charm', 'luck'], samurai: ['health', 'luck'], baseball: ['health', 'luck'], circus: ['health', 'charm'],
  lawyer: ['trade', 'charm'], inventor: ['trade', 'luck'], basketball: ['health', 'luck'], volleyball: ['health', 'charm'],
  doctor: ['green', 'trade'], chef: ['green', 'charm'], firefighter: ['health', 'charm'], programmer: ['trade', 'luck'],
  holoidol: ['charm', 'luck'], zerog: ['health', 'luck'],
  firekeeper: ['luck', 'health'], potter: ['green', 'trade'], herder: ['green', 'charm'], teacher: ['charm', 'trade'],
  builder: ['health', 'green'], painter: ['charm', 'green'], soldier: ['health', 'luck'], tailor: ['charm', 'green'],
  astronomer: ['luck', 'trade'], falconer: ['luck', 'green'], alchemist: ['trade', 'luck'], innkeeper: ['trade', 'charm'],
  photographer: ['luck', 'charm'], detective: ['luck', 'trade'], reporter: ['charm', 'trade'], driver: ['health', 'trade'],
  pilot: ['luck', 'health'], webtoon: ['charm', 'green'], barista: ['charm', 'trade'], aitrainer: ['trade', 'luck'],
  dancer: ['charm', 'health'], toolmaker: ['green', 'health'], sailor: ['health', 'luck'], priest: ['charm', 'luck'],
  musician: ['charm', 'luck'], barber: ['charm', 'green'], banker: ['trade', 'luck'], vet: ['green', 'charm'],
  attendant: ['charm', 'health'], zookeeper: ['green', 'charm'],
  terraformer: ['green', 'health'], vrdesigner: ['green', 'trade'], mecha: ['health', 'luck'], robopet: ['green', 'charm'],
};
// Read when used: TRAITS lives in game.js, which loads after this file.
const traitName = (k) => Object.fromEntries(TRAITS)[k];

/** The job (of the open ones) that fits these traits best; `salt` breaks ties so neighbours differ. */
function bestJob(traits, salt = 0, skip = null) {
  const pool = jobPool().filter((j) => j.id !== skip);
  let best = pool[0];
  let bestScore = -1;
  pool.forEach((j, i) => {
    const [a, b] = JOB_FIT[j.id];
    const score = traits[a] * 2 + traits[b] + (((i + salt) * 7) % 5) * 0.01;
    if (score > bestScore) [best, bestScore] = [j, score];
  });
  return best;
}
/** A neighbour's traits: fixed per family (the same every time you look). */
function villagerTraits(i) {
  const r = rng(i * 131 + 17 + (S.mapSeed ?? 0));
  return Object.fromEntries(TRAITS.map(([k]) => [k, 1 + Math.floor(r() * 5)]));
}

/** Your job: what your traits fit best now; a story when it changes. */
function updateMyJob(quiet = false) {
  if (!S.traits) return;
  const j = bestJob(S.traits, 0, S.freed ? 'servant' : null); // once freed, never a servant again
  if (S.job === j.id) return;
  S.job = j.id;
  if (quiet) return;
  const [a] = JOB_FIT[j.id];
  story(`💼 ${josa(traitName(a), '이', '가')} 좋아서 ${josa(j.name, '이', '가')} 됐어요. 직업 수입 +${pct(myPay(0.5))}.`);
}
const myJob = () => JOBS.find((j) => j.id === S.job) ?? null;
