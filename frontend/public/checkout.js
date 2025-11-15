(() => {
  const scripts = document.querySelectorAll('script[src*="checkout.js"]');
  const script = scripts[scripts.length - 1];
  if (!script) return;

  const sessionId = script.getAttribute('data-session-id');
  const origin = script.getAttribute('data-origin') || (window.location.origin + '');
  const containerId = script.getAttribute('data-container-id') || 'turbofy-checkout';
  const container = document.getElementById(containerId) || document.body;

  if (!sessionId) return;

  const iframe = document.createElement('iframe');
  iframe.src = `${origin.replace(/\/$/, '')}/checkout/${sessionId}`;
  iframe.style.width = '100%';
  iframe.style.height = '700px';
  iframe.style.border = '0';
  iframe.setAttribute('allow', 'clipboard-write');
  container.appendChild(iframe);

  window.addEventListener('message', (evt) => {
    if (!evt.data || typeof evt.data !== 'object') return;
    const handlerName = script.getAttribute('data-callback');
    if (handlerName && typeof window[handlerName] === 'function') {
      try { window[handlerName](evt.data); } catch {}
    }
  });
})();
