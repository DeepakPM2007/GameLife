/* ================================================================
   js/ui/extras.js — Extra screens: Shadow Army, Titles, Charts.
   Opened as overlays from the Status screen (not in bottom nav).
   Phase 5 builds these out.
   ================================================================ */

import { showModal, closeModal } from './components.js';

/**
 * Show the Shadow Army modal.
 * @param {Object} appState
 */
export function showShadowArmy(appState) {
  showModal({
    title: '[SHADOW ARMY]',
    body: `
      <p class="muted text-sm">
        Your shadow soldiers will appear here as you hit streak milestones
        (3, 7, 14, 30, 60, 90, 180, 365 days).
      </p>
      <p class="muted text-xs" style="margin-top:12px;">Phase 5 feature.</p>
    `,
    buttons: [{ label: 'Close', type: '', action: 'sa-close', onClick: closeModal }],
  });
}

/**
 * Show the Titles modal.
 * @param {Object} appState
 */
export function showTitles(appState) {
  showModal({
    title: '[TITLES]',
    body: `
      <p class="muted text-sm">
        Equippable titles are unlocked by reaching milestones.
        Your earned titles will appear here.
      </p>
      <p class="muted text-xs" style="margin-top:12px;">Phase 5 feature.</p>
    `,
    buttons: [{ label: 'Close', type: '', action: 'titles-close', onClick: closeModal }],
  });
}
