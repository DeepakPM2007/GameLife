/* ================================================================
   js/ui/settings.js — Settings screen (Phase 0 placeholder)
   Full settings (PIN, sound, vibrate, name, reset, debug) in Phase 6.
   This module exports renderSettings() for use by the Status screen.
   ================================================================ */

import { exportJSON, importJSON, saveState } from '../store.js';
import { showModal, closeModal, showToast } from './components.js';

/**
 * Show the Settings panel as a modal overlay.
 * Called from the Status screen menu.
 * @param {Object} appState
 */
export function showSettings(appState) {
  showModal({
    title: '[SYSTEM] SETTINGS',
    body: `
      <div style="display:flex; flex-direction:column; gap:12px;">

        <div class="stat-row">
          <span class="stat-label">Hunter Name</span>
          <span class="stat-value">${appState.profile.name}</span>
        </div>

        <div class="stat-row">
          <span class="stat-label">Sound</span>
          <span class="stat-value">${appState.profile.sound ? 'ON' : 'OFF'}</span>
        </div>

        <div class="stat-row">
          <span class="stat-label">Vibrate</span>
          <span class="stat-value">${appState.profile.vibrate ? 'ON' : 'OFF'}</span>
        </div>

        <hr style="border-color:var(--line);">

        <button class="btn btn-primary btn-full" id="set-export">
          ↓ Export Backup JSON
        </button>

        <button class="btn btn-full" id="set-import">
          ↑ Import Backup JSON
        </button>

        <p class="muted text-xs" style="line-height:1.6;">
          Full settings (PIN lock, sound toggle, name edit, debug XP,
          data reset) arrive in Phase 6.
        </p>
      </div>
    `,
    buttons: [{ label: 'Close', type: '', action: 'settings-close', onClick: closeModal }],
  });

  // Wire export
  document.querySelector('#set-export')?.addEventListener('click', () => {
    exportJSON(appState);
    showToast('[SYSTEM] Backup exported.', 'success');
  });

  // Wire import
  document.querySelector('#set-import')?.addEventListener('click', async () => {
    try {
      const imported = await importJSON();
      saveState(imported);
      showToast('[SYSTEM] Backup restored! Reloading…', 'gold', 2200);
      closeModal();
      setTimeout(() => location.reload(), 2200);
    } catch (err) {
      showToast('[ERROR] ' + err.message, 'error');
    }
  });
}
