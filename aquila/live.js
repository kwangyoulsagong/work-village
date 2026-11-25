// 작은 마을 — 실시간 놀러가기 on the same network: a WebRTC data channel between two panels, no server at all.
// No ICE servers: only the machines' own local addresses are offered, so it works on one network (office Wi-Fi) and
// nowhere else. The two halves of the handshake travel as codes, by hand, like the visit codes: you send a peerLink invite
// code, your friend sends back an answer code, and from then on each sees the other walk about, and a guestbook note
// shows up in your town the moment it's written. Nothing here is saved. Loaded before game.js.
'use strict';

let peerLink = null; // { pc, ch, role: 'host' | 'guest', peer, guest, timer, last }
const LIVE_HZ = 4; // positions sent a second
const ICE_WAIT = 2500; // ms to gather the local addresses

const canLive = () => typeof RTCPeerConnection === 'function';

/** Wait until the local addresses are all in the description (or a moment has passed). */
function gathered(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((done) => {
    const t = setTimeout(done, ICE_WAIT);
    pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && (clearTimeout(t), done()));
  });
}

function newPeer() {
  const pc = new RTCPeerConnection({ iceServers: [] }); // same network only: nothing leaves it
  pc.addEventListener('connectionstatechange', () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && peerLink?.pc === pc) endLive('연결이 끊겼어요');
  });
  return pc;
}

/** Host: an invite with the town in it and your half of the handshake. */
async function startLive() {
  if (!canLive()) return toast('이 앱에서는 실시간 놀러가기를 쓸 수 없어요', 2400);
  if (MODE !== 'life') return toast('내 마을에서 시작해 주세요');
  endLive();
  const pc = newPeer();
  const ch = pc.createDataChannel('village');
  peerLink = { pc, ch, role: 'host', peer: null, guest: null, timer: 0, last: '' };
  wireChannel(ch);
  paintLive('코드를 만드는 중이에요…');
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    if (peerLink?.pc !== pc) return;
    const code = await packCode({ k: 'live', from: myCard(), town: townForCode(), news: newsForCode(), sdp: pc.localDescription.sdp });
    $('myCodeTitle').textContent = '실시간 초대 코드';
    $('myCodeNote').textContent = '같은 와이파이에 있는 친구에게 보내 주세요. 친구가 돌려준 답 코드를 아래에 붙여 넣으면 이어져요.';
    $('myCode').value = code;
    $('copyCode').disabled = false;
    paintLive('친구의 답 코드를 기다리고 있어요');
  } catch {
    endLive('연결을 준비하지 못했어요');
  }
}

