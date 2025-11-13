// /api.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { SUPABASE_URL, SUPABASE_ANON_KEY, BOT_USERNAME } = process.env;
  const url = (action) => `${SUPABASE_URL}/rest/v1/${action}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const send = (ok, msg, data = null) => res.json({ success: ok, message: msg, data });

  const { action, userID } = req.query;
  const body = req.body;

  // دالة جلب لاعب
  const getPlayer = async (id) => {
    const r = await fetch(`${url('players')}?user_id=eq.${id}`, { headers });
    return r.ok ? (await r.json())[0] : null;
  };

  // دالة إنشاء لاعب
  const createPlayer = async (id, extra = {}) => {
    const payload = { user_id: String(id), points: 0, usdt: 0, referrals: 0, ...extra };
    await fetch(url('players'), { method: 'POST', headers, body: JSON.stringify(payload) });
    return payload;
  };

  // دالة تحديث لاعب
  const updatePlayer = async (id, delta) => {
    const p = await getPlayer(id);
    if (!p) return;
    const payload = {
      points: p.points + (delta.points || 0),
      usdt: parseFloat(p.usdt) + (delta.usdt || 0),
      referrals: p.referrals + (delta.referrals || 0)
    };
    await fetch(`${url('players')}?user_id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    });
    return { ...p, ...payload };
  };

  // الأكشنات
  if (action === 'registerUser') {
    const exists = await getPlayer(userID);
    if (exists) return send(true, 'Already registered', exists);
    const { ref, firstName, lastName, username, photoURL } = body;
    const newbie = await createPlayer(userID, { invited_by: ref || null });
    if (ref && ref !== userID) {
      await updatePlayer(ref, { points: 2500, referrals: 1 });
    }
    return send(true, 'Registered', newbie);
  }

  if (action === 'getProfile') {
    const p = await getPlayer(userID);
    if (!p) return send(false, 'Not found');
    return send(true, 'OK', p);
  }

  if (action === 'watchAd') {
    const p = await updatePlayer(userID, { points: 1000 });
    return send(true, 'Rewarded', p);
  }

  return send(false, 'Unknown action');
}
