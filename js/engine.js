/* ================================================================
   js/engine.js — Core game logic for ARISE
   XP · Levels · Ranks · Streaks · Stamina · Rollover · Perfect Day
   All game numbers live as constants here (Spec rule 6).
   ================================================================ */

import { getToday, defaultDay } from './store.js';

/* ── Pillar order (canonical) ────────────────────────────────── */
export const PILLARS = ['college', 'skill', 'physical', 'spirit'];

/* ── XP & Level constants ────────────────────────────────────── */
export const XP_TIERS = {
  minimum:  40,
  standard: 80,
  elite:    150,
};

/** Bonus awarded when all 4 pillars reach Standard+ in one day. Split 25 per pillar. */
export const PERFECT_DAY_BONUS_PER_PILLAR = 25; // × 4 = 100 total

/**
 * XP required to advance from level L to L+1.
 * L=1→2: 60 XP   L=10→11: ~1 897 XP
 */
export function xpToNext(level) {
  return Math.round(60 * Math.pow(level, 1.5));
}

/* ── Ranks ───────────────────────────────────────────────────── */
export const RANKS = [
  { min:  1, label: 'E', display: 'E-RANK', color: 'var(--muted)'   },
  { min:  5, label: 'D', display: 'D-RANK', color: 'var(--col-int)' },
  { min: 10, label: 'C', display: 'C-RANK', color: 'var(--col-skl)' },
  { min: 20, label: 'B', display: 'B-RANK', color: 'var(--col-str)' },
  { min: 35, label: 'A', display: 'A-RANK', color: 'var(--gold)'    },
  { min: 50, label: 'S', display: 'S-RANK', color: 'var(--glow)'    },
];

/** Returns the rank object for a given Hunter Level. */
export function getRank(hunterLvl) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (hunterLvl >= r.min) rank = r; }
  return rank;
}

/**
 * Hunter Level = floor(average of the 4 pillar levels).
 * Weakest pillar drags the whole level down on purpose.
 */
export function hunterLevel(pillars) {
  const levels = PILLARS.map(k => pillars[k].level);
  return Math.floor(levels.reduce((a, b) => a + b, 0) / levels.length);
}

/* ── Streak XP multipliers ───────────────────────────────────── */
export const STREAK_MULT = [
  { days:  7, mult: 1.10 },
  { days: 30, mult: 1.25 },
  { days: 90, mult: 1.50 },
];

/** Returns the XP streak multiplier (max 1.5×) for a given streak length. */
export function streakMultiplier(streak) {
  let mult = 1.0;
  for (const s of STREAK_MULT) { if (streak >= s.days) mult = s.mult; }
  return mult;
}

/* ── Stamina constants ───────────────────────────────────────── */
export const STAMINA = {
  max:           100,
  regenPerHour:    4,  // passive
  sleepBonus:     20,  // sleep ≥ 7 h → +20 instantly
  sleepLowHours:   5,  // sleep < 5 h caps stamina at 70
  sleepCap:       70,
  costNormal:      3,  // per logged set
  costHard:        5,  // per set marked Hard
  threshFresh:    60,  // ≥ 60 → Fresh
  threshTired:    30,  // 30-59 → Tired, < 30 → Exhausted
};

/** Returns {label, color} for the current stamina value. */
export function staminaStatus(value) {
  if (value >= STAMINA.threshFresh) return { label: 'FRESH',     color: 'var(--col-str)' };
  if (value >= STAMINA.threshTired) return { label: 'TIRED',     color: 'var(--gold)'    };
  return                                   { label: 'EXHAUSTED', color: 'var(--danger)'  };
}

/* ── Focus minute tier thresholds ────────────────────────────── */
export const FOCUS_THRESH = {
  college: { minimum: 25, standard: 90,  elite: 180 },
  skill:   { minimum: 30, standard: 90,  elite: 180 },
};

/* ── Exam Raid constants ─────────────────────────────────────── */
export const EXAM_RAID_DAYS = 14;    // days before exam where ×1.5 applies
export const EXAM_RAID_MULT = 1.5;

/* ── Boss Gate reward ────────────────────────────────────────── */
export const BOSS_REWARD_XP = 300;

/* ================================================================
   STAMINA REGEN (lazy — computed from stored timestamp)
   ================================================================ */

/**
 * Update state.stamina based on hours elapsed since last update.
 * Called once per app open; never requires background timers.
 */
