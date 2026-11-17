/* ================================================================
   js/ui/status.js — Status screen (Phase 1 — full implementation)
   Shows: avatar · identity · perfect-day pips · stamina ·
          4 pillar XP bars · exam countdown · penalty banner
   ================================================================ */

import {
  hunterLevel, getRank, xpToNext,
  streakMultiplier, staminaStatus,
  perfectDayStatus, getTierForDay,
  STAMINA, EXAM_RAID_DAYS, EXAM_RAID_MULT,
} from '../engine.js';
import { exportJSON, importJSON, saveState, getToday } from '../store.js';
import { showToast } from './components.js';

/* ── Pillar display metadata ─────────────────────────────────── */
const PILLAR_META = {
  college:  { cls: 'int', stat: 'INT', name: 'College',  full: 'INT · College'  },
  skill:    { cls: 'skl', stat: 'SKL', name: 'Skill',    full: 'SKL · Skill'    },
  physical: { cls: 'str', stat: 'STR', name: 'Physical', full: 'STR · Physical' },
  spirit:   { cls: 'spi', stat: 'SPI', name: 'Spirit',   full: 'SPI · Spirit'   },
};

/* ── Main render ─────────────────────────────────────────────── */
export function renderStatus(container, appState) {
  const today    = getToday();
  const dayData  = appState.days[today] ?? {};

  /* Computed values */
  const hl            = hunterLevel(appState.pillars);
  const rank          = getRank(hl);
  const { count: perfectCount, done: perfectDone } = perfectDayStatus(dayData);
  const { label: stamLabel, color: stamColor }     = staminaStatus(appState.stamina.value);
  const exam          = nearestExam(appState);

  container.innerHTML = `

    <div class="system-label">[SYSTEM] STATUS WINDOW</div>

    <!-- ── Identity card ─────────────────────────────────────── -->
    <div class="panel panel-cut status-identity">

      <!-- Hunter avatar silhouette -->
      <div class="avatar-container">
        ${avatarSVG(rank.label)}
      </div>

      <div class="hunter-name">${escHtml(appState.profile.name.toUpperCase())}</div>

      <div class="hunter-meta">
        <span class="badge badge-rank" style="border-color:${rank.color}; color:${rank.color};
              box-shadow:0 0 8px ${rank.color}44;">
          ${rank.display}
        </span>
        <span class="hunter-level-num">Hunter Level <strong>${hl}</strong></span>
      </div>

      ${appState.equippedTitle
        ? `<div class="equipped-title">「${escHtml(appState.equippedTitle)}」</div>`
        : `<div class="equipped-title" style="opacity:.35;">— No title equipped —</div>`}
    </div>

    <!-- ── Perfect Day progress ──────────────────────────────── -->
    <div class="panel">
      <div class="section-title">
        Perfect Day Progress
        <span style="float:right; color:${perfectDone ? 'var(--gold)' : 'var(--muted)'};">
          ${perfectCount}/4 ${perfectDone ? '⭐ COMPLETE' : ''}
        </span>
      </div>
      <div class="perfect-pips">
        ${['college','skill','physical','spirit'].map(p => pipHtml(p, dayData)).join('')}
      </div>
    </div>

    <!-- ── Stamina ────────────────────────────────────────────── -->
    <div class="panel">
      <div class="stat-row mb-8">
        <span class="section-title" style="margin:0;border:0;padding:0;">Stamina</span>
        <span class="stamina-status-label" style="color:${stamColor};">
          ${Math.round(appState.stamina.value)} / 100 &nbsp;·&nbsp; ${stamLabel}
        </span>
      </div>
      <div class="bar-wrap bar-xl">
        <div class="bar-fill stamina" style="width:${appState.stamina.value}%;"></div>
      </div>
      <div class="muted text-xs" style="margin-top:6px;">
        +${STAMINA.regenPerHour}/hr passively &nbsp;·&nbsp;
        Sleep ≥7h → +${STAMINA.sleepBonus} &nbsp;·&nbsp;
        Sleep &lt;5h → cap at ${STAMINA.sleepCap}
      </div>
    </div>

    <!-- ── 4 Pillar cards ─────────────────────────────────────── -->
    ${['college','skill','physical','spirit'].map(p => pillarCard(p, appState.pillars[p], dayData)).join('')}

    <!-- ── Exam countdown (if any exams added) ───────────────── -->
    ${exam ? examPanel(exam) : ''}

    <!-- ── Penalty banner (if active) ────────────────────────── -->
    ${appState.penalty.active ? penaltyBanner(appState.penalty) : ''}

    <!-- ── Data management (settings shortcut) ───────────────── -->
    <div class="panel">
      <div class="section-title">Data</div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1; min-height:40px; padding:6px;"
                id="stat-export">↓ Export</button>
        <button class="btn" style="flex:1; min-height:40px; padding:6px;"
                id="stat-import">↑ Import</button>
      </div>
    </div>

  `;

  /* ── Wire export / import ────────────────────────────────── */
  container.querySelector('#stat-export').addEventListener('click', () => {
    exportJSON(appState);
    showToast('[SYSTEM] Backup exported.', 'success');
  });

  container.querySelector('#stat-import').addEventListener('click', async () => {
    try {
      const imported = await importJSON();
      saveState(imported);
      showToast('[SYSTEM] Backup restored! Reloading…', 'gold', 2200);
      setTimeout(() => location.reload(), 2200);
    } catch (err) {
      showToast('[ERROR] ' + err.message, 'error');
    }
  });
}

