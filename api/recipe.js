// 레시피 썸네일 올리기: 브라우저가 그린 1200×630 PNG를 Vercel Blob에 저장한다.
// POST /api/recipe?c=<레시피 코드>  (본문: PNG 바이너리)
// 저장 위치는 코드의 해시로 정해져서, /r/<코드> 페이지가 같은 이미지를 OG로 쓴다.
const crypto = require('crypto');
const { put, head } = require('@vercel/blob');

const CODE_RE = /^[A-Za-z0-9_-]{8,800}$/;
const MAX = 2 * 1024 * 1024;

function readBody(req) {
  return new Promise((ok, no) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > MAX) { no(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', no);
  });
}
function pathFor(code) { return 'recipes/' + crypto.createHash('sha256').update(code).digest('hex').slice(0, 24) + '.png'; }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) return res.status(503).json({ ok: false, reason: 'no-blob' });
  const code = String((req.query && req.query.c) || '');
  if (!CODE_RE.test(code)) return res.status(400).json({ ok: false });
  const pathname = pathFor(code);
  try {
    const found = await head(pathname).catch(() => null);
    if (found) return res.status(200).json({ ok: true, url: found.url, cached: true });
    const buf = await readBody(req);
    const png = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (!png) return res.status(400).json({ ok: false });
    const blob = await put(pathname, buf, { access: 'public', contentType: 'image/png', addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    return res.status(200).json({ ok: true, url: blob.url });
  } catch (e) {
    console.error('recipe blob error', e && e.message);
    return res.status(500).json({ ok: false, reason: String((e && e.name) || '') + ': ' + String((e && e.message) || '').slice(0, 160) });
  }
};
module.exports.pathFor = pathFor;
module.exports.CODE_RE = CODE_RE;
