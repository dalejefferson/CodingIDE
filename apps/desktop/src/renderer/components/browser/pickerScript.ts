/** Prefix used to identify picker messages in console output */
export const PICKER_MSG_PREFIX = '__ELEMENT_PICKER__:'

/** Attributes worth surfacing in the picker payload */
export const INTERESTING_ATTRS = ['href', 'src', 'type', 'role', 'aria-label', 'data-testid', 'name']

/**
 * Content script injected into the webview when picker mode is active.
 * Highlights elements on hover and console.logs payload on click.
 */
export const PICKER_SCRIPT = `
(function() {
  if (window.__elementPickerActive) return;
  window.__elementPickerActive = true;

  const overlay = document.createElement('div');
  overlay.id = '__picker-overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #4f8cff;background:rgba(79,140,255,0.12);transition:all 0.08s ease;display:none;';
  document.body.appendChild(overlay);

  function updateOverlay(el) {
    if (!el) { overlay.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = r.top + 'px';
    overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  }

  function onMouseMove(e) {
    updateOverlay(e.target);
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;

    const INTERESTING = ${JSON.stringify(INTERESTING_ATTRS)};
    const attrs = {};
    for (const name of INTERESTING) {
      if (el.hasAttribute && el.hasAttribute(name)) attrs[name] = el.getAttribute(name);
    }

    const payload = {
      tag: el.tagName ? el.tagName.toLowerCase() : 'unknown',
      id: el.id || null,
      classes: el.classList ? Array.from(el.classList) : [],
      innerText: (el.innerText || '').slice(0, 500),
      attributes: attrs,
    };

    console.log('${PICKER_MSG_PREFIX}' + JSON.stringify(payload));
  }

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);

  window.__elementPickerCleanup = function() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    window.__elementPickerActive = false;
    delete window.__elementPickerCleanup;
  };
})();
`

export const PICKER_CLEANUP_SCRIPT = `
  if (window.__elementPickerCleanup) window.__elementPickerCleanup();
`
