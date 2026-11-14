/* ================================================================
   js/engine.js — XP, levels, ranks, streaks, stamina, penalty
   STUB for Phase 0.  All game constants will live here.
   Phase 1 builds this out fully.
   ================================================================ */

/* ── XP / Level constants (from spec) ───────────────────────────── */
export const XP_TIERS = {
  minimum:  40,
  standard: 80,
  elite:    150,
};

export const PERFECT_DAY_BONUS = 100; // split 25 XP per pillar

/** XP needed to go from level L to L+1. */
export function xpToNext(level) {
  return Math.round(60 * Math.pow(level, 1.5));
}

/** Rank thresholds by Hunter Level. */
export const RANKS = [
  { min:  1, label: 'E', display: 'E-RANK' },
  { min:  5, label: 'D', display: 'D-RANK' },
  { min: 10, label: 'C', display: 'C-RANK' },
  { min: 20, label: 'B', display: 'B-RANK' },
  { min: 35, label: 'A', display: 'A-RANK' },
  { min: 50, label: 'S', display: 'S-RANK' },
];

/** Returns the rank object for a given Hunter Level. */
export function getRank(hunterLevel) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (hunterLevel >= r.min) rank = r;
  }
  return rank;
}

/** Hunter Level = floor(average of the 4 pillar levels). */
export function hunterLevel(pillars) {
  const levels = Object.values(pillars).map(p => p.level);
  return Math.floor(levels.reduce((a, b) => a + b, 0) / levels.length);
}

/* ── Stamina constants ──────────────────────────────────────────── */
export const STAMINA = {
  max:         100,
  regenPerHour: 4,
  sleepBonus:   20,   // awarded when sleep >= 7h
  sleepCapHours: 5,   // sleep < 5h caps stamina at 70
  sleepCap:     70,
  costNormal:    3,   // per logged set
  costHard:      5,   // per logged set marked Hard
  threshFresh:   60,  // >= 60: Fresh
  threshTired:   30,  // 30-59: Tired
                      // < 30:  Exhausted
};

/* ── Streak multipliers ─────────────────────────────────────────── */
export const STREAK_MULT = [
  { days:  7, mult: 1.10 },
  { days: 30, mult: 1.25 },
  { days: 90, mult: 1.50 },
];

/** Returns the streak XP multiplier for a given streak length. */
export function streakMultiplier(streak) {
  let mult = 1.0;
  for (const s of STREAK_MULT) {
    if (streak >= s.days) mult = s.mult;
  }
  return mult;
}

// Phase 1 will add: addXp(), rollover(), evaluatePenalty(), etc.
