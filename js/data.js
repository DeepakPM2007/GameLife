/* ================================================================
   js/data.js — Static game data: quests, exercises, ladders,
                titles, shadow soldiers, Destiny Chapters.
   STUB for Phase 0. Full data filled in later phases.
   All numbers that appear in later phases must be constants here.
   ================================================================ */

/* ── Daily Quest Tiers (per pillar) ─────────────────────────────── */
export const QUEST_TIERS = {
  college: {
    minimum:  { label: '25 min focus',               xp: 40  },
    standard: { label: '90 min focus',               xp: 80  },
    elite:    { label: '180 min focus',              xp: 150 },
  },
  skill: {
    minimum:  { label: '30 min focus',               xp: 40  },
    standard: { label: '90 min focus',               xp: 80  },
    elite:    { label: '180 min focus',              xp: 150 },
  },
  physical: {
    minimum:  { label: '10 min mobility + hang',     xp: 40  },
    standard: { label: 'Full scheduled workout',     xp: 80  },
    elite:    { label: 'Workout + finisher',         xp: 150 },
    recovery: { label: 'Recovery Quest (rest day)',  xp: 80  }, // counts as standard
  },
  spirit: {
    minimum:  { label: 'Discipline check-in',                           xp: 40  },
    standard: { label: 'Check-in + 10 min practice',                   xp: 80  },
    elite:    { label: 'Check-in + practice + 3-line journal',         xp: 150 },
  },
};

/* ── Focus minute thresholds ────────────────────────────────────── */
export const FOCUS_THRESHOLDS = {
  college: { minimum: 25, standard: 90, elite: 180 },
  skill:   { minimum: 30, standard: 90, elite: 180 },
};

/* ── Weekly Split ───────────────────────────────────────────────── */
export const WEEKLY_SPLIT = [
  { day: 1, name: 'Push',           tag: 'push'     }, // Mon
  { day: 2, name: 'Pull + Hang',    tag: 'pull'     }, // Tue
  { day: 3, name: 'Legs + Core',    tag: 'legs'     }, // Wed
  { day: 4, name: 'Recovery',       tag: 'recovery' }, // Thu
  { day: 5, name: 'Upper Mix',      tag: 'upper'    }, // Fri
  { day: 6, name: 'Boss Gate',      tag: 'boss'     }, // Sat
  { day: 0, name: 'Rest',           tag: 'rest'     }, // Sun
];

/* ── Progression Ladders ────────────────────────────────────────── */
export const LADDERS = {
  push: [
    'Wall Pushup',
    'Incline Pushup',
    'Knee Pushup',
    'Standard Pushup',
    'Close-grip Pushup',
    'Feet-elevated Pushup',
    'Archer Pushup',
    'Pseudo-planche Pushup',
  ],
  pull: [
    'Dead Hang',
    'Scapular Pull',
    '5-sec Negative',
    'Jump-assisted Pullup',
    'Chin-up',
    'Pullup',
    'Wide Pullup',
    'L-sit Pullup',
    'Archer Pullup',
  ],
  legs: [
    'Bodyweight Squat',
    'Split Squat',
    'DB Bulgarian Split Squat',
    'Assisted Pistol Squat',
    'Pistol Squat',
  ],
  hang: [20, 30, 45, 60, 90, 120], // seconds targets
};

/* ── Titles ─────────────────────────────────────────────────────── */
export const ALL_TITLES = [
  { id: 'awakened',    label: 'The Awakened',         condition: 'Complete your first quest'          },
  { id: 'iron_will',   label: 'Iron Will',            condition: '7-day pillar streak'                },
  { id: 'unbroken',    label: 'Unbroken',             condition: '30-day pillar streak'               },
  { id: 'who_rose',    label: 'The One Who Rose',     condition: 'Reach Hunter Level 10'              },
  { id: 'scholar',     label: 'The Scholar',          condition: 'College Level 10'                   },
  { id: 'code_knight', label: 'Code Knight',          condition: 'Skill Level 10'                     },
  { id: 'iron_body',   label: 'Iron Body',            condition: 'Physical Level 10'                  },
  { id: 'vowed',       label: 'The Vowed',            condition: 'Complete Destiny Chapter I'         },
];

/* ── Shadow Army ─────────────────────────────────────────────────── */
// Original names; art will be silhouette SVGs (Phase 5).
export const ALL_SHADOWS = [
  { id: 'shade',    name: 'Shade',    streakDays: 3   },
  { id: 'ember',    name: 'Ember',    streakDays: 7   },
  { id: 'veil',     name: 'Veil',     streakDays: 14  },
  { id: 'ironclad', name: 'Ironclad', streakDays: 30  },
  { id: 'spectre',  name: 'Spectre',  streakDays: 60  },
  { id: 'wraith',   name: 'Wraith',   streakDays: 90  },
  { id: 'eternal',  name: 'Eternal',  streakDays: 180 },
  { id: 'ascendant',name: 'Ascendant',streakDays: 365 },
];

/* ── Destiny Chapters ────────────────────────────────────────────── */
export const CHAPTERS = [
  {
    id:    'ch1',
    title: 'Chapter I — The Vow',
    unlock: { spiritLevel: 5 },
    prompt: 'Write your personal vow and standards.',
  },
  {
    id:    'ch2',
    title: 'Chapter II — Become Worthy',
    unlock: { spiritLevel: 10, hunterLevel: 5 },
    prompt: 'Who do you need to become? List health, skill, career and character.',
  },
  {
    id:    'ch3',
    title: 'Chapter III — The Letter',
    unlock: { spiritLevel: 15 },
    prompt: 'Write a letter to your future life partner.',
  },
  {
    id:    'ch4',
    title: 'Chapter IV — The Destined Gate',
    unlock: { spiritLevel: 20, hunterLevel: 15 },
    prompt: 'Trust the timing. Keep rising.',
  },
];

/* ── Boss Gate reward amounts ────────────────────────────────────── */
export const BOSS_REWARD_XP = 300;

/* ── Exam Raid multiplier (final 14 days before exam) ───────────── */
export const EXAM_RAID_MULT = 1.5;
export const EXAM_RAID_DAYS = 14;
