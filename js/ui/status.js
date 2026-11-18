/* ================================================================
   js/ui/status.js  --  Status screen (Phase 1 full + Phase 2 fixes)
   Fix: avatar viewBox expanded, all non-ASCII as HTML entities.
   ================================================================ */

import {
  hunterLevel, getRank, xpToNext,
  streakMultiplier, staminaStatus,
  perfectDayStatus, getTierForDay,
  STAMINA, EXAM_RAID_DAYS, EXAM_RAID_MULT,
} from '../engine.js';
import { exportJSON, importJSON, saveState, getToday } from '../store.js';
import { showToast } from './components.js';

/* -- Pillar display metadata --------------------------------------- */
const PILLAR_META = {
  college:  { cls: 'int', stat: 'INT', name: 'College',  full: 'INT &middot; College'  },
  skill:    { cls: 'skl', stat: 'SKL', name: 'Skill',    full: 'SKL &middot; Skill'    },
  physical: { cls: 'str', stat: 'STR', name: 'Physical', full: 'STR &middot; Physical' },
  spirit:   { cls: 'spi', stat: 'SPI', name: 'Spirit',   full: 'SPI &middot; Spirit'   },
};

/* -- Main render ---------------------------------------------------- */
export function renderStatus(container, appState) {
  const today   = getToday();
  const dayData = appState.days[today] ?? {};

  const hl       = hunterLevel(appState.pillars);
  const rank     = getRank(hl);
  const { count: perfectCount, done: perfectDone } = perfectDayStatus(dayData);
  const { label: stamLabel, color: stamColor }     = staminaStatus(appState.stamina.value);
  const exam     = nearestExam(appState);

  container.innerHTML = `

    <div class="system-label">[SYSTEM] STATUS WINDOW</div>

    <!-- Identity card -->
    <div class="panel panel-cut status-identity">
      <div class="avatar-container">
        ${avatarSVG(rank.label)}
      </div>
      <div class="hunter-name">${escHtml(appState.profile.name.toUpperCase())}</div>
      <div class="hunter-meta">
        <span class="badge badge-rank"
              style="border-color:${rank.color};color:${rank.color};box-shadow:0 0 8px ${rank.color}44;">
          ${rank.display}
        </span>
        <span class="hunter-level-num">Hunter Level <strong>${hl}</strong></span>
      </div>
      ${appState.equippedTitle
        ? `<div class="equipped-title">&#10022; ${escHtml(appState.equippedTitle)} &#10022;</div>`
        : `<div class="equipped-title" style="opacity:.35;">&mdash; No title equipped &mdash;</div>`}
    </div>

    <!-- Perfect Day progress -->
    <div class="panel">
      <div class="section-title">
        Perfect Day Progress
        <span style="float:right;color:${perfectDone ? 'var(--gold)' : 'var(--muted)'};">
          ${perfectCount}/4 ${perfectDone ? '&#11088; COMPLETE' : ''}
        </span>
      </div>
      <div class="perfect-pips">
        ${['college','skill','physical','spirit'].map(p => pipHtml(p, dayData)).join('')}
      </div>
    </div>

    <!-- Stamina -->
    <div class="panel">
      <div class="stat-row mb-8">
        <span class="section-title" style="margin:0;border:0;padding:0;">Stamina</span>
        <span class="stamina-status-label" style="color:${stamColor};">
          ${Math.round(appState.stamina.value)} / 100 &nbsp;&middot;&nbsp; ${stamLabel}
        </span>
      </div>
      <div class="bar-wrap bar-xl">
        <div class="bar-fill stamina" style="width:${appState.stamina.value}%;"></div>
      </div>
      <div class="muted text-xs" style="margin-top:6px;">
        +${STAMINA.regenPerHour}/hr passively &nbsp;&middot;&nbsp;
        Sleep &ge;7h &rarr; +${STAMINA.sleepBonus} &nbsp;&middot;&nbsp;
        Sleep &lt;5h &rarr; cap at ${STAMINA.sleepCap}
      </div>
    </div>

    <!-- 4 Pillar cards -->
    ${['college','skill','physical','spirit'].map(p =>
      pillarCard(p, appState.pillars[p], dayData)).join('')}

    <!-- Exam countdown -->
    ${exam ? examPanel(exam) : ''}

    <!-- Penalty banners -->
    ${penaltySection(appState.penalty)}

    <!-- Data management -->
    <div class="panel">
      <div class="section-title">Data</div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;min-height:40px;padding:6px;"
                id="stat-export">&#8593; Export</button>
        <button class="btn" style="flex:1;min-height:40px;padding:6px;"
                id="stat-import">&#8595; Import</button>
      </div>
    </div>
  `;

  container.querySelector('#stat-export').addEventListener('click', () => {
    exportJSON(appState);
    showToast('[SYSTEM] Backup exported.', 'success');
  });

  container.querySelector('#stat-import').addEventListener('click', async () => {
    try {
      const imported = await importJSON();
      saveState(imported);
      showToast('[SYSTEM] Data imported. Reloading...', 'success');
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      showToast('[SYSTEM] Import failed: ' + e.message, 'error');
    }
  });
}

/* ================================================================
   AVATAR  --  Anime-style Hunter silhouette SVG
   viewBox expanded to "-5 -20 130 210" so spiky hair is never clipped.
   All text via entity-safe font rendering.
   ================================================================ */
function avatarSVG(rankLabel) {
  const auraColors = {
    E: '#7a8ba3', D: '#38bdf8', C: '#a78bfa',
    B: '#f87171', A: '#fbbf24', S: '#38bdf8'
  };
  const aura  = auraColors[rankLabel] || '#38bdf8';
  const aura2 = rankLabel === 'S' ? '#a78bfa' : aura;

  return `<svg class="avatar-svg" viewBox="-5 -20 130 210"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="ag-aura" cx="50%" cy="58%" r="52%">
      <stop offset="0%"   stop-color="${aura}" stop-opacity="0.28"/>
      <stop offset="70%"  stop-color="${aura}" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="${aura}" stop-opacity="0"/>
    </radialGradient>
    <filter id="ag-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Aura -->
  <ellipse cx="60" cy="104" rx="55" ry="72" fill="url(#ag-aura)"/>

  <!-- SPIKY HAIR -->
  <path d="M38 30 L28  8 L42 22Z" fill="#0a1520" opacity="0.9"/>
  <path d="M46 26 L38  2 L52 20Z" fill="#0a1520" opacity="0.9"/>
  <path d="M56 24 L52  0 L64 20Z" fill="#0a1520" opacity="0.9"/>
  <path d="M68 26 L72  3 L78 22Z" fill="#0a1520" opacity="0.9"/>
  <path d="M78 30 L90 10 L82 26Z" fill="#0a1520" opacity="0.9"/>
  <path d="M36 32 Q36 15 60 14 Q84 15 84 32 Q80 26 60 25 Q40 26 36 32Z"
        fill="#111e2e"/>

  <!-- HEAD -->
  <path d="M40 32 Q38 52 44 60 Q52 66 60 66 Q68 66 76 60 Q82 52 80 32
           Q70 28 60 27 Q50 28 40 32Z" fill="#162030"/>
  <path d="M48 60 Q54 68 60 70 Q66 68 72 60 Q66 65 60 65 Q54 65 48 60Z"
        fill="#162030"/>
  <ellipse cx="40" cy="46" rx="3.5" ry="4" fill="#152535"/>
  <ellipse cx="80" cy="46" rx="3.5" ry="4" fill="#152535"/>

  <!-- GLOWING EYES -->
  <ellipse cx="50" cy="45" rx="5.5" ry="4" fill="#0a1520"/>
  <ellipse cx="70" cy="45" rx="5.5" ry="4" fill="#0a1520"/>
  <ellipse cx="50" cy="45" rx="4"   ry="3" fill="${aura}" opacity="0.9" filter="url(#ag-glow)"/>
  <ellipse cx="70" cy="45" rx="4"   ry="3" fill="${aura}" opacity="0.9" filter="url(#ag-glow)"/>
  <ellipse cx="50" cy="45" rx="2"   ry="2.2" fill="#ffffff" opacity="0.85"/>
  <ellipse cx="70" cy="45" rx="2"   ry="2.2" fill="#ffffff" opacity="0.85"/>
  <line x1="44" y1="40" x2="56" y2="38" stroke="#0a1520" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="64" y1="38" x2="76" y2="40" stroke="#0a1520" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M54 61 Q60 63 66 61" stroke="#0a1520" stroke-width="1.8" fill="none" stroke-linecap="round"/>

  <!-- NECK -->
  <rect x="54" y="66" width="12" height="10" rx="3" fill="#152535"/>

  <!-- TRENCH COAT upper -->
  <path d="M24 80 L40 70 L54 72 L60 74 L66 72 L80 70 L96 80
           L98 128 L60 134 L22 128Z" fill="#0d1a28"/>
  <path d="M54 72 L44 92 L52 94 L60 86Z" fill="#152535"/>
  <path d="M66 72 L76 92 L68 94 L60 86Z" fill="#152535"/>
  <path d="M46 70 Q60 66 74 70 Q70 72 60 73 Q50 72 46 70Z" fill="#152535"/>
  <rect x="56" y="86" width="8" height="30" rx="2" fill="#1e3a5f" opacity="0.4"/>

  <!-- SHOULDERS -->
  <path d="M24 80 L14 72 L18 88 L28 90Z" fill="#152535"/>
  <path d="M96 80 L106 72 L102 88 L92 90Z" fill="#152535"/>

  <!-- ARMS -->
  <path d="M28 90 L14 95 L10 125 L22 128 L24 102 L34 96Z" fill="#152535"/>
  <ellipse cx="16" cy="128" rx="7" ry="6" fill="#162030"/>
  <path d="M92 90 L106 95 L110 125 L98 128 L96 102 L86 96Z" fill="#152535"/>
  <ellipse cx="104" cy="128" rx="7" ry="6" fill="#162030"/>

  <!-- COAT LOWER split hem -->
  <path d="M22 128 L14 170 L46 172 L54 148 L60 134Z" fill="#0a1520"/>
  <path d="M98 128 L106 170 L74 172 L66 148 L60 134Z" fill="#0a1520"/>
  <path d="M54 148 L60 180 L66 148 L60 134Z" fill="#05070d"/>
  <path d="M14 170 L46 172" stroke="${aura}" stroke-width="0.8" opacity="0.3"/>
  <path d="M74 172 L106 170" stroke="${aura}" stroke-width="0.8" opacity="0.3"/>

  <!-- BELT -->
  <rect x="38" y="126" width="44" height="6" rx="2" fill="#1e3a5f"/>
  <rect x="56" y="124" width="8"  height="8" rx="1" fill="${aura}" opacity="0.5"/>

  <!-- TROUSERS -->
  <rect x="40" y="132" width="16" height="36" rx="4" fill="#152535"/>
  <rect x="64" y="132" width="16" height="36" rx="4" fill="#152535"/>

  <!-- BOOTS -->
  <path d="M38 162 L40 168 L58 168 L58 162Z" fill="#0a1520"/>
  <path d="M62 162 L62 168 L80 168 L82 162Z" fill="#0a1520"/>

  <!-- ENERGY PARTICLES -->
  <circle cx="8"   cy="85"  r="2"   fill="${aura}"  opacity="0.5"/>
  <circle cx="112" cy="78"  r="1.5" fill="${aura}"  opacity="0.4"/>
  <circle cx="6"   cy="118" r="1.5" fill="${aura2}" opacity="0.4"/>
  <circle cx="114" cy="112" r="2"   fill="${aura2}" opacity="0.35"/>
  <circle cx="16"  cy="150" r="1"   fill="${aura}"  opacity="0.3"/>
  <circle cx="104" cy="145" r="1"   fill="${aura}"  opacity="0.3"/>

  <!-- RANK RUNE -->
  <text x="60" y="176" text-anchor="middle" font-family="monospace"
        font-size="6" font-weight="900" fill="${aura}" opacity="0.55"
        letter-spacing="3">${rankLabel}-RANK</text>

  <!-- Ground shadow -->
  <ellipse cx="60" cy="178" rx="30" ry="3.5" fill="${aura}" opacity="0.08"/>
