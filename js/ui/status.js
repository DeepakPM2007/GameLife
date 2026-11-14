/* ================================================================
   js/ui/status.js — Status screen (Phase 0 shell)
   Shows design system preview + data export / import.
   Phase 1 will replace the placeholder content with the full
   Status Window: avatar, stats, XP bars, stamina, exam countdown.
   ================================================================ */

import { exportJSON, importJSON, saveState } from '../store.js';
import { showToast } from './components.js';

/**
 * Render the Status tab into `container`.
 * @param {HTMLElement} container
 * @param {Object}      appState  – the global mutable state object
 */
export function renderStatus(container, appState) {
  container.innerHTML = `

    <!-- System banner -->
    <div class="system-label">[SYSTEM] ARISE INITIALIZED — AWAITING HUNTER</div>

    <!-- Identity card -->
    <div class="panel panel-cut">
      <div class="system-label">[STATUS WINDOW]</div>

      <!-- ARISE logo -->
      <div style="text-align:center; padding:16px 0 10px;">
        <div style="font-family:'Orbitron',monospace;
                    font-size:2.4rem; font-weight:900;
                    color:var(--glow); letter-spacing:0.25em;
                    text-shadow:0 0 20px rgba(56,189,248,.6),
                                0 0 40px rgba(56,189,248,.25);">
          ARISE
        </div>
        <div style="color:var(--muted); font-size:0.72rem;
                    letter-spacing:0.2em; text-transform:uppercase; margin-top:4px;">
          Life Leveling System · v0.1
        </div>
      </div>

      <!-- Basic stats -->
      <div class="stat-row">
        <span class="stat-label">Hunter</span>
        <span class="stat-value">${appState.profile.name}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Hunter Level</span>
        <span class="stat-value mono text-glow">1</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Rank</span>
        <span class="badge badge-rank" style="margin:0;">E-RANK</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Schema</span>
        <span class="stat-value mono">v${appState.schemaVersion}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Today</span>
        <span class="stat-value mono">${appState.lastOpenDate}</span>
      </div>
    </div>

    <!-- Design system preview — 4 pillar bars -->
    <div class="panel">
      <div class="section-title">Pillar Stats (Phase 1 preview)</div>

      <div style="margin-bottom:4px;" class="stat-row">
        <span class="text-int" style="font-size:.8rem;font-weight:700;">INT · College</span>
        <span class="stat-value text-int">Lv ${appState.pillars.college.level}</span>
      </div>
      <div class="bar-wrap bar-lg mb-12"><div class="bar-fill int" style="width:35%;"></div></div>

      <div style="margin-bottom:4px;" class="stat-row">
        <span class="text-skl" style="font-size:.8rem;font-weight:700;">SKL · Skill</span>
        <span class="stat-value text-skl">Lv ${appState.pillars.skill.level}</span>
      </div>
      <div class="bar-wrap bar-lg mb-12"><div class="bar-fill skl" style="width:60%;"></div></div>

      <div style="margin-bottom:4px;" class="stat-row">
        <span class="text-str" style="font-size:.8rem;font-weight:700;">STR · Physical</span>
        <span class="stat-value text-str">Lv ${appState.pillars.physical.level}</span>
      </div>
      <div class="bar-wrap bar-lg mb-12"><div class="bar-fill str" style="width:20%;"></div></div>

      <div style="margin-bottom:4px;" class="stat-row">
        <span class="text-spi" style="font-size:.8rem;font-weight:700;">SPI · Spirit</span>
        <span class="stat-value text-spi">Lv ${appState.pillars.spirit.level}</span>
      </div>
      <div class="bar-wrap bar-lg mb-12"><div class="bar-fill spi" style="width:50%;"></div></div>

      <!-- Stamina bar -->
      <div class="stat-row mb-8">
        <span class="stat-label">Stamina</span>
        <span class="stat-value text-gold">${appState.stamina.value} / 100</span>
      </div>
      <div class="bar-wrap bar-xl">
        <div class="bar-fill stamina" style="width:${appState.stamina.value}%;"></div>
      </div>
    </div>

    <!-- Sample badges -->
    <div class="panel">
      <div class="section-title">Badges &amp; Titles</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <span class="badge badge-rank">E-RANK</span>
        <span class="badge" style="border:1px solid var(--muted); color:var(--muted);">
          THE AWAKENED
        </span>
        <span class="badge" style="border:1px solid var(--col-spi); color:var(--col-spi);">
          VOWED
        </span>
      </div>
    </div>

    <!-- Data management -->
    <div class="panel">
      <div class="section-title">Data Management</div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn btn-primary btn-full" id="btn-export">
          ↓ Export Backup JSON
        </button>
        <button class="btn btn-full" id="btn-import">
          ↑ Import Backup JSON
        </button>
      </div>
      <p class="muted text-xs" style="margin-top:10px; line-height:1.6;">
        Your data never leaves this device. Export regularly as a backup.
        Import replaces current data and reloads the app.
      </p>
    </div>

  `;

  /* ── Wire export button ───────────────────────────────────────── */
  container.querySelector('#btn-export').addEventListener('click', () => {
    exportJSON(appState);
    showToast('[SYSTEM] Backup exported.', 'success');
  });

  /* ── Wire import button ───────────────────────────────────────── */
  container.querySelector('#btn-import').addEventListener('click', async () => {
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
