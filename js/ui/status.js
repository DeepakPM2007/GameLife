/* ================================================================
   js/ui/status.js — Status screen (Phase 1 — full implementation)
   Phase 2 fix: improved anime-style Hunter avatar SVG
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

/* ── Pillar display metadata ─────────────────────────────────────── */
const PILLAR_META = {
  college:  { cls: 'int', stat: 'INT', name: 'College',  full: 'INT · College'  },
  skill:    { cls: 'skl', stat: 'SKL', name: 'Skill',    full: 'SKL · Skill'    },
  physical: { cls: 'str', stat: 'STR', name: 'Physical', full: 'STR · Physical' },
  spirit:   { cls: 'spi', stat: 'SPI', name: 'Spirit',   full: 'SPI · Spirit'   },
};

/* ── Main render ─────────────────────────────────────────────────── */
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

    <!-- ── Identity card ─────────────────────────────────────────── -->
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
        ? `<div class="equipped-title">✦ ${escHtml(appState.equippedTitle)} ✦</div>`
        : `<div class="equipped-title" style="opacity:.35;">— No title equipped —</div>`}
    </div>

    <!-- ── Perfect Day progress ───────────────────────────────────── -->
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

    <!-- ── Stamina ───────────────────────────────────────────────── -->
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

    <!-- ── 4 Pillar cards ─────────────────────────────────────────── -->
    ${['college','skill','physical','spirit'].map(p => pillarCard(p, appState.pillars[p], dayData)).join('')}

    <!-- ── Exam countdown (if any exams added) ──────────────────── -->
    ${exam ? examPanel(exam) : ''}

    <!-- ── Penalty banner(s) — one per missed pillar ────────────── -->
    ${penaltySection(appState.penalty)}

    <!-- ── Data management (settings shortcut) ──────────────────── -->
    <div class="panel">
      <div class="section-title">Data</div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1; min-height:40px; padding:6px;"
                id="stat-export">↑ Export</button>
        <button class="btn" style="flex:1; min-height:40px; padding:6px;"
                id="stat-import">↓ Import</button>
      </div>
    </div>

  `;

  /* ── Wire export / import ───────────────────────────────────────── */
  container.querySelector('#stat-export').addEventListener('click', () => {
    exportJSON(appState);
    showToast('[SYSTEM] Backup exported.', 'success');
  });

  container.querySelector('#stat-import').addEventListener('click', async () => {
    try {
      const imported = await importJSON();
      saveState(imported);
      showToast('[SYSTEM] Data imported. Reloading…', 'success');
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      showToast('[SYSTEM] Import failed: ' + e.message, 'error');
    }
  });
}

/* ================================================================
   AVATAR — Anime-style Hunter silhouette
   Sharp angular design: long trench coat, spiky hair, glowing eyes,
   crossed arms or sword-ready stance. Rank-coloured aura.
   ================================================================ */
function avatarSVG(rankLabel) {
  const auraColors = {
    E: '#7a8ba3', D: '#38bdf8', C: '#a78bfa',
    B: '#f87171', A: '#fbbf24', S: '#38bdf8'
  };
  const aura = auraColors[rankLabel] || '#38bdf8';
  const aura2 = rankLabel === 'S' ? '#a78bfa' : aura;

  return `<svg class="avatar-svg" viewBox="0 0 120 180"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Soft radial aura behind figure -->
    <radialGradient id="ag-aura" cx="50%" cy="58%" r="52%">
      <stop offset="0%"   stop-color="${aura}"  stop-opacity="0.28"/>
      <stop offset="70%"  stop-color="${aura}"  stop-opacity="0.07"/>
      <stop offset="100%" stop-color="${aura}"  stop-opacity="0"/>
    </radialGradient>
    <!-- Eye glow filter -->
    <filter id="ag-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Hair glow -->
    <filter id="ag-hair-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background aura circle -->
  <ellipse cx="60" cy="104" rx="55" ry="72" fill="url(#ag-aura)"/>

  <!-- ── HAIR (spiky anime style) ──────────────────────────────── -->
  <!-- Back spikes -->
  <path d="M38 30 L28 8  L42 22Z"  fill="#0a1520" opacity="0.9"/>
  <path d="M46 26 L38 2  L52 20Z"  fill="#0a1520" opacity="0.9"/>
  <path d="M56 24 L52 0  L64 20Z"  fill="#0a1520" opacity="0.9"/>
  <path d="M68 26 L72 3  L78 22Z"  fill="#0a1520" opacity="0.9"/>
  <path d="M78 30 L90 10 L82 26Z"  fill="#0a1520" opacity="0.9"/>

  <!-- Hair body (dark) -->
  <path d="M36 32 Q36 15 60 14 Q84 15 84 32 Q80 26 60 25 Q40 26 36 32Z"
        fill="#111e2e"/>
  <!-- Hair highlight strip -->
  <path d="M46 18 Q54 15 68 18 Q62 16 60 16 Q52 16 46 18Z"
        fill="${aura}" opacity="0.18" filter="url(#ag-hair-glow)"/>

  <!-- ── HEAD ──────────────────────────────────────────────────── -->
  <!-- Face base -->
  <path d="M40 32 Q38 52 44 60 Q52 66 60 66 Q68 66 76 60 Q82 52 80 32 Q70 28 60 27 Q50 28 40 32Z"
        fill="#162030"/>
  <!-- Jaw / chin sharpening -->
  <path d="M48 60 Q54 68 60 70 Q66 68 72 60 Q66 65 60 65 Q54 65 48 60Z"
        fill="#162030"/>

  <!-- Ear hints -->
  <ellipse cx="40" cy="46" rx="3.5" ry="4" fill="#152535"/>
  <ellipse cx="80" cy="46" rx="3.5" ry="4" fill="#152535"/>

  <!-- ── EYES (glowing) ─────────────────────────────────────────── -->
  <!-- Left eye socket -->
  <ellipse cx="50" cy="45" rx="5.5" ry="4" fill="#0a1520"/>
  <!-- Right eye socket -->
  <ellipse cx="70" cy="45" rx="5.5" ry="4" fill="#0a1520"/>
  <!-- Left iris glow -->
  <ellipse cx="50" cy="45" rx="4"   ry="3"   fill="${aura}" opacity="0.9" filter="url(#ag-glow)"/>
  <!-- Right iris glow -->
  <ellipse cx="70" cy="45" rx="4"   ry="3"   fill="${aura}" opacity="0.9" filter="url(#ag-glow)"/>
  <!-- Left pupil -->
  <ellipse cx="50" cy="45" rx="2"   ry="2.2" fill="#ffffff" opacity="0.85"/>
  <!-- Right pupil -->
  <ellipse cx="70" cy="45" rx="2"   ry="2.2" fill="#ffffff" opacity="0.85"/>
  <!-- Sharp brow lines -->
  <line x1="44" y1="40" x2="56" y2="38" stroke="#0a1520" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="64" y1="38" x2="76" y2="40" stroke="#0a1520" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Nose bridge -->
  <path d="M58 50 L57 56 L60 57 L63 56 L62 50Z" fill="#0f1e2e" opacity="0.6"/>
  <!-- Mouth (determined set) -->
  <path d="M54 61 Q60 63 66 61" stroke="#0a1520" stroke-width="1.8" fill="none" stroke-linecap="round"/>

  <!-- ── NECK ───────────────────────────────────────────────────── -->
  <rect x="54" y="66" width="12" height="10" rx="3" fill="#152535"/>

  <!-- ── TRENCH COAT — upper body ───────────────────────────────── -->
  <!-- Coat body -->
  <path d="M24 80 L40 70 L54 72 L60 74 L66 72 L80 70 L96 80
           L98 128 L60 134 L22 128 Z"
        fill="#0d1a28"/>
  <!-- Coat lapels -->
  <path d="M54 72 L44 92 L52 94 L60 86 Z" fill="#152535"/>
  <path d="M66 72 L76 92 L68 94 L60 86 Z" fill="#152535"/>
  <!-- Collar raised -->
  <path d="M46 70 Q60 66 74 70 Q70 72 60 73 Q50 72 46 70Z" fill="#152535"/>

  <!-- Inner shirt/armour line -->
  <rect x="56" y="86" width="8" height="30" rx="2" fill="#1e3a5f" opacity="0.4"/>

  <!-- ── SHOULDERS (pauldron-like) ──────────────────────────────── -->
  <!-- Left shoulder -->
  <path d="M24 80 L14 72 L18 88 L28 90 Z" fill="#152535"/>
  <!-- Right shoulder -->
  <path d="M96 80 L106 72 L102 88 L92 90 Z" fill="#152535"/>

  <!-- ── ARMS ───────────────────────────────────────────────────── -->
  <!-- Left arm — slightly raised, power pose -->
  <path d="M28 90 L14 95 L10 125 L22 128 L24 102 L34 96 Z" fill="#152535"/>
  <!-- Left fist -->
  <ellipse cx="16" cy="128" rx="7" ry="6" fill="#162030"/>
  <!-- Right arm — mirrored -->
  <path d="M92 90 L106 95 L110 125 L98 128 L96 102 L86 96 Z" fill="#152535"/>
  <!-- Right fist -->
  <ellipse cx="104" cy="128" rx="7" ry="6" fill="#162030"/>

  <!-- ── COAT LOWER — dramatic split hem ────────────────────────── -->
  <!-- Left coat panel -->
  <path d="M22 128 L14 170 L46 172 L54 148 L60 134 Z" fill="#0a1520"/>
  <!-- Right coat panel -->
  <path d="M98 128 L106 170 L74 172 L66 148 L60 134 Z" fill="#0a1520"/>
  <!-- Gap/shadow between panels -->
  <path d="M54 148 L60 180 L66 148 L60 134 Z" fill="#05070d"/>

  <!-- Coat hem edge highlights -->
  <path d="M14 170 L46 172" stroke="${aura}" stroke-width="0.8" opacity="0.3"/>
  <path d="M74 172 L106 170" stroke="${aura}" stroke-width="0.8" opacity="0.3"/>

  <!-- ── BELT ───────────────────────────────────────────────────── -->
  <rect x="38" y="126" width="44" height="6" rx="2" fill="#1e3a5f"/>
  <!-- Belt buckle -->
  <rect x="56" y="124" width="8" height="8" rx="1" fill="${aura}" opacity="0.5"/>

  <!-- ── TROUSERS ───────────────────────────────────────────────── -->
  <rect x="40" y="132" width="16" height="36" rx="4" fill="#152535"/>
  <rect x="64" y="132" width="16" height="36" rx="4" fill="#152535"/>

  <!-- ── BOOTS ──────────────────────────────────────────────────── -->
  <path d="M38 162 L40 168 L58 168 L58 162 Z" rx="3" fill="#0a1520"/>
  <path d="M62 162 L62 168 L80 168 L82 162 Z" rx="3" fill="#0a1520"/>
  <!-- Boot highlights -->
  <line x1="42" y1="163" x2="56" y2="163" stroke="${aura}" stroke-width="0.7" opacity="0.25"/>
  <line x1="64" y1="163" x2="78" y2="163" stroke="${aura}" stroke-width="0.7" opacity="0.25"/>

  <!-- ── ENERGY PARTICLES (floating) ───────────────────────────── -->
  <circle cx="8"   cy="85"  r="2"   fill="${aura}"  opacity="0.5"/>
  <circle cx="112" cy="78"  r="1.5" fill="${aura}"  opacity="0.4"/>
  <circle cx="6"   cy="118" r="1.5" fill="${aura2}" opacity="0.4"/>
  <circle cx="114" cy="112" r="2"   fill="${aura2}" opacity="0.35"/>
  <circle cx="16"  cy="150" r="1"   fill="${aura}"  opacity="0.3"/>
  <circle cx="104" cy="145" r="1"   fill="${aura}"  opacity="0.3"/>
  <circle cx="30"  cy="62"  r="1"   fill="${aura}"  opacity="0.25"/>
  <circle cx="90"  cy="58"  r="1"   fill="${aura}"  opacity="0.25"/>

  <!-- ── RANK RUNE (small, bottom centre) ──────────────────────── -->
  <text x="60" y="176" text-anchor="middle" font-family="'Orbitron',monospace"
        font-size="6" font-weight="900" fill="${aura}" opacity="0.55"
        letter-spacing="3">${rankLabel}-RANK</text>

  <!-- Ground shadow -->
  <ellipse cx="60" cy="174" rx="30" ry="3.5" fill="${aura}" opacity="0.08"/>
