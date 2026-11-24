// 레시피 공유 링크: /r/<코드> → 이 함수.
// 카카오톡·인스타 같은 미리보기 봇에는 그 레시피 썸네일을 OG 이미지로 주고,
// 사람은 바로 /?r=<코드> 레시피 화면으로 넘어간다.
const { head } = require('@vercel/blob');
const { pathFor, keyFor, CODE_RE } = require('./recipe');

const SITE = 'https://yoajung-ten.vercel.app';
const TITLE = '요거트 아이스크림 만들기';
const DESC = '나만의 아이스크림 레시피를 만들어보세요';

module.exports = async (req, res) => {
  const code = String((req.query && req.query.c) || '');
  if (!CODE_RE.test(code)) { res.statusCode = 302; res.setHeader('Location', SITE + '/'); return res.end(); }
  let image = null;
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const found = await head(pathFor(code)).catch(() => null);
    if (found) image = SITE + '/og/' + keyFor(code);
  }
  const target = '/?r=' + code;
  const og = image || SITE + '/og.png';
  const html = '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + TITLE + '</title>' +
    '<meta name="description" content="' + DESC + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + TITLE + '">' +
    '<meta property="og:description" content="' + DESC + '">' +
    '<meta property="og:url" content="' + SITE + '/r/' + code + '">' +
    '<meta property="og:image" content="' + og + '">' +
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="' + og + '">' +
    '<meta http-equiv="refresh" content="0;url=' + target + '">' +
    '<script>location.replace(' + JSON.stringify(target) + ')</script>' +
    '</head><body><a href="' + target + '">레시피 보기</a></body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 썸네일이 아직 없으면 캐시하지 않아서, 올라간 뒤 다시 긁을 때 바로 반영
  res.setHeader('Cache-Control', image ? 'public, s-maxage=86400' : 'no-store');
  res.statusCode = 200;
  res.end(html);
};
