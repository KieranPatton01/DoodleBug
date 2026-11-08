/**
 * Doodlebug Responsive Iframe Auto-Resizer
 * Ensures the sandboxed canvas.html is always perfectly fitted without double scrollbars.
 */
(function () {
  const iframe = document.getElementById('doodle-stage');
  const loader = document.getElementById('stage-loader');
  const refreshBtn = document.getElementById('refresh-canvas');
  const updatedBadge = document.getElementById('last-updated');

  if (!iframe) return;

  const MIN_HEIGHT = 400;

  function setHeight(newHeight) {
    if (!newHeight || isNaN(newHeight)) return;
    const targetHeight = Math.max(MIN_HEIGHT, Math.ceil(newHeight));
    iframe.style.height = `${targetHeight}px`;
    if (loader) loader.classList.add('opacity-0');
  }

  // Strategy 1: PostMessage protocol from sandboxed iframe
  window.addEventListener('message', (event) => {
    // Only accept resize events dispatched from our own iframe
    if (event.source !== iframe.contentWindow) return;

    // Canvas can send either { type: 'doodle-resize', height: ... } or { height: ... }
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'doodle-resize' && typeof event.data.height === 'number') {
        setHeight(event.data.height);
      } else if (typeof event.data.canvasHeight === 'number') {
        setHeight(event.data.canvasHeight);
      }
    }
  });

  // Strategy 2: Direct same-origin document inspection (if same domain and unsandboxed)
  function measureSameOrigin() {
    try {
      if (!iframe.contentDocument && !iframe.contentWindow) return;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc || !doc.body) return;

      const bodyHeight = doc.body.scrollHeight;
      const docHeight = doc.documentElement ? doc.documentElement.scrollHeight : 0;
      const height = Math.max(bodyHeight, docHeight);

      if (height > 50) {
        setHeight(height + 16); // padding buffer
      }
    } catch (e) {
      // Sandboxed or cross-origin fallback relies exclusively on postMessage Strategy 1
    }
  }

  iframe.addEventListener('load', () => {
    measureSameOrigin();
    setTimeout(measureSameOrigin, 300);
    setTimeout(measureSameOrigin, 1000);
    if (loader) loader.classList.add('opacity-0');
    if (updatedBadge) {
      const now = new Date();
      updatedBadge.textContent = `Synced: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  });

  // Manual refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (loader) loader.classList.remove('opacity-0');
      const url = new URL(iframe.src, window.location.href);
      url.searchParams.set('_t', Date.now().toString());
      iframe.src = url.toString();
    });
  }

  // Limited fallback check in case fonts or images load late (stops after 10 seconds)
  let pollCount = 0;
  const pollTimer = setInterval(() => {
    pollCount++;
    measureSameOrigin();
    if (pollCount >= 4) {
      clearInterval(pollTimer);
    }
  }, 2500);
})();
