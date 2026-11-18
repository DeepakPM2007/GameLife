/* ================================================================
   js/ui/study.js — Phase 2: Focus Timer + Study Interface
   Wall-clock timer (accurate even when throttled).
   Sub-tabs: College (focus + exams) | Skill (focus).
   ================================================================ */

import { logFocusMinutes, FOCUS_THRESH } from '../engine.js';
import { showToast, showLevelUp, vibrate } from './components.js';
import { getToday } from '../store.js';

/* ── Module-level timer state (NOT persisted to localStorage) ────── */
// Using wall-clock _startAt so the timer is accurate even when the
// browser throttles setInterval on background tabs.
let timer = {
  active:   false,
  paused:   false,
  seconds:  0,
  pillar:   'college',
  _int:     null,    // internal counter interval handle
  _startAt: 0,       // Date.now() when timer (re)started
};

let activeSubTab    = 'college'; // current sub-tab
let displayInterval = null;      // DOM refresh interval — cleared on re-render

/* ── Helpers ─────────────────────────────────────────────────────── */
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ── Focus progress summary row ──────────────────────────────────── */
function focusSummaryRow(pillar, mins) {
  const thresh = FOCUS_THRESH[pillar] ?? {};
  const max    = thresh.elite  ?? 180;
  const pct    = Math.min(100, Math.round((mins / max) * 100));
  const labels = { college: 'INT · College', skill: 'SKL · Skill' };
  const colors = { college: 'var(--col-int)', skill: 'var(--col-skl)' };

  return `
  <div class="study-summary-row">
    <span class="text-xs" style="color:${colors[pillar]}">${labels[pillar]}</span>
    <div class="study-mini-bar">
      <div class="study-mini-fill" style="width:${pct}%;background:${colors[pillar]}"></div>
    </div>
    <span class="mono text-xs" style="color:${colors[pillar]}">${mins} min</span>
  </div>`;
}

/* ── Exam management (College sub-tab) ───────────────────────────── */
function collegeContent(appState) {
  const exams = appState.exams ?? [];
  const today = getToday();

  const rows = exams.map(e => {
    const diff = Math.ceil((new Date(e.date) - new Date(today)) / 86400000);
    const urgent = diff >= 0 && diff <= 14;
    return `
    <div class="stat-row exam-item">
      <div class="exam-info">
        <span class="exam-name">${e.label || e.subject}</span>
        <span class="exam-date muted text-xs">${e.date}</span>
      </div>
      <span class="exam-countdown ${urgent ? 'urgent' : 'muted'} text-xs">
        ${diff < 0 ? 'Past' : diff === 0 ? 'TODAY' : diff + 'd'}
        ${urgent && diff >= 0 ? '🔥' : ''}
      </span>
      <button class="btn btn-icon" data-del-exam="${e.id}" aria-label="Remove exam">✕</button>
    </div>`;
  }).join('') || '<p class="muted text-xs" style="margin:8px 0">No exams added. Add one below.</p>';

  return `
  <div class="panel" style="margin-top:12px">
    <div class="section-title">Exam Raids <span class="muted text-xs">(${exams.length})</span></div>
    ${rows}
    <div class="add-exam-form">
      <input class="text-input" id="exam-subject" placeholder="Subject / exam name" maxlength="40" autocomplete="off">
      <input class="text-input" id="exam-date" type="date">
      <button class="btn btn-primary btn-full" id="btn-add-exam">+ Add Exam Raid</button>
    </div>
  </div>`;
}

/* ── Skill sub-tab content ───────────────────────────────────────── */
function skillContent() {
  return `
  <div class="panel" style="margin-top:12px">
    <div class="section-title">Skill Tree</div>
    <p class="muted text-xs">DSA · Projects · AI — Skill tree coming in Phase 3.</p>
    <p class="muted text-xs" style="margin-top:8px">Use the Focus Timer above to log Skill focus time.</p>
  </div>`;
}

/* ================================================================
   Main render function
   ================================================================ */
export function renderStudy(container, appState, ctx) {
  // Always clear the display interval before re-rendering to avoid leaks
  if (displayInterval) { clearInterval(displayInterval); displayInterval = null; }

  const today   = getToday();
  const dayData = appState.days[today] ?? {};
  const focusMin = dayData.focusMin ?? { college: 0, skill: 0 };

  const isRunning = timer.active && !timer.paused;
  const isPaused  = timer.active && timer.paused;

  container.innerHTML = `
    <div class="system-label">[SYSTEM] STUDY INTERFACE</div>

    <!-- Sub-tab selector -->
    <div class="study-tabs">
      <button class="study-tab ${activeSubTab === 'college' ? 'active active-int' : ''}" data-subtab="college">INT · College</button>
      <button class="study-tab ${activeSubTab === 'skill'   ? 'active active-skl' : ''}" data-subtab="skill">SKL · Skill</button>
    </div>

    <!-- Focus Timer panel (always visible) -->
    <div class="panel panel-cut">
      <div class="system-label">[FOCUS TIMER]</div>

      <!-- Pillar selector (locked while running) -->
      <div class="timer-pillar-row">
        <button class="timer-pillar-btn ${timer.pillar === 'college' ? 'active-int' : ''}"
          data-tp="college" ${timer.active ? 'disabled' : ''}>College</button>
        <button class="timer-pillar-btn ${timer.pillar === 'skill' ? 'active-skl' : ''}"
          data-tp="skill" ${timer.active ? 'disabled' : ''}>Skill</button>
      </div>

      <!-- Big time display -->
      <div class="timer-display" id="timer-display">${formatTime(timer.seconds)}</div>

      <!-- Status line -->
      <p class="muted text-xs text-center" id="timer-status" style="margin:4px 0 12px">
        ${isRunning ? `[SYSTEM] Focusing — ${timer.pillar.toUpperCase()}` :
          isPaused  ? '⏸ Paused — tap RESUME to continue' :
                      'Select pillar and press START'}
      </p>

      <!-- Controls -->
      <div class="timer-controls">
        ${!timer.active
          ? `<button class="btn btn-primary btn-full" id="timer-start">▶ START</button>`
          : `<button class="btn" id="timer-pause" style="flex:1">${isPaused ? '▶ RESUME' : '⏸ PAUSE'}</button>
             <button class="btn btn-gold"  id="timer-stop"  style="flex:1">⬛ LOG</button>`
        }
      </div>
    </div>

    <!-- Today's focus summary -->
    <div class="panel">
      <div class="section-title">Today's Focus</div>
      ${focusSummaryRow('college', focusMin.college ?? 0)}
      ${focusSummaryRow('skill',   focusMin.skill   ?? 0)}
    </div>

    <!-- Sub-tab content -->
    ${activeSubTab === 'college' ? collegeContent(appState) : skillContent()}
  `;

  wireStudyEvents(container, appState, ctx);

  // If timer is running, restart the display refresh interval
  if (isRunning) {
    _startDisplayInterval(container);
  }
}

