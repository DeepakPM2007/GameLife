/* ================================================================
   js/ui/quests.js  --  Phase 2: Daily Quest Board
   All non-ASCII display chars replaced with HTML entities (encoding fix).
   Recovery/Standard tick bug fixed with isTierReached().
   Misclick protection: confirm modal before every tier log.
   ================================================================ */

import {
  getTierForDay, logManualTier, clearPenaltyPillar,
  perfectDayStatus, TIER_XP, FOCUS_THRESH
} from '../engine.js';
import { showModal, closeModal, showToast, showLevelUp, vibrate } from './components.js';
import { getToday } from '../store.js';

/* -- Pillar display metadata --------------------------------------- */
const PILLAR_META = {
  college:  { cls: 'int', stat: 'INT', name: 'College Win',  color: 'var(--col-int)' },
  skill:    { cls: 'skl', stat: 'SKL', name: 'Skill Win',    color: 'var(--col-skl)' },
  physical: { cls: 'str', stat: 'STR', name: 'Physical Win', color: 'var(--col-str)' },
  spirit:   { cls: 'spi', stat: 'SPI', name: 'Spirit Win',   color: 'var(--col-spi)' },
};

/* -- Tier display info --------------------------------------------- */
const TIER_META = {
  none:     { label: 'None',     xp: 0   },
  minimum:  { label: 'Minimum',  xp: 40  },
  standard: { label: 'Standard', xp: 80  },
  elite:    { label: 'Elite',    xp: 150 },
  recovery: { label: 'Recovery', xp: 80  },
};

/* -- Tier descriptions per pillar ---------------------------------- */
const TIER_DESC = {
  college:  { minimum:'25 min focus', standard:'90 min focus', elite:'180 min focus' },
  skill:    { minimum:'30 min focus', standard:'90 min focus', elite:'180 min focus' },
  physical: {
    minimum:  '10 min mobility + hang',
    standard: 'Full scheduled workout',
    elite:    'Workout + finisher set',
    recovery: '10 min mobility + sleep logged',
  },
  spirit: {
    minimum:  'Discipline check-in',
    standard: 'Check-in + 10 min practice',
    elite:    'Check-in + practice + 3-line journal',
  },
};

/*
 * FIX: Recovery == Standard in TIER_RANK, so we use explicit logic.
 *
 * currentTier  | min  std  elite  recovery
 * -------------|---------------------------
 * none         |  -    -     -       -
 * minimum      |  Y    -     -       -
 * standard     |  Y    Y     -       -    (recovery stays UNCHECKED)
 * elite        |  Y    Y     Y       -
 * recovery     |  Y    -     -       Y    (standard stays UNCHECKED)
 */
function isTierReached(displayTier, currentTier) {
  if (currentTier === 'none') return false;
  switch (displayTier) {
    case 'minimum':  return true;
    case 'standard': return currentTier === 'standard' || currentTier === 'elite';
    case 'elite':    return currentTier === 'elite';
    case 'recovery': return currentTier === 'recovery';
    default:         return false;
  }
}

/* -- Physical action buttons per current tier ---------------------- */
function physicalButtons(currentTier) {
  switch (currentTier) {
    case 'none':     return ['minimum', 'recovery', 'standard', 'elite'];
    case 'minimum':  return ['recovery', 'standard', 'elite'];
    case 'recovery': return ['elite'];
    case 'standard': return ['elite'];
    case 'elite':    return [];
    default:         return [];
  }
}

/* -- Button labels (ASCII + HTML entities only) -------------------- */
const PHYSICAL_BTN_LABELS = {
  minimum:  '[MIN] Minimum Done  (10 min mobility)',
  recovery: '[REC] Recovery Quest  (10 min + sleep)',
  standard: '[STD] Full Workout Done',
  elite:    '[ELITE] Workout + Finisher Done',
};
const SPIRIT_BTN_LABELS = {
  minimum:  '[MIN] Check-in Done',
  standard: '[STD] Check-in + Practice Done',
  elite:    '[ELITE] Full Spirit Quest Done',
};

/* ================================================================
   Main render
   ================================================================ */
export function renderQuests(container, appState, ctx) {
  const today   = getToday();
  const dayData = appState.days[today] ?? {};
  const { count: perfectCount, done: perfectDone } = perfectDayStatus(dayData);

  container.innerHTML = `
    <div class="system-label">[SYSTEM] DAILY QUEST BOARD</div>
    <div class="quest-date">${today}</div>

    ${perfectDayBar(perfectCount, perfectDone)}

    ${questCard('college',  appState, dayData)}
    ${questCard('skill',    appState, dayData)}
    ${questCard('physical', appState, dayData)}
    ${questCard('spirit',   appState, dayData)}

    ${penaltySection(appState.penalty)}

    ${bossCard()}
  `;

  wireQuestEvents(container, appState, ctx);
}

