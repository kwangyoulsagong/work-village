// Raw DEFLATE (RFC 1951) in plain JS, for invite codes in the Claude Code mod, whose runtime has no
// CompressionStream. Codes made here open in Aquila and Chrome (which use the browser's 'deflate-raw') and theirs
// open here: inflate reads every block type; deflate writes one fixed-Huffman block with LZ77 matches.

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CLORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

// ── Inflate ────────────────────────────────────────────────────────────────────────────────────────────────────────

function tree(lengths) {
  const counts = new Uint16Array(16);
  for (const l of lengths) counts[l]++;
  counts[0] = 0;
  const offs = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + counts[i - 1];
  const symbols = new Uint16Array(lengths.length);
  lengths.forEach((l, s) => {
    if (l) symbols[offs[l]++] = s;
  });
  return { counts, symbols };
}

let FIXED = null;
function fixedTrees() {
  if (FIXED) return FIXED;
  const lit = new Array(288);
  for (let i = 0; i < 288; i++) lit[i] = i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8;
  return (FIXED = [tree(lit), tree(new Array(30).fill(5))]);
}

/** Raw DEFLATE bytes → the original bytes. Throws on a broken stream. */
export function inflateRaw(input) {
  const src = input instanceof Uint8Array ? input : new Uint8Array(input);
  let pos = 0, bitbuf = 0, bitcnt = 0;
  let out = new Uint8Array(Math.max(1024, src.length * 4));
  let n = 0;
  const need = (k) => {
    if (n + k <= out.length) return;
    let size = out.length * 2;
    while (size < n + k) size *= 2;
    const next = new Uint8Array(size);
    next.set(out.subarray(0, n));
    out = next;
  };
  const bits = (k) => {
    while (bitcnt < k) {
      if (pos >= src.length) throw new Error('inflate: unexpected end');
      bitbuf |= src[pos++] << bitcnt;
      bitcnt += 8;
    }
    const v = bitbuf & ((1 << k) - 1);
    bitbuf >>>= k;
    bitcnt -= k;
    return v;
  };
  const decode = (t) => {
    let code = 0, first = 0, index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const count = t.counts[len];
      if (code - count < first) return t.symbols[index + (code - first)];
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw new Error('inflate: bad code');
  };
  let last = 0;
  while (!last) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      bitbuf = 0;
      bitcnt = 0;
      if (pos + 4 > src.length) throw new Error('inflate: unexpected end');
      const len = src[pos] | (src[pos + 1] << 8);
      pos += 4;
      if (pos + len > src.length) throw new Error('inflate: unexpected end');
      need(len);
      out.set(src.subarray(pos, pos + len), n);
      n += len;
      pos += len;
      continue;
    }
    let lt, dt;
    if (type === 1) [lt, dt] = fixedTrees();
    else if (type === 2) {
      const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
      const cl = new Array(19).fill(0);
      for (let i = 0; i < hclen; i++) cl[CLORDER[i]] = bits(3);
      const ct = tree(cl);
      const lens = [];
      while (lens.length < hlit + hdist) {
        const sym = decode(ct);
        if (sym < 16) lens.push(sym);
        else if (sym === 16) {
          if (!lens.length) throw new Error('inflate: bad repeat');
          const prev = lens[lens.length - 1];
          for (let r = 3 + bits(2); r > 0; r--) lens.push(prev);
        } else for (let r = sym === 17 ? 3 + bits(3) : 11 + bits(7); r > 0; r--) lens.push(0);
      }
      lt = tree(lens.slice(0, hlit));
      dt = tree(lens.slice(hlit, hlit + hdist));
    } else throw new Error('inflate: bad block type');
    for (;;) {
      const sym = decode(lt);
      if (sym < 256) {
        need(1);
        out[n++] = sym;
      } else if (sym === 256) break;
      else {
        const i = sym - 257;
        if (i >= 29) throw new Error('inflate: bad length');
        const len = LBASE[i] + bits(LEXT[i]);
        const d = decode(dt);
        if (d >= 30) throw new Error('inflate: bad distance');
        const dist = DBASE[d] + bits(DEXT[d]);
        if (dist > n) throw new Error('inflate: distance too far');
        need(len);
        for (let k = 0; k < len; k++, n++) out[n] = out[n - dist];
      }
    }
  }
  return out.slice(0, n);
}

// ── Deflate (one fixed-Huffman block, LZ77 with hash chains) ───────────────────────────────────────────────────────

/** Bytes → raw DEFLATE bytes. */
export function deflateRaw(input) {
  const src = input instanceof Uint8Array ? input : new Uint8Array(input);
  const out = [];
  let buf = 0, cnt = 0;
  const put = (v, k) => {
    buf |= v << cnt;
    cnt += k;
    while (cnt >= 8) {
      out.push(buf & 255);
      buf >>>= 8;
      cnt -= 8;
    }
  };
  // Huffman codes go most significant bit first: reversed into the LSB-first stream.
  const putCode = (code, k) => {
    let r = 0;
    for (let i = 0; i < k; i++) r |= ((code >> i) & 1) << (k - 1 - i);
    put(r, k);
  };
  const lit = (s) => {
    if (s < 144) putCode(0x30 + s, 8);
    else if (s < 256) putCode(0x190 + s - 144, 9);
    else if (s < 280) putCode(s - 256, 7);
    else putCode(0xc0 + s - 280, 8);
  };
  put(1, 1); // last block
  put(1, 2); // fixed Huffman
  const N = src.length;
  const HASH = 1 << 15, WIN = 32768, CHAIN = 48;
  const head = new Int32Array(HASH).fill(-1);
  const prev = new Int32Array(N || 1);
  const hash = (i) => ((src[i] << 10) ^ (src[i + 1] << 5) ^ src[i + 2]) & (HASH - 1);
  const insert = (i) => {
    if (i + 2 >= N) return;
    const h = hash(i);
    prev[i] = head[h];
    head[h] = i;
  };
  let i = 0;
  while (i < N) {
    let best = 0, bestD = 0;
    if (i + 2 < N) {
      let j = head[hash(i)];
      for (let c = 0; j >= 0 && i - j <= WIN && c < CHAIN; c++, j = prev[j]) {
        let l = 0;
        while (l < 258 && i + l < N && src[j + l] === src[i + l]) l++;
        if (l > best) {
          best = l;
          bestD = i - j;
          if (l === 258) break;
        }
      }
    }
    if (best >= 3) {
      let li = 28;
      while (LBASE[li] > best) li--;
      lit(257 + li);
      if (LEXT[li]) put(best - LBASE[li], LEXT[li]);
      let di = 29;
      while (DBASE[di] > bestD) di--;
      putCode(di, 5);
      if (DEXT[di]) put(bestD - DBASE[di], DEXT[di]);
      for (let k = 0; k < best; k++) insert(i + k);
      i += best;
    } else {
      lit(src[i]);
      insert(i);
      i++;
    }
  }
  lit(256);
  if (cnt) out.push(buf & 255);
  return new Uint8Array(out);
}
