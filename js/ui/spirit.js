/* ================================================================
   js/ui/spirit.js — Spirit screen (Phase 0 placeholder)
   Discipline Streak, check-in, practice timer, journal,
   Urge Mode, and Destiny Chapters built in Phase 4.
   ================================================================ */

/**
 * Render the Spirit tab.
 * @param {HTMLElement} container
 * @param {Object}      appState
 */
export function renderSpirit(container, appState) {
  const disc = appState.discipline;

  container.innerHTML = `
    <div class="system-label">[SYSTEM] SPIRIT TERMINAL</div>

    <!-- Discipline streak preview -->
    <div class="panel panel-cut">
      <div class="section-title">Discipline Streak</div>
      <div style="display:flex; justify-content:space-around; padding:10px 0;">

        <div style="text-align:center;">
          <div style="font-family:'Orbitron',monospace; font-size:2rem;
                      font-weight:900; color:var(--col-spi);">
            ${disc.current}
          </div>
          <div class="stat-label">Current</div>
        </div>

        <div style="text-align:center;">
          <div style="font-family:'Orbitron',monospace; font-size:2rem;
                      font-weight:900; color:var(--muted);">
            ${disc.best}
          </div>
          <div class="stat-label">Best</div>
        </div>

        <div style="text-align:center;">
          <div style="font-family:'Orbitron',monospace; font-size:2rem;
                      font-weight:900; color:var(--glow);">
            ${disc.totalWon}
          </div>
          <div class="stat-label">Total Won</div>
        </div>

      </div>
    </div>

    <div class="panel">
      <div class="system-label">[SPIRIT — PHASE 4 COMING]</div>
      <div class="placeholder-screen" style="min-height:36vh;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"
             stroke="var(--col-spi)" stroke-width="1.5" opacity="0.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88
                   L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <h2>Spirit Terminal</h2>
        <p>Daily check-in, practice timer,<br>journal, Urge Mode, and<br>
           Destiny Chapters in Phase 4.</p>
      </div>
    </div>

    <!-- Chapters locked preview -->
    <div class="panel">
      <div class="section-title">Destiny Chapters</div>
      ${['Chapter I — The Vow', 'Chapter II — Become Worthy',
         'Chapter III — The Letter', 'Chapter IV — The Destined Gate']
        .map(title => `
          <div style="display:flex; justify-content:space-between;
                      align-items:center; padding:8px 0;
                      border-bottom:1px solid var(--line); opacity:.4;">
            <span class="stat-label">${title}</span>
            <span class="badge" style="border:1px solid var(--line); color:var(--muted);">
              LOCKED
            </span>
          </div>
        `).join('')}
    </div>
  `;
}