/** Guest: a peerLink invite opens their town, and the answer code to send back. */
async function joinLive(obj) {
  if (!canLive()) return toast('이 앱에서는 실시간 놀러가기를 쓸 수 없어요', 2400);
  if (typeof obj.sdp !== 'string' || !obj.town || typeof obj.town !== 'object') return toast('코드를 읽지 못했어요');
  if (MODE !== 'life') return toast('내 마을에서 열어 주세요');
  endLive();
  const pc = newPeer();
  peerLink = { pc, ch: null, role: 'guest', peer: obj.from ?? null, guest: null, timer: 0, last: '' };
  pc.addEventListener('datachannel', (ev) => {
    if (peerLink?.pc !== pc) return;
    peerLink.ch = ev.channel;
    wireChannel(ev.channel);
  });
  try {
    await pc.setRemoteDescription({ type: 'offer', sdp: obj.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    if (peerLink?.pc !== pc) return;
    const answer = await packCode({ k: 'liveBack', from: myCard(), sdp: pc.localDescription.sdp });
    $('theirCode').value = '';
    enterVisit({ ...obj, k: 'town' });
    peerLink.guest = guests[guests.length - 1] ?? null; // the host, walking about (settleTown added them)
    if (peerLink.guest) peerLink.guest.liveWalk = true;
    replyCode = answer;
    await openVisitCard();
    $('myCodeTitle').textContent = '답 코드';
    $('myCodeNote').textContent = `${obj.from?.name ?? '친구'}님에게 보내면 바로 이어져요. 이어지면 서로 움직이는 게 보여요.`;
    paintLive('답 코드를 보내 주세요');
  } catch {
    endLive('연결을 준비하지 못했어요');
  }
}

/** Host: the answer code completes the handshake. */
async function finishLive(obj) {
  if (peerLink?.role !== 'host' || peerLink.pc.signalingState !== 'have-local-offer') return toast('먼저 실시간 초대 코드를 만들어 주세요');
  if (typeof obj.sdp !== 'string') return toast('코드를 읽지 못했어요');
  peerLink.peer = obj.from ?? null;
  $('theirCode').value = '';
  paintLive('이어지는 중이에요…');
  try {
    await peerLink.pc.setRemoteDescription({ type: 'answer', sdp: obj.sdp });
  } catch {
    endLive('답 코드가 맞지 않아요. 새로 시작해 주세요');
  }
}

function wireChannel(ch) {
  ch.addEventListener('open', () => {
    if (peerLink?.ch !== ch) return;
    const name = String(peerLink.peer?.name ?? '친구').slice(0, 8);
    if (peerLink.role === 'host') {
      addGuest(peerLink.peer ?? { name });
      peerLink.guest = guests[guests.length - 1];
      peerLink.guest.liveWalk = true;
      story(`🤝 ${name}님이 실시간으로 놀러 왔어요.`);
    }
    send({ t: 'hi', from: myCard() });
    peerLink.timer = setInterval(sendPos, 1000 / LIVE_HZ);
    paintLive(`${name}님과 이어졌어요`);
    toast(`${name}님과 이어졌어요`);
  });
  ch.addEventListener('message', (ev) => onLive(ev.data));
  ch.addEventListener('close', () => peerLink?.ch === ch && endLive('연결이 끊겼어요'));
}

function send(msg) {
  if (peerLink?.ch?.readyState === 'open') peerLink.ch.send(JSON.stringify(msg));
}
/** Where you are, when it changed (and not while the panel is hidden). */
function sendPos() {
  if (!peerLink || document.hidden) return;
  const msg = { t: 'pos', x: Math.round(me.x), y: Math.round(me.y), d: me.dir, h: !!me.hidden };
  const key = JSON.stringify(msg);
  if (key === peerLink.last) return;
  peerLink.last = key;
  send(msg);
}

/** A message from the other side: anyone's text, so checked. */
function onLive(data) {
  if (!peerLink || typeof data !== 'string' || data.length > 4000) return;
  let m;
  try {
    m = JSON.parse(data);
  } catch {
    return;
  }
  const g = peerLink.guest;
  if (m.t === 'pos' && g) {
    g.tx = Math.max(0, Math.min(W, Number(m.x) || 0));
    g.ty = Math.max(0, Math.min(H, Number(m.y) || 0));
    g.hidden = m.h === true;
    if (['l', 'r', 'u', 'd'].includes(m.d)) g.faceTo = m.d;
  } else if (m.t === 'note' && peerLink.role === 'host' && m.note && typeof m.note === 'object') {
    takeNote({ ...m.note, k: 'note', live: true, seed: S.mapSeed, from: peerLink.peer ?? m.note.from }); // written here, so it's this town
  } else if (m.t === 'bye') endLive(`${String(peerLink.peer?.name ?? '친구').slice(0, 8)}님이 돌아갔어요`);
}

/** A peerLink guest walks to where the other side says they are (8 ticks a second; positions come 4 times). */
function liveThink(e) {
  if (e.tx == null) return false;
  const dx = e.tx - e.x;
  const dy = e.ty - e.y;
  if (Math.abs(dx) > 80 || Math.abs(dy) > 80) {
    [e.x, e.y] = [e.tx, e.ty]; // far: they came out of a door, or took the long way
    return true;
  }
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
    if (e.faceTo) e.dir = e.faceTo;
    return false;
  }
  const s = Math.max(1, Math.hypot(dx, dy) / 2);
  e.x += Math.sign(dx) * Math.min(Math.abs(dx), s);
  e.y += Math.sign(dy) * Math.min(Math.abs(dy), s);
  e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'd' : 'u';
  e.path = [[0, 0]]; // walking (legs move)
  e.frame++;
  return true;
}

/** Guest: a note goes straight to the host's town while you're joined. True when it went. */
function liveNote(note) {
  if (peerLink?.role !== 'guest' || peerLink.ch?.readyState !== 'open') return false;
  send({ t: 'note', note: { text: note.text, x: note.x, y: note.y, from: myCard() } });
  return true;
}

function endLive(why) {
  if (!peerLink) return;
  const l = peerLink;
  peerLink = null;
  clearInterval(l.timer);
  try {
    if (l.ch?.readyState === 'open') l.ch.send(JSON.stringify({ t: 'bye' }));
    l.ch?.close();
    l.pc.close();
  } catch {
    /* closing anyway */
  }
  if (l.role === 'host' && l.guest) {
    guests = guests.filter((g) => g !== l.guest);
    people = people.filter((p) => p !== l.guest);
  }
  if (l.guest) l.guest.liveWalk = false;
  if (why) toast(why, 2200);
  paintLive();
}

function paintLive(text) {
  const s = $('liveState');
  if (!s) return;
  s.hidden = !peerLink;
  s.textContent = peerLink ? text ?? s.textContent : '';
  $('liveStart').textContent = peerLink ? '실시간 끊기' : '실시간으로 같이 놀기';
  $('liveStart').hidden = !canLive() || (MODE !== 'life' && !peerLink);
}

/** Visiting: a tap walks you there (so a friend watching sees you come over). */
function tapWalk(x, y) {
  if (MODE !== 'visit') return false;
  route(me, nearestWalkable(Math.max(0, Math.min(COLS - 1, Math.floor(x / T))), Math.max(0, Math.min(ROWS - 1, Math.floor(y / T)))));
  rest = 40; // stay there a while before strolling on
  return true;
}

function wireLive() {
  $('liveStart').addEventListener('click', () => (peerLink ? endLive('실시간 연결을 끊었어요') : void startLive()));
  canvas.addEventListener('click', (ev) => {
    if (MODE !== 'visit' || dragged || !$('signBox').hidden) return;
    const [x, y] = worldAt(ev);
    tapWalk(x, y);
  });
  window.addEventListener('pagehide', () => endLive());
  paintLive();
}