/* -- Perfect Day progress bar -------------------------------------- */
function perfectDayBar(count, done) {
  const pillars = ['college','skill','physical','spirit'];
  const pips = pillars.map((p, i) => {
    const lit = i < count;
    const color = {
      college:'var(--col-int)', skill:'var(--col-skl)',
      physical:'var(--col-str)', spirit:'var(--col-spi)'
    }[p];
    return `<div class="perfect-pip ${lit ? 'lit' : ''}"
                 style="${lit ? `background:${color};box-shadow:0 0 8px ${color}` : ''}"
                 title="${p}"></div>`;
  }).join('');

  return `
    <div class="panel perfect-day-bar">
      <span class="muted text-xs">PERFECT DAY</span>
      <div class="perfect-pips">${pips}</div>
      ${done
        ? '<span class="gold-text text-xs">&#11088; ACHIEVED</span>'
        : `<span class="muted text-xs">${count}/4 pillars</span>`}
    </div>`;
}

/* -- Individual quest card ----------------------------------------- */
function questCard(pillar, appState, dayData) {
  const meta        = PILLAR_META[pillar];
  const tierData    = dayData.tier ?? {};
  const currentTier = tierData[pillar] ?? 'none';
  const isFocus     = pillar === 'college' || pillar === 'skill';
  const focusMin    = dayData.focusMin ?? {};
  const mins        = focusMin[pillar] ?? 0;
  const thresh      = FOCUS_THRESH[pillar] ?? {};

  const tierRows = isFocus
    ? ['minimum','standard','elite']
    : pillar === 'physical'
      ? ['minimum','standard','elite','recovery']
      : ['minimum','standard','elite'];

  return `
  <div class="panel quest-card quest-card--${meta.cls}">
    <div class="quest-card-header">
      <span class="quest-stat-badge" style="color:${meta.color}">${meta.stat}</span>
      <span class="quest-name">${meta.name}</span>
      ${currentTier !== 'none'
        ? `<span class="quest-tier-badge tier--${currentTier}">&#10003; ${currentTier.toUpperCase()}</span>`
        : ''}
    </div>

    ${isFocus ? focusProgressBar(mins, thresh, currentTier) : ''}

    <div class="quest-tiers">
      ${tierRows.map(t => tierRow(t, pillar, currentTier)).join('')}
    </div>

    <div class="quest-actions">
      ${questActions(pillar, currentTier, isFocus)}
    </div>
  </div>`;
}

/* Focus progress bar */
function focusProgressBar(mins, thresh, currentTier) {
  const max    = thresh.elite  ?? 180;
  const minPct = Math.round(((thresh.minimum  ?? 25) / max) * 100);
  const stdPct = Math.round(((thresh.standard ?? 90) / max) * 100);
  const pct    = Math.min(100, Math.round((mins / max) * 100));

  const barColor = currentTier === 'elite'    ? 'var(--gold)' :
                   currentTier === 'standard' ? 'var(--col-int)' :
                   currentTier === 'minimum'  ? '#38bdf877' : 'var(--muted)';

  return `
  <div class="focus-bar-wrap">
    <div class="focus-bar-track">
      <div class="focus-bar-fill" style="width:${pct}%;background:${barColor}"></div>
      <div class="focus-threshold" style="left:${minPct}%"></div>
      <div class="focus-threshold" style="left:${stdPct}%"></div>
    </div>
    <div class="focus-bar-label">
      <span class="mono text-xs" style="color:var(--glow)">${mins} min</span>
      <span class="muted text-xs">/ ${max} min</span>
    </div>
  </div>`;
}

/* Tier row -- uses isTierReached() for correct Recovery display */
function tierRow(tier, pillar, currentTier) {
  const reached = isTierReached(tier, currentTier);
  const desc    = TIER_DESC[pillar]?.[tier] ?? '';
  const xp      = TIER_META[tier]?.xp ?? 0;
  const label   = TIER_META[tier]?.label ?? tier;

  return `
  <div class="quest-tier-row ${reached ? 'reached' : ''}">
    <span class="tier-check">${reached ? '&#10003;' : 'o'}</span>
    <span class="tier-info">
      <span class="tier-label">${label}</span>
      <span class="muted text-xs">${desc}</span>
    </span>
    <span class="tier-xp">${xp > 0 ? '+' + xp + ' XP' : ''}</span>
  </div>`;
}

/* Quest action buttons */
function questActions(pillar, currentTier, isFocus) {
  if (isFocus) {
    return `<button class="btn btn-primary quest-btn" data-nav="study">[TIMER] Open Focus Timer</button>`;
  }

  if (pillar === 'physical') {
    const toShow = physicalButtons(currentTier);
    if (!toShow.length) return `<span class="muted text-xs text-center">&#10003; All done for today</span>`;
    return toShow.map(tier =>
      `<button class="btn quest-btn tier-btn--${tier}"
               data-log="physical" data-tier="${tier}"
               data-confirm-label="${PHYSICAL_BTN_LABELS[tier]}">
        ${PHYSICAL_BTN_LABELS[tier]}
      </button>`
    ).join('');
  }

  if (pillar === 'spirit') {
    const tiers  = ['minimum','standard','elite'];
    const toShow = tiers.filter(t => !isTierReached(t, currentTier));
    if (!toShow.length) return `<span class="muted text-xs text-center">&#10003; All done for today</span>`;
    return toShow.map(tier =>
      `<button class="btn quest-btn tier-btn--${tier}"
               data-log="spirit" data-tier="${tier}"
               data-confirm-label="${SPIRIT_BTN_LABELS[tier]}">
        ${SPIRIT_BTN_LABELS[tier]}
      </button>`
    ).join('');
  }

  return '';
}

