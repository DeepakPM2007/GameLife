/* ================================================================
   js/ui/components.js — Reusable UI helpers
   Modal, Toast, Progress Bar, XP float-up, Vibrate/Beep.
   No external deps. All DOM, no framework.
   ================================================================ */

/* ── Modal ──────────────────────────────────────────────────────── */

/**
 * Display the global modal dialog.
 *
 * @param {object}  config
 * @param {string}  config.title      – System label shown in header
 * @param {string}  config.body       – Inner HTML for the body section
 * @param {Array}   config.buttons    – [{label, type, action, onClick}]
 *   type    → CSS modifier: 'primary' | 'danger' | 'gold' | ''
 *   action  → unique string used as data-action selector
 *   onClick → function called when button is tapped
 * @param {boolean} config.closeable  – Show ✕ button & click-outside (default true)
 */
export function showModal({ title = '', body = '', buttons = [], closeable = true } = {}) {
  const overlay = document.getElementById('modal-overlay');
  const box     = document.getElementById('modal-box');

  const closeBtn = closeable
    ? `<button class="btn btn-icon" id="modal-close-x" aria-label="Close">✕</button>`
    : '';

  const footerHTML = buttons.length
    ? `<div class="modal-footer">
        ${buttons.map(b =>
          `<button class="btn btn-${b.type || 'primary'}" data-action="${b.action || ''}">${b.label}</button>`
        ).join('')}
       </div>`
    : '';

  box.innerHTML = `
    <div class="modal-header">
      <span class="modal-title" id="modal-title-text">${title}</span>
      ${closeBtn}
    </div>
    <div class="modal-body">${body}</div>
    ${footerHTML}
  `;

  overlay.classList.remove('hidden');

  // Wire close button
  if (closeable) {
    box.querySelector('#modal-close-x')
       ?.addEventListener('click', closeModal);

    // Click outside the box → close (once only)
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    }, { once: true });
  }

  // Wire footer button callbacks
  buttons.forEach(b => {
    if (!b.action || !b.onClick) return;
    box.querySelector(`[data-action="${b.action}"]`)
       ?.addEventListener('click', b.onClick);
  });
}

/** Hide the modal. */
export function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ── Toast ──────────────────────────────────────────────────────── */

/**
 * Show a brief notification toast at the top of the screen.
 *
 * @param {string} message
 * @param {'info'|'success'|'error'|'gold'} type  – controls border/glow colour
 * @param {number} duration – visible time in ms (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  // Set the CSS variable used by the toastOut animation delay
  const fadeMs = 300;
  const delay  = Math.max(0, duration - fadeMs);
  toast.style.setProperty('--toast-delay', delay + 'ms');

  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration + 50);
}

/* ── Progress Bar ───────────────────────────────────────────────── */

/**
 * Create a progress bar inside `container` and return the .bar-wrap element.
 * If a .bar-wrap already exists inside container it is reused (update mode).
 *
 * @param {HTMLElement} container
 * @param {number}  value
 * @param {number}  max
 * @param {string}  colorClass – 'int' | 'skl' | 'str' | 'spi' | 'stamina' | ''
 * @param {string}  sizeClass  – '' | 'bar-lg' | 'bar-xl'
 * @returns {HTMLElement} the .bar-wrap element
 */
export function createProgressBar(container, value, max, colorClass = '', sizeClass = '') {
  let wrap = container.querySelector('.bar-wrap');

  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = `bar-wrap ${sizeClass}`.trim();
    const fill = document.createElement('div');
    fill.className = `bar-fill ${colorClass}`.trim();
    fill.style.width = '0%'; // start at 0 for CSS transition
    wrap.appendChild(fill);
    container.appendChild(wrap);
  }

  // Animate to target percentage on next frame so the transition fires
  const pct = max > 0 ? Math.min(100, (value / max) * 100).toFixed(2) : 0;
  requestAnimationFrame(() => {
    const fill = wrap.querySelector('.bar-fill');
    if (fill) fill.style.width = pct + '%';
  });

  return wrap;
}

/**
 * Update an existing .bar-wrap's fill percentage.
 * @param {HTMLElement} wrap
 * @param {number} value
 * @param {number} max
 */
export function updateProgressBar(wrap, value, max) {
  const pct  = max > 0 ? Math.min(100, (value / max) * 100).toFixed(2) : 0;
  const fill = wrap.querySelector('.bar-fill');
  if (fill) {
    requestAnimationFrame(() => { fill.style.width = pct + '%'; });
  }
}

/* ── XP Float-up Number ─────────────────────────────────────────── */

/**
 * Shows a "+80 XP" number that floats up from the anchor element.
 * @param {HTMLElement} anchor – element to position near
 * @param {string}      text   – e.g. '+80 XP'
 */
export function showXpFloat(anchor, text) {
  const rect = anchor.getBoundingClientRect();
  const el   = document.createElement('div');
  el.className   = 'xp-float';
  el.textContent = text;
  // Centre horizontally over the anchor
  el.style.left = (rect.left + rect.width / 2) + 'px';
  el.style.top  = rect.top + 'px';
  document.body.appendChild(el);
  // Remove after animation ends (~1.2 s)
  setTimeout(() => el.remove(), 1300);
}

/* ── Vibration ──────────────────────────────────────────────────── */

/**
 * Trigger device vibration (no-op if unsupported or denied).
 * @param {number|number[]} pattern – ms or [on, off, on] pattern
 */
export function vibrate(pattern = 30) {
  try { navigator.vibrate?.(pattern); } catch (_) {}
}

/* ── WebAudio Beep ──────────────────────────────────────────────── */

/**
 * Play a short synthesised tone. No audio files needed.
 * @param {number} freq     – Hz (default 440)
 * @param {number} duration – seconds (default 0.1)
 * @param {string} type     – OscillatorType (default 'square')
 */
export function playBeep(freq = 440, duration = 0.1, type = 'square') {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.01);
  } catch (_) { /* audio blocked or unavailable */ }
}

/* ── Level-Up Modal ─────────────────────────────────────────────── */

/**
 * Show the full-screen LEVEL UP celebration modal.
 * @param {string} pillar   – 'college' | 'skill' | 'physical' | 'spirit'
 * @param {number} newLevel
 */
export function showLevelUp(pillar, newLevel) {
  const COLOR_MAP = {
    college:  'var(--col-int)',
    skill:    'var(--col-skl)',
    physical: 'var(--col-str)',
    spirit:   'var(--col-spi)',
  };
  const PILLAR_LABEL = {
    college:  'INT', skill: 'SKL', physical: 'STR', spirit: 'SPI',
  };

  const color = COLOR_MAP[pillar] || 'var(--glow)';
  const stat  = PILLAR_LABEL[pillar] || pillar.toUpperCase();

  showModal({
    title: '[SYSTEM] LEVEL UP',
    body: `
      <div style="text-align:center; padding:10px 0;">
        <div style="font-family:'Orbitron',monospace; font-size:2.5rem;
                    font-weight:900; color:${color};
                    text-shadow:0 0 24px ${color};
                    letter-spacing:0.1em; margin-bottom:8px;">
          LEVEL UP
        </div>
        <div style="font-size:0.85rem; color:var(--muted); margin-bottom:16px;">
          ${stat} has reached
        </div>
        <div style="font-family:'Orbitron',monospace; font-size:3rem;
                    color:${color}; font-weight:900;">
          ${newLevel}
        </div>
      </div>
    `,
    buttons: [{ label: 'RISE', type: 'primary', action: 'level-up-ok', onClick: closeModal }],
    closeable: false,
  });

  vibrate([50, 30, 100]);
}
