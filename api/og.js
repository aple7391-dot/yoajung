// 레시피 썸네일 내보내기: /og/<키> → 비공개 Blob 저장소의 recipes/<키>.png
// 카카오톡·X 같은 미리보기 봇이 공개 주소로 이미지를 가져갈 수 있게 한다.
const { get } = require('@vercel/blob');

module.exports = async (req, res) => {
  const key = String((req.query && req.query.k) || '').replace(/\.png$/, '');
  if (!/^[0-9a-f]{24}$/.test(key)) { res.statusCode = 404; return res.end(); }
  const r = await get('recipes/' + key + '.png', { access: 'private' }).catch(() => null);
  if (!r || r.statusCode !== 200) { res.statusCode = 302; res.setHeader('Location', '/og.png'); return res.end(); }
  const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
  res.statusCode = 200;
  res.end(buf);
};