</svg>`;
}

/* -- Perfect-day pip ----------------------------------------------- */
function pipHtml(pillar, dayData) {
  const { cls, stat, name } = PILLAR_META[pillar];
  const tier = getTierForDay(dayData, pillar);
  const met  = tier === 'standard' || tier === 'elite' || tier === 'recovery';
  const icon = tier === 'elite' ? '&#9733;' : (met ? '&#10003;' : stat);

  return `
    <div class="pip-item">
      <div class="pip-circle ${cls} ${met ? 'met' : ''}"
           aria-label="${name}: ${met ? tier : 'not completed'}">${icon}</div>
      <span class="pip-label">${name}</span>
    </div>`;
}

/* -- Pillar XP card ------------------------------------------------- */
function pillarCard(pillar, p, dayData) {
  const { cls, full } = PILLAR_META[pillar];
  const xpNeeded = xpToNext(p.level);
  const pct      = Math.min(100, Math.round((p.xp / xpNeeded) * 100));
  const mult     = streakMultiplier(p.streak);
  const tier     = getTierForDay(dayData, pillar);

  return `
  <div class="panel pillar-card pillar-card--${cls}">
    <div class="pillar-header">
      <span class="pillar-name text-${cls}">${full}</span>
      <span class="pillar-level text-${cls}">Lv ${p.level}</span>
    </div>
    <div class="pillar-xp-row">
      <span class="mono">${p.xp} / ${xpNeeded} XP</span>
      ${mult > 1
        ? `<span class="text-gold">&times;${mult.toFixed(2)} streak bonus</span>`
        : `<span class="muted">No streak bonus yet</span>`}
    </div>
    <div class="bar-wrap bar-lg">
      <div class="bar-fill ${cls}" style="width:${pct}%;"></div>
    </div>
    <div class="pillar-footer">
      <span class="streak-label">
        ${p.streak > 0
          ? `&#128293; ${p.streak}-day streak`
          : '<span class="muted">Start your streak today</span>'}
      </span>
      <div style="display:flex;align-items:center;gap:6px;">
        ${p.shields > 0 ? `<span class="text-xs text-gold">[S] x${p.shields}</span>` : ''}
        <span class="tier-badge tier-${tier}">
          ${tier === 'none' ? '&mdash;' : tier.toUpperCase()}
        </span>
      </div>
    </div>
  </div>`;
}

/* -- Exam countdown card -------------------------------------------- */
function examPanel(exam) {
  const isRaid = exam.daysUntil <= EXAM_RAID_DAYS;
  return `
    <div class="panel panel-cut">
      <div class="section-title">Exam Countdown</div>
      <div class="exam-countdown">
        <div class="muted text-xs" style="margin-bottom:6px;">${escHtml(exam.label || exam.subject)}</div>
        <div class="exam-days-num">${exam.daysUntil}</div>
        <div class="muted text-xs">days remaining</div>
        ${isRaid
          ? `<div class="exam-raid-active">[EXAM RAID] &middot; College XP &times;${EXAM_RAID_MULT}</div>`
          : ''}
      </div>
    </div>`;
}

/* -- Penalty section ------------------------------------------------ */
function penaltySection(penalty) {
  if (!penalty?.active) return '';
  const list = Array.isArray(penalty.pillars) && penalty.pillars.length
    ? penalty.pillars : (penalty.pillar ? [penalty.pillar] : []);
  if (!list.length) return '';
  return list.map(pillar => penaltyBanner(pillar, penalty.type)).join('');
}

function penaltyBanner(pillar, type = 'pushups') {
  const meta       = PILLAR_META[pillar] ?? {};
  const pillarName = meta.name ?? pillar;
  const cls        = meta.cls  ?? '';
  const action     = type === 'focus'
    ? `20 min focus (${pillarName})` : '40 pushups (split any way)';

  return `
    <div class="panel penalty-banner">
      <div class="system-label">[PENALTY QUEST &middot; ${meta.stat ?? pillar.toUpperCase()}]</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span class="tier-badge tier-none" style="border-color:var(--danger);color:var(--danger);">MISSED</span>
        <strong class="text-${cls}">${pillarName} Pillar</strong>
        <span class="muted text-xs">&mdash; not completed yesterday</span>
      </div>
      <p class="muted text-xs">
        Clear in Quests tab &rarr; <strong style="color:var(--text);">${action}</strong>
        OR <strong style="color:var(--text);">20 min focus in ${pillarName}</strong>.
        Earns 0 XP &mdash; just clears the badge.
      </p>
    </div>`;
}

/* -- Nearest upcoming exam ------------------------------------------ */
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

/* -- Utilities ------------------------------------------------------ */
function localDateMs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
