/* ================================================================
   js/ui/train.js — Train screen (Phase 0 placeholder)
   Awakening Test, set logger, rest timer, ladder, stamina advice
   all built in Phase 3.
   ================================================================ */

/**
 * Render the Train tab.
 * @param {HTMLElement} container
 * @param {Object}      appState
 */
export function renderTrain(container, appState) {
  const stamina = appState.stamina.value;
  const staminaColor = stamina >= 60 ? 'var(--col-str)'
                     : stamina >= 30 ? 'var(--gold)'
                     :                 'var(--danger)';
  const staminaLabel = stamina >= 60 ? 'FRESH'
                     : stamina >= 30 ? 'TIRED'
                     :                 'EXHAUSTED';

  container.innerHTML = `
    <div class="system-label">[SYSTEM] TRAINING TERMINAL</div>

    <!-- Stamina preview -->
    <div class="panel panel-cut">
      <div class="stat-row mb-8">
        <span class="stat-label">Stamina</span>
        <span style="font-family:'Orbitron',monospace; font-size:.8rem;
                     color:${staminaColor}; font-weight:700;">
          ${stamina}/100 · ${staminaLabel}
        </span>
      </div>
      <div class="bar-wrap bar-xl">
        <div class="bar-fill stamina" style="width:${stamina}%;"></div>
      </div>
    </div>

    <div class="panel">
      <div class="system-label">[TRAIN — PHASE 3 COMING]</div>
      <div class="placeholder-screen" style="min-height:38vh;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"
             stroke="var(--col-str)" stroke-width="1.5" opacity="0.5">
          <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16"/>
          <circle cx="4" cy="6.5" r="1.5"/><circle cx="20" cy="6.5" r="1.5"/>
          <circle cx="4" cy="17.5" r="1.5"/><circle cx="20" cy="17.5" r="1.5"/>
        </svg>
        <h2>Training Terminal</h2>
        <p>Workout logger, set counter,<br>rest timer, and progression<br>ladders arrive in Phase 3.</p>
      </div>
    </div>

    <!-- Current ladder step preview -->
    <div class="panel">
      <div class="section-title">Ladder Progress (preview)</div>
      <div class="stat-row">
        <span class="stat-label">Push step</span>
        <span class="stat-value mono">${appState.training.ladderStep.push}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Pull step</span>
        <span class="stat-value mono">${appState.training.ladderStep.pull}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Legs step</span>
        <span class="stat-value mono">${appState.training.ladderStep.legs}</span>
      </div>
    </div>
  `;
}