/* ================================================================
   COMPONENT HELPERS
   ================================================================ */

/* ── Avatar SVG (original warrior silhouette) ──────────────── */
function avatarSVG(rankLabel) {
  // Aura color shifts with rank
  const auraColors = { E:'#7a8ba3', D:'#38bdf8', C:'#a78bfa', B:'#f87171', A:'#fbbf24', S:'#38bdf8' };
  const aura = auraColors[rankLabel] || '#38bdf8';

  return `<svg class="avatar-svg" viewBox="0 0 100 155"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="av-aura" cx="50%" cy="55%" r="50%">
        <stop offset="0%"   stop-color="${aura}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${aura}" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Aura halo -->
    <ellipse cx="50" cy="85" rx="48" ry="68" fill="url(#av-aura)"/>

    <!-- Head -->
    <ellipse cx="50" cy="22" rx="13" ry="13.5" fill="#152535"/>
    <!-- Hood -->
    <path d="M37 20 Q38 9 50 7 Q62 9 63 20 Q59 14 50 13 Q41 14 37 20Z"
          fill="#0d1a28"/>

    <!-- Neck -->
    <rect x="46" y="33" width="8" height="6" rx="2" fill="#152535"/>

    <!-- Coat upper body + shoulders -->
    <path d="M22 44 L38 37 L50 39 L62 37 L78 44 L80 86 L50 90 L20 86Z"
          fill="#152535"/>

    <!-- Left arm -->
    <path d="M22 44 L12 53 L8 80 L17 82 L19 58 L28 50Z" fill="#152535"/>
    <!-- Right arm -->
    <path d="M78 44 L88 53 L92 80 L83 82 L81 58 L72 50Z" fill="#152535"/>

    <!-- Coat lower (long split) -->
    <path d="M20 86 L16 132 L40 134 L50 112 L60 134 L84 132 L80 86Z"
          fill="#0f1f2f"/>

    <!-- Belt line -->
    <rect x="32" y="84" width="36" height="4" rx="1" fill="#1e3a5f" opacity="0.9"/>

    <!-- Legs -->
    <rect x="33" y="110" width="13" height="30" rx="3" fill="#152535"/>
    <rect x="54" y="110" width="13" height="30" rx="3" fill="#152535"/>

    <!-- Boots -->
    <rect x="31" y="136" width="17" height="10" rx="2" fill="#0a1520"/>
    <rect x="52" y="136" width="17" height="10" rx="2" fill="#0a1520"/>

    <!-- Glowing eyes -->
    <ellipse cx="44.5" cy="22" rx="3"   ry="2.5" fill="${aura}"/>
    <ellipse cx="55.5" cy="22" rx="3"   ry="2.5" fill="${aura}"/>
    <ellipse cx="44.5" cy="22" rx="5.5" ry="4.5" fill="${aura}" opacity="0.22"/>
    <ellipse cx="55.5" cy="22" rx="5.5" ry="4.5" fill="${aura}" opacity="0.22"/>

    <!-- Floating energy particles -->
    <circle cx="6"   cy="62"  r="1.5" fill="${aura}" opacity="0.5"/>
    <circle cx="94"  cy="52"  r="1"   fill="${aura}" opacity="0.4"/>
    <circle cx="4"   cy="98"  r="1"   fill="#a78bfa" opacity="0.5"/>
    <circle cx="96"  cy="88"  r="1.5" fill="#a78bfa" opacity="0.4"/>
    <circle cx="14"  cy="118" r="1"   fill="${aura}" opacity="0.3"/>
    <circle cx="86"  cy="112" r="1"   fill="${aura}" opacity="0.3"/>

    <!-- Ground shadow -->
    <ellipse cx="50" cy="149" rx="28" ry="4" fill="${aura}" opacity="0.09"/>
  </svg>`;
}

