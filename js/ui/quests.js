/* ================================================================
   js/ui/quests.js — Quests screen (Phase 0 placeholder)
   Full quest cards, tier checkboxes and boss gate built in Phase 2.
   ================================================================ */

/**
 * Render the Quests tab.
 * @param {HTMLElement} container
 * @param {Object}      appState
 */
export function renderQuests(container, appState) {
  container.innerHTML = `
    <div class="system-label">[SYSTEM] DAILY QUEST BOARD</div>

    <div class="panel panel-cut">
      <div class="system-label">[QUESTS — PHASE 2 COMING]</div>
      <div class="placeholder-screen" style="min-height:40vh;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"
             stroke="var(--glow)" stroke-width="1.5" opacity="0.4">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <h2>Quest Board</h2>
        <p>Daily quests, tier checkboxes,<br>and the weekly Boss Gate<br>arrive in Phase 2.</p>
        <p class="muted text-xs" style="margin-top:8px;">
          Date: ${appState.lastOpenDate}
        </p>
      </div>
    </div>

    <!-- Quest card skeletons to show layout -->
    ${['INT · College', 'SKL · Skill', 'STR · Physical', 'SPI · Spirit'].map((label, i) => {
      const cls = ['int','skl','str','spi'][i];
      return `
        <div class="panel" style="opacity:.4; pointer-events:none;">
          <div class="stat-row">
            <span class="text-${cls}" style="font-weight:700; font-size:.85rem;">
              ${label}
            </span>
            <span class="badge" style="border:1px solid var(--line); color:var(--muted);">
              — XP
            </span>
          </div>
          <div class="bar-wrap mt-8">
            <div class="bar-fill ${cls}" style="width:0%;"></div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}
