/* ================================================================
   js/store.js — Persistent state management for ARISE
   All reads/writes go through loadState() / saveState().
   Never throws away data; keeps corrupt backup in localStorage.
   ================================================================ */

const STORAGE_KEY  = 'arise_v1';          // primary localStorage key
const CORRUPT_KEY  = 'arise_v1_corrupt';  // fallback if parse fails
const SCHEMA_VER   = 1;

/* ── Date helper ────────────────────────────────────────────────── */

/** Returns today's local date string as "YYYY-MM-DD". */
export function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ── Default state ──────────────────────────────────────────────── */

/** Blank day entry – used when a new calendar day starts. */
export function defaultDay() {
  return {
    focusMin:    { college: 0, skill: 0 },
    tier:        { college: 'none', skill: 'none', physical: 'none', spirit: 'none' },
    sleepHours:  null,
    practiceMin: 0,
    journal:     '',
    perfect:     false,
    sets:        [],         // workout sets logged this day
  };
}

/** Full fresh default state (Phase 4 spec). */
function defaultState() {
  const today = getToday();
  const days  = {};
  days[today] = defaultDay();

  return {
    schemaVersion: SCHEMA_VER,

    profile: {
      name:     'Hunter',
      pinHash:  null,
      sound:    true,
      vibrate:  true,
    },

    lastOpenDate: today,

    pillars: {
      college:  { xp: 0, level: 1, streak: 0, best: 0, shields: 0 },
      skill:    { xp: 0, level: 1, streak: 0, best: 0, shields: 0 },
      physical: { xp: 0, level: 1, streak: 0, best: 0, shields: 0 },
      spirit:   { xp: 0, level: 1, streak: 0, best: 0, shields: 0 },
    },

    days,   // keyed by "YYYY-MM-DD"

    stamina: {
      value:     100,
      updatedAt: new Date().toISOString(),
    },

    training: {
      baseline:   {},                             // Awakening Test results
      ladderStep: { push: 3, pull: 2, legs: 0 }, // index into ladder arrays
      log:        [],                             // past workout summaries
    },

    discipline: {
      current:  0,    // current streak (days)
      best:     0,    // all-time best streak
      totalWon: 0,    // total clean days ever
      slips:    [],   // [{date, note}]
    },

    chapters: {
      unlocked: [],   // array of chapter IDs e.g. ['ch1']
      entries:  {},   // {ch1: 'text...', ch3: 'letter text...'}
    },

    shadows: [],        // unlocked shadow soldier IDs
    titles:  [],        // unlocked title IDs
    equippedTitle: '',

    exams: [],          // [{id, subject, date, label}]

    boss: {
      weekKey: '',      // "YYYY-WNN"
      cleared: false,
    },

    penalty: {
      active: false,
      pillar: '',       // which pillar triggered it
      type:   '',       // 'pushups' | 'focus'
    },
  };
}

/* ── Helpers ────────────────────────────────────────────────────── */

/**
 * Deep-merge missing keys from `defaults` into `state`.
 * Never overwrites existing values — only fills gaps.
 */
function mergeDefaults(state, defaults) {
  for (const key of Object.keys(defaults)) {
    if (!(key in state)) {
      // Deep-clone the default value
      state[key] = JSON.parse(JSON.stringify(defaults[key]));
    } else if (
      defaults[key] !== null &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key])
    ) {
      mergeDefaults(state[key], defaults[key]);
    }
  }
  return state;
}

/**
 * Migrate an old schema to the current version.
 * Add migration steps here as new schema versions are released.
 */
function migrate(raw) {
  if (!raw.schemaVersion) raw.schemaVersion = 1;
  // Future: if (raw.schemaVersion < 2) { ... raw.schemaVersion = 2; }
  return raw;
}

/* ── Ensure today's day entry exists ───────────────────────────── */

/**
 * Creates `state.days[today]` if it doesn't exist yet.
 * Returns today's date string.
 */
export function ensureTodayEntry(state) {
  const today = getToday();
  if (!state.days[today]) {
    state.days[today] = defaultDay();
  }
  return today;
}

/* ── Load ───────────────────────────────────────────────────────── */

/**
 * Load state from localStorage.
 * On parse error, keeps the raw string in `arise_v1_corrupt`
 * and returns fresh default state so the app never crashes.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    const parsed   = JSON.parse(raw);
    const migrated = migrate(parsed);
    // Fill any gaps introduced by new schema keys
    return mergeDefaults(migrated, defaultState());
  } catch (err) {
    console.error('[ARISE] State parse failed — using defaults.', err);
    // Preserve corrupt data for manual recovery
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(CORRUPT_KEY, raw);
    } catch (_) { /* storage full or private mode */ }
    return defaultState();
  }
}

/* ── Save ───────────────────────────────────────────────────────── */

/**
 * Persist `state` to localStorage.
 * Never throws — logs to console on failure.
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[ARISE] Save failed:', err);
  }
}

/* ── Export (download JSON file) ────────────────────────────────── */

/**
 * Triggers a browser download of the state as a JSON file.
 * No backend required — uses Blob + object URL.
 */
export function exportJSON(state) {
  const json  = JSON.stringify(state, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `arise-backup-${getToday()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Import (read JSON file) ────────────────────────────────────── */

/**
 * Opens the file picker, reads the chosen JSON file and returns a
 * Promise<state>. Rejects with an Error on bad file or parse error.
 */
export function importJSON() {
  return new Promise((resolve, reject) => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', () => {
      const file = input.files[0];
      document.body.removeChild(input); // clean up picker element

      if (!file) { reject(new Error('No file selected')); return; }

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const raw      = JSON.parse(e.target.result);
          const migrated = migrate(raw);
          const merged   = mergeDefaults(migrated, defaultState());
          resolve(merged);
        } catch {
          reject(new Error('Invalid backup file — JSON parse failed'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });

    input.click(); // open file picker
  });
}

/* ── Corrupt backup flag ────────────────────────────────────────── */

/** True if a corrupt backup was saved from a previous crash. */
export function hasCorruptBackup() {
  return Boolean(localStorage.getItem(CORRUPT_KEY));
}