/* ── Perfect-day pip (one per pillar) ───────────────────────── */
function pipHtml(pillar, dayData) {
  const { cls, stat, name } = PILLAR_META[pillar];
  const tier = getTierForDay(dayData, pillar);
  const met  = tier === 'standard' || tier === 'elite';
  const icon = tier === 'elite' ? '★' : (met ? '✓' : stat);

  return `
    <div class="pip-item">
      <div class="pip-circle ${cls} ${met ? 'met' : ''}"
           aria-label="${name}: ${met ? tier : 'not completed'}">${icon}</div>
      <span class="pip-label">${name}</span>
    </div>`;
}

/* ── Pillar XP card ─────────────────────────────────────────── */
function pillarCard(pillar, p, dayData) {
  const { cls, full } = PILLAR_META[pillar];
  const xpNeeded  = xpToNext(p.level);
  const pct       = xpNeeded > 0 ? Math.min(100, (p.xp / xpNeeded) * 100).toFixed(1) : 0;
  const mult      = streakMultiplier(p.streak);
  const tier      = getTierForDay(dayData, pillar);

  return `
    <div class="panel pillar-card ${cls}">

      <div class="pillar-header">
        <span class="pillar-name text-${cls}">${full}</span>
        <span class="pillar-level text-${cls}">Lv ${p.level}</span>
      </div>

      <div class="pillar-xp-row">
        <span class="mono">${p.xp} / ${xpNeeded} XP</span>
        ${mult > 1
          ? `<span class="text-gold">×${mult.toFixed(2)} streak bonus</span>`
          : `<span class="muted">No streak bonus yet</span>`}
      </div>
      <div class="bar-wrap bar-lg">
        <div class="bar-fill ${cls}" style="width:${pct}%;"></div>
      </div>

      <div class="pillar-footer">
        <span class="streak-label">
          ${p.streak > 0
            ? `🔥 ${p.streak}-day streak`
            : '<span class="muted">Start your streak today</span>'}
        </span>
        <div style="display:flex;align-items:center;gap:6px;">
          ${p.shields > 0
            ? `<span class="text-xs text-gold">🛡 ×${p.shields}</span>`
            : ''}
          <span class="tier-badge tier-${tier}">
            ${tier === 'none' ? '—' : tier.toUpperCase()}
          </span>
        </div>
      </div>

    </div>`;
}

/* ── Exam countdown card ─────────────────────────────────────── */
function examPanel(exam) {
  const isRaid = exam.daysUntil <= EXAM_RAID_DAYS;
  return `
    <div class="panel panel-cut">
      <div class="section-title">Exam Countdown</div>
      <div class="exam-countdown">
        <div class="muted text-xs" style="margin-bottom:6px;">
          ${escHtml(exam.label || exam.subject)}
        </div>
        <div class="exam-days-num">${exam.daysUntil}</div>
        <div class="muted text-xs">days remaining</div>
        ${isRaid
          ? `<div class="exam-raid-active">⚡ EXAM RAID · College XP ×${EXAM_RAID_MULT}</div>`
          : ''}
      </div>
    </div>`;
}

/* ── Penalty banner ─────────────────────────────────────────── */
function penaltyBanner(penalty) {
  const pillarName = PILLAR_META[penalty.pillar]?.name ?? penalty.pillar;
  return `
    <div class="panel penalty-banner">
      <div class="system-label">[PENALTY QUEST ACTIVE]</div>
      <p style="font-size:.875rem;margin-bottom:6px;">
        <strong>${pillarName}</strong> pillar was not completed yesterday.
      </p>
      <p class="muted text-xs">
        Clear in the Quests tab: 40 pushups OR 20 min focus in ${pillarName}.
        Earns 0 XP — just clears the badge.
      </p>
    </div>`;
}

/* ── Nearest upcoming exam ───────────────────────────────────── */
function nearestExam(state) {
  if (!state.exams?.length) return null;
  const today   = getToday();
  const todayMs = localDateMs(today);
  let nearest = null, minDays = Infinity;

  for (const exam of state.exams) {
    const days = Math.ceil((localDateMs(exam.date) - todayMs) / 86_400_000);
    if (days >= 0 && days < minDays) { minDays = days; nearest = { ...exam, daysUntil: days }; }
  }
  return nearest;
}

/* ── Utilities ───────────────────────────────────────────────── */
function localDateMs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