export function computeStamina(state) {
  const now       = Date.now();
  const updatedAt = new Date(state.stamina.updatedAt).getTime();
  const hours     = (now - updatedAt) / 3_600_000;
  const regen     = hours * STAMINA.regenPerHour;
  state.stamina.value     = Math.min(STAMINA.max, Math.round((state.stamina.value + regen) * 10) / 10);
  state.stamina.updatedAt = new Date().toISOString();
}

/**
 * Spend stamina for a workout set.
 * @param {object} state
 * @param {boolean} isHard
 * @returns {number} new stamina value
 */
export function spendStamina(state, isHard = false) {
  const cost = isHard ? STAMINA.costHard : STAMINA.costNormal;
  state.stamina.value = Math.max(0, state.stamina.value - cost);
  state.stamina.updatedAt = new Date().toISOString();
  return state.stamina.value;
}

/* ================================================================
   EXAM RAID MULTIPLIER
   ================================================================ */

/** Returns 1.5 if any exam falls within the next 14 days, else 1.0. */
export function getExamMult(state, today) {
  if (!state.exams?.length) return 1.0;
  const todayMs = localDateMs(today);
  for (const exam of state.exams) {
    const days = Math.ceil((localDateMs(exam.date) - todayMs) / 86_400_000);
    if (days >= 0 && days <= EXAM_RAID_DAYS) return EXAM_RAID_MULT;
  }
  return 1.0;
}

/* ================================================================
   XP — Add to a pillar, handle level-ups
   ================================================================ */

/**
 * Award rawXp to a pillar, applying streak and exam multipliers.
 * Handles multi-level-up in one call.
 *
 * @param {object} state
 * @param {string} pillar – 'college'|'skill'|'physical'|'spirit'
 * @param {number} rawXp  – base XP before multipliers
 * @returns {{ xpAdded:number, levelUps:Array<{pillar,level}> }}
 */
export function addXp(state, pillar, rawXp) {
  const today = getToday();
  const p     = state.pillars[pillar];
  const mult  = streakMultiplier(p.streak);
  const exam  = pillar === 'college' ? getExamMult(state, today) : 1.0;
  const xpAdded = Math.round(rawXp * mult * exam);

  p.xp += xpAdded;

  const levelUps = [];
  while (p.xp >= xpToNext(p.level)) {
    p.xp    -= xpToNext(p.level);
    p.level += 1;
    levelUps.push({ pillar, level: p.level });
  }

  return { xpAdded, levelUps };
}

/* ================================================================
   TIER EVALUATION
   ================================================================ */

/**
 * Determine the tier a pillar reached on a given day.
 * Uses stored tier first; falls back to computing from focus minutes.
 *
 * @param {object} dayData – state.days[dateStr]
 * @param {string} pillar
 * @returns {'none'|'minimum'|'standard'|'elite'}
 */
export function getTierForDay(dayData, pillar) {
  // 1. Use explicitly stored value if already set by Phase 2 / quest logic
  const stored = (dayData?.tier ?? {})[pillar];
  if (stored && stored !== 'none') return stored;

  // 2. Fallback: compute college/skill tier from logged focus minutes
  if (pillar === 'college' || pillar === 'skill') {
    const mins  = (dayData?.focusMin ?? {})[pillar] ?? 0;
    const t     = FOCUS_THRESH[pillar];
    if (mins >= t.elite)    return 'elite';
    if (mins >= t.standard) return 'standard';
    if (mins >= t.minimum)  return 'minimum';
  }
  return 'none';
}

/* ================================================================
   PERFECT DAY
   ================================================================ */

/**
 * Returns how many pillars hit Standard+ today, and whether the
 * Perfect Day bonus should fire.
 *
 * @param {object} dayData – today's day entry
 * @returns {{ count:number, done:boolean }}
 */
export function perfectDayStatus(dayData) {
  let count = 0;
  for (const p of PILLARS) {
    const t = getTierForDay(dayData, p);
    if (t === 'standard' || t === 'elite') count++;
  }
  return { count, done: count === PILLARS.length };
}

/* ================================================================
   ROLLOVER — Called once per app open
   Processes all completed days since lastOpenDate.
   ================================================================ */

/**
 * Main rollover function.
 * - Regens stamina (lazy).
 * - For each completed day since lastOpenDate: updates pillar streaks,
 *   discipline streak, awards shields, sets penalty if needed.
 * - Advances lastOpenDate to today.
 *
 * @param {object} state – the full mutable state object
 */