</svg>`;
}

/* ── Perfect-day pip (one per pillar) ────────────────────────────── */
function pipHtml(pillar, dayData) {
  const { cls, stat, name } = PILLAR_META[pillar];
  const tier = getTierForDay(dayData, pillar);
  const met  = tier === 'standard' || tier === 'elite' || tier === 'recovery';
  const icon = tier === 'elite' ? '★' : (met ? '✓' : stat);

  return `
    <div class="pip-item">
      <div class="pip-circle ${cls} ${met ? 'met' : ''}"
           aria-label="${name}: ${met ? tier : 'not completed'}">${icon}</div>
      <span class="pip-label">${name}</span>
    </div>`;
}

/* ── Pillar XP card ──────────────────────────────────────────────── */
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

/* ── Exam countdown card ─────────────────────────────────────────── */
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
          ? `<div class="exam-raid-active">⚔ EXAM RAID · College XP ×${EXAM_RAID_MULT}</div>`
          : ''}
      </div>
    </div>`;
}

/* ── Penalty section — one banner card per missed pillar ─────────── */
function penaltySection(penalty) {
  if (!penalty?.active) return '';

  const list = Array.isArray(penalty.pillars) && penalty.pillars.length
    ? penalty.pillars
    : (penalty.pillar ? [penalty.pillar] : []);

  if (!list.length) return '';

  return list.map(pillar => penaltyBanner(pillar, penalty.type)).join('');
}

/* ── Single penalty banner ───────────────────────────────────────── */
function penaltyBanner(pillar, type = 'pushups') {
  const meta       = PILLAR_META[pillar] ?? {};
  const pillarName = meta.name ?? pillar;
  const cls        = meta.cls  ?? '';
  const action     = type === 'focus'
    ? `20 min focus (${pillarName})`
    : '40 pushups (split any way)';

  return `
    <div class="panel penalty-banner">
      <div class="system-label">[PENALTY QUEST · ${(meta.stat ?? pillar.toUpperCase())}]</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span class="tier-badge tier-none" style="border-color:var(--danger);color:var(--danger);">MISSED</span>
        <strong class="text-${cls}">${pillarName} Pillar</strong>
        <span class="muted text-xs">— not completed yesterday</span>
      </div>
      <p class="muted text-xs">
        Clear in Quests tab → <strong style="color:var(--text);">${action}</strong>
        OR <strong style="color:var(--text);">20 min focus in ${pillarName}</strong>.
        Earns 0 XP — just clears the badge.
      </p>
    </div>`;
}

/* ── Nearest upcoming exam ───────────────────────────────────────── */
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

/* ── Utilities ───────────────────────────────────────────────────── */
function localDateMs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
