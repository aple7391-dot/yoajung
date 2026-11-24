// 피드백 받기: 재료 요청·한마디를 운영자 메일(FEEDBACK_TO)로 보낸다.
// 지메일 SMTP + 앱 비밀번호로 보내고(SMTP_USER / SMTP_PASS), 받는 곳은 네이버 메일.
// GET /api/feedback?check=1 → 환경변수가 들어있는지만 알려준다(값은 보여주지 않음).
const nodemailer = require('nodemailer');

const hits = new Map(); // 아주 단순한 도배 방지: IP당 1분에 5통
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}
const LABEL = { ingredient: '재료 추가 요청', message: '한마디' };

module.exports = async (req, res) => {
  const env = { FEEDBACK_TO: !!process.env.FEEDBACK_TO, SMTP_USER: !!process.env.SMTP_USER, SMTP_PASS: !!process.env.SMTP_PASS, BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN, BLOB_STORE_ID: !!process.env.BLOB_STORE_ID };
  if (req.method === 'GET') return res.status(200).json({ ok: env.FEEDBACK_TO && env.SMTP_USER && env.SMTP_PASS, env });
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const type = LABEL[body.type] ? body.type : null;
  const text = String(body.text || '').trim().slice(0, 1000);
  if (!type || !text || body.website) return res.status(400).json({ ok: false });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ ok: false });
  if (!env.SMTP_USER || !env.SMTP_PASS || !env.FEEDBACK_TO) return res.status(503).json({ ok: false, env });

  const o = body.order || {};
  const order = [
    `사이즈: ${o.size ? o.size + '인' : '-'}`,
    `쉘: ${o.shell || '-'}`,
    `토핑: ${Array.isArray(o.toppings) && o.toppings.length ? o.toppings.slice(0, 20).join(', ') : '-'}`,
    `시럽: ${o.syrup || '-'}`,
  ].join('\n');
  const port = Number(process.env.SMTP_PORT) || 465;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS).replace(/\s+/g, '') },
    });
    await transport.sendMail({
      from: `"요아정 주문 체험" <${process.env.SMTP_USER}>`,
      to: process.env.FEEDBACK_TO,
      subject: `[요아정] ${LABEL[type]}: ${text.slice(0, 30)}`,
      text: `${LABEL[type]}\n\n${text}\n\n---\n주문 내용\n${order}\n\n보낸 시각: ${new Date().toISOString()}`,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[feedback] send failed', e && e.message);
    return res.status(502).json({ ok: false });
  }
};
