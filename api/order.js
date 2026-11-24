// 주문 번호: 결제하기까지 눌러 결과를 본 사람 순서대로 1, 2, 3 …
// POST /api/order → { ok: true, n: 123 }
// Vercel Blob의 counters/orders.json 하나를 ETag 조건부 쓰기(ifMatch)로 올려서, 동시에 눌러도 번호가 겹치지 않게 한다.
const { get, put, BlobPreconditionFailedError } = require('@vercel/blob');

const PATH = 'counters/orders.json';
const HITS = new Map();               // 같은 IP 연타 막기 (함수 인스턴스 단위, 분당 20회)

function limited(ip) {
  const now = Date.now(), list = (HITS.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); HITS.set(ip, list);
  return list.length > 20;
}
async function readCount() {
  const r = await get(PATH, { access: 'public', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200) return { n: 0, etag: null };
  const text = await new Response(r.stream).text();
  let n = 0; try { n = Math.max(0, parseInt(JSON.parse(text).n, 10) || 0); } catch (e) {}
  return { n, etag: r.blob.etag || null };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ ok: false, reason: 'no-blob' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ ok: false });
  for (let i = 0; i < 8; i++) {
    try {
      const cur = await readCount();
      const next = cur.n + 1;
      const opts = { access: 'public', contentType: 'application/json', addRandomSuffix: false, cacheControlMaxAge: 60 };
      if (cur.etag) { opts.allowOverwrite = true; opts.ifMatch = cur.etag; } else { opts.allowOverwrite = false; }
      await put(PATH, JSON.stringify({ n: next }), opts);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, n: next });
    } catch (e) {
      // 다른 사람이 먼저 올렸으면(ETag 불일치·이미 있음) 잠깐 쉬고 다시
      const conflict = e instanceof BlobPreconditionFailedError || /exist|precondition|412|409/i.test(String(e && e.message));
      if (!conflict) return res.status(500).json({ ok: false });
      await new Promise((ok) => setTimeout(ok, 40 + Math.random() * 120));
    }
  }
  return res.status(503).json({ ok: false, reason: 'busy' });
};
