/* تسجيل التطبيق وزر التثبيت */
(function () {
  const $ = id => document.getElementById(id);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e;
    if (!standalone && $('installBtn')) $('installBtn').hidden = false;
  });
  window.addEventListener('appinstalled', () => { deferred = null; if ($('installBtn')) $('installBtn').hidden = true; });
  if ($('installBtn')) $('installBtn').onclick = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) {}
    deferred = null; $('installBtn').hidden = true;
  };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let off = false; try { off = !!localStorage.getItem('ios_hint_off'); } catch (e) {}
  if (ios && !standalone && !off && $('iosHint')) {
    $('iosHint').hidden = false;
    $('iosHintClose').onclick = () => { $('iosHint').hidden = true; try { localStorage.setItem('ios_hint_off', '1'); } catch (e) {} };
  }
})();