export function rollover(state) {
  // Always regen stamina first (lazy, from stored timestamp)
  computeStamina(state);

  const today = getToday();
  if (state.lastOpenDate === today) return; // already processed today

  // Collect all COMPLETED dates (lastOpenDate inclusive → yesterday inclusive)
  const completed = localDateRange(state.lastOpenDate, today);

  for (const dateStr of completed) {
    const dayData = state.days[dateStr] ?? defaultDay();

    /* ── Per-pillar streak update ──────────────────────────── */
    for (const pillar of PILLARS) {
      const p    = state.pillars[pillar];
      const tier = getTierForDay(dayData, pillar);

      if (tier === 'none') {
        // Missed — spend a shield or break the streak
        if (p.shields > 0) {
          p.shields--;
          p.streak++;                               // shield preserves streak
          if (p.streak > p.best) p.best = p.streak;
        } else {
          p.streak = 0;                             // streak broken
        }
      } else {
        p.streak++;
        if (p.streak > p.best) p.best = p.streak;
        // Award a shield every 7-day streak milestone (max 2 stacked)
        if (p.streak % 7 === 0 && p.shields < 2) {
          p.shields = Math.min(2, p.shields + 1);
        }
      }
    }

    /* ── Discipline streak (Spirit-specific) ───────────────── */
    const spiritTier = getTierForDay(dayData, 'spirit');
    if (spiritTier !== 'none') {
      state.discipline.current++;
      state.discipline.totalWon++;
      if (state.discipline.current > state.discipline.best) {
        state.discipline.best = state.discipline.current;
      }
    } else {
      // No spirit quest → discipline streak resets (slips handled by Spirit screen)
      state.discipline.current = 0;
    }
  }

  /* ── Penalty: recalculate from the most recently completed day ─ */
  // Always recalculate (no !active guard) so re-opens stay accurate.
  // Collect EVERY pillar that missed on the last completed day.
  const lastDate = completed.at(-1);
  if (lastDate) {
    const lastDayData   = state.days[lastDate] ?? defaultDay();
    const missedPillars = PILLARS.filter(p => getTierForDay(lastDayData, p) === 'none');

    if (missedPillars.length > 0) {
      state.penalty = {
        active:  true,
        pillars: missedPillars,          // ALL missed pillars shown as separate banners
        pillar:  missedPillars[0],       // kept for backward-compat
        type:    'pushups',
      };
    } else {
      // Yesterday everything was completed — clear any old penalty
      state.penalty = { active: false, pillars: [], pillar: '', type: '' };
    }
  }

  // Ensure today's entry exists
  if (!state.days[today]) state.days[today] = defaultDay();

  state.lastOpenDate = today;
}

/* ================================================================
   INTERNAL HELPERS
   ================================================================ */

/** Convert "YYYY-MM-DD" to ms since epoch using LOCAL date (no TZ shift). */
function localDateMs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * Returns array of "YYYY-MM-DD" strings from startStr (inclusive)
 * to endStr (exclusive).  Uses local calendar dates to avoid DST issues.
 */
