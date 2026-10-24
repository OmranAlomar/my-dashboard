/* الدخول عبر Firebase Auth + حفظ البيانات في Firestore (REST بلا مكتبات) */
(async () => {
  const C = window.CONFIG || {};
  const $ = id => document.getElementById(id);
  const SK = 'ightanim_session_v1';
  const AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
  const TOKEN = 'https://securetoken.googleapis.com/v1/token';
  const docUrl = uid => `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(C.projectId)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const MSG = {
    INVALID_LOGIN_CREDENTIALS: 'البريد أو كلمة المرور غير صحيحة.',
    EMAIL_NOT_FOUND: 'البريد أو كلمة المرور غير صحيحة.',
    INVALID_PASSWORD: 'البريد أو كلمة المرور غير صحيحة.',
    INVALID_EMAIL: 'صيغة البريد غير صحيحة.',
    USER_DISABLED: 'هذا الحساب معطّل.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'محاولات كثيرة، حاول لاحقاً.'
  };
  let S = null;
  try { S = JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) {}
  const persist = () => { try { S ? localStorage.setItem(SK, JSON.stringify(S)) : localStorage.removeItem(SK); } catch (e) {} };
  function setS(j) {
    S = { idToken: j.idToken || j.id_token, refreshToken: j.refreshToken || j.refresh_token,
      exp: Date.now() + (parseInt(j.expiresIn || j.expires_in, 10) - 60) * 1000,
      uid: j.localId || j.user_id, email: j.email || (S && S.email) || '' };
    persist();
  }
  let refreshing = null;
  async function token() {
    if (!S) return null;
    if (Date.now() < S.exp) return S.idToken;
    if (!refreshing) refreshing = (async () => {
      try {
        const r = await fetch(`${TOKEN}?key=${encodeURIComponent(C.apiKey)}`, { method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(S.refreshToken) });
        const j = await r.json();
        if (!r.ok) throw new Error('refresh');
        setS(j); return S.idToken;
      } catch (e) { S = null; persist(); return null; }
      finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function load() {
    const t = await token();
    if (!t) return { ok: false, status: 401 };
    const r = await fetch(docUrl(S.uid), { headers: { Authorization: 'Bearer ' + t } });
    if (r.status === 404) return { ok: true, mem: {} };
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    let mem = {};
    try { mem = JSON.parse(((j.fields || {}).mem || {}).stringValue || '{}'); } catch (e) {}
    return { ok: true, mem };
  }
  window.cloud = {
    async save(mem, keep) {
      const t = await token();
      if (!t) return { ok: false, status: 401 };
      const body = JSON.stringify({ fields: { mem: { stringValue: JSON.stringify(mem) } } });
      const r = await fetch(docUrl(S.uid) + '?updateMask.fieldPaths=mem', { method: 'PATCH',
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body, keepalive: !!keep && body.length < 60000 });
      return { ok: r.ok, status: r.status };
    },
    async logout() { S = null; persist(); }
  };

  function showLogin(msg) {
    $('auth').hidden = false;
    $('authErr').textContent = msg || '';
    $('authForm').onsubmit = async e => {
      e.preventDefault();
      $('authErr').textContent = '';
      $('authSubmit').disabled = true;
      try {
        const r = await fetch(`${AUTH}?key=${encodeURIComponent(C.apiKey)}`, { method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: $('au').value.trim(), password: $('ap').value, returnSecureToken: true }) });
        const j = await r.json();
        if (!r.ok) {
          const code = ((j.error || {}).message || '').split(' ')[0];
          throw new Error(MSG[code] || ('تعذّر الدخول (' + code + ')'));
        }
        setS(j); location.reload();
      } catch (err) {
        $('authErr').textContent = err instanceof TypeError ? 'تعذّر الاتصال بالإنترنت.' : err.message;
      }
      $('authSubmit').disabled = false;
    };
  }

  if (!C.apiKey || !C.projectId || /ضع_|YOUR/.test(C.apiKey + C.projectId)) {
    showLogin('أكمل ملف config.js أولاً (apiKey و projectId من إعدادات Firebase).');
    return;
  }
  if (!S) { showLogin(); return; }
  try {
    const d = await load();
    if (d.ok) { $('appRoot').hidden = false; window.startApp(d.mem, S.email || S.uid); }
    else if (d.status === 401 || !S) showLogin();
    else if (d.status === 403) showLogin('لا صلاحية: أضف بريدك في قواعد Firestore (ملف firestore.rules).');
    else showLogin('تعذّر تحميل بياناتك (' + d.status + '). تأكد من إنشاء قاعدة Firestore ونشر القواعد.');
  } catch (e) { showLogin('تعذّر الاتصال بالإنترنت.'); }
})();
