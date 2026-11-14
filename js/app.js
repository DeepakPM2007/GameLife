/* ================================================================
   js/app.js — Boot and hash router for ARISE
   Imports screen renderers; each renderer receives (container, state).
   ================================================================ */

import { loadState, saveState, ensureTodayEntry } from './store.js';
import { renderStatus  } from './ui/status.js';
import { renderQuests  } from './ui/quests.js';
import { renderTrain   } from './ui/train.js';
import { renderStudy   } from './ui/study.js';
import { renderSpirit  } from './ui/spirit.js';

/* ── Service Worker registration ────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(err => console.warn('[ARISE] SW registration failed:', err));
  });
}

/* ── App-wide mutable state ─────────────────────────────────────── */
// All screens read and mutate this single object.
// Call persist() after any mutation.
export let state = null;

/** Persist current state to localStorage. */
export function persist() {
  saveState(state);
}

/* ── Valid tab names ────────────────────────────────────────────── */
const TABS = ['status', 'quests', 'train', 'study', 'spirit'];

/* ── Boot ───────────────────────────────────────────────────────── */
function boot() {
  // Load (or create fresh) state
  state = loadState();

  // Ensure today's day entry exists before anything renders
  ensureTodayEntry(state);
  persist();

  // Wire nav buttons and browser back/forward
  setupRouter();

  // Navigate to current hash or fall back to #status
  navigate(location.hash || '#status');
}

/* ── Router ─────────────────────────────────────────────────────── */
function setupRouter() {
  // Nav button clicks
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate('#' + btn.dataset.tab));
  });

  // Browser back / forward
  window.addEventListener('popstate', () => {
    navigate(location.hash || '#status');
  });
}

/**
 * Navigate to a tab by hash string (e.g. "#quests").
 * Updates history, active nav highlight, and renders the screen.
 * @param {string} hash
 */
export function navigate(hash) {
  const raw = hash.replace('#', '').toLowerCase();
  const tab = TABS.includes(raw) ? raw : 'status';

  // Push to browser history (avoid duplicate entries)
  if (location.hash !== '#' + tab) {
    history.pushState(null, '', '#' + tab);
  }

  // Sync nav button active state + aria-current
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  // Render into the main content area
  const content = document.getElementById('screen-content');
  content.scrollTop = 0; // scroll to top on each tab switch

  switch (tab) {
    case 'status':  renderStatus(content, state);  break;
    case 'quests':  renderQuests(content, state);  break;
    case 'train':   renderTrain(content, state);   break;
    case 'study':   renderStudy(content, state);   break;
    case 'spirit':  renderSpirit(content, state);  break;
  }
}

/* ── Start after DOM is ready ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', boot);
