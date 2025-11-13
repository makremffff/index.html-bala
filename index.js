// /index.js
(function () {
  // تهيئة التليجرام
  window.Telegram.WebApp.ready();
  const initData = window.Telegram.WebApp.initDataUnsafe;
  if (!initData?.user) {
    document.body.innerHTML = `<h2 style="text-align:center;margin-top:40px">Please open this mini-app from Telegram.</h2>`;
    return;
  }
  const user = initData.user;
  const BOT_USERNAME = process.env.BOT_USERNAME || 'Game_win_usdtBot';

  // متغيرات الحالة
  let points = 0, usdt = 0, referrals = 0, counter = 15, cooldown = 0;
  const LS_KEY = `st_${user.id}`;

  // دالة موحدة للـAPI
  async function api(action, params = {}) {
    const res = await fetch(`/api.js?action=${action}&userID=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  }

  // تحميل الحالة من التخزين المحلي
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      counter = s.counter ?? 15;
      cooldown = s.cooldown ?? 0;
    } catch {}
  }
  function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify({ counter, cooldown }));
  }

  // تسجيل المستخدم
  async function registerUser() {
    const ref = new URLSearchParams(window.location.search).get('startapp')?.replace('ref_', '') || null;
    await api('registerUser', {
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
      photoURL: user.photo_url || '',
      ref
    });
  }

  // تحميل البيانات
  async function loadProfile() {
    const { data } = await api('getProfile');
    points = data.points;
    usdt = parseFloat(data.usdt);
    referrals = data.referrals;
    render();
  }

  // عرض البيانات
  function render() {
    document.getElementById('pointsVal').textContent = points.toLocaleString();
    document.getElementById('usdtVal').textContent = usdt.toFixed(2);
    document.getElementById('refCount').textContent = referrals;
    document.getElementById('watchBadge').textContent = cooldown > 0 ? fmtMMSS(cooldown) : counter;
  }

  // زر Watch
  document.getElementById('watchBtn').addEventListener('click', async () => {
    if (cooldown > 0) return;
    if (counter <= 0) {
      cooldown = 3600;
      saveState();
      startCooldown();
      return;
    }
    const { success, data } = await api('watchAd');
    if (success) {
      points = data.points;
      counter--;
      saveState();
      render();
    }
  });

  // زر Copy
  document.getElementById('copyBtn').addEventListener('click', () => {
    const link = `https://t.me/${BOT_USERNAME}/earn?startapp=ref_${user.id}`;
    navigator.clipboard.writeText(link).then(() => alert('Referral link copied!'));
  });

  // عداد التبريد
  function startCooldown() {
    const iv = setInterval(() => {
      cooldown = Math.max(0, cooldown - 1);
      saveState();
      render();
      if (cooldown === 0) {
        clearInterval(iv);
        counter = 15;
        saveState();
      }
    }, 1000);
  }

  // تنسيق الوقت
  function fmtMMSS(s) {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // تهيئة أولية
  (async () => {
    loadState();
    await registerUser();
    await loadProfile();
    if (cooldown > 0) startCooldown();
  })();
})();