function localDateRange(startStr, endStr) {
  const result = [];
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end   = new Date(ey, em - 1, ed);
  const cur   = new Date(start);

  while (cur < end) {
    result.push(fmt(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

/** Format a Date object as "YYYY-MM-DD" in local time. */
function fmt(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

/* ================================================================
   PHASE 2 — New engine exports
   logFocusMinutes · logManualTier · clearPenaltyPillar · logSleep
   ================================================================ */

/** XP awarded per tier (absolute). Incremental award = newXP - prevXP. */
export const TIER_XP = { none: 0, minimum: 40, standard: 80, elite: 150, recovery: 80 };

/**
 * Add focus minutes to college or skill; auto-compute tier upgrade;
 * award incremental XP.  Call after every Focus Timer session.
 *
 * @param {object} state
 * @param {'college'|'skill'} pillar
 * @param {number} minutes  – whole minutes to add
 * @returns {{ xpAdded, levelUps, tierChanged, perfectDay, newTier, totalMin }}
 */
export function logFocusMinutes(state, pillar, minutes) {
  if (minutes <= 0) {
    return { xpAdded: 0, levelUps: [], tierChanged: false, perfectDay: false, newTier: 'none', totalMin: 0 };
  }

  const today   = getToday();
  const dayData = state.days[today];

  const prevTier = getTierForDay(dayData, pillar);

  // Accumulate
  dayData.focusMin[pillar] = (dayData.focusMin[pillar] || 0) + minutes;
  const totalMin = dayData.focusMin[pillar];

  // Compute new tier
  const newTier  = _focusTier(totalMin, pillar);
  dayData.tier[pillar] = newTier;

  return { ..._awardIncremental(state, pillar, prevTier, newTier, today), newTier, totalMin };
}

/**
 * Log a manual tier for physical or spirit.
 * Only upgrades — can't reduce a day's tier.
 *
 * @param {object} state
 * @param {'physical'|'spirit'} pillar
 * @param {'minimum'|'standard'|'recovery'|'elite'} tier
 * @returns {{ xpAdded, levelUps, tierChanged, perfectDay, newTier }}
 */
export function logManualTier(state, pillar, tier) {
  const today   = getToday();
  const dayData = state.days[today];

  const prevTier = getTierForDay(dayData, pillar);
  const prevXP   = TIER_XP[prevTier] ?? 0;
  const newXP    = TIER_XP[tier]     ?? 0;

  if (newXP <= prevXP) {
    return { xpAdded: 0, levelUps: [], tierChanged: false, perfectDay: false, newTier: prevTier };
  }

  // For Recovery Quest, store as 'standard' for consistency
  const storedTier = tier === 'recovery' ? 'standard' : tier;
  dayData.tier[pillar] = storedTier;

  return { ..._awardIncremental(state, pillar, prevTier, storedTier, today), newTier: storedTier };
}

/**
 * Remove one pillar from the active penalty list.
 * When all pillars are cleared, penalty becomes inactive.
 */
export function clearPenaltyPillar(state, pillar) {
  const p    = state.penalty;
  const list = Array.isArray(p.pillars) && p.pillars.length
    ? p.pillars
    : (p.pillar ? [p.pillar] : []);
  const remaining = list.filter(x => x !== pillar);
  state.penalty = {
    active:  remaining.length > 0,
    pillars: remaining,
    pillar:  remaining[0] || '',
    type:    p.type || 'pushups',
  };
}

/**
 * Log sleep hours for today; adjusts stamina immediately.
 * Sleep ≥7h → +20 stamina. Sleep <5h → cap at 70.
 */
export function logSleep(state, hours) {
  const today = getToday();
  state.days[today].sleepHours = hours;

  if (hours < STAMINA.sleepLowHours) {
    state.stamina.value = Math.min(state.stamina.value, STAMINA.sleepCap);
  } else if (hours >= 7) {
    state.stamina.value = Math.min(STAMINA.max, state.stamina.value + STAMINA.sleepBonus);
  }
  state.stamina.updatedAt = new Date().toISOString();
}

/* ── Phase 2 internal helpers ───────────────────────────────── */

/** Compute tier from focus minutes for a given pillar. */
function _focusTier(mins, pillar) {
  const t = FOCUS_THRESH[pillar];
  if (!t) return 'none';
  if (mins >= t.elite)    return 'elite';
  if (mins >= t.standard) return 'standard';
  if (mins >= t.minimum)  return 'minimum';
  return 'none';
}

/**
 * Award incremental XP when tier upgrades; check Perfect Day.
 * Returns { xpAdded, levelUps, tierChanged, perfectDay }.
 */
function _awardIncremental(state, pillar, prevTier, newTier, today) {
  const prevXP = TIER_XP[prevTier] ?? 0;
  const newXP  = TIER_XP[newTier]  ?? 0;

  if (newXP <= prevXP) {
    return { xpAdded: 0, levelUps: [], tierChanged: false, perfectDay: false };
  }

  const { xpAdded, levelUps } = addXp(state, pillar, newXP - prevXP);

  // Perfect Day: all 4 pillars at Standard+ in one day
  let perfectDay = false;
  const { done } = perfectDayStatus(state.days[today]);
  if (done && !state.days[today].perfect) {
    state.days[today].perfect = true;
    perfectDay = true;
    // Award bonus XP to all pillars
    for (const p of PILLARS) {
      addXp(state, p, PERFECT_DAY_BONUS_PER_PILLAR);
    }
  }

  return { xpAdded, levelUps, tierChanged: true, perfectDay };
}