/* ================================================================
   Timer display interval (only updates #timer-display DOM element)
   ================================================================ */
function _startDisplayInterval(container) {
  if (displayInterval) clearInterval(displayInterval);
  displayInterval = setInterval(() => {
    const el = container.querySelector('#timer-display');
    if (!el) {
      // Container was replaced — stop the interval
      clearInterval(displayInterval);
      displayInterval = null;
      return;
    }
    el.textContent = formatTime(timer.seconds);
  }, 500);
}

/* ================================================================
   Event wiring
   ================================================================ */
function wireStudyEvents(container, appState, ctx) {
  const refresh = () => renderStudy(container, appState, ctx);

  /* Sub-tab switching */
  container.querySelectorAll('[data-subtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSubTab = btn.dataset.subtab;
      refresh();
    });
  });

  /* Pillar selector (only when timer is idle) */
  container.querySelectorAll('[data-tp]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!timer.active) {
        timer.pillar = btn.dataset.tp;
        // Also switch sub-tab to match
        activeSubTab = timer.pillar;
        refresh();
      }
    });
  });

  /* ── START ─────────────────────────────────────────────────────── */
  container.querySelector('#timer-start')?.addEventListener('click', () => {
    if (timer.active) return;
    timer.active   = true;
    timer.paused   = false;
    timer._startAt = Date.now() - (timer.seconds * 1000);

    // Count interval — updates timer.seconds from wall-clock
    if (timer._int) clearInterval(timer._int);
    timer._int = setInterval(() => {
      if (!timer.paused) {
        timer.seconds = Math.floor((Date.now() - timer._startAt) / 1000);
      }
    }, 500);

    _startDisplayInterval(container);
    // Update controls without full re-render
    refresh();
  });

  /* ── PAUSE / RESUME ────────────────────────────────────────────── */
  container.querySelector('#timer-pause')?.addEventListener('click', () => {
    if (!timer.active) return;
    if (timer.paused) {
      // Resume: recalculate _startAt so elapsed time is preserved
      timer._startAt = Date.now() - (timer.seconds * 1000);
      timer.paused   = false;
      _startDisplayInterval(container);
    } else {
      timer.paused = true;
      if (displayInterval) { clearInterval(displayInterval); displayInterval = null; }
    }
    refresh();
  });

  /* ── STOP & LOG ────────────────────────────────────────────────── */
  container.querySelector('#timer-stop')?.addEventListener('click', () => {
    // Stop all intervals
    if (timer._int)       { clearInterval(timer._int);       timer._int = null; }
    if (displayInterval)  { clearInterval(displayInterval);  displayInterval = null; }

    const minutes = Math.floor(timer.seconds / 60);
    const pillar  = timer.pillar;

    // Reset timer state (keep same pillar for convenience)
    timer = { active: false, paused: false, seconds: 0, pillar, _int: null, _startAt: 0 };

    if (minutes > 0) {
      const result = logFocusMinutes(appState, pillar, minutes);
      ctx.persist();

      showToast(`+${minutes} min logged to ${pillar.toUpperCase()}`, 'info');
      if (result.xpAdded > 0) {
        showToast(`+${result.xpAdded} XP`, 'gold');
        vibrate([30]);
      }
      (result.levelUps ?? []).forEach(lu => showLevelUp(lu.pillar, lu.level));
      if (result.perfectDay) {
        showToast('[SYSTEM] Perfect Day! ⭐ +100 Hunter XP', 'gold', 5000);
        vibrate([50, 30, 100]);
      }
    } else {
      showToast('Session too short to log (< 1 min)', 'error');
    }

    refresh();
  });

  /* ── Exam management (College sub-tab) ─────────────────────────── */
  container.querySelector('#btn-add-exam')?.addEventListener('click', () => {
    const subjEl = container.querySelector('#exam-subject');
    const dateEl = container.querySelector('#exam-date');
    const subj   = subjEl?.value?.trim();
    const date   = dateEl?.value;

    if (!subj) { showToast('Enter a subject name', 'error'); return; }
    if (!date) { showToast('Pick an exam date', 'error'); return; }

    if (!Array.isArray(appState.exams)) appState.exams = [];
    appState.exams.push({ id: Date.now().toString(), subject: subj, label: subj, date });
    ctx.persist();
    showToast(`Exam Raid added: ${subj}`, 'success');
    refresh();
  });

  container.querySelectorAll('[data-del-exam]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.exams = (appState.exams ?? []).filter(e => e.id !== btn.dataset.delExam);
      ctx.persist();
      refresh();
    });
  });
}