/* -- Penalty Quest section ----------------------------------------- */
function penaltySection(penalty) {
  if (!penalty?.active) return '';
  const list = Array.isArray(penalty.pillars) && penalty.pillars.length
    ? penalty.pillars : (penalty.pillar ? [penalty.pillar] : []);
  if (!list.length) return '';

  const cards = list.map(p => {
    const meta = PILLAR_META[p] ?? { name: p, color: 'var(--muted)' };
    return `
    <div class="panel penalty-card">
      <div class="system-label" style="color:var(--danger)">[PENALTY QUEST] ${meta.name.toUpperCase()}</div>
      <p class="muted text-xs" style="margin:8px 0">
        You missed ${meta.name} yesterday. Clear by completing one of:
      </p>
      <div class="quest-actions">
        <button class="btn btn-danger quest-btn" data-clear-penalty="${p}" data-choice="pushups">
          &#10003; 40 Pushups Done
        </button>
        <button class="btn quest-btn" data-clear-penalty="${p}" data-choice="focus">
          &#10003; 20 min Focus Done
        </button>
      </div>
    </div>`;
  }).join('');

  return `<div class="penalty-section">${cards}</div>`;
}

/* -- Weekly Boss Gate placeholder ---------------------------------- */
function bossCard() {
  return `
  <div class="panel boss-card">
    <div class="system-label muted">[BOSS GATE]</div>
    <div class="boss-locked">
      <span class="boss-icon">[LOCKED]</span>
      <span class="muted text-xs">Weekly Boss Gate &mdash; available Saturday</span>
    </div>
  </div>`;
}

/* -- XP result handler --------------------------------------------- */
function handleXPResult(result) {
  if (result.xpAdded > 0) { showToast(`+${result.xpAdded} XP`, 'gold'); vibrate([30]); }
  (result.levelUps ?? []).forEach(lu => showLevelUp(lu.pillar, lu.level));
  if (result.perfectDay) {
    showToast('[SYSTEM] Perfect Day! +100 Hunter XP *', 'gold', 5000);
    vibrate([50, 30, 100]);
  }
}

/* -- Confirm modal before logging ---------------------------------- */
function confirmTierLog(pillarName, label, onConfirm) {
  showModal({
    title: '[SYSTEM] Confirm Quest Log',
    body: `
      <p style="margin:0 0 12px;color:var(--text);">
        Log quest for <strong>${pillarName}</strong>?
      </p>
      <div class="panel" style="padding:10px 14px;margin-bottom:4px;border-color:var(--gold);">
        <span style="color:var(--gold);font-size:0.9rem;">${label}</span>
      </div>
      <p class="muted text-xs" style="margin-top:8px;">
        Cannot be undone today. Confirm only if actually completed.
      </p>`,
    buttons: [
      { label: '&#10003; Confirm', cls: 'btn-primary', onClick() { closeModal(); onConfirm(); } },
      { label: '&#10005; Cancel',  cls: '',            onClick() { closeModal(); } },
    ],
    closeable: true,
  });
}

/* -- Event wiring --------------------------------------------------- */
function wireQuestEvents(container, appState, ctx) {
  const refresh = () => renderQuests(container, appState, ctx);

  /* Log tier buttons */
  container.querySelectorAll('[data-log]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pillar     = btn.dataset.log;
      const tier       = btn.dataset.tier;
      const label      = btn.dataset.confirmLabel || tier;
      const pillarName = PILLAR_META[pillar]?.name ?? pillar;
      confirmTierLog(pillarName, label, () => {
        const result = logManualTier(appState, pillar, tier);
        handleXPResult(result);
        ctx.persist();
        refresh();
      });
    });
  });

  /* Open Focus Timer */
  container.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => ctx.navigate('#' + btn.dataset.nav));
  });

  /* Clear penalty */
  container.querySelectorAll('[data-clear-penalty]').forEach(btn => {
    btn.addEventListener('click', () => {
      clearPenaltyPillar(appState, btn.dataset.clearPenalty);
      ctx.persist();
      showToast('[SYSTEM] Penalty cleared. Rise again, Hunter.', 'success');
      refresh();
    });
  });
}
